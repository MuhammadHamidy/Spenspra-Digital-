package usecase

import (
	"context"
	"errors"

	"github.com/facerec/facerec-be/facerec/module/reading_resumes/domain"
)

func (u *resumeUseCase) GetAll(ctx context.Context, memberID string, bookID string, search string) ([]*domain.ReadingResume, error) {
	return u.repo.FindAll(ctx, memberID, bookID, search)
}

func (u *resumeUseCase) GetByID(ctx context.Context, id string) (*domain.ReadingResume, error) {
	item, err := u.repo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if item == nil {
		return nil, errors.New("resume bacaan tidak ditemukan")
	}
	return item, nil
}

func (u *resumeUseCase) GetInsights(ctx context.Context) (*domain.ReadingAggregateInsights, error) {
	return u.repo.GetAggregateInsights(ctx)
}
