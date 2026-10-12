package usecase

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/facerec/facerec-be/facerec/module/books/domain"
)

func (u *bookUseCase) UpdateItemBarcode(ctx context.Context, itemID string, newBarcode string) (*domain.BookItem, error) {
	newBarcode = strings.TrimSpace(newBarcode)
	if newBarcode == "" {
		return nil, errors.New("kode barcode tidak boleh kosong")
	}

	// Check if barcode is already in use by another item
	existing, err := u.repo.FindItemByBarcode(ctx, newBarcode)
	if err == nil && existing != nil && existing.ID != itemID {
		return nil, fmt.Errorf("barcode \"%s\" sudah digunakan oleh buku lain", newBarcode)
	}

	item, err := u.repo.FindItemByID(ctx, itemID)
	if err != nil || item == nil {
		return nil, errors.New("eksemplar buku tidak ditemukan")
	}

	item.Barcode = newBarcode
	item.UpdatedAt = time.Now()
	if err := u.repo.UpdateItem(ctx, item); err != nil {
		return nil, err
	}

	return u.repo.FindItemByID(ctx, itemID)
}

func (u *bookUseCase) BatchRenumberBarcodes(ctx context.Context, req domain.BatchRenumberRequest) (*domain.BatchRenumberResult, error) {
	result := &domain.BatchRenumberResult{
		TotalUpdated: 0,
	}

	now := time.Now()
	for _, it := range req.Items {
		cleanBarcode := strings.TrimSpace(it.Barcode)
		if cleanBarcode == "" || it.ItemID == "" {
			continue
		}

		item, err := u.repo.FindItemByID(ctx, it.ItemID)
		if err != nil || item == nil {
			continue
		}

		item.Barcode = cleanBarcode
		item.UpdatedAt = now
		if err := u.repo.UpdateItem(ctx, item); err == nil {
			result.TotalUpdated++
		}
	}

	return result, nil
}
