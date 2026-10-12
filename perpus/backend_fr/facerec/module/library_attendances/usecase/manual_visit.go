package usecase

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/facerec/facerec-be/facerec/module/library_attendances/domain"
	"github.com/google/uuid"
)

func (u *attendanceUseCase) RecordManualVisit(ctx context.Context, req domain.ManualVisitRequest) (*domain.LibraryAttendance, error) {
	if req.VisitorName == "" {
		return nil, errors.New("nama pengunjung wajib diisi")
	}

	now := time.Now()
	var memberID *string
	vType := req.VisitorType
	if vType == "" {
		vType = "GUEST"
	}

	if req.MemberCode != "" {
		// Strategi resolusi anggota:
		// 1. Jika token terlihat seperti SSO barcode (awalan PRAMBON-), resolve via SSO API
		//    lalu temukan anggota berdasarkan person_id.
		// 2. Fallback: cari via member_code lokal (untuk kompatibilitas mundur).
		var resolvedMemberID *string

		if strings.HasPrefix(req.MemberCode, "PRAMBON-") || len(req.MemberCode) > 20 {
			// Coba resolve via SSO (sumber kebenaran tunggal)
			ssoPerson, ssoErr := u.ssoClient.ResolveBarcode(ctx, req.MemberCode)
			if ssoErr != nil || ssoPerson == nil {
				return nil, errors.New("barcode tidak valid, tidak aktif, atau sudah dicabut di SSO")
			}
			// Cari library_member berdasarkan person_id
			m, err := u.memberRepo.FindByPersonID(ctx, ssoPerson.ID)
			if err != nil || m == nil {
				return nil, errors.New("barcode valid di SSO namun belum terdaftar sebagai anggota perpustakaan")
			}
			mid := m.ID
			resolvedMemberID = &mid
			req.VisitorName = m.FullName
			vType = "MEMBER"
		}

		if resolvedMemberID == nil {
			// Fallback: cari via member_code lokal
			m, err := u.memberRepo.FindByCode(ctx, req.MemberCode)
			if err == nil && m != nil {
				mid := m.ID
				resolvedMemberID = &mid
				vType = "MEMBER"
				req.VisitorName = m.FullName
			}
		}

		memberID = resolvedMemberID
	}

	// Batasi sesi dalam perpustakaan 1 hari.
	if memberID != nil {
		todayVisit, _ := u.attRepo.FindTodayVisitByMember(ctx, *memberID)
		if todayVisit != nil {
			return todayVisit, nil
		}
	} else if req.VisitorName != "" {
		todayVisit, _ := u.attRepo.FindTodayVisitByVisitorName(ctx, req.VisitorName)
		if todayVisit != nil {
			return todayVisit, nil
		}
	}

	purpose := req.Purpose
	if purpose == "" {
		purpose = "MEMBACA"
	}

	method := req.Method
	if method == "" {
		method = "MANUAL"
	}

	att := &domain.LibraryAttendance{
		ID:          uuid.NewString(),
		MemberID:    memberID,
		VisitorName: req.VisitorName,
		VisitorType: vType,
		Method:      method,
		Purpose:     purpose,
		VisitedAt:   now,
	}

	if err := u.attRepo.Store(ctx, att); err != nil {
		return nil, err
	}

	return att, nil
}
