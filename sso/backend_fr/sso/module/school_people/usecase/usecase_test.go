package usecase_test

import (
	"context"
	"errors"
	"strings"
	"testing"

	"github.com/sso/sso-be/sso/module/school_people/domain"
	"github.com/sso/sso-be/sso/module/school_people/usecase"
)

type mockRepo struct {
	people map[string]*domain.Person
}

func (m *mockRepo) FindAll(ctx context.Context, personType string) ([]*domain.Person, error) {
	var list []*domain.Person
	for _, p := range m.people {
		if personType == "" || p.PersonType == personType {
			list = append(list, p)
		}
	}
	return list, nil
}

func (m *mockRepo) FindByID(ctx context.Context, id string) (*domain.Person, error) {
	p, ok := m.people[id]
	if !ok {
		return nil, nil
	}
	return p, nil
}

func (m *mockRepo) FindByBarcode(ctx context.Context, token string) (*domain.Person, error) {
	for _, p := range m.people {
		if p.BarcodeToken == token && p.BarcodeStatus == "ACTIVE" && p.IsActive {
			return p, nil
		}
	}
	return nil, nil
}

func (m *mockRepo) Create(ctx context.Context, person *domain.Person) error {
	m.people[person.ID] = person
	return nil
}

func (m *mockRepo) Update(ctx context.Context, id string, req domain.UpdatePersonRequest) (*domain.Person, error) {
	p, ok := m.people[id]
	if !ok {
		return nil, errors.New("not found")
	}
	p.FullName = req.FullName
	p.PersonType = req.PersonType
	return p, nil
}

func (m *mockRepo) RevokeBarcode(ctx context.Context, id string) error {
	p, ok := m.people[id]
	if !ok {
		return errors.New("data master tidak ditemukan")
	}
	p.BarcodeStatus = "REVOKED"
	p.IsActive = false
	return nil
}

func (m *mockRepo) Delete(ctx context.Context, id string) error {
	if _, ok := m.people[id]; !ok {
		return errors.New("data master tidak ditemukan")
	}
	delete(m.people, id)
	return nil
}

func TestResolveBarcode_Active(t *testing.T) {
	repo := &mockRepo{
		people: map[string]*domain.Person{
			"person-1": {
				ID:            "person-1",
				PersonType:    "SISWA",
				FullName:      "Andi Saputra",
				BarcodeToken:  "PRAMBON-VALID-TOKEN",
				BarcodeStatus: "ACTIVE",
				IsActive:      true,
			},
		},
	}
	uc := usecase.NewUseCase(repo)

	person, err := uc.ResolveBarcode(context.Background(), "PRAMBON-VALID-TOKEN")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if person.ID != "person-1" {
		t.Errorf("expected person-1, got %s", person.ID)
	}
}

func TestResolveBarcode_Revoked(t *testing.T) {
	repo := &mockRepo{
		people: map[string]*domain.Person{
			"person-1": {
				ID:            "person-1",
				PersonType:    "SISWA",
				FullName:      "Andi Saputra",
				BarcodeToken:  "PRAMBON-REVOKED-TOKEN",
				BarcodeStatus: "REVOKED",
				IsActive:      false,
			},
		},
	}
	uc := usecase.NewUseCase(repo)

	person, err := uc.ResolveBarcode(context.Background(), "PRAMBON-REVOKED-TOKEN")
	if err == nil {
		t.Fatal("expected error for revoked barcode, got nil")
	}
	if person != nil {
		t.Errorf("expected nil person, got %v", person)
	}
}

func TestCreatePerson_GeneratesBarcodeWithPrambonPrefix(t *testing.T) {
	repo := &mockRepo{people: make(map[string]*domain.Person)}
	uc := usecase.NewUseCase(repo)

	person, err := uc.Create(context.Background(), domain.CreatePersonRequest{
		PersonType: "SISWA",
		FullName:   "Budi Kurniawan",
		NISN:       "0081293813",
		ClassName:  "VIII-A",
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !strings.HasPrefix(person.BarcodeToken, "PRAMBON-") {
		t.Errorf("expected barcode to start with PRAMBON-, got %s", person.BarcodeToken)
	}
	if person.BarcodeStatus != "ACTIVE" {
		t.Errorf("expected ACTIVE barcode status, got %s", person.BarcodeStatus)
	}
	if !person.IsActive {
		t.Error("expected IsActive to be true")
	}
}

func TestRevokeBarcode_InvalidatesToken(t *testing.T) {
	repo := &mockRepo{
		people: map[string]*domain.Person{
			"person-1": {
				ID:            "person-1",
				PersonType:    "SISWA",
				FullName:      "Citra Dewi",
				BarcodeToken:  "PRAMBON-CITRA-TOKEN",
				BarcodeStatus: "ACTIVE",
				IsActive:      true,
			},
		},
	}
	uc := usecase.NewUseCase(repo)

	// Revoke
	if err := uc.RevokeBarcode(context.Background(), "person-1"); err != nil {
		t.Fatalf("unexpected revoke error: %v", err)
	}

	// Resolve again -> must fail
	_, err := uc.ResolveBarcode(context.Background(), "PRAMBON-CITRA-TOKEN")
	if err == nil {
		t.Fatal("expected resolve to fail after revoke")
	}
}

func TestDelete(t *testing.T) {
	repo := &mockRepo{
		people: map[string]*domain.Person{
			"person-1": {
				ID:       "person-1",
				FullName: "Citra Dewi",
			},
		},
	}
	uc := usecase.NewUseCase(repo)

	if err := uc.Delete(context.Background(), "person-1"); err != nil {
		t.Fatalf("unexpected delete error: %v", err)
	}

	if _, ok := repo.people["person-1"]; ok {
		t.Fatal("expected person-1 to be deleted from repo")
	}

	if err := uc.Delete(context.Background(), "person-1"); err == nil {
		t.Fatal("expected error deleting non-existent person, got nil")
	}
}

