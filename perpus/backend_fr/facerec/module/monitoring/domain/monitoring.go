package domain

import "context"

// LibrarySummary is the consolidated executive dashboard payload for Kepala Sekolah.
type LibrarySummary struct {
	// Loan metrics
	TotalActiveLoans  int64   `json:"total_active_loans"`
	TotalOverdueLoans int64   `json:"total_overdue_loans"`
	TotalReturnedAll  int64   `json:"total_returned_all"`
	TotalUnpaidFines  float64 `json:"total_unpaid_fines"`

	// Attendance metrics
	TodayVisitors  int64 `json:"today_visitors"`
	MemberVisitors int64 `json:"member_visitors"`
	GuestVisitors  int64 `json:"guest_visitors"`
	TotalAllVisits int64 `json:"total_all_visits"`

	// Collection & member metrics
	TotalBooks   int64 `json:"total_books"`
	TotalMembers int64 `json:"total_members"`

	// Top borrowed books (title + count)
	TopBorrowedBooks []BookStat `json:"top_borrowed_books"`

	// Monthly visit trend (last 6 months)
	MonthlyVisitTrend []MonthlyStat `json:"monthly_visit_trend"`
}

// BookStat represents a book's borrow count for ranking.
type BookStat struct {
	Title  string `json:"title"`
	Author string `json:"author"`
	Count  int64  `json:"count"`
}

// MonthlyStat represents visit/loan count for a given month.
type MonthlyStat struct {
	Month  string `json:"month"`  // e.g. "Sep 2026"
	Visits int64  `json:"visits"` // library_attendances
	Loans  int64  `json:"loans"`  // loans created
}

// Repository defines what the monitoring use-case needs from the database layer.
type Repository interface {
	GetLoanStats(ctx context.Context) (active, overdue, returned int64, unpaidFines float64, err error)
	GetAttendanceStats(ctx context.Context) (today, members, guests, total int64, err error)
	GetCollectionStats(ctx context.Context) (books, members int64, err error)
	GetTopBorrowedBooks(ctx context.Context, limit int) ([]BookStat, error)
	GetMonthlyTrend(ctx context.Context, months int) ([]MonthlyStat, error)
}

// UseCase defines the monitoring use-case interface.
type UseCase interface {
	GetSummary(ctx context.Context) (*LibrarySummary, error)
}
