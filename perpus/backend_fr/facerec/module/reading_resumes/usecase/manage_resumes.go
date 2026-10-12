package usecase

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/facerec/facerec-be/facerec/module/reading_resumes/domain"
	"github.com/google/uuid"
)

func (u *resumeUseCase) Create(ctx context.Context, req domain.CreateResumeRequest) (*domain.ReadingResume, error) {
	if strings.TrimSpace(req.MemberID) == "" {
		return nil, errors.New("anggota wajib dipilih")
	}
	if strings.TrimSpace(req.BookID) == "" {
		return nil, errors.New("buku wajib dipilih")
	}
	if strings.TrimSpace(req.Title) == "" {
		return nil, errors.New("judul resume bacaan wajib diisi")
	}
	if strings.TrimSpace(req.Summary) == "" {
		return nil, errors.New("ringkasan bacaan wajib diisi")
	}
	if strings.TrimSpace(req.KeyInsights) == "" {
		return nil, errors.New("poin pembelajaran / key insights wajib diisi")
	}

	rating := req.Rating
	if rating < 1 {
		rating = 1
	} else if rating > 5 {
		rating = 5
	}

	now := time.Now()
	res := &domain.ReadingResume{
		ID:             uuid.NewString(),
		MemberID:       req.MemberID,
		BookID:         req.BookID,
		LoanID:         req.LoanID,
		Title:          req.Title,
		Summary:        req.Summary,
		KeyInsights:    req.KeyInsights,
		FavoriteQuotes: req.FavoriteQuotes,
		Rating:         rating,
		Status:         "PUBLISHED",
		SubmittedAt:    now,
		CreatedAt:      now,
		UpdatedAt:      now,
	}

	if err := u.repo.Store(ctx, res); err != nil {
		return nil, err
	}

	return u.repo.FindByID(ctx, res.ID)
}

func (u *resumeUseCase) Update(ctx context.Context, id string, req domain.CreateResumeRequest) (*domain.ReadingResume, error) {
	item, err := u.repo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if item == nil {
		return nil, errors.New("resume bacaan tidak ditemukan")
	}

	if req.Title != "" {
		item.Title = req.Title
	}
	if req.Summary != "" {
		item.Summary = req.Summary
	}
	if req.KeyInsights != "" {
		item.KeyInsights = req.KeyInsights
	}
	if req.FavoriteQuotes != "" {
		item.FavoriteQuotes = req.FavoriteQuotes
	}
	if req.Rating >= 1 && req.Rating <= 5 {
		item.Rating = req.Rating
	}
	item.UpdatedAt = time.Now()

	if err := u.repo.Update(ctx, item); err != nil {
		return nil, err
	}

	return u.repo.FindByID(ctx, id)
}

func (u *resumeUseCase) Delete(ctx context.Context, id string) error {
	return u.repo.Delete(ctx, id)
}
