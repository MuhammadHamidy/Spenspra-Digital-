package usecase

import (
	"context"
	"encoding/json"
	"errors"

	"github.com/facerec/facerec-be/facerec/module/faces/domain"
)

func (u *faceUseCase) RegisterFace(ctx context.Context, req domain.RegisterFaceRequest) (*domain.StudentFace, error) {
	if req.UserId == "" {
		return nil, errors.New("user_id wajib diisi")
	}

	vecJson, err := json.Marshal(req.FaceVector)
	if err != nil {
		return nil, errors.New("format face vector tidak valid")
	}

	face := &domain.StudentFace{
		UserId:     req.UserId,
		FullName:   req.FullName,
		Nim:        req.Nim,
		PhotoUrl:   req.PhotoUrl,
		FaceVector: string(vecJson),
	}

	if err := u.repo.Store(ctx, face); err != nil {
		return nil, err
	}

	return u.repo.FindByUserID(ctx, req.UserId)
}
