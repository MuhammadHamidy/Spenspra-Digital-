package usecase

import (
	"github.com/facerec/facerec-be/facerec/module/faces/domain"
)

type faceUseCase struct {
	repo domain.FaceRepository
}

func NewUseCase(repo domain.FaceRepository) domain.UseCase {
	return &faceUseCase{repo: repo}
}
