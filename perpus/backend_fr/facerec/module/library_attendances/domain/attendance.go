package domain

import (
	"context"
	"time"
)

type LibraryAttendance struct {
	ID              string    `json:"id" gorm:"column:id;primaryKey"`
	MemberID        *string   `json:"member_id,omitempty" gorm:"column:member_id"`
	VisitorName     string    `json:"visitor_name" gorm:"column:visitor_name"`
	VisitorType     string    `json:"visitor_type" gorm:"column:visitor_type"` // MEMBER, GUEST
	Method          string    `json:"method" gorm:"column:method"`             // FACE_RECOGNITION, BARCODE_SCAN, MANUAL
	Purpose         string    `json:"purpose" gorm:"column:purpose"`           // MEMBACA, PINJAM_KEMBALI, DISKUSI, STUDI, LAINNYA
	ConfidenceScore float64   `json:"confidence_score" gorm:"column:confidence_score"`
	PhotoURL        string    `json:"photo_url" gorm:"column:photo_url"`
	VisitedAt       time.Time `json:"visited_at" gorm:"column:visited_at"`

	// Enriched
	MemberCode     string `json:"member_code,omitempty" gorm:"->"`
	IdentityNumber string `json:"identity_number,omitempty" gorm:"->"`
}

func (LibraryAttendance) TableName() string {
	return "library_attendances"
}

type RecognizeVisitRequest struct {
	FaceVector []float32 `json:"face_vector"`
	PhotoURL   string    `json:"photo_url"`
	Purpose    string    `json:"purpose"`
}

type RecognizeVisitResponse struct {
	IsRecognized    bool               `json:"is_recognized"`
	Member          *RecognizedMember  `json:"member,omitempty"`
	ConfidenceScore float64            `json:"confidence_score"`
	Attendance      *LibraryAttendance `json:"attendance,omitempty"`
	Message         string             `json:"message"`
}

type RecognizedMember struct {
	ID             string `json:"id"`
	MemberCode     string `json:"member_code"`
	FullName       string `json:"full_name"`
	IdentityNumber string `json:"identity_number"`
	PhotoURL       string `json:"photo_url"`
}

type ManualVisitRequest struct {
	MemberCode  string `json:"member_code,omitempty"`
	VisitorName string `json:"visitor_name"`
	VisitorType string `json:"visitor_type"` // MEMBER, GUEST
	Method      string `json:"method"`       // BARCODE_SCAN, MANUAL
	Purpose     string `json:"purpose"`
}

type AttendanceStats struct {
	TodayVisitors  int64 `json:"today_visitors"`
	MemberVisitors int64 `json:"member_visitors"`
	GuestVisitors  int64 `json:"guest_visitors"`
	TotalVisits    int64 `json:"total_visits"`
}

type AttendanceRepository interface {
	FindAll(ctx context.Context, search string, date string) ([]*LibraryAttendance, error)
	Store(ctx context.Context, att *LibraryAttendance) error
	GetStats(ctx context.Context) (*AttendanceStats, error)
	FindRecentVisitByMember(ctx context.Context, memberID string, withinMinutes int) (*LibraryAttendance, error)
	FindTodayVisitByMember(ctx context.Context, memberID string) (*LibraryAttendance, error)
	FindTodayVisitByVisitorName(ctx context.Context, visitorName string) (*LibraryAttendance, error)
}

type UseCase interface {
	RecognizeAndAttend(ctx context.Context, req RecognizeVisitRequest) (*RecognizeVisitResponse, error)
	RecordManualVisit(ctx context.Context, req ManualVisitRequest) (*LibraryAttendance, error)
	GetAll(ctx context.Context, search string, date string) ([]*LibraryAttendance, error)
	GetStats(ctx context.Context) (*AttendanceStats, error)
}
