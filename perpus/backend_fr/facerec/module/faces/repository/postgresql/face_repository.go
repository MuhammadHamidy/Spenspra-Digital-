package postgresql

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"github.com/facerec/facerec-be/facerec/module/faces/domain"
)

type faceRepository struct {
	db *gorm.DB
}

func NewRepository(db *gorm.DB) domain.FaceRepository {
	return &faceRepository{db: db}
}

func (r *faceRepository) FindByUserID(ctx context.Context, userId string) (*domain.StudentFace, error) {
	var face domain.StudentFace
	err := r.db.WithContext(ctx).Where("user_id = ?", userId).First(&face).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	var user struct {
		FullName string
		NimNip   string
	}
	_ = r.db.Table("accounts").Select("full_name, nim_nip").Where("id = ?", userId).Scan(&user).Error
	face.FullName = user.FullName
	face.Nim = user.NimNip

	return &face, nil
}

func (r *faceRepository) FindAllWithVectors(ctx context.Context) ([]*domain.StudentFace, error) {
	var faces []*domain.StudentFace
	err := r.db.WithContext(ctx).Where("face_vector IS NOT NULL AND face_vector != ''").Find(&faces).Error
	if err != nil {
		return nil, err
	}

	for _, f := range faces {
		var user struct {
			FullName string
			NimNip   string
		}
		_ = r.db.Table("accounts").Select("full_name, nim_nip").Where("id = ?", f.UserId).Scan(&user).Error
		f.FullName = user.FullName
		f.Nim = user.NimNip
	}

	return faces, nil
}

func (r *faceRepository) FindByUserIDs(ctx context.Context, userIds []string) ([]*domain.StudentFace, error) {
	if len(userIds) == 0 {
		return []*domain.StudentFace{}, nil
	}

	var faces []*domain.StudentFace
	err := r.db.WithContext(ctx).Where("user_id IN ?", userIds).Find(&faces).Error
	if err != nil {
		return nil, err
	}

	for _, f := range faces {
		var user struct {
			FullName string
			NimNip   string
		}
		_ = r.db.Table("accounts").Select("full_name, nim_nip").Where("id = ?", f.UserId).Scan(&user).Error
		f.FullName = user.FullName
		f.Nim = user.NimNip
	}

	return faces, nil
}

func (r *faceRepository) Store(ctx context.Context, face *domain.StudentFace) error {
	// Ensure user/student exists in accounts table to satisfy foreign key constraint
	var accountCount int64
	_ = r.db.WithContext(ctx).Table("accounts").Where("id = ? OR username = ?", face.UserId, face.UserId).Count(&accountCount)
	if accountCount == 0 {
		fullName := face.FullName
		if fullName == "" {
			fullName = "Siswa (" + face.UserId + ")"
		}
		nim := face.Nim
		if nim == "" {
			nim = face.UserId
		}
		newAccount := map[string]interface{}{
			"id":            face.UserId,
			"username":      face.UserId,
			"password_hash": "$2a$10$wO3b13/Ue0oG6XfJ4Rz4t.7N8d2M3W9Y2t5d4e.R6M7P8Q9R0S1T2", // password123
			"email":         face.UserId + "@smpn1prambon.sch.id",
			"full_name":     fullName,
			"role_id":       "role-mahasiswa",
			"nim_nip":       nim,
		}
		if err := r.db.WithContext(ctx).Table("accounts").Create(&newAccount).Error; err != nil {
			return err
		}
	} else if face.FullName != "" || face.Nim != "" {
		// Update account details if provided
		updates := map[string]interface{}{}
		if face.FullName != "" {
			updates["full_name"] = face.FullName
		}
		if face.Nim != "" {
			updates["nim_nip"] = face.Nim
		}
		_ = r.db.WithContext(ctx).Table("accounts").Where("id = ? OR username = ?", face.UserId, face.UserId).Updates(updates).Error
	}

	var existing domain.StudentFace
	err := r.db.WithContext(ctx).Where("user_id = ?", face.UserId).First(&existing).Error
	if err == nil && existing.Id != "" {
		existing.PhotoUrl = face.PhotoUrl
		existing.FaceVector = face.FaceVector
		return r.db.WithContext(ctx).Save(&existing).Error
	}

	if face.Id == "" {
		face.Id = uuid.New().String()
	}
	return r.db.WithContext(ctx).Create(face).Error
}

func (r *faceRepository) DeleteByUserID(ctx context.Context, userId string) error {
	return r.db.WithContext(ctx).Where("user_id = ?", userId).Delete(&domain.StudentFace{}).Error
}
