package postgresql

import (
	"context"
	"errors"
	"time"

	"github.com/facerec/facerec-be/facerec/module/library_attendances/domain"
	"gorm.io/gorm"
)

type attendanceRepository struct {
	db *gorm.DB
}

func NewRepository(db *gorm.DB) domain.AttendanceRepository {
	return &attendanceRepository{db: db}
}

func (r *attendanceRepository) FindAll(ctx context.Context, search string, date string) ([]*domain.LibraryAttendance, error) {
	var list []*domain.LibraryAttendance
	q := r.db.WithContext(ctx).Order("visited_at DESC")

	if date != "" {
		q = q.Where("DATE(visited_at) = ?", date)
	}
	if search != "" {
		like := "%" + search + "%"
		q = q.Where("visitor_name ILIKE ? OR purpose ILIKE ?", like, like)
	}

	err := q.Find(&list).Error
	if err != nil {
		return nil, err
	}

	for _, a := range list {
		if a.MemberID != nil && *a.MemberID != "" {
			var m struct {
				MemberCode     string
				IdentityNumber string
			}
			if err := r.db.WithContext(ctx).Table("library_members").Select("member_code, identity_number").Where("id = ?", *a.MemberID).Scan(&m).Error; err == nil {
				a.MemberCode = m.MemberCode
				a.IdentityNumber = m.IdentityNumber
			}
		}
	}

	return list, nil
}

func (r *attendanceRepository) Store(ctx context.Context, att *domain.LibraryAttendance) error {
	return r.db.WithContext(ctx).Create(att).Error
}

func (r *attendanceRepository) GetStats(ctx context.Context) (*domain.AttendanceStats, error) {
	var todayCount int64
	var memberCount int64
	var guestCount int64
	var totalCount int64

	today := time.Now().Format("2006-01-02")
	_ = r.db.WithContext(ctx).Model(&domain.LibraryAttendance{}).Where("DATE(visited_at) = ?", today).Count(&todayCount).Error
	_ = r.db.WithContext(ctx).Model(&domain.LibraryAttendance{}).Where("DATE(visited_at) = ? AND visitor_type = 'MEMBER'", today).Count(&memberCount).Error
	_ = r.db.WithContext(ctx).Model(&domain.LibraryAttendance{}).Where("DATE(visited_at) = ? AND visitor_type = 'GUEST'", today).Count(&guestCount).Error
	_ = r.db.WithContext(ctx).Model(&domain.LibraryAttendance{}).Count(&totalCount).Error

	return &domain.AttendanceStats{
		TodayVisitors:  todayCount,
		MemberVisitors: memberCount,
		GuestVisitors:  guestCount,
		TotalVisits:    totalCount,
	}, nil
}

func (r *attendanceRepository) FindRecentVisitByMember(ctx context.Context, memberID string, withinMinutes int) (*domain.LibraryAttendance, error) {
	var att domain.LibraryAttendance
	since := time.Now().Add(-time.Duration(withinMinutes) * time.Minute)
	err := r.db.WithContext(ctx).Where("member_id = ? AND visited_at >= ?", memberID, since).Order("visited_at DESC").First(&att).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	return &att, err
}

func (r *attendanceRepository) FindTodayVisitByMember(ctx context.Context, memberID string) (*domain.LibraryAttendance, error) {
	var att domain.LibraryAttendance
	today := time.Now().Format("2006-01-02")
	err := r.db.WithContext(ctx).Where("member_id = ? AND DATE(visited_at) = ?", memberID, today).Order("visited_at DESC").First(&att).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	return &att, err
}

func (r *attendanceRepository) FindTodayVisitByVisitorName(ctx context.Context, visitorName string) (*domain.LibraryAttendance, error) {
	var att domain.LibraryAttendance
	today := time.Now().Format("2006-01-02")
	err := r.db.WithContext(ctx).Where("visitor_name ILIKE ? AND DATE(visited_at) = ?", visitorName, today).Order("visited_at DESC").First(&att).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	return &att, err
}
