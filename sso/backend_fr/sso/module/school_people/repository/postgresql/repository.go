package postgresql

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/sso/sso-be/sso/module/school_people/domain"
	"gorm.io/gorm"
)

type Repository struct{ db *gorm.DB }

func NewRepository(db *gorm.DB) domain.Repository { return &Repository{db: db} }

func (r *Repository) FindAll(ctx context.Context, personType string) ([]*domain.Person, error) {
	var people []*domain.Person
	query := r.db.WithContext(ctx).Order("full_name ASC")
	if personType != "" {
		query = query.Where("person_type = ?", personType)
	}
	return people, query.Find(&people).Error
}

func (r *Repository) FindByID(ctx context.Context, id string) (*domain.Person, error) {
	var person domain.Person
	err := r.db.WithContext(ctx).Where("id = ?", id).First(&person).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	return &person, err
}

func (r *Repository) FindByBarcode(ctx context.Context, token string) (*domain.Person, error) {
	var person domain.Person
	cleanToken := strings.TrimSpace(token)
	err := r.db.WithContext(ctx).
		Where("(barcode_token = ? OR nisn = ? OR nip = ? OR id = ?) AND barcode_status = ? AND is_active = ?",
			cleanToken, cleanToken, cleanToken, cleanToken, "ACTIVE", true).
		First(&person).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	return &person, err
}

func (r *Repository) Create(ctx context.Context, person *domain.Person) error {
	if person.ID == "" {
		person.ID = uuid.New().String()
	}
	return r.db.WithContext(ctx).Create(person).Error
}

func (r *Repository) Update(ctx context.Context, id string, req domain.UpdatePersonRequest) (*domain.Person, error) {
	updates := map[string]interface{}{
		"person_type": req.PersonType, "full_name": req.FullName, "nisn": req.NISN,
		"nip": req.NIP, "email": req.Email, "phone": req.Phone,
		"class_name": req.ClassName, "position": req.Position, "updated_at": time.Now(),
	}
	if req.IsActive != nil {
		updates["is_active"] = *req.IsActive
	}
	if err := r.db.WithContext(ctx).Model(&domain.Person{}).Where("id = ?", id).Updates(updates).Error; err != nil {
		return nil, err
	}
	return r.FindByID(ctx, id)
}

func (r *Repository) RevokeBarcode(ctx context.Context, id string) error {
	result := r.db.WithContext(ctx).Model(&domain.Person{}).Where("id = ?", id).
		Updates(map[string]interface{}{"barcode_status": "REVOKED", "is_active": false, "updated_at": time.Now()})
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return errors.New("data master tidak ditemukan")
	}
	return nil
}

func (r *Repository) Delete(ctx context.Context, id string) error {
	result := r.db.WithContext(ctx).Where("id = ?", id).Delete(&domain.Person{})
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return errors.New("data master tidak ditemukan")
	}
	return nil
}
