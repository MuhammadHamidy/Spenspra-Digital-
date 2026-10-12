package usecase

import (
	"context"
	"crypto/rand"
	"crypto/rsa"
	"crypto/x509"
	"encoding/hex"
	"encoding/pem"
	"errors"
	"os"
	"time"

	"github.com/sso/sso-be/sso/module/auth/domain"
	"github.com/sso/sso-be/sso/module/auth/mailer"
	"github.com/golang-jwt/jwt/v5"
	"github.com/redis/go-redis/v9"
	"golang.org/x/crypto/bcrypt"
)

type useCase struct {
	repo       domain.AuthRepository
	jwtSecret  string
	rsaPrivate *rsa.PrivateKey
	pubKeyPem  string
	mailer     mailer.Mailer
	cache      redis.UniversalClient
}

func NewUseCase(repo domain.AuthRepository, jwtSecret string, mailer mailer.Mailer, cache redis.UniversalClient) domain.UseCase {
	if jwtSecret == "" {
		jwtSecret = "absensi-fr-secret-key-2026"
	}
	uc := &useCase{
		repo:      repo,
		jwtSecret: jwtSecret,
		mailer:    mailer,
		cache:     cache,
	}

	// Coba muat RSA Private Key untuk RS256 asymmetric signing.
	// Urutan prioritas:
	//   1. Variabel lingkungan JWT_PRIVATE_KEY_PATH (eksplisit dari Docker volume)
	//   2. Path standar container produksi /keys/jwt_private.pem
	//   3. Path relatif untuk pengembangan lokal
	//   4. Variabel lingkungan JWT_PRIVATE_KEY_PEM (base64 / raw PEM)
	//   5. Auto-generate kunci baru jika tidak ada sumber kunci yang ditemukan
	keyCandidates := []string{
		os.Getenv("JWT_PRIVATE_KEY_PATH"),
		"/keys/jwt_private.pem",
		"shared/keys/jwt_private.pem",
		"../../shared/keys/jwt_private.pem",
		"../../../shared/keys/jwt_private.pem",
	}

	var keyBytes []byte
	var savedKeyPath string
	for _, p := range keyCandidates {
		if p != "" {
			if b, err := os.ReadFile(p); err == nil && len(b) > 0 {
				keyBytes = b
				savedKeyPath = p
				break
			}
		}
	}

	if len(keyBytes) == 0 && os.Getenv("JWT_PRIVATE_KEY_PEM") != "" {
		keyBytes = []byte(os.Getenv("JWT_PRIVATE_KEY_PEM"))
	}

	// Auto-generate: jika tidak ada kunci yang ditemukan dari disk/env,
	// buat pasangan kunci RSA 2048-bit baru dan simpan ke disk agar
	// token tetap valid lintas restart server.
	if len(keyBytes) == 0 {
		newKey, err := rsa.GenerateKey(rand.Reader, 2048)
		if err == nil {
			// Encode & simpan private key ke disk
			privBytes, marshalErr := x509.MarshalPKCS8PrivateKey(newKey)
			if marshalErr == nil {
				privPEM := pem.EncodeToMemory(&pem.Block{Type: "PRIVATE KEY", Bytes: privBytes})

				// Tentukan path penyimpanan: prioritaskan /keys/ (Docker), fallback shared/keys/
				savePath := "/keys/jwt_private.pem"
				if _, statErr := os.Stat("/keys"); os.IsNotExist(statErr) {
					savePath = "shared/keys/jwt_private.pem"
					_ = os.MkdirAll("shared/keys", 0700)
				}

				if writeErr := os.WriteFile(savePath, privPEM, 0600); writeErr == nil {
					keyBytes = privPEM
					savedKeyPath = savePath

					// Simpan public key ke lokasi berpasangan agar satelit bisa membaca
					pubPath := strings.TrimSuffix(savePath, "jwt_private.pem") + "jwt_public.pem"
					if pubBytes, pubErr := x509.MarshalPKIXPublicKey(&newKey.PublicKey); pubErr == nil {
						pubPEM := pem.EncodeToMemory(&pem.Block{Type: "PUBLIC KEY", Bytes: pubBytes})
						_ = os.WriteFile(pubPath, pubPEM, 0644)
					}
				}
			}
		}
	}

	_ = savedKeyPath // digunakan untuk logging jika diperlukan

	if len(keyBytes) > 0 {
		if priv, err := jwt.ParseRSAPrivateKeyFromPEM(keyBytes); err == nil {
			uc.rsaPrivate = priv
			pubBytes, err := x509.MarshalPKIXPublicKey(&priv.PublicKey)
			if err == nil {
				pubBlock := &pem.Block{
					Type:  "PUBLIC KEY",
					Bytes: pubBytes,
				}
				uc.pubKeyPem = string(pem.EncodeToMemory(pubBlock))
			}
		}
	}

	return uc
}

func (u *useCase) GetPublicKey(ctx context.Context) (string, error) {
	if u.pubKeyPem == "" {
		return "", errors.New("kunci publik RSA belum terkonfigurasi")
	}
	return u.pubKeyPem, nil
}

func (u *useCase) Logout(ctx context.Context, tokenString string) error {
	if tokenString == "" {
		return nil
	}

	parser := jwt.NewParser()
	claims := jwt.MapClaims{}
	_, _, err := parser.ParseUnverified(tokenString, claims)
	if err != nil {
		return nil
	}

	jti, _ := claims["jti"].(string)
	if jti == "" {
		return nil
	}

	ttl := 7 * 24 * time.Hour
	if expRaw, ok := claims["exp"]; ok {
		var expUnix int64
		switch v := expRaw.(type) {
		case float64:
			expUnix = int64(v)
		case int64:
			expUnix = v
		}
		if expUnix > 0 {
			remaining := time.Until(time.Unix(expUnix, 0))
			if remaining > 0 {
				ttl = remaining
			}
		}
	}

	if u.cache != nil {
		_ = u.cache.Set(ctx, "auth:blacklist:"+jti, "revoked", ttl).Err()
	}

	return nil
}

func generateRandomPassword() string {
	chars := "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789"
	b := make([]byte, 6)
	_, _ = rand.Read(b)
	for i := range b {
		b[i] = chars[int(b[i])%len(chars)]
	}
	return "Guru#" + string(b)
}

func (u *useCase) Login(ctx context.Context, req domain.LoginRequest) (*domain.LoginResponse, error) {
	if req.Username == "" || req.Password == "" {
		return nil, errors.New("username dan password wajib diisi")
	}

	account, err := u.repo.FindByUsername(ctx, req.Username)
	if err != nil || account == nil {
		return nil, errors.New("username atau password salah")
	}

	err = bcrypt.CompareHashAndPassword([]byte(account.PasswordHash), []byte(req.Password))
	if err != nil {
		return nil, errors.New("username atau password salah")
	}

	tokenIDBytes := make([]byte, 16)
	_, _ = rand.Read(tokenIDBytes)
	jti := hex.EncodeToString(tokenIDBytes)

	// Audience claim: tentukan aplikasi yang diizinkan untuk akun ini berdasarkan perannya
	var aud []string
	switch account.RoleName {
	case "SUPER_ADMIN", "ADMIN", "KEPALA_SEKOLAH":
		aud = []string{"sso", "erapor", "perpus"}
	case "ADMIN_PERPUS":
		aud = []string{"sso", "perpus"}
	case "SISWA":
		aud = []string{"sso", "perpus"}
	case "ADMIN_RAPOR", "ADMIN_ABSENSI", "GURU", "WALI_KELAS":
		aud = []string{"sso", "erapor"}
	default:
		aud = []string{"sso", "erapor"}
	}

	expiresAt := time.Now().Add(7 * 24 * time.Hour)
	claims := jwt.MapClaims{
		"jti":       jti,
		"iss":       "sso.spenspra.sch.id",
		"sub":       account.Id,
		"aud":       aud,
		"id":        account.Id,
		"username":  account.Username,
		"role_id":   account.RoleId,
		"role_name": account.RoleName,
		"full_name": account.FullName,
		"exp":       expiresAt.Unix(),
		"iat":       time.Now().Unix(),
	}

	var tokenString string
	if u.rsaPrivate != nil {
		token := jwt.NewWithClaims(jwt.SigningMethodRS256, claims)
		tokenString, err = token.SignedString(u.rsaPrivate)
	} else {
		token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
		tokenString, err = token.SignedString([]byte(u.jwtSecret))
	}
	if err != nil {
		return nil, err
	}

	account.PasswordHash = ""

	return &domain.LoginResponse{
		Token:     tokenString,
		ExpiresAt: expiresAt.Format(time.RFC3339),
		Account:   account,
	}, nil
}

func (u *useCase) GetAccountList(ctx context.Context, roleName string) ([]*domain.Account, error) {
	accounts, err := u.repo.FindAllAccounts(ctx, roleName)
	if err != nil {
		return nil, err
	}
	for _, a := range accounts {
		a.PasswordHash = ""
	}
	return accounts, nil
}

func (u *useCase) CreateAccount(ctx context.Context, account *domain.Account) error {
	if account.Username == "" {
		return errors.New("username wajib diisi")
	}

	// Resolve role_id jika dikirim sebagai nama role ('GURU', 'SISWA', dll)
	roleInput := account.RoleId
	if roleInput == "" {
		roleInput = account.RoleName
	}
	if roleInput != "" {
		role, _ := u.repo.FindRoleByID(ctx, roleInput)
		if role != nil {
			account.RoleId = role.Id
			account.RoleName = role.Name
		}
	}
	if account.RoleId == "" {
		account.RoleId = "role-guru"
	}

	if account.Password == "" {
		if account.NimNip != "" {
			account.Password = account.NimNip
		} else {
			account.Password = account.Username
		}
	}

	existing, _ := u.repo.FindByUsername(ctx, account.Username)
	if existing != nil {
		return errors.New("username atau NIP/NISN sudah terdaftar")
	}

	rawPassword := account.Password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(account.Password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	account.PasswordHash = string(hashedPassword)
	account.Password = ""

	err = u.repo.StoreAccount(ctx, account)
	if err != nil {
		return err
	}

	// Send access email to teacher if role is GURU and email is present
	if (account.RoleId == "role-guru" || account.RoleName == "GURU") && account.Email != "" && rawPassword != "" {
		createdAccount, errFind := u.repo.FindAccountByID(ctx, account.Id)
		if errFind == nil && createdAccount != nil {
			go func() {
				_ = u.mailer.SendTeacherAccessEmail(
					context.Background(),
					createdAccount.Email,
					createdAccount.FullName,
					createdAccount.Username,
					rawPassword,
					createdAccount.CourseNames,
					createdAccount.ClassCodes,
				)
			}()
		}
	}

	return nil
}

func (u *useCase) UpdateAccount(ctx context.Context, id string, account *domain.Account) error {
	account.Id = id
	if account.RoleId != "" {
		role, _ := u.repo.FindRoleByID(ctx, account.RoleId)
		if role != nil {
			account.RoleId = role.Id
			account.RoleName = role.Name
		}
	}
	if account.Password != "" {
		hashedPassword, err := bcrypt.GenerateFromPassword([]byte(account.Password), bcrypt.DefaultCost)
		if err != nil {
			return err
		}
		account.PasswordHash = string(hashedPassword)
		account.Password = ""
	}
	return u.repo.UpdateAccount(ctx, account)
}

func (u *useCase) DeleteAccount(ctx context.Context, id string) error {
	return u.repo.DeleteAccount(ctx, id)
}

func (u *useCase) GetRoleList(ctx context.Context) ([]*domain.Role, error) {
	return u.repo.FindAllRoles(ctx)
}

func (u *useCase) ResetPassword(ctx context.Context, id string, req domain.ResetPasswordRequest) (*domain.ResetPasswordResponse, error) {
	account, err := u.repo.FindAccountByID(ctx, id)
	if err != nil || account == nil {
		return nil, errors.New("akun tidak ditemukan")
	}

	newPassword := req.NewPassword
	if newPassword == "" {
		newPassword = generateRandomPassword()
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	err = u.repo.ResetPassword(ctx, id, string(hashedPassword))
	if err != nil {
		return nil, err
	}

	emailSent := false
	if req.SendEmail && account.Email != "" {
		errMail := u.mailer.SendPasswordResetEmail(ctx, account.Email, account.FullName, account.Username, newPassword)
		if errMail == nil {
			emailSent = true
		}
	}

	return &domain.ResetPasswordResponse{
		NewPassword: newPassword,
		EmailSent:   emailSent,
		Message:     "Password berhasil direset tanpa menghapus data guru",
	}, nil
}

func (u *useCase) SendAccessEmail(ctx context.Context, id string, customPassword string) error {
	account, err := u.repo.FindAccountByID(ctx, id)
	if err != nil || account == nil {
		return errors.New("akun tidak ditemukan")
	}

	if account.Email == "" {
		return errors.New("guru ini belum memiliki alamat email terdaftar")
	}

	password := customPassword
	if password == "" {
		if account.NimNip != "" {
			password = account.NimNip
		} else {
			password = account.Username
		}
	}

	// Selalu hash dan perbarui kata sandi di database agar yang tertulis di email 100% valid!
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	_ = u.repo.ResetPassword(ctx, account.Id, string(hashedPassword))

	return u.mailer.SendTeacherAccessEmail(
		ctx,
		account.Email,
		account.FullName,
		account.Username,
		password,
		account.CourseNames,
		account.ClassCodes,
	)
}

func (u *useCase) UpdateProfile(ctx context.Context, id string, req domain.UpdateProfileRequest) (*domain.Account, error) {
	current, err := u.repo.FindAccountByID(ctx, id)
	if err != nil || current == nil {
		return nil, errors.New("akun tidak ditemukan")
	}

	// Check if username changed and verify uniqueness
	if req.Username != "" && req.Username != current.Username {
		existing, _ := u.repo.FindByUsername(ctx, req.Username)
		if existing != nil && existing.Id != id {
			return nil, errors.New("username sudah digunakan oleh pengguna lain")
		}
	}

	var newPasswordHash string
	if req.NewPassword != "" {
		// If old password provided, verify it
		if req.OldPassword != "" {
			err = bcrypt.CompareHashAndPassword([]byte(current.PasswordHash), []byte(req.OldPassword))
			if err != nil {
				return nil, errors.New("password lama salah")
			}
		}
		hashed, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
		if err != nil {
			return nil, err
		}
		newPasswordHash = string(hashed)
	}

	updated, err := u.repo.UpdateProfile(ctx, id, req, newPasswordHash)
	if err != nil {
		return nil, err
	}
	if updated != nil {
		updated.PasswordHash = ""
	}
	return updated, nil
}
