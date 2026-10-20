package beranda

import (
	"github.com/facerec/facerec-be/facerec/module/beranda/delivery/http"
	"github.com/facerec/facerec-be/facerec/module/beranda/repository/postgresql"
	"github.com/facerec/facerec-be/facerec/module/beranda/usecase"
	gofiber "github.com/gofiber/fiber/v2"
	"go.uber.org/fx"
)

var Module = fx.Options(
	fx.Provide(
		postgresql.NewRepository,
		usecase.NewUseCase,
		http.NewBerandaHandler,
	),
	fx.Invoke(registerRoutes),
)

func registerRoutes(h *http.BerandaHandler, app *gofiber.App) {
	h.RegisterRoutes(app)
}
