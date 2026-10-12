package domain

import (
	"context"
	"time"
)

type Person struct {
	ID            string    `json:"id" gorm:"primaryKey"`
	PersonType    string    `json:"person_type" gorm:"not null"`
	FullName      string    `json:"full_name" gorm:"not null"`
	NISN          string    `json:"nisn" gorm:"column:nisn"`
	NIP           string    `json:"nip" gorm:"column:nip"`
	Email         string    `json:"email"`
	Phone         string    `json:"phone"`
	ClassName     string    `json:"class_name"`
	Position      string    `json:"position"`
	BarcodeToken  string    `json:"barcode_token" gorm:"not null"`
	BarcodeStatus string    `json:"barcode_status" gorm:"not null"`
	IsActive      bool      `json:"is_active"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

func (Person) TableName() string { return "school_people" }

type CreatePersonRequest struct {
	PersonType string `json:"person_type"`
	FullName   string `json:"full_name"`
	NISN       string `json:"nisn"`
	NIP        string `json:"nip"`
	Email      string `json:"email"`
	Phone      string `json:"phone"`
	ClassName  string `json:"class_name"`
	Position   string `json:"position"`
}

type UpdatePersonRequest struct {
	PersonType string `json:"person_type"`
	FullName   string `json:"full_name"`
	NISN       string `json:"nisn"`
	NIP        string `json:"nip"`
	Email      string `json:"email"`
	Phone      string `json:"phone"`
	ClassName  string `json:"class_name"`
	Position   string `json:"position"`
	IsActive   *bool  `json:"is_active"`
}

type Repository interface {
	FindAll(ctx context.Context, personType string) ([]*Person, error)
	FindByID(ctx context.Context, id string) (*Person, error)
	FindByBarcode(ctx context.Context, token string) (*Person, error)
	Create(ctx context.Context, person *Person) error
	Update(ctx context.Context, id string, req UpdatePersonRequest) (*Person, error)
	RevokeBarcode(ctx context.Context, id string) error
	Delete(ctx context.Context, id string) error
}

type UseCase interface {
	FindAll(ctx context.Context, personType string) ([]*Person, error)
	FindByID(ctx context.Context, id string) (*Person, error)
	ResolveBarcode(ctx context.Context, token string) (*Person, error)
	Create(ctx context.Context, req CreatePersonRequest) (*Person, error)
	Update(ctx context.Context, id string, req UpdatePersonRequest) (*Person, error)
	RevokeBarcode(ctx context.Context, id string) error
	Delete(ctx context.Context, id string) error
}
