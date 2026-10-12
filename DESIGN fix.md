# DESIGN.md — Design System UI/UX

Dokumen acuan desain untuk seluruh antarmuka. Semua komponen **wajib** memakai token di bawah ini, bukan nilai hardcode.

---

## 1. Typography

**Font family:** Poppins (fallback: `system-ui, sans-serif`)

| Token        | Ukuran | Weight   | Penggunaan                        |
| ------------ | ------ | -------- | --------------------------------- |
| Display      | 32px   | Bold 700 | Judul hero / angka besar          |
| Header 1     | 28px   | Bold 700 | Judul halaman                     |
| Header 2     | 24px   | Bold 700 | Judul section                     |
| Header 3     | 20px   | Bold 700 | Judul card / sub-section          |
| Body Large   | 16px   | SemiBold 600 | Teks penekanan, label tombol  |
| Body         | 16px   | Regular 400 | Teks isi utama                 |
| Small        | 12px   | Regular 400 | Teks bantu, helper text, tabel |
| Caption      | 10px   | Regular 400 | Keterangan kecil, metadata     |

```css
:root {
  --font-sans: "Poppins", system-ui, sans-serif;

  --text-display: 700 32px/1.25 var(--font-sans);
  --text-h1: 700 28px/1.3 var(--font-sans);
  --text-h2: 700 24px/1.3 var(--font-sans);
  --text-h3: 700 20px/1.4 var(--font-sans);
  --text-body-lg: 600 16px/1.5 var(--font-sans);
  --text-body: 400 16px/1.5 var(--font-sans);
  --text-small: 400 12px/1.5 var(--font-sans);
  --text-caption: 400 10px/1.4 var(--font-sans);
}
```

> Teks utama memakai `neutral-1000`, teks sekunder `neutral-700`, placeholder/disabled `neutral-500`.

---

## 2. Color System

**Skala:** `50 → 100 → 300 → 500 → 700 → 800 → 1000`

| Level | Fungsi                |
| ----- | --------------------- |
| 50    | Paling terang         |
| 100   | Light background      |
| 300   | Border / subtle       |
| 500   | Main color            |
| 700   | Hover / strong        |
| 800   | Active / dark text    |
| 1000  | Darkest / deep brand  |

### Primary — Purple
| Level | Hex       |
| ----- | --------- |
| 50    | `#FAF9FD` |
| 100   | `#EDEAF5` |
| 300   | `#B9B0D2` |
| 500   | `#4B3B78` |
| 700   | `#3D2E66` |
| 800   | `#30264F` |
| 1000  | `#171329` |

### Secondary — Blue
| Level | Hex       |
| ----- | --------- |
| 50    | `#F8FCFE` |
| 100   | `#E4F1F8` |
| 300   | `#A8CBDD` |
| 500   | `#4F8FBB` |
| 700   | `#397394` |
| 800   | `#2E607C` |
| 1000  | `#183A4B` |

### Accent — Yellow
| Level | Hex       |
| ----- | --------- |
| 50    | `#FFFDF5` |
| 100   | `#FFF6D6` |
| 300   | `#F9DD82` |
| 500   | `#F2C94C` |
| 700   | `#D8A91F` |
| 800   | `#A97E0D` |
| 1000  | `#5C4305` |

### Success — Green
| Level | Hex       |
| ----- | --------- |
| 50    | `#F7FCF9` |
| 300   | `#A9D8BC` |
| 500   | `#2E7D5B` |
| 800   | `#1C5038` |

### Danger — Red
| Level | Hex       |
| ----- | --------- |
| 50    | `#FFF9F8` |
| 300   | `#F1B4AC` |
| 500   | `#C0392B` |
| 800   | `#7D261E` |

### Neutral
| Level | Hex       |
| ----- | --------- |
| 50    | `#FFFFFF` |
| 100   | `#F8F9FC` |
| 300   | `#E5E7EB` |
| 500   | `#98A2B3` |
| 700   | `#667085` |
| 800   | `#344054` |
| 1000  | `#172033` |

```css
:root {
  /* Primary */
  --primary-50: #FAF9FD;  --primary-100: #EDEAF5; --primary-300: #B9B0D2;
  --primary-500: #4B3B78; --primary-700: #3D2E66; --primary-800: #30264F; --primary-1000: #171329;

  /* Secondary */
  --secondary-50: #F8FCFE;  --secondary-100: #E4F1F8; --secondary-300: #A8CBDD;
  --secondary-500: #4F8FBB; --secondary-700: #397394; --secondary-800: #2E607C; --secondary-1000: #183A4B;

  /* Accent */
  --accent-50: #FFFDF5;  --accent-100: #FFF6D6; --accent-300: #F9DD82;
  --accent-500: #F2C94C; --accent-700: #D8A91F; --accent-800: #A97E0D; --accent-1000: #5C4305;

  /* Success */
  --success-50: #F7FCF9; --success-300: #A9D8BC; --success-500: #2E7D5B; --success-800: #1C5038;

  /* Danger */
  --danger-50: #FFF9F8; --danger-300: #F1B4AC; --danger-500: #C0392B; --danger-800: #7D261E;

  /* Neutral */
  --neutral-50: #FFFFFF;  --neutral-100: #F8F9FC; --neutral-300: #E5E7EB;
  --neutral-500: #98A2B3; --neutral-700: #667085; --neutral-800: #344054; --neutral-1000: #172033;
}
```

### Aturan pemakaian warna
- **Primary** untuk aksi utama (tombol primary, link aktif, elemen brand).
- **Secondary** untuk aksi pendukung, informasi, dan highlight non-kritis.
- **Accent (Yellow)** hanya untuk penekanan kecil: badge, notifikasi, ikon sorotan — jangan jadi warna dominan.
- **Success** untuk status berhasil/selesai/hadir; **Danger** untuk error, hapus, dan status gagal.
- Background halaman `neutral-100`, permukaan card/modal `neutral-50`, border `neutral-300`.
- State interaksi: default `500` → hover `700` → active `800`.

---

## 3. Border Radius

| Token | Nilai  |
| ----- | ------ |
| SM    | 6px    |
| MD    | 8px    |
| LG    | 12px   |
| XL    | 16px   |
| FULL  | 999px  |

| Komponen | Radius      |
| -------- | ----------- |
| Button   | 8px (MD)    |
| Input    | 6px (SM)    |
| Card     | 12px (LG)   |
| Modal    | 16px (XL)   |
| Badge    | 999px (FULL)|
| Avatar   | 999px (FULL)|

```css
:root {
  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  --radius-full: 999px;
}
```

---

## 4. Shadow

| Token | Penggunaan |
| ----- | ---------- |
| SM    | Button     |
| MD    | Card       |
| LG    | Opsional (dropdown, popover, modal) |

> Nilai blur/offset tidak tercantum di desain asli. Nilai berikut adalah usulan yang selaras dengan warna brand — sesuaikan jika ada spesifikasi dari desainer.

```css
:root {
  --shadow-sm: 0 1px 2px rgba(23, 32, 51, 0.08);
  --shadow-md: 0 4px 12px rgba(23, 32, 51, 0.08);
  --shadow-lg: 0 12px 24px rgba(23, 32, 51, 0.12);
}
```

---

## 5. Spesifikasi Komponen

### Button
- Radius `8px`, shadow `sm`, font Body Large (16px / 600).
- **Primary:** bg `primary-500`, teks `neutral-50`; hover `primary-700`; active `primary-800`.
- **Secondary:** bg `secondary-500`, teks `neutral-50`; hover `secondary-700`; active `secondary-800`.
- **Outline:** border `neutral-300`, teks `neutral-1000`; hover bg `neutral-100`.
- **Danger:** bg `danger-500`, teks `neutral-50`; active `danger-800`.
- **Disabled:** bg `neutral-300`, teks `neutral-500`, tanpa shadow.

### Input
- Radius `6px`, border `1px neutral-300`, bg `neutral-50`, teks Body.
- Placeholder `neutral-500`; label Small/Body Large `neutral-800`.
- Focus: border `primary-500` + ring `primary-100`.
- Error: border `danger-500`, helper text `danger-500` (Small).

### Card
- Radius `12px`, bg `neutral-50`, border `1px neutral-300` (opsional), shadow `md`.
- Judul memakai Header 3, isi memakai Body.

### Modal
- Radius `16px`, bg `neutral-50`, shadow `lg`, overlay `neutral-1000` opacity 50%.
- Judul Header 2 atau Header 3.

### Badge
- Radius `999px`, teks Small (12px / 600).
- Warna: `{warna}-100` sebagai background, `{warna}-800` sebagai teks (contoh: success → bg `success-50`, teks `success-800`).

### Avatar
- Bentuk lingkaran (`999px`), fallback inisial bg `primary-100`, teks `primary-700`.

### Tabel & Daftar
- Header tabel bg `neutral-100`, teks Small 600 `neutral-700`.
- Baris dipisah border `neutral-300`; hover baris `primary-50`.

---

## 6. Prinsip Umum

1. **Konsisten:** gunakan token, jangan membuat ukuran, warna, atau radius baru.
2. **Hierarki jelas:** satu aksi primary per area; sisanya secondary/outline.
3. **Kontras terbaca:** teks di atas `primary-500/700/800` memakai `neutral-50`; teks di atas level 50–300 memakai `neutral-1000` atau `neutral-800`.
4. **Ruang napas:** gunakan spacing kelipatan 4px (4, 8, 12, 16, 24, 32).
5. **Sederhana:** hindari gradien, efek berlebihan, atau dekorasi yang tidak ada di design system.

---

## 7. Konfigurasi Tailwind (opsional)

```js
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      fontFamily: { sans: ["Poppins", "system-ui", "sans-serif"] },
      fontSize: {
        display: ["32px", { lineHeight: "1.25", fontWeight: "700" }],
        h1: ["28px", { lineHeight: "1.3", fontWeight: "700" }],
        h2: ["24px", { lineHeight: "1.3", fontWeight: "700" }],
        h3: ["20px", { lineHeight: "1.4", fontWeight: "700" }],
        body: ["16px", { lineHeight: "1.5" }],
        small: ["12px", { lineHeight: "1.5" }],
        caption: ["10px", { lineHeight: "1.4" }],
      },
      borderRadius: { sm: "6px", md: "8px", lg: "12px", xl: "16px", full: "999px" },
      boxShadow: {
        sm: "0 1px 2px rgba(23,32,51,0.08)",
        md: "0 4px 12px rgba(23,32,51,0.08)",
        lg: "0 12px 24px rgba(23,32,51,0.12)",
      },
      colors: {
        primary: { 50: "#FAF9FD", 100: "#EDEAF5", 300: "#B9B0D2", 500: "#4B3B78", 700: "#3D2E66", 800: "#30264F", 1000: "#171329" },
        secondary: { 50: "#F8FCFE", 100: "#E4F1F8", 300: "#A8CBDD", 500: "#4F8FBB", 700: "#397394", 800: "#2E607C", 1000: "#183A4B" },
        accent: { 50: "#FFFDF5", 100: "#FFF6D6", 300: "#F9DD82", 500: "#F2C94C", 700: "#D8A91F", 800: "#A97E0D", 1000: "#5C4305" },
        success: { 50: "#F7FCF9", 300: "#A9D8BC", 500: "#2E7D5B", 800: "#1C5038" },
        danger: { 50: "#FFF9F8", 300: "#F1B4AC", 500: "#C0392B", 800: "#7D261E" },
        neutral: { 50: "#FFFFFF", 100: "#F8F9FC", 300: "#E5E7EB", 500: "#98A2B3", 700: "#667085", 800: "#344054", 1000: "#172033" },
      },
    },
  },
};
```
