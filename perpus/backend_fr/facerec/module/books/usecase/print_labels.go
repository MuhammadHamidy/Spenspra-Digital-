package usecase

import (
	"context"

	"github.com/facerec/facerec-be/facerec/module/books/domain"
)

func (u *bookUseCase) GetLabelsForPrinting(ctx context.Context, barcodes []string) ([]*domain.LabelPrintItem, error) {
	items, err := u.repo.FindItemsByBarcodes(ctx, barcodes)
	if err != nil {
		return nil, err
	}

	var labels []*domain.LabelPrintItem
	for _, it := range items {
		labels = append(labels, &domain.LabelPrintItem{
			Barcode:    it.Barcode,
			Title:      it.BookTitle,
			Author:     it.BookAuthor,
			CallNumber: it.CallNumber,
			CopyNumber: it.CopyNumber,
		})
	}

	return labels, nil
}
