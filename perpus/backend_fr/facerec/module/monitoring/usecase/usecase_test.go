package usecase_test

import (
	"context"
	"testing"

	"github.com/facerec/facerec-be/facerec/module/monitoring/domain"
	"github.com/facerec/facerec-be/facerec/module/monitoring/usecase"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

type mockRepository struct {
	mock.Mock
}

func (m *mockRepository) GetLoanStats(ctx context.Context) (active, overdue, returned int64, unpaidFines float64, err error) {
	args := m.Called(ctx)
	return args.Get(0).(int64), args.Get(1).(int64), args.Get(2).(int64), args.Get(3).(float64), args.Error(4)
}

func (m *mockRepository) GetAttendanceStats(ctx context.Context) (today, members, guests, total int64, err error) {
	args := m.Called(ctx)
	return args.Get(0).(int64), args.Get(1).(int64), args.Get(2).(int64), args.Get(3).(int64), args.Error(4)
}

func (m *mockRepository) GetCollectionStats(ctx context.Context) (books, members int64, err error) {
	args := m.Called(ctx)
	return args.Get(0).(int64), args.Get(1).(int64), args.Error(2)
}

func (m *mockRepository) GetTopBorrowedBooks(ctx context.Context, limit int) ([]domain.BookStat, error) {
	args := m.Called(ctx, limit)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]domain.BookStat), args.Error(1)
}

func (m *mockRepository) GetMonthlyTrend(ctx context.Context, months int) ([]domain.MonthlyStat, error) {
	args := m.Called(ctx, months)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]domain.MonthlyStat), args.Error(1)
}

func TestGetSummary(t *testing.T) {
	repo := new(mockRepository)
	uc := usecase.NewUseCase(repo)
	ctx := context.Background()

	repo.On("GetLoanStats", ctx).Return(int64(15), int64(3), int64(45), float64(12000), nil).Once()
	repo.On("GetAttendanceStats", ctx).Return(int64(28), int64(22), int64(6), int64(350), nil).Once()
	repo.On("GetCollectionStats", ctx).Return(int64(120), int64(85), nil).Once()
	repo.On("GetTopBorrowedBooks", ctx, 5).Return([]domain.BookStat{
		{Title: "Clean Code", Author: "Robert C. Martin", Count: 14},
	}, nil).Once()
	repo.On("GetMonthlyTrend", ctx, 6).Return([]domain.MonthlyStat{
		{Month: "Sep 2026", Visits: 180, Loans: 25},
	}, nil).Once()

	summary, err := uc.GetSummary(ctx)
	assert.NoError(t, err)
	assert.NotNil(t, summary)
	assert.Equal(t, int64(15), summary.TotalActiveLoans)
	assert.Equal(t, int64(3), summary.TotalOverdueLoans)
	assert.Equal(t, int64(28), summary.TodayVisitors)
	assert.Equal(t, int64(120), summary.TotalBooks)
	assert.Equal(t, int64(85), summary.TotalMembers)
	assert.Equal(t, 1, len(summary.TopBorrowedBooks))
	assert.Equal(t, "Clean Code", summary.TopBorrowedBooks[0].Title)

	repo.AssertExpectations(t)
}
