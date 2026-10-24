package usecase_test

import (
	"context"
	"testing"

	"github.com/rapor/rapor-be/rapor/module/grades/domain"
	"github.com/rapor/rapor-be/rapor/module/grades/usecase"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

type mockRepository struct {
	mock.Mock
}

func (m *mockRepository) FindAll(ctx context.Context, f domain.GradeFilter) ([]*domain.StudentGrade, error) {
	args := m.Called(ctx, f)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*domain.StudentGrade), args.Error(1)
}

func (m *mockRepository) Upsert(ctx context.Context, grades []*domain.StudentGrade) error {
	args := m.Called(ctx, grades)
	return args.Error(0)
}

func (m *mockRepository) GetSummary(ctx context.Context, kkm float64) (*domain.AcademicSummary, error) {
	args := m.Called(ctx, kkm)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.AcademicSummary), args.Error(1)
}

func (m *mockRepository) GetDeadlines(ctx context.Context) ([]*domain.GradeDeadline, error) {
	args := m.Called(ctx)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*domain.GradeDeadline), args.Error(1)
}

func (m *mockRepository) SaveDeadline(ctx context.Context, dl *domain.GradeDeadline) error {
	args := m.Called(ctx, dl)
	return args.Error(0)
}

func (m *mockRepository) GetLock(ctx context.Context, className, subjectCode, assessmentType, academicYear, semester string) (*domain.GradeLock, error) {
	return nil, nil
}
func (m *mockRepository) SetLock(ctx context.Context, lock *domain.GradeLock) error {
	return nil
}
func (m *mockRepository) ListLocks(ctx context.Context, className, academicYear, semester string) ([]*domain.GradeLock, error) {
	return nil, nil
}
func (m *mockRepository) CreateChangeLogs(ctx context.Context, logs []*domain.GradeChangeLog) error {
	return nil
}
func (m *mockRepository) GetChangeLogs(ctx context.Context, f domain.GradeChangeLogFilter) ([]*domain.GradeChangeLog, error) {
	return nil, nil
}
func (m *mockRepository) GetEndorsements(ctx context.Context, academicYear, semester string) ([]*domain.ReportEndorsement, error) {
	return nil, nil
}
func (m *mockRepository) SaveEndorsement(ctx context.Context, endorsement *domain.ReportEndorsement) error {
	return nil
}
func (m *mockRepository) ExportBackup(ctx context.Context) (*domain.BackupData, error) {
	return nil, nil
}
func (m *mockRepository) RestoreBackup(ctx context.Context, data *domain.BackupData) error {
	return nil
}
func (m *mockRepository) DeleteGrades(ctx context.Context, f domain.GradeFilter, all bool) (int64, error) {
	return 0, nil
}
func (m *mockRepository) DeleteByIDs(ctx context.Context, ids []string) error {
	return nil
}

func TestPredicateCalculation(t *testing.T) {
	assert.Equal(t, "A", usecase.Predicate(95.0))
	assert.Equal(t, "A", usecase.Predicate(86.0))
	assert.Equal(t, "B", usecase.Predicate(85.9))
	assert.Equal(t, "B", usecase.Predicate(76.0))
	assert.Equal(t, "C", usecase.Predicate(75.9))
	assert.Equal(t, "C", usecase.Predicate(66.0))
	assert.Equal(t, "D", usecase.Predicate(65.9))
	assert.Equal(t, "D", usecase.Predicate(0.0))
}

func TestSaveBulkValidation(t *testing.T) {
	repo := new(mockRepository)
	uc := usecase.NewUseCase(repo)
	ctx := context.Background()

	// 1. Missing ClassName
	_, err := uc.SaveBulk(ctx, domain.BulkGradeRequest{
		SubjectCode: "MTK",
	}, "")
	assert.Error(t, err)

	// 2. Score out of range (> 100)
	scoreHigh := 105.0
	repo.On("FindAll", ctx, mock.Anything).Return([]*domain.StudentGrade{}, nil)
	_, err = uc.SaveBulk(ctx, domain.BulkGradeRequest{
		ClassName:   "7A",
		SubjectCode: "MTK",
		Grades: []domain.GradeInput{
			{StudentID: "stu-1", StudentName: "Andi", Score: &scoreHigh},
		},
	}, "")
	assert.Error(t, err)

	// 3. Valid grades saved
	scoreValid := 88.0
	repo.On("Upsert", ctx, mock.Anything).Return(nil).Once()
	count, err := uc.SaveBulk(ctx, domain.BulkGradeRequest{
		ClassName:   "7A",
		SubjectCode: "MTK",
		Grades: []domain.GradeInput{
			{StudentID: "stu-1", StudentName: "Andi", Score: &scoreValid},
			{StudentID: "stu-2", StudentName: "Budi", Score: nil}, // nil score should be skipped
		},
	}, "")
	assert.NoError(t, err)
	assert.Equal(t, 1, count)
}

func TestGetSummary(t *testing.T) {
	repo := new(mockRepository)
	uc := usecase.NewUseCase(repo)
	ctx := context.Background()

	expectedSummary := &domain.AcademicSummary{
		KKM:          75.0,
		AverageScore: 84.5,
		TotalGrades:  25,
	}

	repo.On("GetSummary", ctx, 75.0).Return(expectedSummary, nil).Once()

	res, err := uc.GetSummary(ctx)
	assert.NoError(t, err)
	assert.Equal(t, 84.5, res.AverageScore)
	assert.Equal(t, int64(25), res.TotalGrades)
	repo.AssertExpectations(t)
}
