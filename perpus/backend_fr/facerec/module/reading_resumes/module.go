package reading_resumes

import (
	"github.com/facerec/facerec-be/facerec/module/reading_resumes/delivery/http"
	"github.com/facerec/facerec-be/facerec/module/reading_resumes/repository/postgresql"
	"github.com/facerec/facerec-be/facerec/module/reading_resumes/usecase"
	gofiber "github.com/gofiber/fiber/v2"
	"go.uber.org/fx"
)

var Module = fx.Options(
	fx.Provide(
		postgresql.NewRepository,
		usecase.NewUseCase,
		http.NewResumeHandler,
	),
	fx.Invoke(registerRoutes),
)

func registerRoutes(h *http.ResumeHandler, app *gofiber.App) {
	h.RegisterRoutes(app)
}
