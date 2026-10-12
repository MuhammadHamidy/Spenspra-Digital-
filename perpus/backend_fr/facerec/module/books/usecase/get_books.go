package usecase

import (
	"context"
	"errors"

	"github.com/facerec/facerec-be/facerec/module/books/domain"
)

func (u *bookUseCase) GetAll(ctx context.Context, search string, category string) ([]*domain.Book, error) {
	return u.repo.FindAll(ctx, search, category)
}

func (u *bookUseCase) GetByID(ctx context.Context, id string) (*domain.Book, error) {
	b, err := u.repo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if b == nil {
		return nil, errors.New("buku tidak ditemukan")
	}
	return b, nil
}

func (u *bookUseCase) GetItemByBarcode(ctx context.Context, barcode string) (*domain.BookItem, error) {
	item, err := u.repo.FindItemByBarcode(ctx, barcode)
	if err != nil {
		return nil, err
	}
	if item == nil {
		return nil, errors.New("eksemplar buku dengan barcode tersebut tidak ditemukan")
	}
	return item, nil
}
