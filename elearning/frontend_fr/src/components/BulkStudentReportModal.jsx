import React, { useState, useMemo } from 'react';
import {
  formatRaporDescription,
  getDynamicReportDate,
  PAPER_SIZES,
} from './StudentReportModal';
import { getOrderedRaporSubjects } from '@/lib/raporSubjectConfig';
import { KOP_IMAGE_DATA_URI, WATERMARK_IMAGE_DATA_URI } from '@/lib/reportAssets';

export function generateSingleStudentSectionHTML({
  student,
  selectedClass = '',
  teacherName = '',
  teacherNip = '',
  reportDate = '',
  academicYear = '',
  semester = '',
  isLast = false,
  endorsement = null,
  paperSize = 'A4',
  subjects = null,
}) {
  const activePaper = PAPER_SIZES[paperSize] || PAPER_SIZES.A4;
  const activeReportDate = getDynamicReportDate(reportDate);
  const displayTeacherName = teacherName || student?.homeroom_teacher || 'Wali Kelas';
  const displayTeacherNip = teacherNip || student?.homeroom_nip || '-';
  const isEndorsed = Boolean(endorsement && (endorsement.status === 'APPROVED' || endorsement.signature_data));
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

  const pageBreakStyle = isLast ? 'page-break-after: avoid; break-after: avoid;' : 'page-break-after: always; break-after: page;';

  return `
    <div class="rapor-student-page" style="${pageBreakStyle} box-sizing: border-box; width: ${activePaper.width}; height: ${activePaper.height}; max-height: ${activePaper.height}; padding: ${activePaper.padding}; margin: 0 auto; position: relative; overflow: hidden; page-break-inside: avoid; break-inside: avoid;">
      <div class="content-wrap">
        <div class="kop-img-wrap">
          <img src="${KOP_IMAGE_DATA_URI}" alt="Kop SMP Negeri 1 Prambon" />
        </div>

        <div class="title-block">
          <h2>RAPOR SISIPAN TENGAH SEMESTER</h2>
          <h3>SEMESTER ${String(semester).toUpperCase()} TAHUN AJARAN ${academicYear}</h3>
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
          isEndorsed
            ? `
        <!-- Tiga Kolom Pengesahan: Orang Tua, Wali Kelas, dan Kepala Sekolah Resmi -->
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
              Mengetahui,<br/>Kepala SMP Negeri 1 Prambon,
            </td>
          </tr>
          <tr style="height: 38pt;">
            <td style="vertical-align: bottom; text-align: left;"></td>
            <td style="vertical-align: bottom; text-align: left; padding-left: 8pt;"></td>
            <td style="vertical-align: middle; text-align: left; padding-left: 8pt;">
              ${
                endorsement?.signature_data
                  ? `<img src="${endorsement.signature_data}" style="max-height: 36pt; max-width: 95pt; object-fit: contain; display: block;" alt="TTD Kepala Sekolah" />`
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
              <p style="margin: 0; font-weight: bold; text-decoration: underline;">${endorsement?.principal_name || 'Kepala Sekolah'}</p>
              <p style="margin: 2pt 0 0 0;">${endorsement?.principal_nip ? `NIP. ${endorsement.principal_nip}` : 'NIP. -'}</p>
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
  `;
}

export function generateBulkPrintableHTML({
  students = [],
  selectedClass = '',
  teacherName = '',
  teacherNip = '',
  reportDate = '',
  academicYear = '',
  semester = '',
  endorsement = null,
  paperSize = 'A4',
  subjects = null,
}) {
  const activePaper = PAPER_SIZES[paperSize] || PAPER_SIZES.A4;
  const activeReportDate = getDynamicReportDate(reportDate);
  const displayTeacherName = teacherName || 'Wali Kelas';
  const displayTeacherNip = teacherNip || '-';
  const activeSubjects = subjects || getOrderedRaporSubjects();
  const sectionsHTML = students
    .map((student, idx) =>
      generateSingleStudentSectionHTML({
        student,
        selectedClass,
        teacherName: displayTeacherName,
        teacherNip: displayTeacherNip,
        reportDate: activeReportDate,
        academicYear,
        semester,
        isLast: idx === students.length - 1,
        endorsement,
        paperSize,
        subjects: activeSubjects,
      })
    )
    .join('\n');

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>Rapor_Massal_Kelas_${selectedClass}_TA_${academicYear.replace('/', '_')}</title>
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
  ${sectionsHTML}
</body>
</html>`;
}

export default function BulkStudentReportModal({
  isOpen,
  onClose,
  students = [],
  selectedClass = '',
  teacherName = '',
  teacherNip = '',
  endorsement = null,
  academicYear = '',
  semester = '',
}) {
  const [selectedStudentIds, setSelectedStudentIds] = useState(() =>
    students.map((s) => s.id)
  );
  const [reportDate, setReportDate] = useState(() => getDynamicReportDate(''));
  const [includeSignature, setIncludeSignature] = useState(true);
  const [filterType, setFilterType] = useState('ALL'); // 'ALL' | 'COMPLETE' | 'PASSED'
  const [isGenerating, setIsGenerating] = useState(false);

  // Sync saat data students berubah
  React.useEffect(() => {
    if (isOpen && students.length > 0) {
      setSelectedStudentIds(students.map((s) => s.id));
    }
  }, [isOpen, students]);

  if (!isOpen) return null;

  const totalStudents = students.length;
  const completeStudents = students.filter((s) => s.isComplete).length;
  const passedStudents = students.filter((s) => s.isPassed).length;

  const filteredStudents = useMemo(() => {
    if (filterType === 'COMPLETE') {
      return students.filter((s) => s.isComplete);
    }
    if (filterType === 'PASSED') {
      return students.filter((s) => s.isPassed);
    }
    return students;
  }, [students, filterType]);

  const handleSelectAll = () => {
    setSelectedStudentIds(filteredStudents.map((s) => s.id));
  };

  const handleDeselectAll = () => {
    setSelectedStudentIds([]);
  };

  const handleToggleStudent = (id) => {
    setSelectedStudentIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const [paperSize, setPaperSize] = useState('A4');

  const studentsToPrint = useMemo(() => {
    return students.filter((s) => selectedStudentIds.includes(s.id));
  }, [students, selectedStudentIds]);

  const handleBulkPrint = () => {
    if (studentsToPrint.length === 0) {
      alert('Pilih minimal satu siswa untuk dicetak.');
      return;
    }

    setIsGenerating(true);
    const htmlContent = generateBulkPrintableHTML({
      students: studentsToPrint,
      selectedClass,
      teacherName,
      teacherNip,
      reportDate,
      endorsement,
      academicYear,
      semester,
      includeSignature,
      paperSize,
    });

    const printWin = window.open('', '_blank', 'width=1000,height=900');
    if (printWin) {
      printWin.document.open();
      printWin.document.write(htmlContent);
      printWin.document.close();
      printWin.focus();

      setTimeout(() => {
        setIsGenerating(false);
        printWin.print();
      }, 500);
    } else {
      setIsGenerating(false);
      alert('Pop-up browser terblokir. Harap izinkan pop-up untuk mencetak dokumen.');
    }
  };

  const handleDownloadCombinedHTML = () => {
    if (studentsToPrint.length === 0) {
      alert('Pilih minimal satu siswa untuk diunduh.');
      return;
    }

    const htmlContent = generateBulkPrintableHTML({
      students: studentsToPrint,
      selectedClass,
      teacherName,
      teacherNip,
      reportDate,
      endorsement,
      academicYear,
      semester,
      includeSignature,
      paperSize,
    });

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Rapor_Massal_Kelas_${selectedClass}_${academicYear.replace('/', '-')}_${semester}_${paperSize}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex flex-wrap items-center justify-between px-6 py-4 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white border-b border-slate-800 gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/30 text-blue-200 uppercase tracking-wider border border-blue-400/30">
                Fitur Cetak Massal Rapor
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/30 text-emerald-200 border border-emerald-400/30">
                Kelas {selectedClass} • {academicYear} ({semester})
              </span>
            </div>
            <h2 className="text-lg font-bold text-white mt-1">
              Cetak Massal Rapor 1 Rombel (Bulk PDF Generation)
            </h2>
            <p className="text-xs text-blue-200">
              Mencetak seluruh lembar rapor siswa dalam format A4 / F4 terstandar dalam satu dokumen PDF siap cetak.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Pemilih Ukuran Kertas Bulk */}
            <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-xs border border-white/20 rounded-xl px-2.5 py-1 text-white">
              <span className="text-[11px] font-bold text-white/80">Kertas:</span>
              <select
                value={paperSize}
                onChange={(e) => setPaperSize(e.target.value)}
                className="text-xs font-semibold text-white bg-transparent border-none focus:outline-none cursor-pointer [&>option]:text-slate-900"
                title="Pilih ukuran kertas cetak massal rapor"
              >
                <option value="A4">A4 (210 × 297 mm)</option>
                <option value="F4">F4 / Folio (215 × 330 mm)</option>
                <option value="LETTER">Letter (216 × 279 mm)</option>
              </select>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition cursor-pointer"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50">
          {/* Panel Konfigurasi Cetak */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Titimangsa Tanggal Rapor:
              </label>
              <input
                type="text"
                value={reportDate}
                onChange={(e) => setReportDate(e.target.value)}
                placeholder="Contoh: 20 April 2026"
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#1E4DBD] bg-white"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                Dicetak pada kolom pengesahan orang tua/wali.
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Format Pengesahan:
              </label>
              <div className="text-xs text-slate-800 font-medium py-1">
                {endorsement?.status === 'APPROVED' || endorsement?.signature_data
                  ? '3 Kolom (Disahkan Kepala Sekolah + Wali Kelas)'
                  : '2 Kolom (Wali Kelas & Orang Tua/Wali)'}
              </div>
              <span className="text-[10px] text-emerald-600 font-semibold block">
                {endorsement?.status === 'APPROVED' || endorsement?.signature_data
                  ? `✓ Disahkan oleh ${endorsement?.principal_name || 'Kepala Sekolah'}`
                  : '✓ Sesuai Format Rapor Sisipan Resmi'}
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Wali Kelas & NIP:
              </label>
              <p className="text-xs font-semibold text-slate-800 truncate">
                {teacherName || 'Wali Kelas'}
              </p>
              <p className="text-[11px] text-slate-500">
                NIP. {teacherNip || '-'}
              </p>
            </div>
          </div>

          {/* Filter Cepat Siswa */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700">Filter Siswa:</span>
              <button
                type="button"
                onClick={() => setFilterType('ALL')}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition cursor-pointer ${
                  filterType === 'ALL'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Semua Siswa ({totalStudents})
              </button>
              <button
                type="button"
                onClick={() => setFilterType('COMPLETE')}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition cursor-pointer ${
                  filterType === 'COMPLETE'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Nilai Lengkap ({completeStudents})
              </button>
              <button
                type="button"
                onClick={() => setFilterType('PASSED')}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition cursor-pointer ${
                  filterType === 'PASSED'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Tuntas KKM ({passedStudents})
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-xs text-blue-600 hover:underline font-semibold cursor-pointer"
              >
                Pilih Semua
              </button>
              <span className="text-slate-300">|</span>
              <button
                type="button"
                onClick={handleDeselectAll}
                className="text-xs text-slate-500 hover:underline font-semibold cursor-pointer"
              >
                Batal Pilih
              </button>
            </div>
          </div>

          {/* Daftar Siswa Checklist */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="px-4 py-3 bg-slate-100 border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                Daftar Siswa untuk Dicetak ({studentsToPrint.length} dari {totalStudents} terpilih)
              </span>
              <span className="text-[11px] text-slate-500">
                1 Siswa = 1 Lembar A4 (Page Break Otomatis)
              </span>
            </div>

            <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
              {filteredStudents.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">
                  Tidak ada data siswa yang cocok dengan filter.
                </div>
              ) : (
                filteredStudents.map((s, idx) => {
                  const isChecked = selectedStudentIds.includes(s.id);
                  const scoreCount = Object.keys(s.scores || {}).length;

                  return (
                    <label
                      key={s.id}
                      className={`flex items-center justify-between px-4 py-2.5 hover:bg-slate-50 transition cursor-pointer ${
                        isChecked ? 'bg-blue-50/40' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleStudent(s.id)}
                          className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                        />
                        <span className="text-xs font-mono text-slate-400 w-6">
                          {idx + 1}.
                        </span>
                        <div>
                          <p className="text-xs font-bold text-slate-900">{s.name}</p>
                          <p className="text-[10px] text-slate-500 font-mono">
                            NISN: {s.nisn}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {scoreCount >= 12 ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            Lengkap (12 Mapel)
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                            {scoreCount}/12 Mapel
                          </span>
                        )}

                        <span className="text-xs font-semibold text-slate-700 w-12 text-right">
                          {s.avgScore || '-'}
                        </span>
                      </div>
                    </label>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-600">
            Siap mencetak <strong className="text-blue-700">{studentsToPrint.length}</strong> lembar rapor.
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleDownloadCombinedHTML}
              disabled={studentsToPrint.length === 0}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
              title="Unduh berkas HTML gabungan untuk arsip offline"
            >
              <svg className="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>Unduh Arsip HTML</span>
            </button>
            <button
              type="button"
              onClick={handleBulkPrint}
              disabled={studentsToPrint.length === 0 || isGenerating}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition flex items-center gap-2 shadow-sm cursor-pointer disabled:opacity-50"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              <span>{isGenerating ? 'Menyiapkan Lembar...' : 'Cetak Semua Rapor (PDF)'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
