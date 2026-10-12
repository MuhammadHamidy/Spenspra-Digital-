package usecase

import (
	"context"
	"errors"
	"fmt"
	"time"

	memberDomain "github.com/facerec/facerec-be/facerec/module/library_members/domain"
	"github.com/facerec/facerec-be/facerec/module/library_attendances/domain"
	"github.com/google/uuid"
)

func (u *attendanceUseCase) RecognizeAndAttend(ctx context.Context, req domain.RecognizeVisitRequest) (*domain.RecognizeVisitResponse, error) {
	if len(req.FaceVector) == 0 {
		return nil, errors.New("vektor wajah tidak boleh kosong")
	}

	// 1. Jalankan pencocokan wajah via Face Service
	matchRes, err := u.faceUC.MatchFace(ctx, req.FaceVector, nil)
	if err != nil {
		return nil, err
	}

	if !matchRes.IsMatch {
		return &domain.RecognizeVisitResponse{
			IsRecognized:    false,
			ConfidenceScore: matchRes.ConfidenceScore,
			Message:         "Wajah tidak dikenali dalam database anggota. Silakan registrasi atau absen sebagai tamu.",
		}, nil
	}

	// 2. Cari profil anggota terkait berdasarkan UserID atau Nama
	var member *memberDomain.Member
	if matchRes.StudentId != "" {
		// Cari member berdasarkan user_id atau ID
		_ = u.db.WithContext(ctx).Where("user_id = ? OR id = ?", matchRes.StudentId, matchRes.StudentId).First(&member).Error
	}
	if member == nil && matchRes.FullName != "" {
		_ = u.db.WithContext(ctx).Where("full_name ILIKE ?", "%"+matchRes.FullName+"%").First(&member).Error
	}

	now := time.Now()
	visitorName := matchRes.FullName
	var memberID *string

	var recognizedMember *domain.RecognizedMember
	if member != nil {
		memberID = &member.ID
		visitorName = member.FullName
		recognizedMember = &domain.RecognizedMember{
			ID:             member.ID,
			MemberCode:     member.MemberCode,
			FullName:       member.FullName,
			IdentityNumber: member.IdentityNumber,
			PhotoURL:       req.PhotoURL,
		}

		// Batasi sesi dalam perpustakaan 1 hari. Sesi aktif hingga pergantian hari.
		// Ketika berganti hari, pengecekan hari ini akan otomatis kosong sehingga dapat absen kembali.
		todayVisit, _ := u.attRepo.FindTodayVisitByMember(ctx, member.ID)
		if todayVisit != nil {
			return &domain.RecognizeVisitResponse{
				IsRecognized:    true,
				Member:          recognizedMember,
				ConfidenceScore: matchRes.ConfidenceScore,
				Attendance:      todayVisit,
				Message:         fmt.Sprintf("Sesi perpustakaan hari ini masih aktif untuk %s (tercatat hadir pukul %s). Selamat berkegiatan!", member.FullName, todayVisit.VisitedAt.Format("15:04")),
			}, nil
		}
	} else {
		recognizedMember = &domain.RecognizedMember{
			FullName: matchRes.FullName,
			PhotoURL: req.PhotoURL,
		}
		if matchRes.FullName != "" {
			todayVisit, _ := u.attRepo.FindTodayVisitByVisitorName(ctx, matchRes.FullName)
			if todayVisit != nil {
				return &domain.RecognizeVisitResponse{
					IsRecognized:    true,
					Member:          recognizedMember,
					ConfidenceScore: matchRes.ConfidenceScore,
					Attendance:      todayVisit,
					Message:         fmt.Sprintf("Sesi perpustakaan hari ini masih aktif untuk %s (tercatat hadir pukul %s). Selamat berkegiatan!", matchRes.FullName, todayVisit.VisitedAt.Format("15:04")),
				}, nil
			}
		}
	}

	purpose := req.Purpose
	if purpose == "" {
		purpose = "MEMBACA"
	}

	att := &domain.LibraryAttendance{
		ID:              uuid.NewString(),
		MemberID:        memberID,
		VisitorName:     visitorName,
		VisitorType:     "MEMBER",
		Method:          "FACE_RECOGNITION",
		Purpose:         purpose,
		ConfidenceScore: matchRes.ConfidenceScore,
		PhotoURL:        req.PhotoURL,
		VisitedAt:       now,
	}

	if err := u.attRepo.Store(ctx, att); err != nil {
		return nil, err
	}

	return &domain.RecognizeVisitResponse{
		IsRecognized:    true,
		Member:          recognizedMember,
		ConfidenceScore: matchRes.ConfidenceScore,
		Attendance:      att,
		Message:         fmt.Sprintf("Halo %s, presensi kunjungan perpustakaan Anda berhasil dicatat!", visitorName),
	}, nil
}
