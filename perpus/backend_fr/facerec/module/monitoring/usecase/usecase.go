package usecase

import (
	"context"

	"github.com/facerec/facerec-be/facerec/module/monitoring/domain"
)

type monitoringUseCase struct {
	repo domain.Repository
}

func NewUseCase(repo domain.Repository) domain.UseCase {
	return &monitoringUseCase{repo: repo}
}

func (u *monitoringUseCase) GetSummary(ctx context.Context) (*domain.LibrarySummary, error) {
	active, overdue, returned, unpaidFines, _ := u.repo.GetLoanStats(ctx)
	today, members, guests, total, _ := u.repo.GetAttendanceStats(ctx)
	books, memberCount, _ := u.repo.GetCollectionStats(ctx)
	topBooks, _ := u.repo.GetTopBorrowedBooks(ctx, 5)
	trend, _ := u.repo.GetMonthlyTrend(ctx, 6)

	return &domain.LibrarySummary{
		TotalActiveLoans:  active,
		TotalOverdueLoans: overdue,
		TotalReturnedAll:  returned,
		TotalUnpaidFines:  unpaidFines,

		TodayVisitors:  today,
		MemberVisitors: members,
		GuestVisitors:  guests,
		TotalAllVisits: total,

		TotalBooks:   books,
		TotalMembers: memberCount,

		TopBorrowedBooks:  topBooks,
		MonthlyVisitTrend: trend,
	}, nil
}
