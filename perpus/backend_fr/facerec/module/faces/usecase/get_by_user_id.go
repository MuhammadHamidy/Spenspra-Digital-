package usecase

import (
	"context"
	"errors"

	"github.com/facerec/facerec-be/facerec/module/faces/domain"
)

func (u *faceUseCase) GetByUserID(ctx context.Context, userId string) (*domain.StudentFace, error) {
	face, err := u.repo.FindByUserID(ctx, userId)
	if err != nil {
		return nil, err
	}
	if face == nil {
		return nil, errors.New("data wajah siswa belum terdaftar")
	}
	return face, nil
}
