package users

import (
	gofiber "github.com/gofiber/fiber/v2"
	"go.uber.org/fx"
	"github.com/sso/sso-be/sso/module/users/delivery/http"
	"github.com/sso/sso-be/sso/module/users/domain"
	"github.com/sso/sso-be/sso/module/users/repository/postgresql"
	"github.com/sso/sso-be/sso/module/users/usecase"
)

// Module exports the users module for Fx.
var Module = fx.Options(
	fx.Provide(
		fx.Annotate(
			postgresql.NewRepository,
			fx.As(new(domain.UserRepository)),
		),
		fx.Annotate(
			usecase.NewUseCase,
			fx.As(new(domain.UseCase)),
		),
		http.NewUserHandler,
	),
	fx.Invoke(registerRoutes),
)

func registerRoutes(h *http.UserHandler, app *gofiber.App) {
	h.RegisterRoutes(app)
}
