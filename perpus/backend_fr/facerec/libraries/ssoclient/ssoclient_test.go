package ssoclient_test

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/facerec/facerec-be/facerec/libraries/ssoclient"
)

func TestResolveBarcode_Success(t *testing.T) {
	expectedPerson := &ssoclient.Person{
		ID:            "user-siswa-1",
		PersonType:    "SISWA",
		FullName:      "Andi Saputra",
		NISN:          "0081293812",
		ClassName:     "VII-D",
		BarcodeToken:  "PRAMBON-PERPUS123XYZ",
		BarcodeStatus: "ACTIVE",
		IsActive:      true,
	}

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			t.Errorf("expected POST, got %s", r.Method)
		}
		if r.URL.Path != "/api/barcode/resolve" {
			t.Errorf("expected /api/barcode/resolve, got %s", r.URL.Path)
		}

		var req map[string]string
		_ = json.NewDecoder(r.Body).Decode(&req)
		if req["barcode_token"] != "PRAMBON-PERPUS123XYZ" {
			t.Errorf("unexpected barcode_token: %s", req["barcode_token"])
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_ = json.NewEncoder(w).Encode(map[string]interface{}{
			"success": true,
			"message": "Barcode valid",
			"data":    expectedPerson,
		})
	}))
	defer server.Close()

	client := ssoclient.NewWithConfig(server.URL, "")
	person, err := client.ResolveBarcode(context.Background(), "PRAMBON-PERPUS123XYZ")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if person == nil {
		t.Fatal("expected non-nil person")
	}
	if person.ID != expectedPerson.ID {
		t.Errorf("expected ID %s, got %s", expectedPerson.ID, person.ID)
	}
	if person.FullName != expectedPerson.FullName {
		t.Errorf("expected FullName %s, got %s", expectedPerson.FullName, person.FullName)
	}
	if person.BarcodeStatus != "ACTIVE" {
		t.Errorf("expected ACTIVE, got %s", person.BarcodeStatus)
	}
}

func TestResolveBarcode_RevokedOrInvalid(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusNotFound)
		_ = json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"message": "barcode tidak valid atau sudah tidak aktif",
		})
	}))
	defer server.Close()

	client := ssoclient.NewWithConfig(server.URL, "")
	person, err := client.ResolveBarcode(context.Background(), "PRAMBON-REVOKED-TOKEN")
	if err == nil {
		t.Fatal("expected error for revoked token, got nil")
	}
	if person != nil {
		t.Errorf("expected nil person for revoked token, got %v", person)
	}
}

func TestResolveBarcode_EmptyToken(t *testing.T) {
	client := ssoclient.NewWithConfig("http://localhost:8080", "")
	_, err := client.ResolveBarcode(context.Background(), "")
	if err == nil {
		t.Fatal("expected error for empty token")
	}
}
