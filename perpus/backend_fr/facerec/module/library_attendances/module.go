package library_attendances

import (
	"github.com/facerec/facerec-be/facerec/module/library_attendances/delivery/http"
	"github.com/facerec/facerec-be/facerec/module/library_attendances/repository/postgresql"
	"github.com/facerec/facerec-be/facerec/module/library_attendances/usecase"
	gofiber "github.com/gofiber/fiber/v2"
	"go.uber.org/fx"
)

var Module = fx.Options(
	fx.Provide(
		postgresql.NewRepository,
		usecase.NewUseCase,
		http.NewAttendanceHandler,
	),
	fx.Invoke(registerRoutes),
)

func registerRoutes(h *http.AttendanceHandler, app *gofiber.App) {
	h.RegisterRoutes(app)
}
