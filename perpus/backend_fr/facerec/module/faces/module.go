package faces

import (
	gofiber "github.com/gofiber/fiber/v2"
	"go.uber.org/fx"
	"github.com/facerec/facerec-be/facerec/module/faces/delivery/http"
	"github.com/facerec/facerec-be/facerec/module/faces/repository/postgresql"
	"github.com/facerec/facerec-be/facerec/module/faces/usecase"
)

var Module = fx.Options(
	fx.Provide(
		postgresql.NewRepository,
		usecase.NewUseCase,
		http.NewFaceHandler,
	),
	fx.Invoke(registerRoutes),
)

func registerRoutes(h *http.FaceHandler, app *gofiber.App) {
	h.RegisterRoutes(app)
}
