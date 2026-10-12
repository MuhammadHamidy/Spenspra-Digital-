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

	// Coba resolve via SSO jika barcode berformat SSO (PRAMBON-*)
	if strings.HasPrefix(req.MemberBarcode, "PRAMBON-") || len(req.MemberBarcode) > 20 {
		if u.ssoClient != nil {
			ssoPerson, ssoErr := u.ssoClient.ResolveBarcode(ctx, req.MemberBarcode)
			if ssoErr != nil || ssoPerson == nil {
				return nil, errors.New("barcode anggota tidak valid, tidak aktif, atau sudah dicabut di SSO")
			}
			member, _ = u.memberRepo.FindByPersonID(ctx, ssoPerson.ID)
			if member == nil {
				return nil, errors.New("anggota valid di SSO namun belum terdaftar sebagai anggota perpustakaan")
			}
		}
	}

	if member == nil {
		member, err = u.memberRepo.FindByCode(ctx, req.MemberBarcode)
		if err != nil || member == nil {
			// Try finding by ID
			member, err = u.memberRepo.FindByID(ctx, req.MemberBarcode)
			if err != nil || member == nil {
				return nil, errors.New("anggota dengan barcode/kode tersebut tidak terdaftar")
			}
		}
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
