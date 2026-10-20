// Package ssoclient menyediakan HTTP client ringan untuk memanggil
// endpoint SSO /api/barcode/resolve dan mendapatkan data person
// berdasarkan barcode_token.
//
// Konfigurasi melalui environment variable:
//   SSO_API_URL    - base URL SSO API, cth: http://sso-api:8080
//   SSO_API_KEY    - header X-Service-Key (opsional, untuk auth antar layanan)
package ssoclient

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"os"
	"time"
)

// Person merepresentasikan data identitas yang dikembalikan SSO.
type Person struct {
	ID            string `json:"id"`
	PersonType    string `json:"person_type"`
	FullName      string `json:"full_name"`
	NISN          string `json:"nisn"`
	NIP           string `json:"nip"`
	Email         string `json:"email"`
	Phone         string `json:"phone"`
	ClassName     string `json:"class_name"`
	Position      string `json:"position"`
	BarcodeToken  string `json:"barcode_token"`
	BarcodeStatus string `json:"barcode_status"`
	IsActive      bool   `json:"is_active"`
}

type ssoResponse struct {
	Success bool    `json:"success"`
	Data    *Person `json:"data"`
	Message string  `json:"message"`
}

// Client adalah SSO HTTP client.
type Client struct {
	baseURL    string
	apiKey     string
	httpClient *http.Client
}

// New membuat SSO client dari environment variable.
func New() *Client {
	baseURL := os.Getenv("SSO_API_URL")
	if baseURL == "" {
		baseURL = "http://sso-api:8080"
	}
	return &Client{
		baseURL: baseURL,
		apiKey:  os.Getenv("SSO_API_KEY"),
		httpClient: &http.Client{
			Timeout: 5 * time.Second,
		},
	}
}

// NewWithConfig membuat SSO client dengan konfigurasi eksplisit (berguna untuk testing).
func NewWithConfig(baseURL, apiKey string) *Client {
	return &Client{
		baseURL: baseURL,
		apiKey:  apiKey,
		httpClient: &http.Client{
			Timeout: 5 * time.Second,
		},
	}
}

// ResolveBarcode memanggil POST /api/barcode/resolve di SSO dan
// mengembalikan data Person jika token valid dan aktif.
//
// Error dikembalikan jika:
//   - jaringan gagal
//   - SSO mengembalikan HTTP non-2xx
//   - token tidak ditemukan / sudah dicabut
func (c *Client) ResolveBarcode(ctx context.Context, barcodeToken string) (*Person, error) {
	if barcodeToken == "" {
		return nil, errors.New("barcode_token tidak boleh kosong")
	}

	body, _ := json.Marshal(map[string]string{"barcode_token": barcodeToken})

	req, err := http.NewRequestWithContext(ctx, http.MethodPost,
		c.baseURL+"/api/barcode/resolve",
		bytes.NewReader(body),
	)
	if err != nil {
		return nil, fmt.Errorf("ssoclient: gagal membuat request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	if c.apiKey != "" {
		req.Header.Set("X-Service-Key", c.apiKey)
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("ssoclient: gagal menghubungi SSO (%s): %w", c.baseURL, err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusUnauthorized || resp.StatusCode == http.StatusNotFound {
		return nil, errors.New("barcode tidak valid atau sudah tidak aktif")
	}
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("ssoclient: SSO mengembalikan status %d", resp.StatusCode)
	}

	var ssoResp ssoResponse
	if err := json.NewDecoder(resp.Body).Decode(&ssoResp); err != nil {
		return nil, fmt.Errorf("ssoclient: gagal parse respons SSO: %w", err)
	}

	if !ssoResp.Success || ssoResp.Data == nil {
		msg := ssoResp.Message
		if msg == "" {
			msg = "barcode tidak valid"
		}
		return nil, errors.New(msg)
	}

	return ssoResp.Data, nil
}

type ssoListResponse struct {
	Success bool      `json:"success"`
	Data    []*Person `json:"data"`
	Message string    `json:"message"`
}

// FetchAllPeople mengambil data master identitas dari SSO (GURU, SISWA, dsb).
func (c *Client) FetchAllPeople(ctx context.Context, personType string) ([]*Person, error) {
	targetURL := c.baseURL + "/api/master/people"
	if personType != "" {
		targetURL += "?person_type=" + personType
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, targetURL, nil)
	if err != nil {
		return nil, fmt.Errorf("ssoclient: gagal membuat request: %w", err)
	}
	if c.apiKey != "" {
		req.Header.Set("X-Service-Key", c.apiKey)
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("ssoclient: gagal menghubungi SSO (%s): %w", c.baseURL, err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("ssoclient: SSO mengembalikan status %d", resp.StatusCode)
	}

	var listResp ssoListResponse
	if err := json.NewDecoder(resp.Body).Decode(&listResp); err != nil {
		return nil, fmt.Errorf("ssoclient: gagal parse respons SSO: %w", err)
	}

	return listResp.Data, nil
}

type SSOClass struct {
	ID        string `json:"id"`
	ClassCode string `json:"class_code"`
	Room      string `json:"room"`
}

type ssoClassListResponse struct {
	Success bool        `json:"success"`
	Data    []*SSOClass `json:"data"`
	Message string      `json:"message"`
}

// FetchAllClasses mengambil data master kelas/rombel dari SSO.
func (c *Client) FetchAllClasses(ctx context.Context) ([]*SSOClass, error) {
	targetURL := c.baseURL + "/api/school/classes"
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, targetURL, nil)
	if err != nil {
		return nil, fmt.Errorf("ssoclient: gagal membuat request: %w", err)
	}
	if c.apiKey != "" {
		req.Header.Set("X-Service-Key", c.apiKey)
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("ssoclient: gagal menghubungi SSO (%s): %w", c.baseURL, err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("ssoclient: SSO mengembalikan status %d", resp.StatusCode)
	}

	var listResp ssoClassListResponse
	if err := json.NewDecoder(resp.Body).Decode(&listResp); err != nil {
		return nil, fmt.Errorf("ssoclient: gagal parse respons SSO: %w", err)
	}

	return listResp.Data, nil
}

