package school_people

import (
	"github.com/gofiber/fiber/v2"
	"github.com/sso/sso-be/sso/module/school_people/delivery/http"
	"github.com/sso/sso-be/sso/module/school_people/repository/postgresql"
	"github.com/sso/sso-be/sso/module/school_people/usecase"
	"go.uber.org/fx"
)

var Module = fx.Options(
	fx.Provide(postgresql.NewRepository, usecase.NewUseCase, http.NewHandler),
	fx.Invoke(registerRoutes),
)

func registerRoutes(h *http.Handler, app *fiber.App) { h.RegisterRoutes(app) }
