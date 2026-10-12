package domain

import (
	"context"
	"time"
)

type StudentFace struct {
	Id           string    `json:"id" gorm:"primaryKey"`
	UserId       string    `json:"user_id" gorm:"unique;not null"`
	FullName     string    `json:"full_name" gorm:"-"`
	Nim          string    `json:"nim" gorm:"-"`
	PhotoUrl     string    `json:"photo_url"`
	FaceVector   string    `json:"face_vector"` // JSON array string e.g. "[0.123, -0.456, ...]"
	RegisteredAt time.Time `json:"registered_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

func (StudentFace) TableName() string {
	return "student_faces"
}

type RegisterFaceRequest struct {
	UserId     string    `json:"user_id"`
	FullName   string    `json:"full_name"`
	Nim        string    `json:"nim"`
	PhotoUrl   string    `json:"photo_url"`
	FaceVector []float32 `json:"face_vector"`
}

type MatchFaceRequest struct {
	SessionId  string    `json:"session_id"`
	FaceVector []float32 `json:"face_vector"`
	PhotoUrl   string    `json:"photo_url"`
}

type MatchFaceResponse struct {
	IsMatch         bool         `json:"is_match"`
	StudentId       string       `json:"student_id"`
	FullName        string       `json:"full_name"`
	Nim             string       `json:"nim"`
	ConfidenceScore float64      `json:"confidence_score"`
	FaceData        *StudentFace `json:"face_data,omitempty"`
}

type FaceRepository interface {
	FindByUserID(ctx context.Context, userId string) (*StudentFace, error)
	FindAllWithVectors(ctx context.Context) ([]*StudentFace, error)
	FindByUserIDs(ctx context.Context, userIds []string) ([]*StudentFace, error)
	Store(ctx context.Context, face *StudentFace) error
	DeleteByUserID(ctx context.Context, userId string) error
}

type UseCase interface {
	RegisterFace(ctx context.Context, req RegisterFaceRequest) (*StudentFace, error)
	GetByUserID(ctx context.Context, userId string) (*StudentFace, error)
	MatchFace(ctx context.Context, candidateVector []float32, allowedUserIds []string) (*MatchFaceResponse, error)
}
