package usecase

import (
	"context"
	"errors"

	"github.com/facerec/facerec-be/facerec/module/loans/domain"
)

func (u *loanUseCase) GetAll(ctx context.Context, filter domain.LoanFilter) ([]*domain.Loan, error) {
	return u.loanRepo.FindAll(ctx, filter)
}

func (u *loanUseCase) GetByID(ctx context.Context, id string) (*domain.Loan, error) {
	l, err := u.loanRepo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if l == nil {
		return nil, errors.New("data peminjaman tidak ditemukan")
	}
	return l, nil
}

func (u *loanUseCase) GetSummaryStats(ctx context.Context) (*domain.LoanSummaryStats, error) {
	return u.loanRepo.GetSummaryStats(ctx)
}
