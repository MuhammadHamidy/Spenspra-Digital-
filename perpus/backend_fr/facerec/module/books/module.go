package books

import (
	"github.com/facerec/facerec-be/facerec/module/books/delivery/http"
	"github.com/facerec/facerec-be/facerec/module/books/repository/postgresql"
	"github.com/facerec/facerec-be/facerec/module/books/usecase"
	gofiber "github.com/gofiber/fiber/v2"
	"go.uber.org/fx"
)

var Module = fx.Options(
	fx.Provide(
		postgresql.NewRepository,
		usecase.NewUseCase,
		http.NewBookHandler,
	),
	fx.Invoke(registerRoutes),
)

func registerRoutes(h *http.BookHandler, app *gofiber.App) {
	h.RegisterRoutes(app)
}
