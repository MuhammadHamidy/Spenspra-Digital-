package usecase

import (
	faceDomain "github.com/facerec/facerec-be/facerec/module/faces/domain"
	memberDomain "github.com/facerec/facerec-be/facerec/module/library_members/domain"
	"github.com/facerec/facerec-be/facerec/module/library_attendances/domain"
	"github.com/facerec/facerec-be/facerec/libraries/ssoclient"
	"gorm.io/gorm"
)

type attendanceUseCase struct {
	attRepo    domain.AttendanceRepository
	memberRepo memberDomain.MemberRepository
	faceUC     faceDomain.UseCase
	db         *gorm.DB
	ssoClient  *ssoclient.Client
}

func NewUseCase(
	attRepo domain.AttendanceRepository,
	memberRepo memberDomain.MemberRepository,
	faceUC faceDomain.UseCase,
	db *gorm.DB,
) domain.UseCase {
	return &attendanceUseCase{
		attRepo:    attRepo,
		memberRepo: memberRepo,
		faceUC:     faceUC,
		db:         db,
		ssoClient:  ssoclient.New(),
	}
}
