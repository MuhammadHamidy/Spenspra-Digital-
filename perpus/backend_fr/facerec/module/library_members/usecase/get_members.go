package usecase

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/facerec/facerec-be/facerec/module/library_members/domain"
)

func (u *memberUseCase) GetAll(ctx context.Context, search string) ([]*domain.Member, error) {
	list, err := u.repo.FindAll(ctx, search)
	if err == nil && len(list) == 0 && search == "" {
		// Jika tabel anggota masih kosong, tarik master data langsung dari SSO
		_, _ = u.SyncFromSSO(ctx)
		return u.repo.FindAll(ctx, search)
	}
	return list, err
}

func (u *memberUseCase) GetByID(ctx context.Context, id string) (*domain.Member, error) {
	m, err := u.repo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if m == nil {
		return nil, errors.New("anggota tidak ditemukan")
	}
	return m, nil
}

func (u *memberUseCase) GetByCode(ctx context.Context, code string) (*domain.Member, error) {
	cleanCode := strings.TrimSpace(code)
	if cleanCode == "" {
		return nil, errors.New("kode barcode anggota tidak boleh kosong")
	}

	// 1. Coba cari di database lokal terlebih dahulu
	m, err := u.repo.FindByCode(ctx, cleanCode)
	if err == nil && m != nil {
		return m, nil
	}

	// 2. Hubungi SSO (sumber kebenaran tunggal untuk civitas & barcode token)
	if u.ssoClient != nil {
		ssoPerson, ssoErr := u.ssoClient.ResolveBarcode(ctx, cleanCode)
		if ssoErr == nil && ssoPerson != nil && ssoPerson.IsActive {
			personID := ssoPerson.ID
			existing, _ := u.repo.FindByPersonID(ctx, personID)
			if existing == nil {
				ident := ssoPerson.NISN
				if ident == "" {
					ident = ssoPerson.NIP
				}
				if ident != "" {
					existing, _ = u.repo.FindByCode(ctx, ident)
				}
			}

			if existing != nil {
				existing.PersonID = &personID
				if existing.FullName == "" {
					existing.FullName = ssoPerson.FullName
				}
				_ = u.repo.Update(ctx, existing)
				return existing, nil
			}

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

			newMember := &domain.Member{
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

			if storeErr := u.repo.Store(ctx, newMember); storeErr == nil {
				return newMember, nil
			}
		}
	}

	return nil, errors.New("anggota perpustakaan tidak ditemukan")
}
