package domain

import (
	"context"
	"time"
)

type Book struct {
	ID              string      `json:"id" gorm:"column:id;primaryKey"`
	ISBN            string      `json:"isbn" gorm:"column:isbn"`
	Title           string      `json:"title" gorm:"column:title"`
	Author          string      `json:"author" gorm:"column:author"`
	Publisher       string      `json:"publisher" gorm:"column:publisher"`
	PublishYear     int         `json:"publish_year" gorm:"column:publish_year"`
	Category        string      `json:"category" gorm:"column:category"`
	CallNumber      string      `json:"call_number" gorm:"column:call_number"`
	Description     string      `json:"description" gorm:"column:description"`
	CoverURL        string      `json:"cover_url" gorm:"column:cover_url"`
	TotalCopies     int         `json:"total_copies" gorm:"column:total_copies"`
	AvailableCopies int         `json:"available_copies" gorm:"column:available_copies"`
	Items           []*BookItem `json:"items,omitempty" gorm:"foreignKey:BookID"`
	CreatedAt       time.Time   `json:"created_at" gorm:"column:created_at"`
	UpdatedAt       time.Time   `json:"updated_at" gorm:"column:updated_at"`
}

func (Book) TableName() string {
	return "books"
}

type BookItem struct {
	ID            string    `json:"id" gorm:"column:id;primaryKey"`
	BookID        string    `json:"book_id" gorm:"column:book_id"`
	Barcode       string    `json:"barcode" gorm:"column:barcode;unique"`
	CopyNumber    int       `json:"copy_number" gorm:"column:copy_number"`
	Status        string    `json:"status" gorm:"column:status"`                 // AVAILABLE, BORROWED, MAINTENANCE, LOST
	ItemCondition string    `json:"item_condition" gorm:"column:item_condition"` // GOOD, FAIR, DAMAGED
	BookTitle     string    `json:"book_title,omitempty" gorm:"->"`
	BookAuthor    string    `json:"book_author,omitempty" gorm:"->"`
	CallNumber    string    `json:"call_number,omitempty" gorm:"->"`
	CreatedAt     time.Time `json:"created_at" gorm:"column:created_at"`
	UpdatedAt     time.Time `json:"updated_at" gorm:"column:updated_at"`
}

func (BookItem) TableName() string {
	return "book_items"
}

type CreateBookRequest struct {
	ISBN        string `json:"isbn"`
	Title       string `json:"title"`
	Author      string `json:"author"`
	Publisher   string `json:"publisher"`
	PublishYear int    `json:"publish_year"`
	Category    string `json:"category"`
	CallNumber  string `json:"call_number"`
	Description string `json:"description"`
	CoverURL    string `json:"cover_url"`
	TotalCopies int    `json:"total_copies"`
}

type ImportBookRow struct {
	ISBN        string `json:"isbn"`
	Title       string `json:"title"`
	Author      string `json:"author"`
	Publisher   string `json:"publisher"`
	PublishYear int    `json:"publish_year"`
	Category    string `json:"category"`
	CallNumber  string `json:"call_number"`
	Description string `json:"description"`
	CopiesCount int    `json:"copies_count"`
}

type ImportBatchRequest struct {
	Books []ImportBookRow `json:"books"`
}

type ImportResult struct {
	TotalProcessed int      `json:"total_processed"`
	TotalSuccess   int      `json:"total_success"`
	TotalFailed    int      `json:"total_failed"`
	Errors         []string `json:"errors,omitempty"`
}

type LabelPrintItem struct {
	Barcode    string `json:"barcode"`
	Title      string `json:"title"`
	Author     string `json:"author"`
	CallNumber string `json:"call_number"`
	CopyNumber int    `json:"copy_number"`
}

type UpdateBarcodeRequest struct {
	Barcode string `json:"barcode"`
}

type BatchRenumberItem struct {
	ItemID  string `json:"item_id"`
	Barcode string `json:"barcode"`
}

type BatchRenumberRequest struct {
	Items []BatchRenumberItem `json:"items"`
}

type BatchRenumberResult struct {
	TotalUpdated int `json:"total_updated"`
}

type BookRepository interface {
	FindAll(ctx context.Context, search string, category string) ([]*Book, error)
	FindByID(ctx context.Context, id string) (*Book, error)
	FindByISBN(ctx context.Context, isbn string) (*Book, error)
	Store(ctx context.Context, book *Book) error
	Update(ctx context.Context, book *Book) error
	Delete(ctx context.Context, id string) error
	GetNextBookSequence(ctx context.Context) (int, error)

	// Items (Eksemplar)
	FindItemsByBookID(ctx context.Context, bookID string) ([]*BookItem, error)
	FindItemByBarcode(ctx context.Context, barcode string) (*BookItem, error)
	FindItemByID(ctx context.Context, id string) (*BookItem, error)
	StoreItem(ctx context.Context, item *BookItem) error
	UpdateItem(ctx context.Context, item *BookItem) error
	DeleteItem(ctx context.Context, id string) error
	FindItemsByBarcodes(ctx context.Context, barcodes []string) ([]*BookItem, error)
}

type UseCase interface {
	GetAll(ctx context.Context, search string, category string) ([]*Book, error)
	GetByID(ctx context.Context, id string) (*Book, error)
	Create(ctx context.Context, req CreateBookRequest) (*Book, error)
	Update(ctx context.Context, id string, req CreateBookRequest) (*Book, error)
	Delete(ctx context.Context, id string) error
	AddCopies(ctx context.Context, bookID string, count int) ([]*BookItem, error)
	GetItemByBarcode(ctx context.Context, barcode string) (*BookItem, error)
	ImportBatch(ctx context.Context, req ImportBatchRequest) (*ImportResult, error)
	GetLabelsForPrinting(ctx context.Context, barcodes []string) ([]*LabelPrintItem, error)
	UpdateItemBarcode(ctx context.Context, itemID string, newBarcode string) (*BookItem, error)
	BatchRenumberBarcodes(ctx context.Context, req BatchRenumberRequest) (*BatchRenumberResult, error)
}

