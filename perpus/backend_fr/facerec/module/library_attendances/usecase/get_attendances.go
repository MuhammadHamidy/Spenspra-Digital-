package usecase

import (
	"context"

	"github.com/facerec/facerec-be/facerec/module/library_attendances/domain"
)

func (u *attendanceUseCase) GetAll(ctx context.Context, search string, date string) ([]*domain.LibraryAttendance, error) {
	return u.attRepo.FindAll(ctx, search, date)
}

func (u *attendanceUseCase) GetStats(ctx context.Context) (*domain.AttendanceStats, error) {
	return u.attRepo.GetStats(ctx)
}
