package domain

import (
	"context"
	"time"
)

type ReadingResume struct {
	ID             string    `json:"id" gorm:"column:id;primaryKey"`
	MemberID       string    `json:"member_id" gorm:"column:member_id"`
	BookID         string    `json:"book_id" gorm:"column:book_id"`
	LoanID         *string   `json:"loan_id,omitempty" gorm:"column:loan_id"`
	Title          string    `json:"title" gorm:"column:title"`
	Summary        string    `json:"summary" gorm:"column:summary"`
	KeyInsights    string    `json:"key_insights" gorm:"column:key_insights"`
	FavoriteQuotes string    `json:"favorite_quotes" gorm:"column:favorite_quotes"`
	Rating         int       `json:"rating" gorm:"column:rating"`
	Status         string    `json:"status" gorm:"column:status"`
	SubmittedAt    time.Time `json:"submitted_at" gorm:"column:submitted_at"`
	CreatedAt      time.Time `json:"created_at" gorm:"column:created_at"`
	UpdatedAt      time.Time `json:"updated_at" gorm:"column:updated_at"`

	// Enriched
	MemberName     string `json:"member_name,omitempty" gorm:"->"`
	MemberCode     string `json:"member_code,omitempty" gorm:"->"`
	BookTitle      string `json:"book_title,omitempty" gorm:"->"`
	BookAuthor     string `json:"book_author,omitempty" gorm:"->"`
	BookCategory   string `json:"book_category,omitempty" gorm:"->"`
	BookCoverURL   string `json:"book_cover_url,omitempty" gorm:"->"`
}

func (ReadingResume) TableName() string {
	return "reading_resumes"
}

type CreateResumeRequest struct {
	MemberID       string  `json:"member_id"`
	BookID         string  `json:"book_id"`
	LoanID         *string `json:"loan_id,omitempty"`
	Title          string  `json:"title"`
	Summary        string  `json:"summary"`
	KeyInsights    string  `json:"key_insights"`
	FavoriteQuotes string  `json:"favorite_quotes"`
	Rating         int     `json:"rating"`
}

type CategoryInsight struct {
	Category   string  `json:"category"`
	Count      int64   `json:"count"`
	Percentage float64 `json:"percentage"`
}

type ReaderLeaderboardItem struct {
	MemberID       string `json:"member_id"`
	MemberName     string `json:"member_name"`
	MemberCode     string `json:"member_code"`
	TotalResumes   int64  `json:"total_resumes"`
	TotalBooksRead int64  `json:"total_books_read"`
	Rank           int    `json:"rank"`
}

type ReadingAggregateInsights struct {
	TotalResumesSubmitted int64                    `json:"total_resumes_submitted"`
	AverageRating         float64                  `json:"average_rating"`
	TopCategories         []CategoryInsight        `json:"top_categories"`
	Leaderboard           []ReaderLeaderboardItem  `json:"leaderboard"`
}

type ResumeRepository interface {
	FindAll(ctx context.Context, memberID string, bookID string, search string) ([]*ReadingResume, error)
	FindByID(ctx context.Context, id string) (*ReadingResume, error)
	Store(ctx context.Context, r *ReadingResume) error
	Update(ctx context.Context, r *ReadingResume) error
	Delete(ctx context.Context, id string) error
	GetAggregateInsights(ctx context.Context) (*ReadingAggregateInsights, error)
}

type UseCase interface {
	GetAll(ctx context.Context, memberID string, bookID string, search string) ([]*ReadingResume, error)
	GetByID(ctx context.Context, id string) (*ReadingResume, error)
	Create(ctx context.Context, req CreateResumeRequest) (*ReadingResume, error)
	Update(ctx context.Context, id string, req CreateResumeRequest) (*ReadingResume, error)
	Delete(ctx context.Context, id string) error
	GetInsights(ctx context.Context) (*ReadingAggregateInsights, error)
}
