import React from 'react';
import { KOP_IMAGE_DATA_URI, WATERMARK_IMAGE_DATA_URI } from '@/lib/reportAssets';
import {
  getOrderedRaporSubjects,
  DEFAULT_OFFICIAL_RAPOR_SUBJECTS,
} from '@/lib/raporSubjectConfig';
import { getSchoolAcademicPeriod } from '@/lib/academicPeriod';

export const OFFICIAL_RAPOR_SUBJECTS = DEFAULT_OFFICIAL_RAPOR_SUBJECTS;


export const DEFAULT_PREDICATE_DESCRIPTIONS = {
  A: 'Sangat baik dalam memahami materi pembelajaran dan mampu menyelesaikannya secara mandiri.',
  B: 'Baik dalam memahami materi pembelajaran dan mampu menyelesaikannya dengan tepat.',
  C: 'Cukup dalam memahami materi pembelajaran, masih memerlukan latihan dan penguatan.',
  D: 'Perlu bimbingan dan pendampingan intensif dalam memahami materi dasar.',
};

export const getPredicate = (score) => {
  if (score === '' || score === null || score === undefined || Number.isNaN(Number(score))) return '-';
  const num = Number(score);
  if (num >= 86) return 'A';
  if (num >= 76) return 'B';
  if (num >= 66) return 'C';
  return 'D';
};

// Format deskripsi rapor: murni deskripsi capaian pembelajaran tanpa prefix predikat ('A:', 'B:', dll.)
export const formatRaporDescription = (score, customDesc = null) => {
  const pred = getPredicate(score);
  if (pred === '-') return '-';
  if (customDesc && customDesc.trim()) {
    return customDesc.replace(/^[A-D]\s*:\s*/i, '').trim();
  }
  return DEFAULT_PREDICATE_DESCRIPTIONS[pred] || '-';
};

// Utilitas pemformatan tanggal laporan dinamis (Bahasa Indonesia)
export const getDynamicReportDate = (customDate) => {
  if (customDate && String(customDate).trim()) return customDate;
  try {
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date());
  } catch {
    return '-';
  }
};

export const PAPER_SIZES = {
  A4: {
    id: 'A4',
    label: 'A4 (210 × 297 mm)',
    pageCSS: '210mm 297mm',
    width: '210mm',
    height: '297mm',
    padding: '7mm 14mm 5mm 14mm',
  },
  F4: {
    id: 'F4',
    label: 'F4 / Folio (215 × 330 mm)',
    pageCSS: '215mm 330mm',
    width: '215mm',
    height: '330mm',
    padding: '10mm 15mm 8mm 15mm',
  },
  LETTER: {
    id: 'LETTER',
    label: 'Letter (216 × 279 mm)',
    pageCSS: '216mm 279mm',
    width: '216mm',
    height: '279mm',
    padding: '6mm 12mm 4mm 12mm',
  },
};

export function generatePrintableReportHTML({
  student,
  selectedClass = '',
  teacherName = '',
  teacherNip = '',
  reportDate = '',
  academicYear = '',
  semester = '',
  endorsement = null,
  endorsementFormat = 'AUTO',
  paperSize = 'A4',
  subjects = null,
}) {
  const activePaper = PAPER_SIZES[paperSize] || PAPER_SIZES.A4;
  const activeReportDate = getDynamicReportDate(reportDate);
  const displayTeacherName = teacherName || student?.homeroom_teacher || 'Wali Kelas';
  const displayTeacherNip = teacherNip || student?.homeroom_nip || '-';

  const period = getSchoolAcademicPeriod();
  const displayAcademicYear = academicYear || period?.year || '2025/2026';
  const displaySemester = (semester || period?.semester || 'GENAP').toUpperCase();

  let effectiveFormat = endorsementFormat;
  if (!effectiveFormat || effectiveFormat === 'AUTO') {
    if (endorsement && (endorsement.status === 'APPROVED' || endorsement.signature_data)) {
      effectiveFormat = (endorsement.approver_role === 'ADMIN' || (endorsement.notes && endorsement.notes.toLowerCase().includes('admin'))) ? 'ADMIN' : 'KEPSEK';
    } else {
      effectiveFormat = 'STANDARD';
    }
  }

  const isThreeColumn = effectiveFormat === 'KEPSEK' || effectiveFormat === 'ADMIN';
  const signatoryTitle = effectiveFormat === 'ADMIN'
    ? (endorsement?.signatory_title || 'Administrator / Tim Kurikulum')
    : (endorsement?.signatory_title || 'Kepala SMP Negeri 1 Prambon');
  const signatoryName = effectiveFormat === 'ADMIN'
    ? (endorsement?.admin_name || endorsement?.principal_name || 'Administrator Sekolah')
    : (endorsement?.principal_name || 'Kepala Sekolah');
  const signatoryNip = effectiveFormat === 'ADMIN'
    ? (endorsement?.admin_nip || endorsement?.principal_nip || '-')
    : (endorsement?.principal_nip || '-');

  const attendance = {
    sakit: student?.attendance?.sakit ?? student?.sakit ?? 0,
    izin: student?.attendance?.izin ?? student?.izin ?? 0,
    alfa: student?.attendance?.alfa ?? student?.alfa ?? 0,
  };

  const activeSubjects = subjects || getOrderedRaporSubjects();

  const tableRowsHTML = activeSubjects.map((item) => {
    if (item.isMulokHeader) {
      return `
        <tr style="height: 16pt;">
          <td style="border: 1pt solid #000; text-align: center; vertical-align: top; padding: 2pt 3pt; font-size: 9.5pt;">${item.no}</td>
          <td style="border: 1pt solid #000; text-align: left; vertical-align: top; padding: 2pt 3pt; font-size: 9.5pt; font-weight: bold;">${item.name}</td>
          <td style="border: 1pt solid #000; text-align: center; vertical-align: top; padding: 2pt 3pt; font-size: 9.5pt;"></td>
          <td style="border: 1pt solid #000; text-align: left; vertical-align: top; padding: 2pt 3pt; font-size: 9.5pt;"></td>
        </tr>
      `;
    }

    const score = student?.scores?.[item.code] ?? student?.scores?.[item.code.toLowerCase()] ?? '';
    const hasScore = typeof score === 'number' || (typeof score === 'string' && score !== '' && score !== '-');
    const displayScore = hasScore ? score : '-';
    const studentCustomDesc = student?.descriptions?.[item.code] || '';
    const descriptionText = hasScore
      ? formatRaporDescription(score, studentCustomDesc)
      : '-';

    const paddingLeft = item.isMulokItem ? 'padding-left: 14pt;' : '';

    return `
      <tr style="height: 16pt;">
        <td style="border: 1pt solid #000; text-align: center; vertical-align: top; padding: 2pt 3pt; font-size: 9.5pt;">${item.no || '&nbsp;'}</td>
        <td style="border: 1pt solid #000; text-align: left; vertical-align: top; padding: 2pt 3pt; font-size: 9.5pt; ${paddingLeft}">${item.name}</td>
        <td style="border: 1pt solid #000; text-align: center; vertical-align: top; padding: 2pt 3pt; font-size: 9.5pt; font-weight: 500;">${displayScore}</td>
        <td style="border: 1pt solid #000; text-align: left; vertical-align: top; padding: 2pt 3pt; font-size: 9pt; line-height: 1.2;">${descriptionText}</td>
      </tr>
    `;
  }).join('');

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>Rapor_Sisipan_${student?.name?.replace(/\\s+/g, '_')}_${selectedClass}</title>
  <style>
    @page {
      size: ${activePaper.pageCSS};
      margin: 0 !important;
    }
    * {
      box-sizing: border-box;
      font-family: Arial, Helvetica, sans-serif;
      color: #000000;
    }
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      background: #ffffff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .rapor-page {
      box-sizing: border-box;
      width: ${activePaper.width};
      height: ${activePaper.height};
      max-height: ${activePaper.height};
      padding: ${activePaper.padding};
      margin: 0 auto;
      position: relative;
      overflow: hidden;
      page-break-inside: avoid;
      page-break-after: avoid;
      break-inside: avoid;
      break-after: avoid;
    }
    .content-wrap {
      position: relative;
      z-index: 1;
    }
    .kop-img-wrap {
      text-align: center;
      margin-bottom: 2pt;
    }
    .kop-img-wrap img {
      width: 100%;
      max-width: 630px;
      height: auto;
      display: block;
      margin: 0 auto;
    }
    .title-block {
      text-align: center;
      margin: 2pt 0 4pt 0;
    }
    .title-block h2 {
      margin: 0;
      font-size: 10.5pt;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 0.2px;
    }
    .title-block h3 {
      margin: 1.5pt 0 0 0;
      font-size: 10.5pt;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 0.2px;
    }
    .identitas-table {
      width: 100%;
      margin: 0 0 4pt 0;
      border-collapse: collapse;
      font-size: 9.5pt;
    }
    .identitas-table td {
      padding: 1pt 0;
      vertical-align: top;
    }
    .grades-container {
      position: relative;
      margin-bottom: 5pt;
    }
    .watermark-bg {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 360px;
      max-width: 80%;
      pointer-events: none;
      z-index: 0;
      opacity: 0.90;
    }
    .watermark-bg img {
      width: 100%;
      height: auto;
      display: block;
    }
    .grades-table {
      position: relative;
      z-index: 1;
      width: 100%;
      border-collapse: collapse;
      background: transparent;
    }
    .grades-table th {
      border: 1pt solid #000000;
      padding: 2pt 3pt;
      font-size: 9.5pt;
      font-weight: bold;
      text-align: center;
      background: transparent;
    }
    .grades-table td {
      border: 1pt solid #000000;
      padding: 2pt 3pt;
      font-size: 9pt;
      vertical-align: top;
      background: transparent;
    }
    .section-title {
      font-size: 9.5pt;
      font-weight: bold;
      margin: 4pt 0 2pt 0;
    }
    .attendance-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 5pt;
      background: transparent;
    }
    .attendance-table th, .attendance-table td {
      border: 1pt solid #000000;
      padding: 2pt 5pt;
      font-size: 9pt;
      vertical-align: top;
      background: transparent;
    }
    .attendance-table th {
      font-weight: bold;
      width: 33.33%;
      text-align: left;
    }
    .attendance-table td {
      height: 14pt;
    }
    .signature-grid {
      width: 100%;
      border-collapse: collapse;
      page-break-inside: avoid;
      font-size: 9.5pt;
      margin-top: 5pt;
      background: transparent;
    }
    .signature-grid td {
      vertical-align: top;
      padding: 0 4pt;
      background: transparent;
    }
    @media print {
      body { margin: 0; padding: 0; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="rapor-page">
    <div class="content-wrap">
      <div class="kop-img-wrap">
        <img src="${KOP_IMAGE_DATA_URI}" alt="Kop SMP Negeri 1 Prambon" />
      </div>

      <div class="title-block">
        <h2>RAPOR SISIPAN TENGAH SEMESTER</h2>
        <h3>SEMESTER ${String(displaySemester).toUpperCase()} TAHUN AJARAN ${displayAcademicYear}</h3>
      </div>

      <table class="identitas-table">
        <tr>
          <td style="width: 210pt;">Satuan Pendidikan</td>
          <td style="width: 12pt; text-align: center;">:</td>
          <td>SMP NEGERI 1 PRAMBON</td>
        </tr>
        <tr>
          <td>Nomor Pokok Sekolah Nasional</td>
          <td style="text-align: center;">:</td>
          <td>20501774</td>
        </tr>
        <tr>
          <td>Nama Lengkap</td>
          <td style="text-align: center;">:</td>
          <td style="font-weight: bold; text-transform: uppercase;">${student?.name || '-'}</td>
        </tr>
        <tr>
          <td>Kelas</td>
          <td style="text-align: center;">:</td>
          <td>${selectedClass}</td>
        </tr>
        <tr>
          <td>Nomor Induk Siswa Nasional</td>
          <td style="text-align: center;">:</td>
          <td>${student?.nisn || '-'}</td>
        </tr>
      </table>

      <div class="grades-container">
        <div class="watermark-bg">
          <img src="${WATERMARK_IMAGE_DATA_URI}" alt="" />
        </div>
        <table class="grades-table">
          <thead>
            <tr>
              <th style="width: 37.5pt;">No</th>
              <th style="width: 152.2pt;">Mata Pelajaran</th>
              <th style="width: 47.2pt;">Nilai</th>
              <th style="width: 260pt;">Deskripsi</th>
            </tr>
          </thead>
          <tbody>
            ${tableRowsHTML}
          </tbody>
        </table>
      </div>

      <p class="section-title">Data Kehadiran Murid</p>
      <table class="attendance-table">
        <thead>
          <tr>
            <th>Jumlah Sakit:</th>
            <th>Jumlah Izin:</th>
            <th>Jumlah Tanpa Keterangan:</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>${attendance.sakit ?? 0} hari</td>
            <td>${attendance.izin ?? 0} hari</td>
            <td>${attendance.alfa ?? 0} hari</td>
          </tr>
        </tbody>
      </table>

      ${
        isThreeColumn
          ? `
      <!-- Tiga Kolom Pengesahan: Orang Tua, Wali Kelas, dan Kepala Sekolah / Admin Resmi -->
      <table class="signature-grid">
        <tr>
          <td style="width: 32%; text-align: left;">
            &nbsp;
          </td>
          <td style="width: 34%; text-align: left; padding-left: 8pt;">
            &nbsp;
          </td>
          <td style="width: 34%; text-align: left; padding-left: 8pt;">
            Kabupaten Sidoarjo, ${activeReportDate}
          </td>
        </tr>
        <tr>
          <td style="width: 32%; text-align: left;">
            Orang Tua/Wali,
          </td>
          <td style="width: 34%; text-align: left; padding-left: 8pt;">
            Wali Kelas,
          </td>
          <td style="width: 34%; text-align: left; padding-left: 8pt;">
            Mengetahui,<br/>${signatoryTitle},
          </td>
        </tr>
        <tr style="height: 38pt;">
          <td style="vertical-align: bottom; text-align: left;"></td>
          <td style="vertical-align: bottom; text-align: left; padding-left: 8pt;"></td>
          <td style="vertical-align: middle; text-align: left; padding-left: 8pt;">
            ${
              endorsement?.signature_data
                ? `<img src="${endorsement.signature_data}" style="max-height: 36pt; max-width: 95pt; object-fit: contain; display: block;" alt="TTD Pengesahan" />`
                : ''
            }
          </td>
        </tr>
        <tr>
          <td style="width: 32%; text-align: left;">
            <p style="margin: 0;">……………………………………………</p>
          </td>
          <td style="width: 34%; text-align: left; padding-left: 8pt;">
            <p style="margin: 0; font-weight: normal;">${displayTeacherName}</p>
            <p style="margin: 2pt 0 0 0;">NIP. ${displayTeacherNip}</p>
          </td>
          <td style="width: 34%; text-align: left; padding-left: 8pt;">
            <p style="margin: 0; font-weight: bold; text-decoration: underline;">${signatoryName}</p>
            <p style="margin: 2pt 0 0 0;">${signatoryNip && signatoryNip !== '-' ? `NIP. ${signatoryNip}` : 'NIP. -'}</p>
          </td>
        </tr>
      </table>
      `
          : `
      <!-- Dua Kolom Pengesahan: Wali Kelas & Orang Tua/Wali Sesuai Format Template Resmi -->
      <table class="signature-grid">
        <tr>
          <td style="width: 50%;">
            &nbsp;
          </td>
          <td style="width: 50%; text-align: left; padding-left: 24pt;">
            Kabupaten Sidoarjo, ${activeReportDate}
          </td>
        </tr>
        <tr>
          <td style="width: 50%; text-align: left;">
            Wali Kelas,
          </td>
          <td style="width: 50%; text-align: left; padding-left: 24pt;">
            Orang Tua/Wali,
          </td>
        </tr>
        <tr style="height: 38pt;">
          <td style="vertical-align: bottom; text-align: left;">
          </td>
          <td style="vertical-align: bottom; text-align: left; padding-left: 24pt;">
          </td>
        </tr>
        <tr>
          <td style="width: 50%; text-align: left;">
            <p style="margin: 0; font-weight: normal;">${displayTeacherName}</p>
            <p style="margin: 2pt 0 0 0;">NIP. ${displayTeacherNip}</p>
          </td>
          <td style="width: 50%; text-align: left; padding-left: 24pt;">
            <p style="margin: 0;">……………………………………………</p>
          </td>
        </tr>
      </table>
      `
      }
    </div>
  </div>
</body>
</html>`;
}

export default function StudentReportModal({
  isOpen,
  onClose,
  student,
  selectedClass = '',
  teacherName = '',
  teacherNip = '',
  reportDate = '',
  academicYear = '',
  semester = '',
  endorsement = null,
}) {
  const [paperSize, setPaperSize] = React.useState('A4');
  const [activeSubjects, setActiveSubjects] = React.useState(() => getOrderedRaporSubjects());

  const period = getSchoolAcademicPeriod();
  const activeAcademicYear = academicYear || period?.year || '2025/2026';
  const activeSemester = (semester || period?.semester || 'GENAP').toUpperCase();

  const [endorsementFormat, setEndorsementFormat] = React.useState(() => {
    if (endorsement && (endorsement.status === 'APPROVED' || endorsement.signature_data)) {
      return (endorsement.approver_role === 'ADMIN' || (endorsement.notes && endorsement.notes.toLowerCase().includes('admin'))) ? 'ADMIN' : 'KEPSEK';
    }
    return 'STANDARD';
  });

  React.useEffect(() => {
    if (endorsement && (endorsement.status === 'APPROVED' || endorsement.signature_data)) {
      setEndorsementFormat((prev) => {
        if (prev === 'STANDARD') {
          return (endorsement.approver_role === 'ADMIN' || (endorsement.notes && endorsement.notes.toLowerCase().includes('admin'))) ? 'ADMIN' : 'KEPSEK';
        }
        return prev;
      });
    }
  }, [endorsement]);

  React.useEffect(() => {
    const handleOrderChange = () => {
      setActiveSubjects(getOrderedRaporSubjects());
    };
    handleOrderChange();
    window.addEventListener('rapor-subject-order-changed', handleOrderChange);
    return () => window.removeEventListener('rapor-subject-order-changed', handleOrderChange);
  }, [isOpen]);

  if (!isOpen || !student) return null;

  const formattedReportDate = getDynamicReportDate(reportDate);
  const displayTeacherName = teacherName || student?.homeroom_teacher || 'Wali Kelas';
  const displayTeacherNip = teacherNip || student?.homeroom_nip || '-';
  const isThreeColumn = endorsementFormat === 'KEPSEK' || endorsementFormat === 'ADMIN';

  const signatoryTitle = endorsementFormat === 'ADMIN'
    ? (endorsement?.signatory_title || 'Administrator / Tim Kurikulum')
    : (endorsement?.signatory_title || 'Kepala SMPN 1 Prambon');
  const signatoryName = endorsementFormat === 'ADMIN'
    ? (endorsement?.admin_name || endorsement?.principal_name || 'Administrator Sekolah')
    : (endorsement?.principal_name || 'Kepala Sekolah');
  const signatoryNip = endorsementFormat === 'ADMIN'
    ? (endorsement?.admin_nip || endorsement?.principal_nip || '-')
    : (endorsement?.principal_nip || '-');

  const attendance = {
    sakit: student?.attendance?.sakit ?? student?.sakit ?? 0,
    izin: student?.attendance?.izin ?? student?.izin ?? 0,
    alfa: student?.attendance?.alfa ?? student?.alfa ?? 0,
  };

  const handlePrintPDF = () => {
    const htmlContent = generatePrintableReportHTML({
      student,
      selectedClass,
      teacherName: displayTeacherName,
      teacherNip: displayTeacherNip,
      reportDate: formattedReportDate,
      academicYear: activeAcademicYear,
      semester: activeSemester,
      endorsement,
      endorsementFormat,
      paperSize,
      subjects: activeSubjects,
    });

    const printWin = window.open('', '_blank', 'width=900,height=900');
    if (printWin) {
      printWin.document.open();
      printWin.document.write(htmlContent);
      printWin.document.close();
      printWin.focus();
      setTimeout(() => {
        printWin.print();
      }, 350);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex flex-wrap items-center justify-between px-6 py-4 bg-slate-50 border-b border-slate-200 gap-3">
          <div>
            <span className="text-[10px] font-bold tracking-wider uppercase text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
              Format Rapor Sisipan Semester {activeSemester} TA {activeAcademicYear} • SMPN 1 Prambon
            </span>
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900 mt-1">
              Pratinjau Rapor: {student.name} ({student.nisn})
            </h2>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Pilihan Format Pengesahan Rapor */}
            <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-600">Pengesahan:</span>
              <select
                value={endorsementFormat}
                onChange={(e) => setEndorsementFormat(e.target.value)}
                className="text-xs font-semibold text-slate-800 bg-transparent border-none focus:outline-none cursor-pointer"
                title="Pilih format pengesahan rapor (Standar 2 Kolom, Pengesahan Kepsek, atau Pengesahan Admin)"
              >
                <option value="STANDARD">Format Standar (2 Kolom: Walas & Ortu)</option>
                <option value="KEPSEK">Pengesahan Kepala Sekolah (3 Kolom)</option>
                <option value="ADMIN">Pengesahan Administrator / TU (3 Kolom)</option>
              </select>
            </div>

            {/* Pilihan Ukuran Kertas Cetak */}
            <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-600">Kertas:</span>
              <select
                value={paperSize}
                onChange={(e) => setPaperSize(e.target.value)}
                className="text-xs font-semibold text-slate-800 bg-transparent border-none focus:outline-none cursor-pointer"
                title="Pilih ukuran kertas cetak rapor"
              >
                <option value="A4">A4 (210 × 297 mm)</option>
                <option value="F4">F4 / Folio (215 × 330 mm)</option>
                <option value="LETTER">Letter (216 × 279 mm)</option>
              </select>
            </div>

            <button
              type="button"
              onClick={handlePrintPDF}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-sm flex items-center gap-1.5 cursor-pointer"
              title={`Cetak langsung atau simpan sebagai dokumen PDF resmi (${paperSize})`}
            >
              <span>🖨️ Cetak Rapor (PDF)</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 bg-slate-100/60">
          <div className="max-w-[760px] mx-auto bg-white p-8 sm:p-10 rounded-xl shadow-xs border border-slate-300 text-black text-xs font-sans relative overflow-hidden">
            <div className="relative z-10">
              {/* Kop Surat Gambar Resmi */}
              <div className="text-center mb-3">
                <img
                  src={KOP_IMAGE_DATA_URI}
                  alt="Kop SMP Negeri 1 Prambon"
                  className="w-full max-w-[633px] mx-auto block"
                />
              </div>

              {/* Judul Laporan */}
              <div className="text-center my-3">
                <h2 className="text-sm font-bold uppercase tracking-wide m-0">RAPOR SISIPAN TENGAH SEMESTER</h2>
                <h3 className="text-sm font-bold uppercase tracking-wide m-0 mt-0.5">
                  SEMESTER {String(activeSemester).toUpperCase()} TAHUN AJARAN {activeAcademicYear}
                </h3>
              </div>

              {/* Identitas Siswa */}
              <table className="w-full text-xs mb-3">
                <tbody>
                  <tr>
                    <td className="w-60 py-0.5">Satuan Pendidikan</td>
                    <td className="w-4">:</td>
                    <td>SMP NEGERI 1 PRAMBON</td>
                  </tr>
                  <tr>
                    <td className="py-0.5">Nomor Pokok Sekolah Nasional</td>
                    <td>:</td>
                    <td>20501774</td>
                  </tr>
                  <tr>
                    <td className="py-0.5">Nama Lengkap</td>
                    <td>:</td>
                    <td className="font-bold uppercase">{student.name}</td>
                  </tr>
                  <tr>
                    <td className="py-0.5">Kelas</td>
                    <td>:</td>
                    <td>{selectedClass}</td>
                  </tr>
                  <tr>
                    <td className="py-0.5">Nomor Induk Siswa Nasional</td>
                    <td>:</td>
                    <td>{student.nisn}</td>
                  </tr>
                </tbody>
              </table>

              {/* Tabel Nilai & Deskripsi dengan Watermark Lambang Sekolah Tepat di Belakang Tabel */}
              <div className="relative mb-3">
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
                  <img
                    src={WATERMARK_IMAGE_DATA_URI}
                    alt="Watermark SMPN 1 Prambon"
                    className="w-[360px] sm:w-[390px] max-w-[85%] object-contain select-none opacity-90"
                  />
                </div>

                <table className="w-full border-collapse border border-black text-xs relative z-10 bg-transparent">
                  <thead>
                    <tr className="bg-transparent">
                      <th className="border border-black p-1 text-center w-10 font-bold bg-transparent">No</th>
                      <th className="border border-black p-1 text-center w-52 font-bold bg-transparent">Mata Pelajaran</th>
                      <th className="border border-black p-1 text-center w-14 font-bold bg-transparent">Nilai</th>
                      <th className="border border-black p-1 text-center font-bold bg-transparent">Deskripsi</th>
                    </tr>
                  </thead>
                  <tbody className="bg-transparent">
                    {activeSubjects.map((item) => {
                      if (item.isMulokHeader) {
                        return (
                          <tr key="mulok-header" className="bg-transparent">
                            <td className="border border-black p-1 text-center font-normal bg-transparent">{item.no}</td>
                            <td className="border border-black p-1 font-bold bg-transparent">{item.name}</td>
                            <td className="border border-black p-1 text-center bg-transparent"></td>
                            <td className="border border-black p-1 bg-transparent"></td>
                          </tr>
                        );
                      }

                      const score = student?.scores?.[item.code] ?? student?.scores?.[item.code.toLowerCase()] ?? '';
                      const hasScore = typeof score === 'number' || (typeof score === 'string' && score !== '' && score !== '-');
                      const displayScore = hasScore ? score : '-';
                      const studentCustomDesc = student?.descriptions?.[item.code] || '';
                      const descriptionText = hasScore
                        ? formatRaporDescription(score, studentCustomDesc)
                        : '-';

                      return (
                        <tr key={item.code} className="bg-transparent">
                          <td className="border border-black p-1 text-center bg-transparent">{item.no}</td>
                          <td className={`border border-black p-1 bg-transparent ${item.isMulokItem ? 'pl-4' : ''}`}>
                            {item.name}
                          </td>
                          <td className="border border-black p-1 text-center font-semibold bg-transparent">
                            {displayScore}
                          </td>
                          <td className="border border-black p-1 text-[11px] leading-tight bg-transparent">
                            {descriptionText}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Data Kehadiran Murid */}
              <p className="font-bold text-xs mb-1 mt-3">Data Kehadiran Murid</p>
              <table className="w-full border-collapse border border-black text-xs mb-4">
                <thead>
                  <tr className="bg-transparent">
                    <th className="border border-black p-1.5 text-left w-1/3 font-bold">Jumlah Sakit:</th>
                    <th className="border border-black p-1.5 text-left w-1/3 font-bold">Jumlah Izin:</th>
                    <th className="border border-black p-1.5 text-left w-1/3 font-bold">Jumlah Tanpa Keterangan:</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-black p-1.5">{attendance.sakit ?? 0} hari</td>
                    <td className="border border-black p-1.5">{attendance.izin ?? 0} hari</td>
                    <td className="border border-black p-1.5">{attendance.alfa ?? 0} hari</td>
                  </tr>
                </tbody>
              </table>

              {/* Pengesahan Rapor: 3 Kolom Jika Disahkan Kepala Sekolah / Admin, atau 2 Kolom Standar */}
              {isThreeColumn ? (
                <div className="grid grid-cols-3 gap-4 text-xs pt-3">
                  <div>
                    <p className="m-0">&nbsp;</p>
                    <p className="m-0 mt-0.5">Orang Tua/Wali,</p>
                    <div className="h-16 flex items-end">
                      {/* Ruang Tanda Tangan */}
                    </div>
                    <p className="m-0">……………………………………………</p>
                  </div>

                  <div className="px-2">
                    <p className="m-0">&nbsp;</p>
                    <p className="m-0 mt-0.5">Wali Kelas,</p>
                    <div className="h-16 flex items-end">
                      {/* Ruang Tanda Tangan */}
                    </div>
                    <p className="m-0 font-normal">{displayTeacherName}</p>
                    <p className="m-0 mt-0.5 text-slate-600">NIP. {displayTeacherNip}</p>
                  </div>

                  <div className="pl-2">
                    <p className="m-0 text-slate-700">Kabupaten Sidoarjo, {formattedReportDate}</p>
                    <p className="m-0 mt-0.5">Mengetahui,</p>
                    <p className="m-0 font-semibold text-slate-900">{signatoryTitle},</p>
                    <div className="h-12 flex items-center">
                      {endorsement?.signature_data ? (
                        <img
                          src={endorsement.signature_data}
                          alt="TTD Pengesahan"
                          className="max-h-12 max-w-[120px] object-contain"
                        />
                      ) : (
                        <div className="text-[10px] text-emerald-700 italic">Disahkan Digital</div>
                      )}
                    </div>
                    <p className="m-0 font-bold underline text-slate-900">{signatoryName}</p>
                    <p className="m-0 mt-0.5 text-slate-600 font-mono text-[11px]">
                      {signatoryNip && signatoryNip !== '-' ? `NIP. ${signatoryNip}` : 'NIP. -'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-8 text-xs pt-3">
                  <div>
                    <p className="m-0">&nbsp;</p>
                    <p className="m-0 mt-0.5">Wali Kelas,</p>
                    <div className="h-16 flex items-end">
                      {/* Ruang Tanda Tangan */}
                    </div>
                    <p className="m-0 font-normal">{displayTeacherName}</p>
                    <p className="m-0 mt-0.5 text-slate-600">NIP. {displayTeacherNip}</p>
                  </div>

                  <div className="pl-4">
                    <p className="m-0 text-slate-700">Kabupaten Sidoarjo, {formattedReportDate}</p>
                    <p className="m-0 mt-0.5">Orang Tua/Wali,</p>
                    <div className="h-16 flex items-end">
                      {/* Ruang Tanda Tangan */}
                    </div>
                    <p className="m-0">……………………………………………</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-3 bg-slate-50 border-t border-slate-200 text-xs">
          <p className="text-slate-500 text-[11px]">
            💡 Format cetak rapor sisipan ini 100% identik dengan format resmi template Word & PDF SMPN 1 Prambon.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handlePrintPDF}
              className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition cursor-pointer"
            >
              Cetak PDF
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold transition cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
