package library_members

import (
	"github.com/facerec/facerec-be/facerec/module/library_members/delivery/http"
	"github.com/facerec/facerec-be/facerec/module/library_members/repository/postgresql"
	"github.com/facerec/facerec-be/facerec/module/library_members/usecase"
	gofiber "github.com/gofiber/fiber/v2"
	"go.uber.org/fx"
)

var Module = fx.Options(
	fx.Provide(
		postgresql.NewRepository,
		usecase.NewUseCase,
		http.NewMemberHandler,
	),
	fx.Invoke(registerRoutes),
)

func registerRoutes(h *http.MemberHandler, app *gofiber.App) {
	h.RegisterRoutes(app)
}
