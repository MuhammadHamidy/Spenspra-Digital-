package usecase

import (
	"github.com/facerec/facerec-be/facerec/libraries/ssoclient"
	"github.com/facerec/facerec-be/facerec/module/library_members/domain"
)

type memberUseCase struct {
	repo      domain.MemberRepository
	ssoClient *ssoclient.Client
}

func NewUseCase(repo domain.MemberRepository) domain.UseCase {
	return &memberUseCase{
		repo:      repo,
		ssoClient: ssoclient.New(),
	}
}
