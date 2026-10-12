package roles

import (
	gofiber "github.com/gofiber/fiber/v2"
	"go.uber.org/fx"
	"github.com/rapor/rapor-be/rapor/module/roles/delivery/http"
	"github.com/rapor/rapor-be/rapor/module/roles/domain"
	"github.com/rapor/rapor-be/rapor/module/roles/repository/postgresql"
	"github.com/rapor/rapor-be/rapor/module/roles/usecase"
)

// Module exports the roles module for Fx.
var Module = fx.Options(
	fx.Provide(
		fx.Annotate(
			postgresql.NewRepository,
			fx.As(new(domain.RoleRepository)),
		),
		fx.Annotate(
			usecase.NewUseCase,
			fx.As(new(domain.UseCase)),
		),
		http.NewRoleHandler,
	),
	fx.Invoke(registerRoutes),
)

func registerRoutes(h *http.RoleHandler, app *gofiber.App) {
	h.RegisterRoutes(app)
}
