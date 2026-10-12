package usecase

import (
	"github.com/facerec/facerec-be/facerec/module/reading_resumes/domain"
)

type resumeUseCase struct {
	repo domain.ResumeRepository
}

func NewUseCase(repo domain.ResumeRepository) domain.UseCase {
	return &resumeUseCase{repo: repo}
}
