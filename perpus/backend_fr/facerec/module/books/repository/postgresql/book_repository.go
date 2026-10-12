package postgresql

import (
	"context"
	"errors"

	"github.com/facerec/facerec-be/facerec/module/books/domain"
	"gorm.io/gorm"
)

type bookRepository struct {
	db *gorm.DB
}

func NewRepository(db *gorm.DB) domain.BookRepository {
	return &bookRepository{db: db}
}

func (r *bookRepository) FindAll(ctx context.Context, search string, category string) ([]*domain.Book, error) {
	var list []*domain.Book
	q := r.db.WithContext(ctx).Order("created_at DESC")

	if search != "" {
		like := "%" + search + "%"
		q = q.Where("title ILIKE ? OR author ILIKE ? OR isbn ILIKE ? OR call_number ILIKE ?", like, like, like, like)
	}
	if category != "" && category != "ALL" {
		q = q.Where("category = ?", category)
	}

	err := q.Find(&list).Error
	if err != nil {
		return nil, err
	}

	// Preload items count / actual available copies
	for _, b := range list {
		var availableCount int64
		var totalCount int64
		_ = r.db.WithContext(ctx).Model(&domain.BookItem{}).Where("book_id = ? AND status = 'AVAILABLE'", b.ID).Count(&availableCount).Error
		_ = r.db.WithContext(ctx).Model(&domain.BookItem{}).Where("book_id = ?", b.ID).Count(&totalCount).Error
		b.AvailableCopies = int(availableCount)
		b.TotalCopies = int(totalCount)

		var items []*domain.BookItem
		_ = r.db.WithContext(ctx).Where("book_id = ?", b.ID).Order("copy_number ASC").Find(&items).Error
		b.Items = items
	}

	return list, nil
}

func (r *bookRepository) FindByID(ctx context.Context, id string) (*domain.Book, error) {
	var b domain.Book
	err := r.db.WithContext(ctx).Where("id = ?", id).First(&b).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	// Preload items
	var items []*domain.BookItem
	_ = r.db.WithContext(ctx).Where("book_id = ?", b.ID).Order("copy_number ASC").Find(&items).Error
	b.Items = items

	var availableCount int64
	_ = r.db.WithContext(ctx).Model(&domain.BookItem{}).Where("book_id = ? AND status = 'AVAILABLE'", b.ID).Count(&availableCount).Error
	b.AvailableCopies = int(availableCount)
	b.TotalCopies = len(items)

	return &b, nil
}

func (r *bookRepository) FindByISBN(ctx context.Context, isbn string) (*domain.Book, error) {
	var b domain.Book
	err := r.db.WithContext(ctx).Where("isbn = ?", isbn).First(&b).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	return &b, err
}

func (r *bookRepository) Store(ctx context.Context, book *domain.Book) error {
	return r.db.WithContext(ctx).Create(book).Error
}

func (r *bookRepository) Update(ctx context.Context, book *domain.Book) error {
	return r.db.WithContext(ctx).Save(book).Error
}

func (r *bookRepository) Delete(ctx context.Context, id string) error {
	return r.db.WithContext(ctx).Delete(&domain.Book{}, "id = ?", id).Error
}

func (r *bookRepository) GetNextBookSequence(ctx context.Context) (int, error) {
	var count int64
	err := r.db.WithContext(ctx).Model(&domain.Book{}).Count(&count).Error
	return int(count) + 1, err
}

func (r *bookRepository) FindItemsByBookID(ctx context.Context, bookID string) ([]*domain.BookItem, error) {
	var items []*domain.BookItem
	err := r.db.WithContext(ctx).Where("book_id = ?", bookID).Order("copy_number ASC").Find(&items).Error
	return items, err
}

func (r *bookRepository) FindItemByBarcode(ctx context.Context, barcode string) (*domain.BookItem, error) {
	var item domain.BookItem
	err := r.db.WithContext(ctx).Where("barcode = ?", barcode).First(&item).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	var book domain.Book
	if err := r.db.WithContext(ctx).Select("title, author, call_number").Where("id = ?", item.BookID).First(&book).Error; err == nil {
		item.BookTitle = book.Title
		item.BookAuthor = book.Author
		item.CallNumber = book.CallNumber
	}

	return &item, nil
}

func (r *bookRepository) FindItemByID(ctx context.Context, id string) (*domain.BookItem, error) {
	var item domain.BookItem
	err := r.db.WithContext(ctx).Where("id = ?", id).First(&item).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	return &item, err
}

func (r *bookRepository) StoreItem(ctx context.Context, item *domain.BookItem) error {
	return r.db.WithContext(ctx).Create(item).Error
}

func (r *bookRepository) UpdateItem(ctx context.Context, item *domain.BookItem) error {
	return r.db.WithContext(ctx).Save(item).Error
}

func (r *bookRepository) DeleteItem(ctx context.Context, id string) error {
	return r.db.WithContext(ctx).Delete(&domain.BookItem{}, "id = ?", id).Error
}

func (r *bookRepository) FindItemsByBarcodes(ctx context.Context, barcodes []string) ([]*domain.BookItem, error) {
	var items []*domain.BookItem
	if len(barcodes) == 0 {
		return items, nil
	}
	err := r.db.WithContext(ctx).Where("barcode IN ?", barcodes).Find(&items).Error
	if err != nil {
		return nil, err
	}
	for _, it := range items {
		var book domain.Book
		if err := r.db.WithContext(ctx).Select("title, author, call_number").Where("id = ?", it.BookID).First(&book).Error; err == nil {
			it.BookTitle = book.Title
			it.BookAuthor = book.Author
			it.CallNumber = book.CallNumber
		}
	}
	return items, nil
}
