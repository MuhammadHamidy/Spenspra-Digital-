package postgresql

import (
	"context"
	"errors"

	"github.com/facerec/facerec-be/facerec/module/library_members/domain"
	"gorm.io/gorm"
)

type memberRepository struct {
	db *gorm.DB
}

func NewRepository(db *gorm.DB) domain.MemberRepository {
	return &memberRepository{db: db}
}

func (r *memberRepository) FindAll(ctx context.Context, search string) ([]*domain.Member, error) {
	var list []*domain.Member
	q := r.db.WithContext(ctx).Order("created_at DESC")
	if search != "" {
		like := "%" + search + "%"
		q = q.Where("full_name ILIKE ? OR member_code ILIKE ? OR identity_number ILIKE ? OR email ILIKE ?", like, like, like, like)
	}
	err := q.Find(&list).Error
	return list, err
}

func (r *memberRepository) FindByID(ctx context.Context, id string) (*domain.Member, error) {
	var m domain.Member
	err := r.db.WithContext(ctx).Where("id = ?", id).First(&m).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &m, nil
}

func (r *memberRepository) FindByCode(ctx context.Context, code string) (*domain.Member, error) {
	var m domain.Member
	err := r.db.WithContext(ctx).Where("member_code = ?", code).First(&m).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &m, nil
}

// FindByPersonID mencari anggota perpustakaan berdasarkan person_id dari SSO.
func (r *memberRepository) FindByPersonID(ctx context.Context, personID string) (*domain.Member, error) {
	var m domain.Member
	err := r.db.WithContext(ctx).Where("person_id = ?", personID).First(&m).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &m, nil
}

func (r *memberRepository) Store(ctx context.Context, member *domain.Member) error {
	return r.db.WithContext(ctx).Create(member).Error
}

func (r *memberRepository) Update(ctx context.Context, member *domain.Member) error {
	return r.db.WithContext(ctx).Save(member).Error
}

func (r *memberRepository) Delete(ctx context.Context, id string) error {
	return r.db.WithContext(ctx).Delete(&domain.Member{}, "id = ?", id).Error
}

func (r *memberRepository) GetNextSequence(ctx context.Context) (int, error) {
	var count int64
	err := r.db.WithContext(ctx).Model(&domain.Member{}).Count(&count).Error
	if err != nil {
		return 1, err
	}
	return int(count) + 1, nil
}
