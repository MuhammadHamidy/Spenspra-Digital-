package usecase

import (
	"context"
	"errors"
	"time"

	"github.com/facerec/facerec-be/facerec/module/loans/domain"
)

func (u *loanUseCase) Return(ctx context.Context, req domain.ReturnRequest) (*domain.Loan, error) {
	if req.BookBarcode == "" {
		return nil, errors.New("barcode eksemplar buku wajib diisi")
	}

	// 1. Cari Eksemplar Buku
	item, err := u.bookRepo.FindItemByBarcode(ctx, req.BookBarcode)
	if err != nil || item == nil {
		return nil, errors.New("eksemplar buku tidak ditemukan")
	}

	// 2. Cari Transaksi Pinjaman Aktif
	loan, err := u.loanRepo.FindActiveByBookItemID(ctx, item.ID)
	if err != nil || loan == nil {
		return nil, errors.New("tidak ditemukan riwayat peminjaman aktif untuk buku ini")
	}

	now := time.Now()
	loan.ReturnDate = &now
	loan.UpdatedAt = now

	// 3. Kalkulasi Keterlambatan & Denda
	if now.After(loan.DueDate) {
		diff := now.Sub(loan.DueDate)
		days := int(diff.Hours() / 24)
		if days <= 0 {
			days = 1
		}
		loan.DaysOverdue = days
		loan.FineAmount = float64(days) * loan.FinePerDay
		loan.Status = "RETURNED" // Transaksi selesai dengan denda
	} else {
		loan.DaysOverdue = 0
		loan.FineAmount = 0.00
		loan.IsFinePaid = true
		loan.Status = "RETURNED"
	}

	if req.Notes != "" {
		loan.Notes = loan.Notes + " | Pengembalian: " + req.Notes
	}

	if err := u.loanRepo.Update(ctx, loan); err != nil {
		return nil, err
	}

	// 4. Update Status Eksemplar Buku kembali ke AVAILABLE
	newCondition := req.ItemCondition
	if newCondition == "" {
		newCondition = "GOOD"
	}
	item.ItemCondition = newCondition
	if newCondition == "DAMAGED" {
		item.Status = "MAINTENANCE"
	} else {
		item.Status = "AVAILABLE"
	}
	item.UpdatedAt = now
	_ = u.bookRepo.UpdateItem(ctx, item)

	return u.loanRepo.FindByID(ctx, loan.ID)
}
