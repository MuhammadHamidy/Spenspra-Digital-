package usecase

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"strings"

	"github.com/sso/sso-be/sso/module/school_people/domain"
)

type useCase struct{ repo domain.Repository }

func NewUseCase(repo domain.Repository) domain.UseCase { return &useCase{repo: repo} }

func newBarcodeToken() (string, error) {
	raw := make([]byte, 24)
	if _, err := rand.Read(raw); err != nil {
		return "", err
	}
	return "PRAMBON-" + strings.ToUpper(hex.EncodeToString(raw)), nil
}

func validateType(value string) bool {
	switch value {
	case "SISWA", "GURU", "KEPALA_SEKOLAH", "TENAGA_KEPENDIDIKAN":
		return true
	default:
		return false
	}
}

func (u *useCase) FindAll(ctx context.Context, personType string) ([]*domain.Person, error) {
	return u.repo.FindAll(ctx, personType)
}

func (u *useCase) FindByID(ctx context.Context, id string) (*domain.Person, error) {
	return u.repo.FindByID(ctx, id)
}

func (u *useCase) ResolveBarcode(ctx context.Context, token string) (*domain.Person, error) {
	if strings.TrimSpace(token) == "" {
		return nil, errors.New("barcode_token wajib diisi")
	}
	person, err := u.repo.FindByBarcode(ctx, strings.TrimSpace(token))
	if err != nil {
		return nil, err
	}
	if person == nil {
		return nil, errors.New("barcode tidak valid atau sudah tidak aktif")
	}
	return person, nil
}

func (u *useCase) Create(ctx context.Context, req domain.CreatePersonRequest) (*domain.Person, error) {
	req.FullName = strings.TrimSpace(req.FullName)
	if req.FullName == "" {
		return nil, errors.New("nama lengkap wajib diisi")
	}
	if !validateType(req.PersonType) {
		return nil, errors.New("person_type tidak valid")
	}
	token, err := newBarcodeToken()
	if err != nil {
		return nil, err
	}
	person := &domain.Person{
		PersonType: req.PersonType, FullName: req.FullName, NISN: req.NISN, NIP: req.NIP,
		Email: req.Email, Phone: req.Phone, ClassName: req.ClassName, Position: req.Position,
		BarcodeToken: token, BarcodeStatus: "ACTIVE", IsActive: true,
	}
	if err := u.repo.Create(ctx, person); err != nil {
		return nil, err
	}
	return person, nil
}

func (u *useCase) Update(ctx context.Context, id string, req domain.UpdatePersonRequest) (*domain.Person, error) {
	if req.FullName == "" || !validateType(req.PersonType) {
		return nil, errors.New("nama lengkap dan person_type wajib valid")
	}
	return u.repo.Update(ctx, id, req)
}

func (u *useCase) RevokeBarcode(ctx context.Context, id string) error {
	return u.repo.RevokeBarcode(ctx, id)
}

func (u *useCase) Delete(ctx context.Context, id string) error {
	return u.repo.Delete(ctx, id)
}
