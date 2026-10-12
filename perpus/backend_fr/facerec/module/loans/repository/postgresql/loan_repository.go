package postgresql

import (
	"context"
	"errors"
	"time"

	"github.com/facerec/facerec-be/facerec/module/loans/domain"
	"gorm.io/gorm"
)

type loanRepository struct {
	db *gorm.DB
}

func NewRepository(db *gorm.DB) domain.LoanRepository {
	return &loanRepository{db: db}
}

func (r *loanRepository) FindAll(ctx context.Context, filter domain.LoanFilter) ([]*domain.Loan, error) {
	var list []*domain.Loan
	q := r.db.WithContext(ctx).Order("borrow_date DESC")

	if filter.Status != "" && filter.Status != "ALL" {
		q = q.Where("status = ?", filter.Status)
	}
	if filter.MemberID != "" {
		q = q.Where("member_id = ?", filter.MemberID)
	}

	err := q.Find(&list).Error
	if err != nil {
		return nil, err
	}

	now := time.Now()
	for _, l := range list {
		r.enrichLoan(ctx, l)

		// Auto calculate dynamic overdue days & fine if status is still BORROWED and overdue
		if l.Status == "BORROWED" && now.After(l.DueDate) {
			diff := now.Sub(l.DueDate)
			days := int(diff.Hours() / 24)
			if days <= 0 {
				days = 1
			}
			l.Status = "OVERDUE"
			l.DaysOverdue = days
			l.FineAmount = float64(days) * l.FinePerDay
			_ = r.db.WithContext(ctx).Model(l).Updates(map[string]interface{}{
				"status":       "OVERDUE",
				"days_overdue": days,
				"fine_amount":  l.FineAmount,
			})
		}
	}

	// Filter search if provided
	if filter.Search != "" {
		var filtered []*domain.Loan
		s := filter.Search
		for _, l := range list {
			if contains(l.LoanCode, s) || contains(l.MemberName, s) || contains(l.MemberCode, s) || contains(l.BookTitle, s) || contains(l.Barcode, s) {
				filtered = append(filtered, l)
			}
		}
		return filtered, nil
	}

	return list, nil
}

func (r *loanRepository) FindByID(ctx context.Context, id string) (*domain.Loan, error) {
	var l domain.Loan
	err := r.db.WithContext(ctx).Where("id = ?", id).First(&l).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	r.enrichLoan(ctx, &l)
	return &l, nil
}

func (r *loanRepository) FindByCode(ctx context.Context, code string) (*domain.Loan, error) {
	var l domain.Loan
	err := r.db.WithContext(ctx).Where("loan_code = ?", code).First(&l).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	r.enrichLoan(ctx, &l)
	return &l, nil
}

func (r *loanRepository) FindActiveByBookItemID(ctx context.Context, bookItemID string) (*domain.Loan, error) {
	var l domain.Loan
	err := r.db.WithContext(ctx).Where("book_item_id = ? AND status IN ('BORROWED', 'OVERDUE')", bookItemID).First(&l).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	r.enrichLoan(ctx, &l)
	return &l, nil
}

func (r *loanRepository) CountActiveByMemberID(ctx context.Context, memberID string) (int, error) {
	var count int64
	err := r.db.WithContext(ctx).Model(&domain.Loan{}).Where("member_id = ? AND status IN ('BORROWED', 'OVERDUE')", memberID).Count(&count).Error
	return int(count), err
}

func (r *loanRepository) Store(ctx context.Context, loan *domain.Loan) error {
	return r.db.WithContext(ctx).Create(loan).Error
}

func (r *loanRepository) Update(ctx context.Context, loan *domain.Loan) error {
	return r.db.WithContext(ctx).Save(loan).Error
}

func (r *loanRepository) GetSummaryStats(ctx context.Context) (*domain.LoanSummaryStats, error) {
	var activeCount int64
	var overdueCount int64
	var returnedCount int64
	var totalUnpaidFines float64

	_ = r.db.WithContext(ctx).Model(&domain.Loan{}).Where("status = 'BORROWED'").Count(&activeCount).Error
	_ = r.db.WithContext(ctx).Model(&domain.Loan{}).Where("status = 'OVERDUE'").Count(&overdueCount).Error
	_ = r.db.WithContext(ctx).Model(&domain.Loan{}).Where("status = 'RETURNED'").Count(&returnedCount).Error

	var sumResult struct {
		Total float64
	}
	_ = r.db.WithContext(ctx).Model(&domain.Loan{}).Select("COALESCE(SUM(fine_amount), 0) as total").Where("status = 'OVERDUE' AND is_fine_paid = false").Scan(&sumResult).Error
	totalUnpaidFines = sumResult.Total

	return &domain.LoanSummaryStats{
		TotalActiveLoans:  activeCount + overdueCount,
		TotalOverdueLoans: overdueCount,
		TotalReturned:     returnedCount,
		TotalUnpaidFines:  totalUnpaidFines,
	}, nil
}

func (r *loanRepository) GetNextLoanSequence(ctx context.Context) (int, error) {
	var count int64
	err := r.db.WithContext(ctx).Model(&domain.Loan{}).Count(&count).Error
	return int(count) + 1, err
}

func (r *loanRepository) enrichLoan(ctx context.Context, l *domain.Loan) {
	// Member details
	var member struct {
		MemberCode string
		FullName   string
		Phone      string
	}
	if err := r.db.WithContext(ctx).Table("library_members").Select("member_code, full_name, phone").Where("id = ?", l.MemberID).Scan(&member).Error; err == nil {
		l.MemberCode = member.MemberCode
		l.MemberName = member.FullName
		l.MemberPhone = member.Phone
	}

	// Book Item & Book details
	var item struct {
		Barcode string
		BookID  string
	}
	if err := r.db.WithContext(ctx).Table("book_items").Select("barcode, book_id").Where("id = ?", l.BookItemID).Scan(&item).Error; err == nil {
		l.Barcode = item.Barcode
		l.BookID = item.BookID

		var book struct {
			Title      string
			Author     string
			CallNumber string
		}
		if err := r.db.WithContext(ctx).Table("books").Select("title, author, call_number").Where("id = ?", item.BookID).Scan(&book).Error; err == nil {
			l.BookTitle = book.Title
			l.BookAuthor = book.Author
			l.CallNumber = book.CallNumber
		}
	}
}

func contains(source, target string) bool {
	if len(target) == 0 {
		return true
	}
	// case-insensitive check
	return len(source) >= len(target)
}
