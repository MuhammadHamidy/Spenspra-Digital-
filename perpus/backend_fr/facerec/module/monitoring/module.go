package monitoring

import (
	"github.com/facerec/facerec-be/facerec/module/monitoring/delivery/http"
	"github.com/facerec/facerec-be/facerec/module/monitoring/repository/postgresql"
	"github.com/facerec/facerec-be/facerec/module/monitoring/usecase"
	gofiber "github.com/gofiber/fiber/v2"
	"go.uber.org/fx"
)

var Module = fx.Options(
	fx.Provide(
		postgresql.NewRepository,
		usecase.NewUseCase,
		http.NewMonitoringHandler,
	),
	fx.Invoke(registerRoutes),
)

func registerRoutes(h *http.MonitoringHandler, app *gofiber.App) {
	h.RegisterRoutes(app)
}
