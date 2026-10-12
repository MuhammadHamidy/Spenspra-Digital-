package usecase

import (
	"github.com/facerec/facerec-be/facerec/libraries/ssoclient"
	bookDomain "github.com/facerec/facerec-be/facerec/module/books/domain"
	memberDomain "github.com/facerec/facerec-be/facerec/module/library_members/domain"
	"github.com/facerec/facerec-be/facerec/module/loans/domain"
	"gorm.io/gorm"
)

type loanUseCase struct {
	loanRepo   domain.LoanRepository
	memberRepo memberDomain.MemberRepository
	bookRepo   bookDomain.BookRepository
	db         *gorm.DB
	ssoClient  *ssoclient.Client
}

func NewUseCase(
	loanRepo domain.LoanRepository,
	memberRepo memberDomain.MemberRepository,
	bookRepo bookDomain.BookRepository,
	db *gorm.DB,
) domain.UseCase {
	return &loanUseCase{
		loanRepo:   loanRepo,
		memberRepo: memberRepo,
		bookRepo:   bookRepo,
		db:         db,
		ssoClient:  ssoclient.New(),
	}
}
