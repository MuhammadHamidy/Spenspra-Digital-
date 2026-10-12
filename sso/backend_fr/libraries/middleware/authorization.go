package middleware

import (
	"crypto/rsa"
	"errors"
	"fmt"
	"os"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
	"github.com/sso/sso-be/libraries/idp"
)

const (
	authCookieKey   = "access_token"
	authCookieAlt   = "perpusdig_auth_token"
	PrefixAuthToken = "auth:token:"
)

type AuthorizationMiddleware struct {
	idp       idp.IDPProvider
	db        *pgxpool.Pool
	cache     redis.UniversalClient
	rsaPublic *rsa.PublicKey
	jwtSecret string
}

func NewAuthorizationMiddleware(idp idp.IDPProvider, db *pgxpool.Pool, cache redis.UniversalClient) *AuthorizationMiddleware {
	mw := &AuthorizationMiddleware{idp: idp, db: db, cache: cache}

	// Coba muat RSA Public Key untuk verifikasi RS256
	keyCandidates := []string{
		os.Getenv("JWT_PUBLIC_KEY_PATH"),
		"/keys/jwt_public.pem",
		"shared/keys/jwt_public.pem",
		"../../shared/keys/jwt_public.pem",
		"../../../shared/keys/jwt_public.pem",
	}

	for _, p := range keyCandidates {
		if p != "" {
			if b, err := os.ReadFile(p); err == nil && len(b) > 0 {
				if pub, err := jwt.ParseRSAPublicKeyFromPEM(b); err == nil {
					mw.rsaPublic = pub
					break
				}
			}
		}
	}

	// Jika public key tidak ditemukan tetapi private key ada, derive public key dari private key
	if mw.rsaPublic == nil {
		privCandidates := []string{
			os.Getenv("JWT_PRIVATE_KEY_PATH"),
			"/keys/jwt_private.pem",
			"shared/keys/jwt_private.pem",
			"../../shared/keys/jwt_private.pem",
			"../../../shared/keys/jwt_private.pem",
		}
		for _, p := range privCandidates {
			if p != "" {
				if b, err := os.ReadFile(p); err == nil && len(b) > 0 {
					if priv, err := jwt.ParseRSAPrivateKeyFromPEM(b); err == nil {
						mw.rsaPublic = &priv.PublicKey
						break
					}
				}
			}
		}
	}

	mw.jwtSecret = os.Getenv("JWT_SECRET")
	if mw.jwtSecret == "" {
		mw.jwtSecret = "absensi-fr-secret-key-2026"
	}

	return mw
}

const (
	XTokenKey        = "X-Token"
	XUserIdKey       = "X-User-Id"
	XExternalSubject = "X-External-Subject"
	XGroupKey        = "X-Group"
	XInstitutionId   = "X-Institution-Id"
)

func (a *AuthorizationMiddleware) Authenticate(scopes ...string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		token := strings.TrimSpace(c.Get("Authorization"))
		if strings.HasPrefix(strings.ToLower(token), "bearer ") {
			token = strings.TrimSpace(token[len("Bearer "):])
		}
		if token == "" {
			token = strings.TrimSpace(c.Cookies(authCookieKey))
		}
		if token == "" {
			token = strings.TrimSpace(c.Cookies(authCookieAlt))
		}
		if token == "" {
			return fiber.ErrUnauthorized
		}

		// 1. Verifikasi Kriptografis Tanda Tangan JWT (RS256 atau fallback HS256)
		parsedToken, err := jwt.Parse(token, func(t *jwt.Token) (interface{}, error) {
			if _, ok := t.Method.(*jwt.SigningMethodRSA); ok {
				if a.rsaPublic != nil {
					return a.rsaPublic, nil
				}
				return nil, errors.New("kunci publik RSA belum terkonfigurasi")
			}
			if _, ok := t.Method.(*jwt.SigningMethodHMAC); ok {
				return []byte(a.jwtSecret), nil
			}
			return nil, fmt.Errorf("algoritma signing tidak didukung: %v", t.Header["alg"])
		})

		if err == nil && parsedToken.Valid {
			if claims, ok := parsedToken.Claims.(jwt.MapClaims); ok {
				// 2. Token Revocation via Redis (Langkah 3)
				if jti, ok := claims["jti"].(string); ok && jti != "" && a.cache != nil {
					exists, rErr := a.cache.Exists(c.UserContext(), "auth:blacklist:"+jti).Result()
					if rErr == nil && exists > 0 {
						return fiber.NewError(fiber.StatusUnauthorized, "token telah dicabut (revoked)")
					}
				}

				sub, _ := claims["sub"].(string)
				if sub == "" {
					sub, _ = claims["id"].(string)
				}
				roleName, _ := claims["role_name"].(string)
				fullName, _ := claims["full_name"].(string)

				c.Locals(XUserIdKey, sub)
				c.Locals(XTokenKey, token)
				c.Locals(XExternalSubject, sub)
				c.Locals("user_role", roleName)
				c.Locals("full_name", fullName)
				c.Locals(XGroupKey, []string{})
				return c.Next()
			}
		}

		return fiber.ErrUnauthorized
	}
}
