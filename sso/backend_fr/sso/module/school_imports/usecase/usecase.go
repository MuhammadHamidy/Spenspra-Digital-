package usecase

import (
	"bytes"
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/sso/sso-be/sso/module/school_imports/domain"
	"github.com/google/uuid"
	"github.com/xuri/excelize/v2"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

func generateBarcodeToken() string {
	raw := make([]byte, 24)
	if _, err := rand.Read(raw); err != nil {
		return "PRAMBON-" + strings.ToUpper(uuid.New().String()+uuid.New().String())[:48]
	}
	return "PRAMBON-" + strings.ToUpper(hex.EncodeToString(raw))
}

type useCase struct {
	db *gorm.DB
}

func NewUseCase(db *gorm.DB) domain.UseCase {
	return &useCase{db: db}
}

func (u *useCase) ImportStudentsFromExcel(ctx context.Context, fileReader io.Reader) (*domain.ImportResultResponse, error) {
	f, err := excelize.OpenReader(fileReader)
	if err != nil {
		return nil, fmt.Errorf("gagal membaca file excel: %w", err)
	}
	defer f.Close()

	sheets := f.GetSheetList()
	if len(sheets) == 0 {
		return nil, errors.New("file excel tidak memiliki sheet aktif")
	}

	rows, err := f.GetRows(sheets[0])
	if err != nil {
		return nil, fmt.Errorf("gagal membaca baris sheet: %w", err)
	}

	if len(rows) <= 1 {
		return nil, errors.New("file excel kosong atau hanya berisi baris header")
	}

	columns := detectStudentColumns(rows[0])

	// Cache kelas yang ada
	var classes []struct {
		ID        string
		ClassCode string
	}
	if err := u.db.WithContext(ctx).Table("classes").Select("id, class_code").Find(&classes).Error; err != nil {
		return nil, err
	}
	classMap := make(map[string][]string)
	for _, c := range classes {
		classMap[normalizeClassCode(c.ClassCode)] = append(classMap[normalizeClassCode(c.ClassCode)], c.ID)
	}

	var errorList []domain.ImportErrorDetail
	type validStudentRow struct {
		ID        string
		Username  string
		FullName  string
		NISN      string
		ClassName string
		ClassIDs  []string
		Gender    string
		Phone     string
	}
	var validRows []validStudentRow
	seenNISN := make(map[string]int)

	// Validasi baris demi baris
	for i, row := range rows {
		if i == 0 {
			continue // skip header
		}
		rowNum := i + 1

		emptyRow := true
		for _, cell := range row {
			if strings.TrimSpace(cell) != "" {
				emptyRow = false
				break
			}
		}
		if emptyRow {
			continue
		}

		nisn := cellValue(row, columns.nisn)
		fullName := cellValue(row, columns.fullName)
		className := cellValue(row, columns.className)
		gender, genderError := normalizeGender(cellValue(row, columns.gender))
		parentPhone := cellValue(row, columns.parentPhone)

		if genderError != "" {
			errorList = append(errorList, domain.ImportErrorDetail{
				Row:    rowNum,
				Column: "Jenis Kelamin",
				Error:  genderError,
			})
			continue
		}

		if nisn == "" {
			errorList = append(errorList, domain.ImportErrorDetail{
				Row:    rowNum,
				Column: "NISN",
				Error:  "Kolom NISN tidak boleh kosong",
			})
			continue
		}

		if prevRow, exists := seenNISN[nisn]; exists {
			errorList = append(errorList, domain.ImportErrorDetail{
				Row:    rowNum,
				Column: "NISN",
				Error:  fmt.Sprintf("NISN '%s' duplikat di file (sudah ada di baris %d)", nisn, prevRow),
			})
			continue
		}
		seenNISN[nisn] = rowNum

		if fullName == "" {
			errorList = append(errorList, domain.ImportErrorDetail{
				Row:    rowNum,
				Column: "Nama Lengkap",
				Error:  "Kolom Nama Lengkap tidak boleh kosong",
			})
			continue
		}

		var classIDs []string
		cleanClassName := strings.TrimSpace(className)
		if cleanClassName != "" {
			classIDs = classMap[normalizeClassCode(cleanClassName)]
		}

		validRows = append(validRows, validStudentRow{
			ID:        uuid.New().String(),
			Username:  "siswa_" + nisn,
			FullName:  fullName,
			NISN:      nisn,
			ClassName: cleanClassName,
			ClassIDs:  classIDs,
			Gender:    gender,
			Phone:     parentPhone,
		})
	}

	if len(errorList) > 0 {
		return &domain.ImportResultResponse{
			TotalRows: len(rows) - 1,
			Inserted:  0,
			Failed:    len(errorList),
			Errors:    errorList,
		}, nil
	}

	// Eksekusi insert transaksional
	now := time.Now()
	hashedPwd, _ := bcrypt.GenerateFromPassword([]byte("password123"), bcrypt.DefaultCost)

	err = u.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		for _, vr := range validRows {
			var existing struct {
				ID       string
				PersonID *string `gorm:"column:person_id"`
			}
			err := tx.Table("accounts").
				Select("id, person_id").
				Where("nisn = ? AND role_id = ?", vr.NISN, "role-siswa").
				First(&existing).Error
			studentID := vr.ID
			if err == nil {
				studentID = existing.ID
				updates := map[string]interface{}{
					"full_name":  vr.FullName,
					"class_name": vr.ClassName,
					"phone":      vr.Phone,
					"gender":     vr.Gender,
					"updated_at": now,
				}
				if existing.PersonID == nil || *existing.PersonID == "" {
					updates["person_id"] = studentID
				}
				if err := tx.Table("accounts").Where("id = ?", existing.ID).Updates(updates).Error; err != nil {
					return fmt.Errorf("gagal memperbarui siswa %s (NISN: %s): %w", vr.FullName, vr.NISN, err)
				}
			} else if !errors.Is(err, gorm.ErrRecordNotFound) {
				return fmt.Errorf("gagal mencari siswa (NISN: %s): %w", vr.NISN, err)
			}

			// 1. Simpan/sinkronkan data master ke school_people (sumber identitas tunggal & barcode)
			var personCount int64
			if err := tx.Table("school_people").Where("id = ? OR nisn = ?", studentID, vr.NISN).Count(&personCount).Error; err == nil && personCount == 0 {
				barcodeToken := generateBarcodeToken()
				personData := map[string]interface{}{
					"id":             studentID,
					"person_type":    "SISWA",
					"full_name":      vr.FullName,
					"nisn":           vr.NISN,
					"class_name":     vr.ClassName,
					"phone":          vr.Phone,
					"barcode_token":  barcodeToken,
					"barcode_status": "ACTIVE",
					"is_active":      true,
					"created_at":     now,
					"updated_at":     now,
				}
				if err := tx.Table("school_people").Create(personData).Error; err != nil {
					return fmt.Errorf("gagal insert school_people siswa %s: %w", vr.FullName, err)
				}
			}

			// 2. Insert ke accounts jika siswa baru
			if studentID == vr.ID {
				accountData := map[string]interface{}{
					"id":            vr.ID,
					"person_id":     vr.ID,
					"username":         vr.Username,
					"password_hash":    string(hashedPwd),
					"initial_password": "password123",
					"email":            fmt.Sprintf("%s@siswa.sekolah.sch.id", vr.NISN),
					"full_name":     vr.FullName,
					"role_id":       "role-siswa",
					"nim_nip":       "NISN. " + vr.NISN,
					"nisn":          vr.NISN,
					"phone":         vr.Phone,
					"class_name":    vr.ClassName,
					"gender":        vr.Gender,
					"is_active":     true,
					"created_at":    now,
					"updated_at":    now,
				}
				if err := tx.Table("accounts").Create(accountData).Error; err != nil {
					return fmt.Errorf("gagal insert siswa %s (NISN: %s): %w", vr.FullName, vr.NISN, err)
				}
			}

			// 3. Enroll siswa ke semua kelas mapel / rombel dengan kode rombel yang sama.
			targetClassIDs := vr.ClassIDs
			normCode := normalizeClassCode(vr.ClassName)
			if normCode != "" && len(targetClassIDs) == 0 {
				if ids, ok := classMap[normCode]; ok && len(ids) > 0 {
					targetClassIDs = ids
				} else {
					var courseID string
					var course struct{ ID string }
					if err := tx.Table("courses").Select("id").First(&course).Error; err == nil {
						courseID = course.ID
					} else {
						courseID = uuid.New().String()
						_ = tx.Table("courses").Create(map[string]interface{}{
							"id":          courseID,
							"code":        "UMUM",
							"name":        "Pembelajaran Umum / Wali Kelas",
							"sks":         3,
							"description": "Mata pelajaran umum rombel kelas",
							"created_at":  now,
							"updated_at":  now,
						})
					}

					var teacherID string
					var teacher struct{ ID string }
					if err := tx.Table("accounts").Select("id").
						Where("role_id IN ?", []string{"role-wali-kelas", "role-guru"}).
						Order("created_at ASC").
						First(&teacher).Error; err == nil {
						teacherID = teacher.ID
					} else {
						teacherID = "user-guru-1"
					}

					newClassID := uuid.New().String()
					acadYear := fmt.Sprintf("%d/%d", now.Year(), now.Year()+1)
					if now.Month() < time.July {
						acadYear = fmt.Sprintf("%d/%d", now.Year()-1, now.Year())
					}
					classData := map[string]interface{}{
						"id":            newClassID,
						"course_id":     courseID,
						"class_code":    vr.ClassName,
						"dosen_id":      teacherID,
						"academic_year": acadYear,
						"room":          "Ruang " + vr.ClassName,
						"created_at":    now,
						"updated_at":    now,
					}
					if err := tx.Table("classes").Create(classData).Error; err == nil {
						classMap[normCode] = []string{newClassID}
						targetClassIDs = []string{newClassID}
					}
				}
			}

			for _, classID := range targetClassIDs {
				var enrollmentCount int64
				if err := tx.Table("class_enrollments").
					Where("class_id = ? AND student_id = ?", classID, studentID).
					Count(&enrollmentCount).Error; err != nil {
					return fmt.Errorf("gagal memeriksa enrollment siswa %s: %w", vr.FullName, err)
				}
				if enrollmentCount > 0 {
					continue
				}

				enrollment := map[string]interface{}{
					"id":          uuid.New().String(),
					"class_id":    classID,
					"student_id":  studentID,
					"enrolled_at": now,
				}
				if err := tx.Table("class_enrollments").Create(&enrollment).Error; err != nil {
					return fmt.Errorf("gagal enroll kelas siswa %s: %w", vr.FullName, err)
				}
			}
		}
		return nil
	})

	if err != nil {
		return nil, err
	}

	return &domain.ImportResultResponse{
		TotalRows: len(rows) - 1,
		Inserted:  len(validRows),
		Failed:    0,
	}, nil
}

func normalizeClassCode(value string) string {
	normalized := strings.ToUpper(strings.TrimSpace(value))
	normalized = strings.ReplaceAll(normalized, "KELAS", "")
	normalized = strings.ReplaceAll(normalized, " ", "")
	normalized = strings.ReplaceAll(normalized, "-", "")
	normalized = strings.ReplaceAll(normalized, "_", "")

	for _, replacement := range []struct {
		from string
		to   string
	}{
		{"VIII", "8"},
		{"VII", "7"},
		{"IX", "9"},
		{"VI", "6"},
		{"XII", "12"},
		{"XI", "11"},
		{"X", "10"},
	} {
		if strings.HasPrefix(normalized, replacement.from) {
			return replacement.to + strings.TrimPrefix(normalized, replacement.from)
		}

	}
	return normalized
}

type studentColumns struct {
	nisn        int
	fullName    int
	className   int
	gender      int
	parentPhone int
}

func detectStudentColumns(header []string) studentColumns {
	columns := studentColumns{nisn: 0, fullName: 1, className: 2, gender: 3, parentPhone: 4}
	for index, value := range header {
		normalized := strings.ToUpper(strings.TrimSpace(value))
		normalized = strings.NewReplacer(" ", "", "_", "", "-", "", "(", "", ")", "", "/", "").Replace(normalized)
		switch {
		case strings.Contains(normalized, "NISN"):
			columns.nisn = index
		case strings.Contains(normalized, "NAMALENGKAP") || normalized == "NAMA":
			columns.fullName = index
		case strings.Contains(normalized, "KODEKELAS") || normalized == "KELAS" || strings.Contains(normalized, "ROMBEL"):
			columns.className = index
		case strings.Contains(normalized, "JENISKELAMIN") || strings.Contains(normalized, "GENDER"):
			columns.gender = index
		case strings.Contains(normalized, "NOHP") || strings.Contains(normalized, "TELEPON"):
			columns.parentPhone = index
		}
	}
	return columns
}

func cellValue(row []string, index int) string {
	if index < 0 || index >= len(row) {
		return ""
	}
	return strings.TrimSpace(row[index])
}

func normalizeGender(value string) (string, string) {
	normalized := strings.ToUpper(strings.TrimSpace(value))
	normalized = strings.NewReplacer(" ", "", "_", "", "-", "", "(", "", ")", "", ".", "").Replace(normalized)
	switch normalized {
	case "", "L", "LAKILAKI", "LAKI", "MALE", "PRIA", "1":
		return "L", ""
	case "P", "PEREMPUAN", "WANITA", "FEMALE", "PUTRI", "2":
		return "P", ""
	default:
		return "", fmt.Sprintf("Nilai '%s' tidak dikenali. Gunakan L/Laki-laki atau P/Perempuan.", value)
	}
}

func normalizeClassName(value string) string {
	normalized := normalizeClassCode(value)
	if len(normalized) < 2 {
		return strings.ToUpper(strings.TrimSpace(value))
	}
	return normalized[:1] + "-" + normalized[1:]
}

func generateUsernameFromFullName(name string) string {
	name = strings.ToLower(strings.TrimSpace(name))
	for _, title := range []string{"s.pd.", "s.pd", "m.pd.", "m.pd", "s.kom.", "s.kom", "s.si.", "s.si", "m.si.", "m.si", "drs.", "drs", "dra.", "dra", "gr.", "gr"} {
		name = strings.ReplaceAll(name, title, "")
	}
	var b strings.Builder
	for _, r := range name {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') {
			b.WriteRune(r)
		} else if r == ' ' || r == '_' || r == '-' || r == '.' {
			b.WriteRune('_')
		}
	}
	res := b.String()
	for strings.Contains(res, "__") {
		res = strings.ReplaceAll(res, "__", "_")
	}
	res = strings.Trim(res, "_")
	if res == "" {
		res = "guru"
	}
	return res
}

func (u *useCase) ImportTeachersFromExcel(ctx context.Context, fileReader io.Reader) (*domain.ImportResultResponse, error) {
	f, err := excelize.OpenReader(fileReader)
	if err != nil {
		return nil, fmt.Errorf("gagal membaca file excel: %w", err)
	}
	defer f.Close()

	sheets := f.GetSheetList()
	if len(sheets) == 0 {
		return nil, errors.New("file excel tidak memiliki sheet aktif")
	}

	rows, err := f.GetRows(sheets[0])
	if err != nil {
		return nil, fmt.Errorf("gagal membaca baris sheet: %w", err)
	}

	if len(rows) <= 1 {
		return nil, errors.New("file excel kosong atau hanya berisi baris header")
	}

	var errorList []domain.ImportErrorDetail
	type validTeacherRow struct {
		ID           string
		NIP          string
		FullName     string
		Username     string
		RawEmail     string
		AccountEmail string
		Password     string
		Phone        string
	}
	var validRows []validTeacherRow
	seenNIP := make(map[string]int)
	seenUser := make(map[string]int)

	// Petakan index kolom dari baris header (baris 0)
	colNIP, colName, colUser, colEmail, colPass, colPhone := 0, 1, 2, 3, 4, 5
	if len(rows) > 0 {
		for idx, h := range rows[0] {
			hl := strings.ToLower(strings.TrimSpace(h))
			if strings.Contains(hl, "nip") {
				colNIP = idx
			} else if strings.Contains(hl, "nama") {
				colName = idx
			} else if strings.Contains(hl, "user") {
				colUser = idx
			} else if strings.Contains(hl, "email") || strings.Contains(hl, "surel") {
				colEmail = idx
			} else if strings.Contains(hl, "pass") || strings.Contains(hl, "sandi") {
				colPass = idx
			} else if strings.Contains(hl, "hp") || strings.Contains(hl, "wa") || strings.Contains(hl, "telepon") || strings.Contains(hl, "kontak") {
				colPhone = idx
			}
		}
	}

	for i, row := range rows {
		if i == 0 {
			continue
		}
		rowNum := i + 1

		emptyRow := true
		for _, cell := range row {
			if strings.TrimSpace(cell) != "" {
				emptyRow = false
				break
			}
		}
		if emptyRow {
			continue
		}

		nip := ""
		if len(row) > colNIP {
			nip = strings.TrimSpace(row[colNIP])
		}
		// Bersihkan prefix 'NIP.' atau 'NIP:' jika ada
		nip = strings.TrimPrefix(nip, "NIP.")
		nip = strings.TrimPrefix(nip, "NIP:")
		nip = strings.TrimPrefix(nip, "NIP ")
		nip = strings.TrimSpace(nip)
		if nip == "-" {
			nip = ""
		}

		fullName := ""
		if len(row) > colName {
			fullName = strings.TrimSpace(row[colName])
		}
		username := ""
		if len(row) > colUser {
			username = strings.TrimSpace(row[colUser])
		}
		rawEmail := ""
		if len(row) > colEmail {
			rawEmail = strings.TrimSpace(row[colEmail])
		}
		password := "Spenspra2026"
		if len(row) > colPass && strings.TrimSpace(row[colPass]) != "" {
			password = strings.TrimSpace(row[colPass])
		}
		phone := ""
		if len(row) > colPhone {
			phone = strings.TrimSpace(row[colPhone])
		}

		// NIP bersifat opsional, hanya diperiksa duplikat jika diisi
		if nip != "" {
			if prev, exists := seenNIP[nip]; exists {
				errorList = append(errorList, domain.ImportErrorDetail{
					Row:    rowNum,
					Column: "NIP",
					Error:  fmt.Sprintf("NIP '%s' duplikat di baris %d", nip, prev),
				})
				continue
			}
			seenNIP[nip] = rowNum
		}

		if fullName == "" {
			errorList = append(errorList, domain.ImportErrorDetail{
				Row:    rowNum,
				Column: "Nama Lengkap",
				Error:  "Nama Lengkap guru tidak boleh kosong",
			})
			continue
		}

		// Jika username kosong, gunakan NIP (bila ada) atau buat otomatis dari nama lengkap
		if username == "" {
			if nip != "" {
				username = nip
			} else {
				username = generateUsernameFromFullName(fullName)
			}
		}

		// Jika username bentrok di file, tambahkan suffix nomor agar unik
		baseUser := username
		counter := 1
		for {
			if _, exists := seenUser[username]; exists {
				counter++
				username = fmt.Sprintf("%s_%d", baseUser, counter)
			} else {
				break
			}
		}
		seenUser[username] = rowNum

		// Email akun SSO internal jika di Excel tidak diisi (agar lolos NOT NULL UNIQUE constraint di database)
		accountEmail := rawEmail
		if accountEmail == "" {
			accountEmail = fmt.Sprintf("%s@smpn1prambon.sch.id", strings.ToLower(username))
		}

		validRows = append(validRows, validTeacherRow{
			ID:           uuid.New().String(),
			NIP:          nip,
			FullName:     fullName,
			Username:     username,
			RawEmail:     rawEmail,
			AccountEmail: accountEmail,
			Password:     password,
			Phone:        phone,
		})
	}

	if len(errorList) > 0 {
		return &domain.ImportResultResponse{
			TotalRows: len(rows) - 1,
			Inserted:  0,
			Failed:    len(errorList),
			Errors:    errorList,
		}, nil
	}

	now := time.Now()
	var credentialsList []domain.TeacherCredentialItem

	err = u.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		for _, vr := range validRows {
			// 1. Simpan/sinkronkan data master ke school_people (status GURU aktif & barcode)
			var existingPerson struct {
				ID string
			}
			queryPerson := tx.Table("school_people").Where("id = ?", vr.ID)
			if vr.NIP != "" {
				queryPerson = tx.Table("school_people").Where("id = ? OR (nip = ? AND nip != '')", vr.ID, vr.NIP)
			}
			errPerson := queryPerson.First(&existingPerson).Error

			personID := vr.ID
			if errPerson != nil {
				barcodeToken := generateBarcodeToken()
				personData := map[string]interface{}{
					"id":             vr.ID,
					"person_type":    "GURU",
					"full_name":      vr.FullName,
					"nip":            vr.NIP,
					"email":          vr.RawEmail, // Menggunakan raw email (jika kosong tetap kosong di data master guru)
					"phone":          vr.Phone,
					"position":       "Guru Mata Pelajaran",
					"barcode_token":  barcodeToken,
					"barcode_status": "ACTIVE",
					"is_active":      true,
					"created_at":     now,
					"updated_at":     now,
				}
				if err := tx.Table("school_people").Create(personData).Error; err != nil {
					return fmt.Errorf("gagal insert school_people guru %s: %w", vr.FullName, err)
				}
			} else {
				personID = existingPerson.ID
				updPerson := map[string]interface{}{
					"person_type": "GURU",
					"full_name":   vr.FullName,
					"email":       vr.RawEmail, // Menggunakan raw email (tetap kosong jika tidak diisi)
					"phone":       vr.Phone,
					"position":    "Guru Mata Pelajaran",
					"is_active":   true,
					"updated_at":  now,
				}
				if vr.NIP != "" {
					updPerson["nip"] = vr.NIP
				}
				_ = tx.Table("school_people").Where("id = ?", existingPerson.ID).Updates(updPerson).Error
			}

			// 2. Simpan atau perbarui akun di tabel accounts (role-guru)
			hashedPwd, _ := bcrypt.GenerateFromPassword([]byte(vr.Password), bcrypt.DefaultCost)
			var existingAccountCount int64
			queryAcc := tx.Table("accounts").Where("id = ? OR person_id = ? OR username = ?", personID, personID, vr.Username)
			if vr.NIP != "" {
				queryAcc = tx.Table("accounts").Where("id = ? OR person_id = ? OR username = ? OR (nim_nip = ? AND nim_nip != '')", personID, personID, vr.Username, vr.NIP)
			}
			_ = queryAcc.Count(&existingAccountCount).Error

			if existingAccountCount > 0 {
				updAccount := map[string]interface{}{
					"person_id":  personID,
					"full_name":  vr.FullName,
					"role_id":    "role-guru",
					"email":      vr.AccountEmail,
					"phone":      vr.Phone,
					"is_active":  true,
					"updated_at": now,
				}
				if vr.NIP != "" {
					updAccount["nim_nip"] = vr.NIP
				}
				if vr.Password != "" {
					updAccount["password_hash"] = string(hashedPwd) // Update password sesuai Excel
					updAccount["initial_password"] = vr.Password
				}
				queryUpd := tx.Table("accounts").Where("id = ? OR person_id = ? OR username = ?", personID, personID, vr.Username)
				if vr.NIP != "" {
					queryUpd = tx.Table("accounts").Where("id = ? OR person_id = ? OR username = ? OR (nim_nip = ? AND nim_nip != '')", personID, personID, vr.Username, vr.NIP)
				}
				_ = queryUpd.Updates(updAccount).Error
			} else {
				accountData := map[string]interface{}{
					"id":               personID,
					"person_id":        personID,
					"username":         vr.Username,
					"password_hash":    string(hashedPwd),
					"initial_password": vr.Password,
					"email":            vr.AccountEmail,
					"full_name":        vr.FullName,
					"role_id":          "role-guru",
					"nim_nip":          vr.NIP,
					"phone":            vr.Phone,
					"is_active":        true,
					"created_at":       now,
					"updated_at":       now,
				}
				if err := tx.Table("accounts").Create(accountData).Error; err != nil {
					return fmt.Errorf("gagal insert akun guru %s (Username: %s): %w", vr.FullName, vr.Username, err)
				}
			}

			// Simpan ke daftar kredensial untuk dikirim kembali ke frontend
			credentialsList = append(credentialsList, domain.TeacherCredentialItem{
				ID:       personID,
				NIP:      vr.NIP,
				FullName: vr.FullName,
				Username: vr.Username,
				Password: vr.Password,
				Email:    vr.RawEmail,
			})
		}
		return nil
	})

	if err != nil {
		return nil, err
	}

	// Sinkronisasi otomatis ke e-Rapor di background
	go func() {
		client := &http.Client{Timeout: 5 * time.Second}
		req, err := http.NewRequest(http.MethodPost, "http://rapor-api:8080/api/school/sync-sso", nil)
		if err == nil {
			_, _ = client.Do(req)
		}
	}()

	return &domain.ImportResultResponse{
		TotalRows:   len(rows) - 1,
		Inserted:    len(validRows),
		Failed:      0,
		Credentials: credentialsList,
	}, nil
}

func (u *useCase) GenerateStudentTemplateExcel() ([]byte, error) {
	f := excelize.NewFile()
	defer f.Close()

	sheet := "Data_Siswa"
	f.SetSheetName("Sheet1", sheet)

	headers := []string{"NISN (Wajib)", "Nama Lengkap (Wajib)", "Kode Kelas (Contoh: VII-A)", "Jenis Kelamin (L/P)", "No HP Orang Tua"}
	for colIdx, h := range headers {
		cell, _ := excelize.CoordinatesToCellName(colIdx+1, 1)
		_ = f.SetCellValue(sheet, cell, h)
	}

	// Contoh data baris 2 & 3
	_ = f.SetCellValue(sheet, "A2", "0081293820")
	_ = f.SetCellValue(sheet, "B2", "Muhammad Rizky Pratama")
	_ = f.SetCellValue(sheet, "C2", "VII-D")
	_ = f.SetCellValue(sheet, "D2", "L")
	_ = f.SetCellValue(sheet, "E2", "081298765432")

	_ = f.SetCellValue(sheet, "A3", "0081293821")
	_ = f.SetCellValue(sheet, "B3", "Aisyah Putri Azzahra")
	_ = f.SetCellValue(sheet, "C3", "VII-D")
	_ = f.SetCellValue(sheet, "D3", "P")
	_ = f.SetCellValue(sheet, "E3", "081298765433")

	var buf bytes.Buffer
	if err := f.Write(&buf); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}

func (u *useCase) GenerateTeacherTemplateExcel() ([]byte, error) {
	f := excelize.NewFile()
	defer f.Close()

	sheet := "Data_Guru"
	f.SetSheetName("Sheet1", sheet)

	headers := []string{"NIP (Wajib)", "Nama Lengkap (Wajib)", "Username (Opsional)", "Email (Opsional)", "Password (Opsional)", "No WhatsApp/HP", "Status"}
	for colIdx, h := range headers {
		cell, _ := excelize.CoordinatesToCellName(colIdx+1, 1)
		_ = f.SetCellValue(sheet, cell, h)
	}

	// Contoh data
	_ = f.SetCellValue(sheet, "A2", "198503122010121001")
	_ = f.SetCellValue(sheet, "B2", "Budi Santoso, S.Pd")
	_ = f.SetCellValue(sheet, "C2", "198503122010121001")
	_ = f.SetCellValue(sheet, "D2", "budi.santoso@smpn1prambon.sch.id")
	_ = f.SetCellValue(sheet, "E2", "password123")
	_ = f.SetCellValue(sheet, "F2", "081234567891")
	_ = f.SetCellValue(sheet, "G2", "Guru Aktif")

	var buf bytes.Buffer
	if err := f.Write(&buf); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}
