package domain

import (
	"context"
	"time"
)

type Member struct {
	ID             string    `json:"id" gorm:"column:id;primaryKey"`
	UserID         *string   `json:"user_id,omitempty" gorm:"column:user_id"`
	PersonID       *string   `json:"person_id,omitempty" gorm:"column:person_id"`
	MemberCode     string    `json:"member_code" gorm:"column:member_code;unique"`
	FullName       string    `json:"full_name" gorm:"column:full_name"`
	IdentityNumber string    `json:"identity_number" gorm:"column:identity_number"`
	Email          string    `json:"email" gorm:"column:email"`
	Phone          string    `json:"phone" gorm:"column:phone"`
	Address        string    `json:"address" gorm:"column:address"`
	MaxBorrowLimit int       `json:"max_borrow_limit" gorm:"column:max_borrow_limit"`
	IsActive       bool      `json:"is_active" gorm:"column:is_active"`
	CreatedAt      time.Time `json:"created_at" gorm:"column:created_at"`
	UpdatedAt      time.Time `json:"updated_at" gorm:"column:updated_at"`
}

func (Member) TableName() string {
	return "library_members"
}

type CreateMemberRequest struct {
	FullName       string  `json:"full_name"`
	IdentityNumber string  `json:"identity_number"`
	Email          string  `json:"email"`
	Phone          string  `json:"phone"`
	Address        string  `json:"address"`
	MaxBorrowLimit int     `json:"max_borrow_limit"`
	UserID         *string `json:"user_id,omitempty"`
	PersonID       *string `json:"person_id,omitempty"`
}

type MemberRepository interface {
	FindAll(ctx context.Context, search string) ([]*Member, error)
	FindByID(ctx context.Context, id string) (*Member, error)
	FindByCode(ctx context.Context, code string) (*Member, error)
	FindByPersonID(ctx context.Context, personID string) (*Member, error)
	Store(ctx context.Context, member *Member) error
	Update(ctx context.Context, member *Member) error
	Delete(ctx context.Context, id string) error
	GetNextSequence(ctx context.Context) (int, error)
}

type UseCase interface {
	GetAll(ctx context.Context, search string) ([]*Member, error)
	GetByID(ctx context.Context, id string) (*Member, error)
	GetByCode(ctx context.Context, code string) (*Member, error)
	Create(ctx context.Context, req CreateMemberRequest) (*Member, error)
	Update(ctx context.Context, id string, req CreateMemberRequest) (*Member, error)
	Delete(ctx context.Context, id string) error
	SyncFromSSO(ctx context.Context) (int, error)
}
