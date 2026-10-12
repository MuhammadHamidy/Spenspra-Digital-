package domain

import (
	"context"
	"time"
)

type Loan struct {
	ID          string     `json:"id" gorm:"column:id;primaryKey"`
	LoanCode    string     `json:"loan_code" gorm:"column:loan_code;unique"`
	MemberID    string     `json:"member_id" gorm:"column:member_id"`
	BookItemID  string     `json:"book_item_id" gorm:"column:book_item_id"`
	BorrowDate  time.Time  `json:"borrow_date" gorm:"column:borrow_date"`
	DueDate     time.Time  `json:"due_date" gorm:"column:due_date"`
	ReturnDate  *time.Time `json:"return_date,omitempty" gorm:"column:return_date"`
	Status      string     `json:"status" gorm:"column:status"` // BORROWED, RETURNED, OVERDUE, LOST
	FinePerDay  float64    `json:"fine_per_day" gorm:"column:fine_per_day"`
	DaysOverdue int        `json:"days_overdue" gorm:"column:days_overdue"`
	FineAmount  float64    `json:"fine_amount" gorm:"column:fine_amount"`
	IsFinePaid  bool       `json:"is_fine_paid" gorm:"column:is_fine_paid"`
	Notes       string     `json:"notes" gorm:"column:notes"`

	// Enriched fields
	MemberCode     string `json:"member_code,omitempty" gorm:"->"`
	MemberName     string `json:"member_name,omitempty" gorm:"->"`
	MemberPhone    string `json:"member_phone,omitempty" gorm:"->"`
	Barcode        string `json:"barcode,omitempty" gorm:"->"`
	BookTitle      string `json:"book_title,omitempty" gorm:"->"`
	BookAuthor     string `json:"book_author,omitempty" gorm:"->"`
	CallNumber     string `json:"call_number,omitempty" gorm:"->"`
	BookID         string `json:"book_id,omitempty" gorm:"->"`

	CreatedAt time.Time `json:"created_at" gorm:"column:created_at"`
	UpdatedAt time.Time `json:"updated_at" gorm:"column:updated_at"`
}

func (Loan) TableName() string {
	return "loans"
}

type BorrowRequest struct {
	MemberBarcode string `json:"member_barcode"` // MemberCode (e.g. MBR-2026-0001)
	BookBarcode   string `json:"book_barcode"`   // BookItem Barcode (e.g. LIB-BK-2026-0001-C01)
	DurationDays  int    `json:"duration_days"`  // Default 7 days
	Notes         string `json:"notes"`
}

type ReturnRequest struct {
	BookBarcode   string `json:"book_barcode"`
	ItemCondition string `json:"item_condition"` // GOOD, FAIR, DAMAGED
	Notes         string `json:"notes"`
}

type LoanFilter struct {
	Status   string
	MemberID string
	Search   string
}

type LoanSummaryStats struct {
	TotalActiveLoans  int64   `json:"total_active_loans"`
	TotalOverdueLoans int64   `json:"total_overdue_loans"`
	TotalReturned     int64   `json:"total_returned"`
	TotalUnpaidFines  float64 `json:"total_unpaid_fines"`
}

type LoanRepository interface {
	FindAll(ctx context.Context, filter LoanFilter) ([]*Loan, error)
	FindByID(ctx context.Context, id string) (*Loan, error)
	FindByCode(ctx context.Context, code string) (*Loan, error)
	FindActiveByBookItemID(ctx context.Context, bookItemID string) (*Loan, error)
	CountActiveByMemberID(ctx context.Context, memberID string) (int, error)
	Store(ctx context.Context, loan *Loan) error
	Update(ctx context.Context, loan *Loan) error
	GetSummaryStats(ctx context.Context) (*LoanSummaryStats, error)
	GetNextLoanSequence(ctx context.Context) (int, error)
}

type UseCase interface {
	Borrow(ctx context.Context, req BorrowRequest) (*Loan, error)
	Return(ctx context.Context, req ReturnRequest) (*Loan, error)
	GetAll(ctx context.Context, filter LoanFilter) ([]*Loan, error)
	GetByID(ctx context.Context, id string) (*Loan, error)
	GetSummaryStats(ctx context.Context) (*LoanSummaryStats, error)
	PayFine(ctx context.Context, loanID string) error
}
