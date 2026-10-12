package middleware

import (
	"net/url"
	"strings"

	"github.com/gofiber/fiber/v2"
)

// CSRFOriginConfig mendefinisikan opsi untuk CSRF Origin Validator.
type CSRFOriginConfig struct {
	AllowedHosts []string
}

// DefaultCSRFOriginConfig mengembalikan daftar domain yang sah di ekosistem Spenspra.
func DefaultCSRFOriginConfig() CSRFOriginConfig {
	return CSRFOriginConfig{
		AllowedHosts: []string{
			"localhost",
			".localhost",
			"127.0.0.1",
			"spenspra.sch.id",
			".spenspra.sch.id",
		},
	}
}

// CSRFOriginValidator memeriksa header Origin / Referer pada request mutasi (POST, PUT, PATCH, DELETE)
// untuk mencegah serangan Cross-Site Request Forgery antar-subdomain atau dari situs luar.
func CSRFOriginValidator(cfg ...CSRFOriginConfig) fiber.Handler {
	config := DefaultCSRFOriginConfig()
	if len(cfg) > 0 {
		config = cfg[0]
	}

	return func(c *fiber.Ctx) error {
		method := c.Method()

		// Request idempotent (GET, HEAD, OPTIONS) diizinkan
		if method == fiber.MethodGet || method == fiber.MethodHead || method == fiber.MethodOptions {
			return c.Next()
		}

		// Request server-to-server internal dengan Service Key diizinkan
		if c.Get("X-Service-Key") != "" {
			return c.Next()
		}

		origin := strings.TrimSpace(c.Get("Origin"))
		if origin == "" {
			referer := strings.TrimSpace(c.Get("Referer"))
			if referer != "" {
				if parsed, err := url.Parse(referer); err == nil {
					origin = parsed.Scheme + "://" + parsed.Host
				}
			}
		}

		// Jika Origin atau Referer ada, validasi terhadap whitelist
		if origin != "" {
			parsedOrigin, err := url.Parse(origin)
			if err != nil {
				return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
					"success": false,
					"message": "CSRF validation: origin tidak valid",
				})
			}

			host := strings.ToLower(parsedOrigin.Hostname())
			isAllowed := false

			for _, allowed := range config.AllowedHosts {
				if allowed == host {
					isAllowed = true
					break
				}
				if strings.HasPrefix(allowed, ".") && (host == allowed[1:] || strings.HasSuffix(host, allowed)) {
					isAllowed = true
					break
				}
			}

			if !isAllowed {
				return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
					"success": false,
					"message": "CSRF origin validation failed: domain asal (" + host + ") tidak diizinkan",
				})
			}
		}

		return c.Next()
	}
}
