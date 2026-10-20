package elearning

import (
	gofiber "github.com/gofiber/fiber/v2"
	"github.com/rapor/rapor-be/rapor/module/elearning/delivery/http"
	"github.com/rapor/rapor-be/rapor/module/elearning/repository/postgresql"
	"github.com/rapor/rapor-be/rapor/module/elearning/usecase"
	"go.uber.org/fx"
)

var Module = fx.Options(
	fx.Provide(
		postgresql.NewRepository,
		usecase.NewUseCase,
		http.NewELearningHandler,
	),
	fx.Invoke(registerRoutes),
)

func registerRoutes(h *http.ELearningHandler, app *gofiber.App) {
	h.RegisterRoutes(app)
}
