package http

import (
	"github.com/facerec/facerec-be/facerec/module/library_members/domain"
	"github.com/gofiber/fiber/v2"
)

type MemberHandler struct {
	useCase domain.UseCase
}

func NewMemberHandler(useCase domain.UseCase) *MemberHandler {
	return &MemberHandler{useCase: useCase}
}

func (h *MemberHandler) RegisterRoutes(app *fiber.App) {
	api := app.Group("/api/members")
	api.Get("/", h.GetAll)
	api.Get("/code/:code", h.GetByCode)
	api.Get("/:id", h.GetByID)
	api.Post("/", h.Create)
	api.Post("/sync-sso", h.SyncFromSSO)
	api.Put("/:id", h.Update)
	api.Delete("/:id", h.Delete)
}
