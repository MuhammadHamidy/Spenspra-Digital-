package usecase

import (
	"github.com/facerec/facerec-be/facerec/module/books/domain"
)

type bookUseCase struct {
	repo domain.BookRepository
}

func NewUseCase(repo domain.BookRepository) domain.UseCase {
	return &bookUseCase{repo: repo}
}
