/**
 * Excel & CSV Helper for Digital Library Book Import / Export
 */

export const BOOK_TEMPLATE_COLUMNS = [
  "Judul Buku",
  "Pengarang",
  "Penerbit",
  "Kota Terbit",
  "Tahun Terbit",
  "ISBN",
  "Jumlah Eksemplar",
  "Klasifikasi DDC",
  "Kategori (Opsional)",
  "Deskripsi (Opsional)",
];

export const SAMPLE_BOOK_IMPORT_DATA = [
  {
    JudulBuku: "Bumi Manusia",
    Pengarang: "Pramoedya Ananta Toer",
    Penerbit: "Lentera Dipantara",
    KotaTerbit: "Jakarta",
    TahunTerbit: 1980,
    ISBN: "978-979-97312-3-4",
    JumlahEksemplar: 4,
    KlasifikasiDDC: "813",
    Kategori: "Kesusastraan & Novel",
    Deskripsi: "Kisah roman sejarah pergerakan kebangkitan nasional Indonesia di era kolonial Belanda.",
  },
  {
    JudulBuku: "Atomic Habits: Perubahan Kecil yang Memberikan Hasil Luar Biasa",
    Pengarang: "James Clear",
    Penerbit: "Gramedia Pustaka Utama",
    KotaTerbit: "Jakarta",
    TahunTerbit: 2019,
    ISBN: "978-602-06-3318-3",
    JumlahEksemplar: 5,
    KlasifikasiDDC: "158.1",
    Kategori: "Pengembangan Diri",
    Deskripsi: "Strategi praktis membangun kebiasaan baik dan menghilangkan kebiasaan buruk setiap hari.",
  },
  {
    JudulBuku: "Cosmos: Menjelajahi Alam Semesta",
    Pengarang: "Carl Sagan",
    Penerbit: "Kepustakaan Populer Gramedia",
    KotaTerbit: "Jakarta",
    TahunTerbit: 2016,
    ISBN: "978-602-424-695-2",
    JumlahEksemplar: 2,
    KlasifikasiDDC: "520",
    Kategori: "Sains & Astronomi",
    Deskripsi: "Eksplorasi ilmu falak dan evolusi pemikiran manusia tentang alam semesta yang maha luas.",
  },
  {
    JudulBuku: "Matematika untuk SMP/MTs Kelas VII",
    Pengarang: "Tim Kemendikbudristek",
    Penerbit: "Pusat Perbukuan Kemendikbud",
    KotaTerbit: "Jakarta",
    TahunTerbit: 2022,
    ISBN: "978-602-244-883-9",
    JumlahEksemplar: 30,
    KlasifikasiDDC: "510",
    Kategori: "Buku Paket Pelajaran",
    Deskripsi: "Buku teks utama mata pelajaran Matematika Kurikulum Merdeka untuk jenjang SMP Kelas 7.",
  },
];

export function getCategoryFromDDC(ddc) {
  if (!ddc) return "Umum";
  const cleaned = String(ddc).trim().replace(/[^0-9]/g, "");
  if (!cleaned) return "Umum";
  const num = parseInt(cleaned.slice(0, 3).padEnd(3, "0"), 10);
  if (num < 100) return "Karya Umum & Komputer";
  if (num < 200) return "Filsafat & Psikologi";
  if (num < 300) return "Agama";
  if (num < 400) return "Ilmu Sosial & Pendidikan";
  if (num < 500) return "Bahasa & Linguistik";
  if (num < 600) return "Sains & Matematika";
  if (num < 700) return "Teknologi & Terapan";
  if (num < 800) return "Kesenian & Olahraga";
  if (num < 900) return "Kesusastraan & Novel";
  if (num < 1000) return "Sejarah & Geografi";
  return "Umum";
}

export function generateCallNumber(ddc, author, title) {
  const ddcPart = String(ddc || "000").trim();
  const authorClean = String(author || "ANN").trim().replace(/[^a-zA-Z]/g, "");
  const authorPart =
    authorClean.length >= 3
      ? authorClean.slice(0, 3).toUpperCase()
      : authorClean.padEnd(3, "X").toUpperCase();
  const titleClean = String(title || "b").trim().replace(/[^a-zA-Z]/g, "");
  const titlePart = titleClean.length > 0 ? titleClean.slice(0, 1).toLowerCase() : "b";
  return `${ddcPart} ${authorPart} ${titlePart}`;
}

/**
 * Parses raw CSV or text content into an array of book objects.
 */
export function parseBookCSV(content) {
  const lines = content.split(/\r?\n/).filter((line) => line.trim() !== "");
  if (lines.length <= 1) return [];

  const delimiter = lines[0].includes(";") ? ";" : ",";
  const headerTokens = splitCSVLine(lines[0], delimiter).map((h) =>
    h.trim().toLowerCase().replace(/[^a-z0-9]/g, "")
  );

  const results = [];
  for (let i = 1; i < lines.length; i++) {
    const rawCols = splitCSVLine(lines[i], delimiter);
    if (rawCols.length < 2) continue;

    const row = {};
    headerTokens.forEach((key, idx) => {
      row[key] = (rawCols[idx] || "").trim();
    });

    const title =
      row["judulbuku"] ||
      row["judul"] ||
      row["title"] ||
      row["namabuku"] ||
      rawCols[0] ||
      "";

    const author =
      row["pengarang"] ||
      row["penulis"] ||
      row["author"] ||
      rawCols[1] ||
      "";

    const publisher =
      row["penerbit"] ||
      row["publisher"] ||
      rawCols[2] ||
      "";

    const city =
      row["kotaterbit"] ||
      row["kota"] ||
      row["city"] ||
      rawCols[3] ||
      "";

    const rawYear =
      row["tahunterbit"] ||
      row["tahun"] ||
      row["year"] ||
      rawCols[4] ||
      "";
    const year = parseInt(String(rawYear).replace(/[^0-9]/g, ""), 10);

    const isbn =
      row["isbn"] ||
      row["no_isbn"] ||
      rawCols[5] ||
      "";

    const rawCopies =
      row["jumlaheksemplar"] ||
      row["eksemplar"] ||
      row["jumlah"] ||
      row["copies"] ||
      rawCols[6] ||
      "";
    const copies = parseInt(String(rawCopies).replace(/[^0-9]/g, ""), 10);

    const ddc =
      row["klasifikasiddc"] ||
      row["ddc"] ||
      row["klasifikasi"] ||
      rawCols[7] ||
      "";

    let category =
      row["kategoriopsional"] ||
      row["kategori"] ||
      row["category"] ||
      "";
    if (!category) {
      category = getCategoryFromDDC(ddc);
    }

    const desc =
      row["deskripsiopsional"] ||
      row["deskripsi"] ||
      row["description"] ||
      row["sinopsis"] ||
      "";

    const callNumber = generateCallNumber(ddc, author, title);

    let fullPublisher = publisher;
    if (city && publisher && !publisher.includes(city)) {
      fullPublisher = `${city} : ${publisher}`;
    } else if (city && !publisher) {
      fullPublisher = city;
    }

    if (title && author) {
      results.push({
        title,
        isbn: isbn || "-",
        author,
        publisher: fullPublisher,
        publish_year: isNaN(year) || year <= 0 ? new Date().getFullYear() : year,
        category,
        call_number: callNumber,
        ddc: ddc || "000",
        city: city || "",
        copies_count: isNaN(copies) || copies <= 0 ? 1 : copies,
        description: desc,
      });
    }
  }

  return results;
}

function splitCSVLine(line, delimiter) {
  const tokens = [];
  let inQuotes = false;
  let current = "";

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === delimiter && !inQuotes) {
      tokens.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  tokens.push(current);
  return tokens;
}

/**
 * Triggers client-side browser download for standard CSV / Excel template.
 */
export function downloadBookImportTemplate(includeSample = true) {
  let csvContent = BOOK_TEMPLATE_COLUMNS.join(",") + "\n";
  const dataToExport = includeSample ? SAMPLE_BOOK_IMPORT_DATA : [];

  dataToExport.forEach((item) => {
    const row = [
      `"${(item.JudulBuku || "").replace(/"/g, '""')}"`,
      `"${(item.Pengarang || "").replace(/"/g, '""')}"`,
      `"${(item.Penerbit || "").replace(/"/g, '""')}"`,
      `"${(item.KotaTerbit || "").replace(/"/g, '""')}"`,
      item.TahunTerbit || 2024,
      `"${item.ISBN || ""}"`,
      item.JumlahEksemplar || 1,
      `"${item.KlasifikasiDDC || ""}"`,
      `"${(item.Kategori || "").replace(/"/g, '""')}"`,
      `"${(item.Deskripsi || "").replace(/"/g, '""')}"`,
    ];
    csvContent += row.join(",") + "\n";
  });

  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", "template_import_buku_perpustakaan.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Excel & CSV Helper for Member (Siswa & Guru) Import
 */
/**
 * Excel & CSV Helper for Member (Siswa & Guru) Import
 * Sesuai dengan kolom tabel sistem:
 * Nama Lengkap, Peran, NISN / NIP, Kelas / Jabatan, Email, No Telepon, Batas Pinjam
 */
export const MEMBER_TEMPLATE_COLUMNS = [
  "Nama Lengkap",
  "Peran (SISWA / GURU)",
  "NISN / NIP",
  "Kelas / Jabatan",
  "Email",
  "No Telepon",
  "Batas Pinjam",
];

export const SAMPLE_MEMBER_IMPORT_DATA = [
  {
    NamaLengkap: "Muhammad Rayhan Al-Fatih",
    Peran: "SISWA",
    NomorIdentitas: "0081293815",
    KelasAtauJabatan: "VII-A",
    Email: "rayhan.fatih@smpn1prambon.sch.id",
    NomorHP: "081298765431",
    BatasPinjam: 3,
  },
  {
    NamaLengkap: "Annisa Rahmadani",
    Peran: "SISWA",
    NomorIdentitas: "0081293816",
    KelasAtauJabatan: "VIII-B",
    Email: "annisa.r@smpn1prambon.sch.id",
    NomorHP: "081298765432",
    BatasPinjam: 3,
  },
  {
    NamaLengkap: "Budi Santoso, S.Pd",
    Peran: "GURU",
    NomorIdentitas: "NIP. 198503122010121001",
    KelasAtauJabatan: "Guru Matematika",
    Email: "budi@smpn1prambon.sch.id",
    NomorHP: "081234567891",
    BatasPinjam: 5,
  },
  {
    NamaLengkap: "Siti Aminah, S.Pd",
    Peran: "GURU",
    NomorIdentitas: "NIP. 198802022012022002",
    KelasAtauJabatan: "Guru Bahasa Indonesia",
    Email: "siti@smpn1prambon.sch.id",
    NomorHP: "081234567892",
    BatasPinjam: 5,
  },
  {
    NamaLengkap: "Dra. Hj. Sri Wahyuni, M.Pd",
    Peran: "GURU",
    NomorIdentitas: "NIP. 197805122005012003",
    KelasAtauJabatan: "Guru IPA",
    Email: "sri.wahyuni@smpn1prambon.sch.id",
    NomorHP: "081387654321",
    BatasPinjam: 5,
  },
  {
    NamaLengkap: "Zahra Salsabila",
    Peran: "SISWA",
    NomorIdentitas: "0081293817",
    KelasAtauJabatan: "IX-A",
    Email: "zahra.s@smpn1prambon.sch.id",
    NomorHP: "081298765433",
    BatasPinjam: 3,
  },
];

export function parseMemberCSV(content) {
  const lines = content.split(/\r?\n/).filter((line) => line.trim() !== "");
  if (lines.length <= 1) return [];

  const delimiter = lines[0].includes(";") ? ";" : ",";
  const headerTokens = splitCSVLine(lines[0], delimiter).map((h) =>
    h.trim().toLowerCase().replace(/[^a-z0-9]/g, "")
  );

  const isDapodikFormat =
    headerTokens.includes("nisn") &&
    (headerTokens.includes("namasiswa") || headerTokens.includes("nama"));

  const results = [];
  for (let i = 1; i < lines.length; i++) {
    const rawCols = splitCSVLine(lines[i], delimiter);
    if (rawCols.length < 2) continue;

    const row = {};
    headerTokens.forEach((key, idx) => {
      row[key] = (rawCols[idx] || "").trim();
    });

    // 1. Nama Siswa / Anggota
    let fullName =
      row["namasiswa"] ||
      row["namalengkap"] ||
      row["nama"] ||
      row["name"] ||
      "";
    if (!fullName && isDapodikFormat && rawCols.length >= 2) {
      fullName = rawCols[1].trim();
    } else if (!fullName && !isDapodikFormat) {
      fullName = rawCols[0].trim();
    }

    // 2. NISN / NIP
    let identityNumber =
      row["nisn"] ||
      row["nisnnip"] ||
      row["nomoridentitas"] ||
      row["nip"] ||
      row["nis"] ||
      "";
    if (!identityNumber && isDapodikFormat && rawCols.length >= 1) {
      identityNumber = rawCols[0].trim();
    } else if (!identityNumber && rawCols.length >= 3) {
      identityNumber = rawCols[2].trim();
    }

    // 3. Peran (Siswa atau Guru)
    const rawRole = (
      row["peransiswaguru"] ||
      row["peran"] ||
      row["tipeanggota"] ||
      row["tipe"] ||
      row["role"] ||
      ""
    ).toUpperCase();

    let memberType = "SISWA";
    if (
      rawRole.includes("GURU") ||
      rawRole.includes("TEACHER") ||
      rawRole.includes("STAFF") ||
      rawRole.includes("DOSEN") ||
      identityNumber.toUpperCase().includes("NIP")
    ) {
      memberType = "GURU";
    }

    // 4. Kelas / Rombel / Jabatan
    let className =
      row["kelas"] ||
      row["kelasjabatan"] ||
      row["kelasataujabatan"] ||
      row["rombel"] ||
      row["jabatan"] ||
      "";
    if (!className && isDapodikFormat && rawCols.length >= 4) {
      className = rawCols[3].trim();
    }
    if (!className) {
      className = memberType === "GURU" ? "Guru Pengajar" : "IX-A";
    }

    // 5. Jenis Kelamin (JK)
    const gender = (row["jk"] || row["jeniskelamin"] || row["gender"] || "").toUpperCase();

    // 6. Email & Phone (Opsional - tidak wajib)
    const email = row["email"] || "";
    const phone =
      row["notelepon"] ||
      row["nomorhp"] ||
      row["nohp"] ||
      row["hp"] ||
      row["telepon"] ||
      "";

    // 7. Batas Pinjam (Default 3 untuk siswa, 5 untuk guru)
    const limit = parseInt(
      row["bataspinjam"] ||
        row["limit"] ||
        (memberType === "GURU" ? "5" : "3"),
      10
    );

    if (fullName) {
      results.push({
        id: `usr-${Date.now()}-${i}`,
        full_name: fullName,
        member_type: memberType,
        identity_number: identityNumber || `NISN-${Date.now()}-${i}`,
        class_name: className,
        gender: gender === "L" || gender === "LAKI-LAKI" ? "L" : gender === "P" || gender === "PEREMPUAN" ? "P" : "",
        email: email,
        phone: phone,
        max_borrow_limit: isNaN(limit) ? (memberType === "GURU" ? 5 : 3) : limit,
        is_enrolled: false,
        photo_url: null,
      });
    }
  }

  return results;
}

export function downloadMemberImportTemplate(includeSample = true) {
  let csvContent = MEMBER_TEMPLATE_COLUMNS.join(",") + "\n";
  const dataToExport = includeSample ? SAMPLE_MEMBER_IMPORT_DATA : [];

  dataToExport.forEach((item) => {
    const row = [
      `"${item.NamaLengkap.replace(/"/g, '""')}"`,
      `"${item.Peran || item.TipeAnggota || 'SISWA'}"`,
      `"${item.NomorIdentitas}"`,
      `"${item.KelasAtauJabatan}"`,
      `"${item.Email}"`,
      `"${item.NomorHP}"`,
      item.BatasPinjam,
    ];
    csvContent += row.join(",") + "\n";
  });

  const blob = new Blob(["\uFEFF" + csvContent], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", "template_import_siswa_guru_smpn1prambon.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Download template khusus format siswa Dapodik (4 kolom: NISN, NAMA SISWA, JK, KELAS)
 */
export function downloadStudentDapodikTemplate(includeSample = true) {
  let csvContent = "NISN,NAMA SISWA,JK,KELAS\n";
  if (includeSample) {
    csvContent += '0126622085,"ACHMAD AFAN MAULANA",L,IX-A\n';
    csvContent += '0128145575,"ACHMAD DAVIN DWI OCTAVIAN",L,IX-A\n';
    csvContent += '0123561441,"AISYAH LAILATUL MUFIDAH",P,IX-A\n';
    csvContent += '0125891234,"ANINDA PUTRI LESTARI",P,VII-B\n';
    csvContent += '0129876543,"BAGAS SURYA PRATAMA",L,VIII-A\n';
  }

  const blob = new Blob(["\uFEFF" + csvContent], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", "template_dapodik_siswa_smpn1prambon.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

