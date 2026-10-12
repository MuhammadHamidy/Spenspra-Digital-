package usecase

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/facerec/facerec-be/facerec/module/books/domain"
	"github.com/google/uuid"
)

func (u *bookUseCase) ImportBatch(ctx context.Context, req domain.ImportBatchRequest) (*domain.ImportResult, error) {
	res := &domain.ImportResult{
		TotalProcessed: len(req.Books),
	}

	now := time.Now()
	for i, row := range req.Books {
		if strings.TrimSpace(row.Title) == "" || strings.TrimSpace(row.Author) == "" {
			res.TotalFailed++
			res.Errors = append(res.Errors, fmt.Sprintf("Baris %d: Judul dan Pengarang wajib diisi", i+1))
			continue
		}

		copies := row.CopiesCount
		if copies <= 0 {
			copies = 1
		}

		seq, _ := u.repo.GetNextBookSequence(ctx)
		bookID := uuid.NewString()

		book := &domain.Book{
			ID:              bookID,
			ISBN:            row.ISBN,
			Title:           row.Title,
			Author:          row.Author,
			Publisher:       row.Publisher,
			PublishYear:     row.PublishYear,
			Category:        row.Category,
			CallNumber:      row.CallNumber,
			Description:     row.Description,
			CoverURL:        "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400",
			TotalCopies:     copies,
			AvailableCopies: copies,
			CreatedAt:       now,
			UpdatedAt:       now,
		}

		if err := u.repo.Store(ctx, book); err != nil {
			res.TotalFailed++
			res.Errors = append(res.Errors, fmt.Sprintf("Baris %d (%s): Gagal menyimpan buku - %v", i+1, row.Title, err))
			continue
		}

		// Generate auto barcodes
		for c := 1; c <= copies; c++ {
			barcode := fmt.Sprintf("LIB-BK-%d-%04d-C%02d", now.Year(), seq, c)
			item := &domain.BookItem{
				ID:            uuid.NewString(),
				BookID:        bookID,
				Barcode:       barcode,
				CopyNumber:    c,
				Status:        "AVAILABLE",
				ItemCondition: "GOOD",
				CreatedAt:     now,
				UpdatedAt:     now,
			}
			_ = u.repo.StoreItem(ctx, item)
		}

		res.TotalSuccess++
	}

	return res, nil
}
