package usecase

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/facerec/facerec-be/facerec/module/books/domain"
	"github.com/google/uuid"
)

func (u *bookUseCase) Create(ctx context.Context, req domain.CreateBookRequest) (*domain.Book, error) {
	if strings.TrimSpace(req.Title) == "" {
		return nil, errors.New("judul buku wajib diisi")
	}
	if strings.TrimSpace(req.Author) == "" {
		return nil, errors.New("pengarang buku wajib diisi")
	}

	copies := req.TotalCopies
	if copies <= 0 {
		copies = 1
	}

	now := time.Now()
	bookID := uuid.NewString()
	seq, _ := u.repo.GetNextBookSequence(ctx)

	book := &domain.Book{
		ID:              bookID,
		ISBN:            req.ISBN,
		Title:           req.Title,
		Author:          req.Author,
		Publisher:       req.Publisher,
		PublishYear:     req.PublishYear,
		Category:        req.Category,
		CallNumber:      req.CallNumber,
		Description:     req.Description,
		CoverURL:        req.CoverURL,
		TotalCopies:     copies,
		AvailableCopies: copies,
		CreatedAt:       now,
		UpdatedAt:       now,
	}

	if err := u.repo.Store(ctx, book); err != nil {
		return nil, err
	}

	// Auto-generate eksemplar buku beserta barcode unik
	for i := 1; i <= copies; i++ {
		barcode := fmt.Sprintf("LIB-BK-%d-%04d-C%02d", now.Year(), seq, i)
		item := &domain.BookItem{
			ID:            uuid.NewString(),
			BookID:        bookID,
			Barcode:       barcode,
			CopyNumber:    i,
			Status:        "AVAILABLE",
			ItemCondition: "GOOD",
			CreatedAt:     now,
			UpdatedAt:     now,
		}
		_ = u.repo.StoreItem(ctx, item)
	}

	return u.repo.FindByID(ctx, bookID)
}

func (u *bookUseCase) Update(ctx context.Context, id string, req domain.CreateBookRequest) (*domain.Book, error) {
	b, err := u.repo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if b == nil {
		return nil, errors.New("buku tidak ditemukan")
	}

	if req.Title != "" {
		b.Title = req.Title
	}
	if req.Author != "" {
		b.Author = req.Author
	}
	if req.ISBN != "" {
		b.ISBN = req.ISBN
	}
	if req.Publisher != "" {
		b.Publisher = req.Publisher
	}
	if req.PublishYear > 0 {
		b.PublishYear = req.PublishYear
	}
	if req.Category != "" {
		b.Category = req.Category
	}
	if req.CallNumber != "" {
		b.CallNumber = req.CallNumber
	}
	if req.Description != "" {
		b.Description = req.Description
	}
	if req.CoverURL != "" {
		b.CoverURL = req.CoverURL
	}
	b.UpdatedAt = time.Now()

	if err := u.repo.Update(ctx, b); err != nil {
		return nil, err
	}

	return u.repo.FindByID(ctx, id)
}

func (u *bookUseCase) Delete(ctx context.Context, id string) error {
	return u.repo.Delete(ctx, id)
}

func (u *bookUseCase) AddCopies(ctx context.Context, bookID string, count int) ([]*domain.BookItem, error) {
	if count <= 0 {
		return nil, errors.New("jumlah eksemplar tambahan minimal 1")
	}

	b, err := u.repo.FindByID(ctx, bookID)
	if err != nil || b == nil {
		return nil, errors.New("buku tidak ditemukan")
	}

	existingItems, _ := u.repo.FindItemsByBookID(ctx, bookID)
	startCopy := len(existingItems) + 1
	now := time.Now()

	var addedItems []*domain.BookItem
	for i := 0; i < count; i++ {
		copyNum := startCopy + i
		barcode := fmt.Sprintf("LIB-BK-%d-%s-C%02d", now.Year(), b.ID[:8], copyNum)
		item := &domain.BookItem{
			ID:            uuid.NewString(),
			BookID:        bookID,
			Barcode:       barcode,
			CopyNumber:    copyNum,
			Status:        "AVAILABLE",
			ItemCondition: "GOOD",
			CreatedAt:     now,
			UpdatedAt:     now,
		}
		if err := u.repo.StoreItem(ctx, item); err == nil {
			addedItems = append(addedItems, item)
		}
	}

	return addedItems, nil
}
