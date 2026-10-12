package postgresql

import (
	"context"
	"fmt"
	"time"

	"github.com/facerec/facerec-be/facerec/module/monitoring/domain"
	"gorm.io/gorm"
)

type monitoringRepository struct {
	db *gorm.DB
}

func NewRepository(db *gorm.DB) domain.Repository {
	return &monitoringRepository{db: db}
}

func (r *monitoringRepository) GetLoanStats(ctx context.Context) (active, overdue, returned int64, unpaidFines float64, err error) {
	r.db.WithContext(ctx).Table("loans").Where("status IN ?", []string{"BORROWED", "OVERDUE"}).Count(&active)
	r.db.WithContext(ctx).Table("loans").Where("status = ?", "OVERDUE").Count(&overdue)
	r.db.WithContext(ctx).Table("loans").Where("status = ?", "RETURNED").Count(&returned)
	r.db.WithContext(ctx).Table("loans").
		Where("is_fine_paid = ? AND fine_amount > ?", false, 0).
		Select("COALESCE(SUM(fine_amount), 0)").
		Scan(&unpaidFines)
	return
}

func (r *monitoringRepository) GetAttendanceStats(ctx context.Context) (today, members, guests, total int64, err error) {
	now := time.Now()
	today24h := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	r.db.WithContext(ctx).Table("library_attendances").Where("visited_at >= ?", today24h).Count(&today)
	r.db.WithContext(ctx).Table("library_attendances").Where("visitor_type = ?", "MEMBER").Count(&members)
	r.db.WithContext(ctx).Table("library_attendances").Where("visitor_type = ?", "GUEST").Count(&guests)
	r.db.WithContext(ctx).Table("library_attendances").Count(&total)
	return
}

func (r *monitoringRepository) GetCollectionStats(ctx context.Context) (books, members int64, err error) {
	r.db.WithContext(ctx).Table("books").Count(&books)
	r.db.WithContext(ctx).Table("library_members").Where("is_active = ?", true).Count(&members)
	return
}

func (r *monitoringRepository) GetTopBorrowedBooks(ctx context.Context, limit int) ([]domain.BookStat, error) {
	type row struct {
		Title  string
		Author string
		Count  int64
	}
	var rows []row
	err := r.db.WithContext(ctx).
		Table("loans l").
		Select("b.title, b.author, COUNT(l.id) as count").
		Joins("JOIN book_items bi ON bi.id = l.book_item_id").
		Joins("JOIN books b ON b.id = bi.book_id").
		Group("b.id, b.title, b.author").
		Order("count DESC").
		Limit(limit).
		Scan(&rows).Error
	if err != nil {
		return nil, err
	}
	stats := make([]domain.BookStat, len(rows))
	for i, row := range rows {
		stats[i] = domain.BookStat{Title: row.Title, Author: row.Author, Count: row.Count}
	}
	return stats, nil
}

func (r *monitoringRepository) GetMonthlyTrend(ctx context.Context, months int) ([]domain.MonthlyStat, error) {
	type visitRow struct {
		YM    string
		Count int64
	}
	type loanRow struct {
		YM    string
		Count int64
	}

	var visits []visitRow
	var loans []loanRow

	r.db.WithContext(ctx).
		Table("library_attendances").
		Select("TO_CHAR(visited_at, 'Mon YYYY') as ym, COUNT(*) as count").
		Where("visited_at >= NOW() - INTERVAL '6 months'").
		Group("TO_CHAR(visited_at, 'Mon YYYY'), DATE_TRUNC('month', visited_at)").
		Order("DATE_TRUNC('month', visited_at)").
		Scan(&visits)

	r.db.WithContext(ctx).
		Table("loans").
		Select("TO_CHAR(borrow_date, 'Mon YYYY') as ym, COUNT(*) as count").
		Where("borrow_date >= NOW() - INTERVAL '6 months'").
		Group("TO_CHAR(borrow_date, 'Mon YYYY'), DATE_TRUNC('month', borrow_date)").
		Order("DATE_TRUNC('month', borrow_date)").
		Scan(&loans)

	// Build month labels for last N months
	now := time.Now()
	statMap := make(map[string]*domain.MonthlyStat)
	result := make([]domain.MonthlyStat, months)
	for i := months - 1; i >= 0; i-- {
		m := now.AddDate(0, -i, 0)
		label := fmt.Sprintf("%s %d", m.Month().String()[:3], m.Year())
		result[months-1-i] = domain.MonthlyStat{Month: label}
		statMap[label] = &result[months-1-i]
	}
	for _, v := range visits {
		if s, ok := statMap[v.YM]; ok {
			s.Visits = v.Count
		}
	}
	for _, l := range loans {
		if s, ok := statMap[l.YM]; ok {
			s.Loans = l.Count
		}
	}
	return result, nil
}
