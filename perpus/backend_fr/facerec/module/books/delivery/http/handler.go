package http

import (
	"github.com/facerec/facerec-be/facerec/module/books/domain"
	"github.com/gofiber/fiber/v2"
)

type BookHandler struct {
	useCase domain.UseCase
}

func NewBookHandler(useCase domain.UseCase) *BookHandler {
	return &BookHandler{useCase: useCase}
}

func (h *BookHandler) RegisterRoutes(app *fiber.App) {
	api := app.Group("/api/books")
	api.Get("/", h.GetAll)
	api.Get("/barcode/:barcode", h.GetItemByBarcode)
	api.Get("/:id", h.GetByID)
	api.Post("/", h.Create)
	api.Put("/:id", h.Update)
	api.Delete("/:id", h.Delete)
	api.Post("/:id/copies", h.AddCopies)
	api.Put("/items/:itemId/barcode", h.UpdateItemBarcode)
	api.Post("/items/batch-renumber", h.BatchRenumberBarcodes)
	api.Post("/import-batch", h.ImportBatch)
	api.Post("/labels-print", h.GetLabelsForPrinting)
}
