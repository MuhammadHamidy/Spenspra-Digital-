package http

import (
	"bytes"
	"encoding/json"
	"fmt"
	_ "image/png"
	"net/http"
	"net/url"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	qrcode "github.com/skip2/go-qrcode"
	"github.com/sso/sso-be/libraries/responses"
	"github.com/sso/sso-be/sso/module/school_people/domain"
	"github.com/xuri/excelize/v2"
)

type Handler struct{ people domain.UseCase }

func NewHandler(people domain.UseCase) *Handler { return &Handler{people: people} }

func (h *Handler) RegisterRoutes(app *fiber.App) {
	api := app.Group("/api/master/people")
	api.Get("/", h.List)
	api.Get("/barcodes/export-excel", h.ExportBarcodesExcel)
	api.Get("/:id", h.Get)
	api.Post("/", h.Create)
	api.Put("/:id", h.Update)
	api.Delete("/:id", h.Delete)
	api.Post("/:id/revoke-barcode", h.Revoke)
	app.Post("/api/barcode/resolve", h.Resolve)
	app.Get("/api/master/people/:id/barcode", h.Barcode)
}

func (h *Handler) List(c *fiber.Ctx) error {
	result, err := h.people.FindAll(c.Context(), c.Query("person_type"))
	if err != nil {
		return c.Status(500).JSON(responses.Fail("SYSTEM_ERROR", err.Error()))
	}
	return c.JSON(responses.Success(result, "Data master berhasil dimuat"))
}

func (h *Handler) Get(c *fiber.Ctx) error {
	result, err := h.people.FindByID(c.Context(), c.Params("id"))
	if err != nil {
		return c.Status(500).JSON(responses.Fail("SYSTEM_ERROR", err.Error()))
	}
	if result == nil {
		return c.Status(404).JSON(responses.Fail("NOT_FOUND", "Data master tidak ditemukan"))
	}
	return c.JSON(responses.Success(result, "Data master berhasil dimuat"))
}

func (h *Handler) Create(c *fiber.Ctx) error {
	var req domain.CreatePersonRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(http.StatusBadRequest).JSON(responses.Fail("BAD_REQUEST", err.Error()))
	}
	result, err := h.people.Create(c.Context(), req)
	if err != nil {
		return c.Status(http.StatusBadRequest).JSON(responses.Fail("CREATE_FAILED", err.Error()))
	}
	return c.Status(http.StatusCreated).JSON(responses.Success(result, "Data master berhasil dibuat"))
}

func (h *Handler) Update(c *fiber.Ctx) error {
	var req domain.UpdatePersonRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(http.StatusBadRequest).JSON(responses.Fail("BAD_REQUEST", err.Error()))
	}
	result, err := h.people.Update(c.Context(), c.Params("id"), req)
	if err != nil {
		return c.Status(http.StatusBadRequest).JSON(responses.Fail("UPDATE_FAILED", err.Error()))
	}
	return c.JSON(responses.Success(result, "Data master berhasil diperbarui"))
}

func (h *Handler) Delete(c *fiber.Ctx) error {
	if err := h.people.Delete(c.Context(), c.Params("id")); err != nil {
		return c.Status(http.StatusBadRequest).JSON(responses.Fail("DELETE_FAILED", err.Error()))
	}
	return c.JSON(responses.Success(true, "Data master berhasil dihapus"))
}

func (h *Handler) Revoke(c *fiber.Ctx) error {
	if err := h.people.RevokeBarcode(c.Context(), c.Params("id")); err != nil {
		return c.Status(http.StatusBadRequest).JSON(responses.Fail("REVOKE_FAILED", err.Error()))
	}
	return c.JSON(responses.Success(true, "Barcode berhasil dicabut"))
}

func (h *Handler) Resolve(c *fiber.Ctx) error {
	var req struct {
		BarcodeToken string `json:"barcode_token"`
		Token        string `json:"token"`
		Code         string `json:"code"`
		Value        string `json:"value"`
		QRCodeToken  string `json:"qr_code_token"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(http.StatusBadRequest).JSON(responses.Fail("BAD_REQUEST", err.Error()))
	}
	token := firstNonEmpty(req.BarcodeToken, req.Token, req.QRCodeToken, req.Code, req.Value)
	token = normalizeBarcodePayload(token)
	result, err := h.people.ResolveBarcode(c.Context(), token)
	if err != nil {
		return c.Status(http.StatusUnauthorized).JSON(responses.Fail("INVALID_BARCODE", err.Error()))
	}
	return c.JSON(responses.Success(result, "Barcode valid"))
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			return value
		}
	}
	return ""
}

// normalizeBarcodePayload keeps the central SSO resolver compatible with QR
// payloads produced by future applications, while preserving raw tokens.
func normalizeBarcodePayload(raw string) string {
	value := strings.TrimSpace(raw)
	value = strings.Trim(value, "\"'")

	if strings.HasPrefix(value, "{") && strings.HasSuffix(value, "}") {
		var payload struct {
			BarcodeToken string `json:"barcode_token"`
			QRCodeToken  string `json:"qr_code_token"`
			Token        string `json:"token"`
			Code         string `json:"code"`
			Value        string `json:"value"`
		}
		if err := json.Unmarshal([]byte(value), &payload); err == nil {
			value = firstNonEmpty(payload.BarcodeToken, payload.QRCodeToken, payload.Token, payload.Code, payload.Value)
		}
	}

	if parsed, err := url.Parse(value); err == nil && parsed.Query() != nil {
		value = firstNonEmpty(
			parsed.Query().Get("barcode_token"),
			parsed.Query().Get("qr_code_token"),
			parsed.Query().Get("token"),
			parsed.Query().Get("code"),
			value,
		)
	}

	return strings.TrimSpace(value)
}

func (h *Handler) Barcode(c *fiber.Ctx) error {
	person, err := h.people.FindByID(c.Context(), c.Params("id"))
	if err != nil || person == nil || person.BarcodeStatus != "ACTIVE" || !person.IsActive {
		return c.Status(http.StatusNotFound).JSON(responses.Fail("NOT_FOUND", "Barcode tidak tersedia"))
	}
	size, _ := strconv.Atoi(c.Query("size", "256"))
	if size < 64 || size > 2048 {
		size = 256
	}
	png, err := qrcode.Encode(person.BarcodeToken, qrcode.Medium, size)
	if err != nil {
		return c.Status(500).JSON(responses.Fail("QR_GEN_ERROR", err.Error()))
	}
	c.Set("Content-Type", "image/png")
	return c.Send(png)
}

var excelSheetInvalidChars = regexp.MustCompile(`[:\\/?*\[\]]+`)

func sanitizeExcelSheetName(name string, used map[string]bool) string {
	cleaned := strings.TrimSpace(excelSheetInvalidChars.ReplaceAllString(name, "-"))
	if cleaned == "" {
		cleaned = "Lainnya"
	}
	if len([]rune(cleaned)) > 28 {
		cleaned = string([]rune(cleaned)[:28])
	}
	base := cleaned
	idx := 2
	for used[strings.ToLower(cleaned)] {
		suffix := fmt.Sprintf("_%d", idx)
		maxBase := 31 - len(suffix)
		if len([]rune(base)) > maxBase {
			cleaned = string([]rune(base)[:maxBase]) + suffix
		} else {
			cleaned = base + suffix
		}
		idx++
	}
	used[strings.ToLower(cleaned)] = true
	return cleaned
}

func (h *Handler) ExportBarcodesExcel(c *fiber.Ctx) error {
	personType := strings.TrimSpace(strings.ToUpper(c.Query("person_type", "")))
	if personType == "ALL" {
		personType = ""
	}
	classFilter := strings.TrimSpace(c.Query("class_name", ""))
	if strings.EqualFold(classFilter, "ALL") {
		classFilter = ""
	}
	searchFilter := strings.TrimSpace(strings.ToLower(c.Query("search", "")))
	separateSheets := !strings.EqualFold(c.Query("separate_sheets", "true"), "false")

	allPeople, err := h.people.FindAll(c.Context(), personType)
	if err != nil {
		return c.Status(500).JSON(responses.Fail("SYSTEM_ERROR", err.Error()))
	}

	filtered := make([]*domain.Person, 0, len(allPeople))
	for _, p := range allPeople {
		if p == nil || !p.IsActive || strings.ToUpper(p.BarcodeStatus) != "ACTIVE" || strings.TrimSpace(p.BarcodeToken) == "" {
			continue
		}
		if classFilter != "" && !strings.EqualFold(strings.TrimSpace(p.ClassName), classFilter) {
			continue
		}
		if searchFilter != "" {
			haystack := strings.ToLower(strings.Join([]string{
				p.FullName, p.NISN, p.NIP, p.ClassName, p.BarcodeToken, p.Position,
			}, " "))
			if !strings.Contains(haystack, searchFilter) {
				continue
			}
		}
		filtered = append(filtered, p)
	}

	if len(filtered) == 0 {
		return c.Status(http.StatusNotFound).JSON(responses.Fail("NOT_FOUND", "Tidak ada data barcode aktif yang sesuai filter"))
	}

	sort.Slice(filtered, func(i, j int) bool {
		ci := strings.ToLower(strings.TrimSpace(filtered[i].ClassName))
		cj := strings.ToLower(strings.TrimSpace(filtered[j].ClassName))
		if ci != cj {
			if ci == "" {
				return false
			}
			if cj == "" {
				return true
			}
			return ci < cj
		}
		return strings.ToLower(strings.TrimSpace(filtered[i].FullName)) < strings.ToLower(strings.TrimSpace(filtered[j].FullName))
	})

	type sheetGroup struct {
		label string
		items []*domain.Person
	}
	var groups []sheetGroup
	if separateSheets && classFilter == "" {
		groupMap := make(map[string]*sheetGroup)
		var order []string
		for _, p := range filtered {
			lbl := strings.TrimSpace(p.ClassName)
			if lbl == "" {
				switch strings.ToUpper(p.PersonType) {
				case "GURU":
					lbl = "Guru"
				case "TENAGA_KEPENDIDIKAN":
					lbl = "Tendik"
				case "KEPALA_SEKOLAH":
					lbl = "Kepala Sekolah"
				default:
					lbl = "Lainnya"
				}
			}
			if _, ok := groupMap[lbl]; !ok {
				groupMap[lbl] = &sheetGroup{label: lbl}
				order = append(order, lbl)
			}
			groupMap[lbl].items = append(groupMap[lbl].items, p)
		}
		for _, k := range order {
			groups = append(groups, *groupMap[k])
		}
	} else {
		lbl := "Barcode Siswa"
		if classFilter != "" {
			lbl = "Kelas " + classFilter
		}
		groups = append(groups, sheetGroup{label: lbl, items: filtered})
	}

	f := excelize.NewFile()
	defer func() { _ = f.Close() }()

	titleStyle, _ := f.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Bold: true, Size: 13, Color: "#0F172A"},
		Alignment: &excelize.Alignment{Horizontal: "center", Vertical: "center"},
	})
	headerStyle, _ := f.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Bold: true, Size: 10, Color: "#FFFFFF"},
		Fill:      excelize.Fill{Type: "pattern", Color: []string{"#1E3A8A"}, Pattern: 1},
		Alignment: &excelize.Alignment{Horizontal: "center", Vertical: "center", WrapText: true},
		Border: []excelize.Border{
			{Type: "left", Color: "#CBD5E1", Style: 1},
			{Type: "right", Color: "#CBD5E1", Style: 1},
			{Type: "top", Color: "#CBD5E1", Style: 1},
			{Type: "bottom", Color: "#CBD5E1", Style: 1},
		},
	})
	cellCenterStyle, _ := f.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Size: 10, Color: "#0F172A"},
		Alignment: &excelize.Alignment{Horizontal: "center", Vertical: "center", WrapText: true},
		Border: []excelize.Border{
			{Type: "left", Color: "#CBD5E1", Style: 1},
			{Type: "right", Color: "#CBD5E1", Style: 1},
			{Type: "top", Color: "#CBD5E1", Style: 1},
			{Type: "bottom", Color: "#CBD5E1", Style: 1},
		},
	})
	cellNameStyle, _ := f.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Bold: true, Size: 10, Color: "#0F172A"},
		Alignment: &excelize.Alignment{Horizontal: "left", Vertical: "center", WrapText: true},
		Border: []excelize.Border{
			{Type: "left", Color: "#CBD5E1", Style: 1},
			{Type: "right", Color: "#CBD5E1", Style: 1},
			{Type: "top", Color: "#CBD5E1", Style: 1},
			{Type: "bottom", Color: "#CBD5E1", Style: 1},
		},
	})
	cellTextStyle, _ := f.NewStyle(&excelize.Style{
		NumFmt:    49, // Text format (@) so leading zeros in NISN/NIP are preserved
		Font:      &excelize.Font{Size: 10, Color: "#1E293B"},
		Alignment: &excelize.Alignment{Horizontal: "center", Vertical: "center", WrapText: true},
		Border: []excelize.Border{
			{Type: "left", Color: "#CBD5E1", Style: 1},
			{Type: "right", Color: "#CBD5E1", Style: 1},
			{Type: "top", Color: "#CBD5E1", Style: 1},
			{Type: "bottom", Color: "#CBD5E1", Style: 1},
		},
	})

	usedSheetNames := make(map[string]bool)
	firstSheet := true
	fitToPage := true
	pageSizeA4 := 9
	orientationPortrait := "portrait"
	fitWidth := 1
	fitHeight := 0

	for _, grp := range groups {
		sheetName := sanitizeExcelSheetName(grp.label, usedSheetNames)
		if firstSheet {
			_ = f.SetSheetName("Sheet1", sheetName)
			firstSheet = false
		} else {
			_, _ = f.NewSheet(sheetName)
		}

		// Column widths
		_ = f.SetColWidth(sheetName, "A", "A", 6)
		_ = f.SetColWidth(sheetName, "B", "B", 34)
		_ = f.SetColWidth(sheetName, "C", "C", 16)
		_ = f.SetColWidth(sheetName, "D", "D", 18)
		_ = f.SetColWidth(sheetName, "E", "E", 26)
		_ = f.SetColWidth(sheetName, "F", "F", 19)

		// Title row
		_ = f.MergeCell(sheetName, "A1", "F1")
		_ = f.SetRowHeight(sheetName, 1, 28)
		_ = f.SetCellValue(sheetName, "A1", fmt.Sprintf("DAFTAR BARCODE CIVITAS SMP NEGERI 1 PRAMBON — %s", strings.ToUpper(grp.label)))
		_ = f.SetCellStyle(sheetName, "A1", "F1", titleStyle)

		// Header row
		_ = f.SetRowHeight(sheetName, 2, 24)
		headers := []string{"No", "Nama Lengkap", "Kelas / Jabatan", "NISN / NIP", "Token Barcode", "QR Code"}
		for colIdx, hTitle := range headers {
			cell, _ := excelize.CoordinatesToCellName(colIdx+1, 2)
			_ = f.SetCellValue(sheetName, cell, hTitle)
		}
		_ = f.SetCellStyle(sheetName, "A2", "F2", headerStyle)

		// Data rows + embedded QR PNG
		for i, p := range grp.items {
			rowNum := i + 3
			_ = f.SetRowHeight(sheetName, rowNum, 94)

			classOrPos := strings.TrimSpace(p.ClassName)
			if classOrPos == "" {
				classOrPos = firstNonEmpty(strings.TrimSpace(p.Position), p.PersonType)
			}
			identityNum := firstNonEmpty(strings.TrimSpace(p.NISN), strings.TrimSpace(p.NIP), "-")

			_ = f.SetCellValue(sheetName, fmt.Sprintf("A%d", rowNum), i+1)
			_ = f.SetCellValue(sheetName, fmt.Sprintf("B%d", rowNum), strings.ToUpper(strings.TrimSpace(p.FullName)))
			_ = f.SetCellValue(sheetName, fmt.Sprintf("C%d", rowNum), strings.ToUpper(classOrPos))
			_ = f.SetCellStr(sheetName, fmt.Sprintf("D%d", rowNum), identityNum)
			_ = f.SetCellStr(sheetName, fmt.Sprintf("E%d", rowNum), p.BarcodeToken)

			_ = f.SetCellStyle(sheetName, fmt.Sprintf("A%d", rowNum), fmt.Sprintf("A%d", rowNum), cellCenterStyle)
			_ = f.SetCellStyle(sheetName, fmt.Sprintf("B%d", rowNum), fmt.Sprintf("B%d", rowNum), cellNameStyle)
			_ = f.SetCellStyle(sheetName, fmt.Sprintf("C%d", rowNum), fmt.Sprintf("C%d", rowNum), cellCenterStyle)
			_ = f.SetCellStyle(sheetName, fmt.Sprintf("D%d", rowNum), fmt.Sprintf("E%d", rowNum), cellTextStyle)
			_ = f.SetCellStyle(sheetName, fmt.Sprintf("F%d", rowNum), fmt.Sprintf("F%d", rowNum), cellCenterStyle)

			if pngBytes, qErr := qrcode.Encode(p.BarcodeToken, qrcode.Medium, 160); qErr == nil {
				_ = f.AddPictureFromBytes(sheetName, fmt.Sprintf("F%d", rowNum), &excelize.Picture{
					Extension: ".png",
					File:      pngBytes,
					Format: &excelize.GraphicOptions{
						ScaleX:      0.68,
						ScaleY:      0.68,
						OffsetX:     10,
						OffsetY:     6,
						Positioning: "oneCell",
					},
				})
			}
		}

		// Print setup: A4 portrait, fit all columns on 1 page wide
		_ = f.SetSheetProps(sheetName, &excelize.SheetPropsOptions{FitToPage: &fitToPage})
		_ = f.SetPageLayout(sheetName, &excelize.PageLayoutOptions{
			Size:        &pageSizeA4,
			Orientation: &orientationPortrait,
			FitToWidth:  &fitWidth,
			FitToHeight: &fitHeight,
		})
	}

	var buf bytes.Buffer
	if err := f.Write(&buf); err != nil {
		return c.Status(500).JSON(responses.Fail("EXCEL_ERROR", "Gagal menyusun file Excel: "+err.Error()))
	}

	scopeTag := "Semua_Siswa"
	if classFilter != "" {
		scopeTag = "Kelas_" + strings.ReplaceAll(classFilter, " ", "_")
	} else if personType != "" && personType != "SISWA" {
		scopeTag = personType
	}
	filename := fmt.Sprintf("Barcode_%s_%s.xlsx", scopeTag, time.Now().Format("20060102"))

	c.Set("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	c.Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, filename))
	return c.Send(buf.Bytes())
}
