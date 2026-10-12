package usecase

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/facerec/facerec-be/facerec/module/library_members/domain"
	"github.com/google/uuid"
)

func (u *memberUseCase) Create(ctx context.Context, req domain.CreateMemberRequest) (*domain.Member, error) {
	if req.FullName == "" {
		return nil, errors.New("nama lengkap anggota wajib diisi")
	}

	seq, _ := u.repo.GetNextSequence(ctx)
	now := time.Now()
	memberCode := fmt.Sprintf("MBR-%d-%04d", now.Year(), seq)

	limit := req.MaxBorrowLimit
	if limit <= 0 {
		limit = 3
	}

	m := &domain.Member{
		ID:             uuid.NewString(),
		UserID:         req.UserID,
		PersonID:       req.PersonID,
		MemberCode:     memberCode,
		FullName:       req.FullName,
		IdentityNumber: req.IdentityNumber,
		Email:          req.Email,
		Phone:          req.Phone,
		Address:        req.Address,
		MaxBorrowLimit: limit,
		IsActive:       true,
		CreatedAt:      now,
		UpdatedAt:      now,
	}

	if err := u.repo.Store(ctx, m); err != nil {
		return nil, err
	}

	return m, nil
}

func (u *memberUseCase) Update(ctx context.Context, id string, req domain.CreateMemberRequest) (*domain.Member, error) {
	m, err := u.repo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if m == nil {
		return nil, errors.New("anggota tidak ditemukan")
	}

	if req.FullName != "" {
		m.FullName = req.FullName
	}
	if req.IdentityNumber != "" {
		m.IdentityNumber = req.IdentityNumber
	}
	if req.Email != "" {
		m.Email = req.Email
	}
	if req.Phone != "" {
		m.Phone = req.Phone
	}
	if req.Address != "" {
		m.Address = req.Address
	}
	if req.MaxBorrowLimit > 0 {
		m.MaxBorrowLimit = req.MaxBorrowLimit
	}
	if req.PersonID != nil {
		m.PersonID = req.PersonID
	}
	m.UpdatedAt = time.Now()

	if err := u.repo.Update(ctx, m); err != nil {
		return nil, err
	}

	return m, nil
}

func (u *memberUseCase) Delete(ctx context.Context, id string) error {
	return u.repo.Delete(ctx, id)
}

func (u *memberUseCase) SyncFromSSO(ctx context.Context) (int, error) {
	if u.ssoClient == nil {
		return 0, errors.New("sso client tidak terkonfigurasi")
	}

	people, err := u.ssoClient.FetchAllPeople(ctx, "")
	if err != nil {
		return 0, fmt.Errorf("gagal mengambil data master dari SSO: %w", err)
	}

	count := 0
	now := time.Now()
	for _, p := range people {
		if p == nil || !p.IsActive {
			continue
		}

		personID := p.ID
		ident := p.NIP
		if ident == "" {
			ident = p.NISN
		}

		memberCode := "MBR-" + ident
		if ident == "" {
			memberCode = "MBR-" + p.ID[:8]
		}

		address := "Warga Sekolah"
		limit := 3
		if p.PersonType == "GURU" {
			address = "Guru Pengajar"
			limit = 5
		} else if p.ClassName != "" {
			address = "Kelas " + p.ClassName
		}

		existing, _ := u.repo.FindByPersonID(ctx, personID)
		if existing == nil && ident != "" {
			existing, _ = u.repo.FindByCode(ctx, memberCode)
		}

		if existing != nil {
			existing.PersonID = &personID
			existing.FullName = p.FullName
			existing.IdentityNumber = ident
			existing.Email = p.Email
			existing.Phone = p.Phone
			existing.Address = address
			existing.MaxBorrowLimit = limit
			existing.IsActive = true
			existing.UpdatedAt = now
			_ = u.repo.Update(ctx, existing)
		} else {
			m := &domain.Member{
				ID:             "mbr-" + p.ID[:8],
				PersonID:       &personID,
				MemberCode:     memberCode,
				FullName:       p.FullName,
				IdentityNumber: ident,
				Email:          p.Email,
				Phone:          p.Phone,
				Address:        address,
				MaxBorrowLimit: limit,
				IsActive:       true,
				CreatedAt:      now,
				UpdatedAt:      now,
			}
			_ = u.repo.Store(ctx, m)
		}
		count++
	}

	return count, nil
}
