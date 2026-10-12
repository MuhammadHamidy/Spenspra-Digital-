package auth

import (
	"github.com/sso/sso-be/sso/config"
	"github.com/sso/sso-be/sso/module/auth/delivery/http"
	"github.com/sso/sso-be/sso/module/auth/domain"
	"github.com/sso/sso-be/sso/module/auth/mailer"
	"github.com/sso/sso-be/sso/module/auth/repository/postgresql"
	"github.com/sso/sso-be/sso/module/auth/usecase"
	"github.com/gofiber/fiber/v2"
	"github.com/redis/go-redis/v9"
	"go.uber.org/fx"
)

var Module = fx.Options(
	fx.Provide(
		mailer.NewMailer,
		fx.Annotate(
			postgresql.NewRepository,
			fx.As(new(domain.AuthRepository)),
		),
		func(repo domain.AuthRepository, appConfig *config.InternalAppConfig, m mailer.Mailer, cache redis.UniversalClient) domain.UseCase {
			secret := "sso-secret" // Default secret
			if appConfig.JwtSecret != "" {
				secret = appConfig.JwtSecret
			}
			return usecase.NewUseCase(repo, secret, m, cache)
		},
		http.NewAuthHandler,
	),


	fx.Invoke(registerRoutes),
)

func registerRoutes(h *http.AuthHandler, app *fiber.App) {
	h.RegisterRoutes(app)
}
