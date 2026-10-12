# Spenspra Design Tokens Terpusat

Dokumen implementasi teknis dan token desain terpusat untuk ekosistem digital SMP Negeri 1 Prambon (SSO, e-Rapor, dan e-Perpustakaan) yang merujuk pada `DESIGN fix.md`.

## 1. Lokasi Berkas Terpusat
- **CSS Design Tokens:** [`shared/styles/design-tokens.css`](./design-tokens.css)
- **JavaScript Design Tokens:** [`shared/styles/designTokens.js`](./designTokens.js)

## 2. Palet Warna (Color System)
- **Primary (Purple):**
  - `50`: `#FAF9FD`
  - `100`: `#EDEAF5`
  - `300`: `#B9B0D2`
  - `500`: `#4B3B78` (Main Brand, Tombol Primary, Menu Aktif)
  - `700`: `#3D2E66` (Hover State)
  - `800`: `#30264F` (Active State / Dark Text)
  - `1000`: `#171329` (Deep Brand)
- **Secondary (Blue):**
  - `50`: `#F8FCFE`
  - `100`: `#E4F1F8`
  - `300`: `#A8CBDD`
  - `500`: `#4F8FBB` (Aksi Sekunder / Aksentuasi Informasi)
  - `700`: `#397394`
  - `800`: `#2E607C`
  - `1000`: `#183A4B`
- **Accent (Yellow):**
  - `50`: `#FFFDF5`, `100`: `#FFF6D6`, `300`: `#F9DD82`, `500`: `#F2C94C`, `700`: `#D8A91F`, `800`: `#A97E0D`, `1000`: `#5C4305`
- **Success (Green):**
  - `50`: `#F7FCF9`, `300`: `#A9D8BC`, `500`: `#2E7D5B`, `800`: `#1C5038`
- **Danger (Red):**
  - `50`: `#FFF9F8`, `300`: `#F1B4AC`, `500`: `#C0392B`, `800`: `#7D261E`
- **Neutral:**
  - `50`: `#FFFFFF` (Surface Card/Modal)
  - `100`: `#F8F9FC` (Background Aplikasi)
  - `300`: `#E5E7EB` (Borders & Dividers)
  - `500`: `#98A2B3` (Placeholder & Helper)
  - `700`: `#667085` (Teks Sekunder)
  - `800`: `#344054` (Label Form & Heading Kecil)
  - `1000`: `#172033` (Teks Utama)

## 3. Tipografi (Typography)
- **Font Utama:** `Poppins`, fallback `system-ui, sans-serif`.
- **Hierarki:** Display (32px Bold), H1 (28px Bold), H2 (24px Bold), H3 (20px Bold), Body Large (16px SemiBold), Body (16px Regular), Small (12px Regular), Caption (10px Regular).

## 4. Radius & Shadow
- **Radius:** SM (6px - Input), MD (8px - Button), LG (12px - Card), XL (16px - Modal), FULL (999px - Badge & Avatar).
- **Shadow:** SM (`0 1px 2px rgba(23,32,51,0.08)`), MD (`0 4px 12px rgba(23,32,51,0.08)`), LG (`0 12px 24px rgba(23,32,51,0.12)`).

## 5. Status Penerapan Saat Ini
- [x] **Portal SSO (`sso/frontend_fr`)**:
  - `globals.css` (Tailwind v4 `@theme` + CSS Variables)
  - `theme/theme.js` (MUI Theme Registry)
  - `Navbar.jsx`, `Sidebar.jsx`, `page.jsx`, `login/page.jsx`
- [x] **Sistem e-Rapor (`rapor/frontend_fr`)**:
  - `globals.css` (Tailwind v4 `@theme` + CSS Variables)
  - `theme/theme.js` (MUI Theme Registry)
  - `Navbar.jsx`, `Sidebar.jsx`, `page.jsx`
