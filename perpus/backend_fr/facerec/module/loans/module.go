package loans

import (
	"github.com/facerec/facerec-be/facerec/module/loans/delivery/http"
	"github.com/facerec/facerec-be/facerec/module/loans/repository/postgresql"
	"github.com/facerec/facerec-be/facerec/module/loans/usecase"
	gofiber "github.com/gofiber/fiber/v2"
	"go.uber.org/fx"
)

var Module = fx.Options(
	fx.Provide(
		postgresql.NewRepository,
		usecase.NewUseCase,
		http.NewLoanHandler,
	),
	fx.Invoke(registerRoutes),
)

func registerRoutes(h *http.LoanHandler, app *gofiber.App) {
	h.RegisterRoutes(app)
}
