package usecase

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	memberDomain "github.com/facerec/facerec-be/facerec/module/library_members/domain"
	"github.com/facerec/facerec-be/facerec/module/loans/domain"
	"github.com/google/uuid"
)

func (u *loanUseCase) Borrow(ctx context.Context, req domain.BorrowRequest) (*domain.Loan, error) {
	if req.MemberBarcode == "" {
		return nil, errors.New("barcode atau kode anggota wajib diisi")
	}
	if req.BookBarcode == "" {
		return nil, errors.New("barcode eksemplar buku wajib diisi")
	}

	// 1. Validasi Anggota
	var member *memberDomain.Member
	var err error
	cleanBarcode := strings.TrimSpace(req.MemberBarcode)

	// Coba cari di database lokal terlebih dahulu (by member_code, identity_number, id, person_id)
	member, err = u.memberRepo.FindByCode(ctx, cleanBarcode)
	if err != nil || member == nil {
		member, _ = u.memberRepo.FindByID(ctx, cleanBarcode)
	}

	// Jika tidak ditemukan secara lokal, resolve via SSO (sumber kebenaran tunggal untuk civitas & barcode token)
	if member == nil && u.ssoClient != nil {
		ssoPerson, ssoErr := u.ssoClient.ResolveBarcode(ctx, cleanBarcode)
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
				member = existing
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
					CreatedAt:      time.Now(),
					UpdatedAt:      time.Now(),
				}
				if storeErr := u.memberRepo.Store(ctx, newMember); storeErr == nil {
					member = newMember
				}
			}
		}
	}

	if member == nil {
		return nil, errors.New("anggota dengan barcode/kode tersebut tidak terdaftar atau barcode tidak valid di sistem sekolah")
	}
	if !member.IsActive {
		return nil, errors.New("status keanggotaan sedang tidak aktif")
	}

	// 2. Cek limit peminjaman
	activeCount, err := u.loanRepo.CountActiveByMemberID(ctx, member.ID)
	if err != nil {
		return nil, err
	}
	if activeCount >= member.MaxBorrowLimit {
		return nil, fmt.Errorf("anggota telah mencapai batas maksimal peminjaman (%d buku)", member.MaxBorrowLimit)
	}

	// 3. Validasi Eksemplar Buku
	item, err := u.bookRepo.FindItemByBarcode(ctx, req.BookBarcode)
	if err != nil || item == nil {
		return nil, errors.New("eksemplar buku dengan barcode tersebut tidak ditemukan")
	}
	if item.Status != "AVAILABLE" {
		return nil, fmt.Errorf("eksemplar buku sedang tidak tersedia (status: %s)", item.Status)
	}

	// 4. Hitung Tanggal Jatuh Tempo
	now := time.Now()
	days := req.DurationDays
	if days <= 0 {
		days = 7
	}
	dueDate := now.AddDate(0, 0, days)

	seq, _ := u.loanRepo.GetNextLoanSequence(ctx)
	loanCode := fmt.Sprintf("PJ-%s-%04d", now.Format("20060102"), seq)

	loan := &domain.Loan{
		ID:          uuid.NewString(),
		LoanCode:    loanCode,
		MemberID:    member.ID,
		BookItemID:  item.ID,
		BorrowDate:  now,
		DueDate:     dueDate,
		Status:      "BORROWED",
		FinePerDay:  1000.00,
		DaysOverdue: 0,
		FineAmount:  0.00,
		IsFinePaid:  false,
		Notes:       req.Notes,
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	if err := u.loanRepo.Store(ctx, loan); err != nil {
		return nil, err
	}

	// 5. Update Status Eksemplar Buku menjadi BORROWED
	item.Status = "BORROWED"
	item.UpdatedAt = now
	_ = u.bookRepo.UpdateItem(ctx, item)

	return u.loanRepo.FindByID(ctx, loan.ID)
}
