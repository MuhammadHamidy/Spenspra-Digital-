package usecase

import (
	"context"
	"errors"
	"strings"

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
	if strings.HasPrefix(code, "PRAMBON-") || len(code) > 20 {
		if u.ssoClient != nil {
			ssoPerson, ssoErr := u.ssoClient.ResolveBarcode(ctx, code)
			if ssoErr != nil || ssoPerson == nil {
				return nil, errors.New("barcode anggota tidak valid, tidak aktif, atau sudah dicabut di SSO")
			}
			m, err := u.repo.FindByPersonID(ctx, ssoPerson.ID)
			if err != nil || m == nil {
				return nil, errors.New("anggota valid di SSO namun belum terdaftar sebagai anggota perpustakaan")
			}
			return m, nil
		}
	}

	m, err := u.repo.FindByCode(ctx, code)
	if err != nil {
		return nil, err
	}
	if m == nil {
		return nil, errors.New("anggota tidak ditemukan")
	}
	return m, nil
}
