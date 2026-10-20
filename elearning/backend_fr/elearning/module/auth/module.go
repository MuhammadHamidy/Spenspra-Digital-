package auth

import (
	"github.com/rapor/rapor-be/rapor/config"
	"github.com/rapor/rapor-be/rapor/module/auth/delivery/http"
	"github.com/rapor/rapor-be/rapor/module/auth/domain"
	"github.com/rapor/rapor-be/rapor/module/auth/mailer"
	"github.com/rapor/rapor-be/rapor/module/auth/repository/postgresql"
	"github.com/rapor/rapor-be/rapor/module/auth/usecase"
	"github.com/gofiber/fiber/v2"
	"go.uber.org/fx"
)

var Module = fx.Options(
	fx.Provide(
		mailer.NewMailer,
		fx.Annotate(
			postgresql.NewRepository,
			fx.As(new(domain.AuthRepository)),
		),
		func(repo domain.AuthRepository, appConfig *config.InternalAppConfig, m mailer.Mailer) domain.UseCase {
			secret := "rapor-secret" // Default secret
			if appConfig.JwtSecret != "" {
				secret = appConfig.JwtSecret
			}
			return usecase.NewUseCase(repo, secret, m)
		},
		http.NewAuthHandler,
	),


	fx.Invoke(registerRoutes),
)

func registerRoutes(h *http.AuthHandler, app *fiber.App) {
	h.RegisterRoutes(app)
}
