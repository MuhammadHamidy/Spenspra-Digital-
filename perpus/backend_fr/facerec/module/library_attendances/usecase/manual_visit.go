package usecase

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/facerec/facerec-be/facerec/module/library_attendances/domain"
	memberDomain "github.com/facerec/facerec-be/facerec/module/library_members/domain"
	"github.com/google/uuid"
)

func (u *attendanceUseCase) RecordManualVisit(ctx context.Context, req domain.ManualVisitRequest) (*domain.LibraryAttendance, error) {
	if req.VisitorName == "" && req.MemberCode == "" {
		return nil, errors.New("nama pengunjung atau kode barcode anggota wajib diisi")
	}

	now := time.Now()
	var memberID *string
	vType := req.VisitorType
	if vType == "" {
		vType = "GUEST"
	}

	if req.MemberCode != "" {
		cleanCode := strings.TrimSpace(req.MemberCode)
		var m *memberDomain.Member

		// 1. Coba cari di database lokal terlebih dahulu (by member_code, identity_number, id, person_id)
		localMember, err := u.memberRepo.FindByCode(ctx, cleanCode)
		if err == nil && localMember != nil {
			m = localMember
		} else {
			m, _ = u.memberRepo.FindByID(ctx, cleanCode)
		}

		// 2. Jika tidak ditemukan secara lokal, resolve via SSO (sumber kebenaran tunggal untuk civitas/barcode)
		if m == nil && u.ssoClient != nil {
			ssoPerson, ssoErr := u.ssoClient.ResolveBarcode(ctx, cleanCode)
			if ssoErr == nil && ssoPerson != nil && ssoPerson.IsActive {
				personID := ssoPerson.ID
				existing, _ := u.memberRepo.FindByPersonID(ctx, personID)
				if existing == nil {
					ident := ssoPerson.NISN
					if ident == "" {
						ident = ssoPerson.NIP
					}
					if ident != "" {
						existing, _ = u.memberRepo.FindByCode(ctx, ident)
					}
				}

				if existing != nil {
					existing.PersonID = &personID
					if existing.FullName == "" {
						existing.FullName = ssoPerson.FullName
					}
					_ = u.memberRepo.Update(ctx, existing)
					m = existing
				} else {
					// JIT Auto-Enrollment anggota perpustakaan
					ident := ssoPerson.NISN
					if ident == "" {
						ident = ssoPerson.NIP
					}
					memberCode := "MBR-" + ident
					if ident == "" {
						memberCode = "MBR-" + ssoPerson.ID[:8]
					}
					address := "Warga Sekolah"
					limit := 3
					if ssoPerson.PersonType == "GURU" {
						address = "Guru Pengajar"
						limit = 5
					} else if ssoPerson.ClassName != "" {
						address = "Kelas " + ssoPerson.ClassName
					}

					newMember := &memberDomain.Member{
						ID:             "mbr-" + ssoPerson.ID,
						PersonID:       &personID,
						MemberCode:     memberCode,
						FullName:       ssoPerson.FullName,
						IdentityNumber: ident,
						Email:          ssoPerson.Email,
						Phone:          ssoPerson.Phone,
						Address:        address,
						MaxBorrowLimit: limit,
						IsActive:       true,
						CreatedAt:      now,
						UpdatedAt:      now,
					}
					if storeErr := u.memberRepo.Store(ctx, newMember); storeErr == nil {
						m = newMember
					}
				}
			}
		}

		if m != nil {
			mid := m.ID
			memberID = &mid
			req.VisitorName = m.FullName
			vType = "MEMBER"
		} else if strings.HasPrefix(cleanCode, "PRAMBON-") || len(cleanCode) > 20 {
			return nil, errors.New("barcode tidak valid, tidak aktif, atau tidak terdaftar di sistem sekolah")
		}
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
