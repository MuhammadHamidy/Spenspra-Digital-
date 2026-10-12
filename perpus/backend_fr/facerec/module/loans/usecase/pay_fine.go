package usecase

import (
	"context"
	"errors"
	"time"
)

func (u *loanUseCase) PayFine(ctx context.Context, loanID string) error {
	loan, err := u.loanRepo.FindByID(ctx, loanID)
	if err != nil || loan == nil {
		return errors.New("data peminjaman tidak ditemukan")
	}
	loan.IsFinePaid = true
	loan.UpdatedAt = time.Now()
	return u.loanRepo.Update(ctx, loan)
}
