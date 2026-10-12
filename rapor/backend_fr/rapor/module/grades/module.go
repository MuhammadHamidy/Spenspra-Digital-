package grades

import (
	gofiber "github.com/gofiber/fiber/v2"
	"github.com/rapor/rapor-be/rapor/module/grades/delivery/http"
	"github.com/rapor/rapor-be/rapor/module/grades/repository/postgresql"
	"github.com/rapor/rapor-be/rapor/module/grades/usecase"
	"go.uber.org/fx"
)

var Module = fx.Options(
	fx.Provide(
		postgresql.NewRepository,
		usecase.NewUseCase,
		http.NewGradeHandler,
	),
	fx.Invoke(registerRoutes),
)

func registerRoutes(h *http.GradeHandler, app *gofiber.App) {
	h.RegisterRoutes(app)
}
