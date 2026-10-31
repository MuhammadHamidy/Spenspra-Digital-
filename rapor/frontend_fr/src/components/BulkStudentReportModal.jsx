import React, { useState, useMemo } from 'react';
import {
  formatRaporDescription,
  getDynamicReportDate,
  PAPER_SIZES,
} from './StudentReportModal';
import { getOrderedRaporSubjects } from '@/lib/raporSubjectConfig';
import { KOP_IMAGE_DATA_URI, WATERMARK_IMAGE_DATA_URI } from '@/lib/reportAssets';
import { getSchoolAcademicPeriod } from '@/lib/academicPeriod';

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

  const pageBreakStyle = isLast ? 'page-break-after: avoid; break-after: avoid;' : 'page-break-after: always; break-after: page;';

  return `
    <div class="rapor-student-page" style="${pageBreakStyle} box-sizing: border-box; width: ${activePaper.width}; height: ${activePaper.height}; max-height: ${activePaper.height}; padding: ${activePaper.padding}; margin: 0 auto; position: relative; overflow: hidden; page-break-inside: avoid; break-inside: avoid;">
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
  endorsementFormat = 'AUTO',
  paperSize = 'A4',
  subjects = null,
}) {
  const activePaper = PAPER_SIZES[paperSize] || PAPER_SIZES.A4;
  const activeReportDate = getDynamicReportDate(reportDate);
  const displayTeacherName = teacherName || 'Wali Kelas';
  const displayTeacherNip = teacherNip || '-';
  const activeSubjects = subjects || getOrderedRaporSubjects();

  const period = getSchoolAcademicPeriod();
  const displayAcademicYear = academicYear || period?.year || '2025/2026';
  const displaySemester = (semester || period?.semester || 'GENAP').toUpperCase();

  const sectionsHTML = students
    .map((student, idx) =>
      generateSingleStudentSectionHTML({
        student,
        selectedClass,
        teacherName: displayTeacherName,
        teacherNip: displayTeacherNip,
        reportDate: activeReportDate,
        academicYear: displayAcademicYear,
        semester: displaySemester,
        isLast: idx === students.length - 1,
        endorsement,
        endorsementFormat,
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
  const period = getSchoolAcademicPeriod();
  const activeAcademicYear = academicYear || period?.year || '2025/2026';
  const activeSemester = (semester || period?.semester || 'GENAP').toUpperCase();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState(() =>
    students.map((s) => s.id)
  );
  const [reportDate, setReportDate] = useState(() => getDynamicReportDate(''));
  const [includeSignature, setIncludeSignature] = useState(true);
  const [filterType, setFilterType] = useState('ALL'); // 'ALL' | 'COMPLETE' | 'PASSED'
  const [isGenerating, setIsGenerating] = useState(false);
  const [paperSize, setPaperSize] = useState('A4');

  const [endorsementFormat, setEndorsementFormat] = useState(() => {
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

  // Sync saat data students berubah
  React.useEffect(() => {
    if (isOpen && students.length > 0) {
      setSelectedStudentIds(students.map((s) => s.id));
    }
  }, [isOpen, students]);

  const totalStudents = students.length;
  const completeStudents = useMemo(() => students.filter((s) => s.isComplete).length, [students]);
  const passedStudents = useMemo(() => students.filter((s) => s.isPassed).length, [students]);

  const filteredStudents = useMemo(() => {
    let list = students;
    if (filterType === 'COMPLETE') {
      list = list.filter((s) => s.isComplete);
    } else if (filterType === 'PASSED') {
      list = list.filter((s) => s.isPassed);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((s) =>
        (s.name && s.name.toLowerCase().includes(q)) ||
        (s.nisn && String(s.nisn).toLowerCase().includes(q))
      );
    }

    return list;
  }, [students, filterType, searchQuery]);

  const handleSelectAllVisible = () => {
    const visibleIds = filteredStudents.map((s) => s.id);
    setSelectedStudentIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
  };

  const handleDeselectAllVisible = () => {
    const visibleIds = new Set(filteredStudents.map((s) => s.id));
    setSelectedStudentIds((prev) => prev.filter((id) => !visibleIds.has(id)));
  };

  const handleToggleStudent = (id) => {
    setSelectedStudentIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

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
      endorsementFormat,
      academicYear: activeAcademicYear,
      semester: activeSemester,
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
      alert('Pop-up browser terblokir. Harap izinkan pop-up pada peramban Anda untuk mencetak rapor.');
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
      endorsementFormat,
      academicYear: activeAcademicYear,
      semester: activeSemester,
      includeSignature,
      paperSize,
    });

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Rapor_Massal_Kelas_${selectedClass}_${activeAcademicYear.replace('/', '-')}_${activeSemester}_${paperSize}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-900/50 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-6xl h-[92vh] sm:h-[88vh] bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col my-auto">
        {/* Header */}
        <header className="flex-shrink-0 bg-white px-5 sm:px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
              Cetak Rapor Kelas {selectedClass}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Tahun Ajaran {activeAcademicYear} • Semester {activeSemester}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-flex items-center text-xs font-semibold px-3 py-1.5 rounded-lg bg-blue-50 text-[#193D9B] border border-blue-100">
              {studentsToPrint.length} dari {totalStudents} Siswa Terpilih
            </span>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer text-base"
              title="Tutup"
            >
              ✕
            </button>
          </div>
        </header>

        {/* Workspace Body */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          {/* Left Column: Pengaturan */}
          <aside className="w-full lg:w-80 xl:w-88 bg-slate-50/60 border-r border-slate-200 flex flex-col justify-between overflow-y-auto flex-shrink-0">
            <div className="p-5 space-y-4">
              {/* Ukuran Kertas */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Ukuran Kertas
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaperSize('A4')}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold transition cursor-pointer text-center ${
                      paperSize === 'A4'
                        ? 'bg-blue-50 border-[#193D9B] text-[#193D9B] ring-1 ring-[#193D9B]'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    A4 (Standar)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaperSize('F4')}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold transition cursor-pointer text-center ${
                      paperSize === 'F4'
                        ? 'bg-blue-50 border-[#193D9B] text-[#193D9B] ring-1 ring-[#193D9B]'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    F4 / Folio
                  </button>
                </div>
              </div>

              {/* Tanggal Cetak */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Tanggal Cetak
                </label>
                <input
                  type="text"
                  value={reportDate}
                  onChange={(e) => setReportDate(e.target.value)}
                  placeholder="Contoh: 31 Oktober 2026"
                  className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#193D9B] text-slate-800"
                />
              </div>

              {/* Format Pengesahan */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Pengesahan
                </label>
                <select
                  value={endorsementFormat}
                  onChange={(e) => setEndorsementFormat(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#193D9B] text-slate-800 cursor-pointer"
                >
                  <option value="STANDARD">Format Standar (Wali Kelas & Orang Tua)</option>
                  <option value="KEPSEK">Pengesahan Kepala Sekolah</option>
                  <option value="ADMIN">Pengesahan Administrator / TU</option>
                </select>
              </div>

              {/* Info Wali Kelas */}
              <div className="pt-3 border-t border-slate-200 text-xs flex justify-between items-center text-slate-600">
                <span className="font-medium">Wali Kelas:</span>
                <span className="font-semibold text-slate-800 truncate max-w-[170px]" title={teacherName || 'Wali Kelas'}>
                  {teacherName || 'Wali Kelas'}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="p-5 border-t border-slate-200 bg-white space-y-2">
              <button
                type="button"
                onClick={handleBulkPrint}
                disabled={studentsToPrint.length === 0 || isGenerating}
                className="w-full py-2.5 px-4 rounded-xl bg-[#193D9B] hover:bg-[#1E4DBD] text-white font-semibold text-xs shadow-xs transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                <span>
                  {isGenerating
                    ? 'Menyiapkan Rapor...'
                    : `Cetak Rapor (${studentsToPrint.length})`}
                </span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownloadCombinedHTML}
                  disabled={studentsToPrint.length === 0}
                  className="flex-1 py-2 px-3 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  title="Unduh berkas HTML gabungan"
                >
                  <svg className="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  <span>Unduh HTML</span>
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="py-2 px-4 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-medium transition cursor-pointer"
                >
                  Batal
                </button>
              </div>
            </div>
          </aside>

          {/* Right Column: Daftar Siswa */}
          <main className="flex-1 flex flex-col overflow-hidden bg-white">
            {/* Filter Bar */}
            <div className="p-4 border-b border-slate-200 space-y-3">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                {/* Search */}
                <div className="relative flex-1 max-w-sm">
                  <svg
                    className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari siswa..."
                    className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#193D9B] text-slate-800 transition"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Filter Tabs */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setFilterType('ALL')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                      filterType === 'ALL'
                        ? 'bg-[#193D9B] text-white shadow-2xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Semua ({totalStudents})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterType('COMPLETE')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                      filterType === 'COMPLETE'
                        ? 'bg-[#193D9B] text-white shadow-2xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Nilai Lengkap ({completeStudents})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterType('PASSED')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                      filterType === 'PASSED'
                        ? 'bg-[#193D9B] text-white shadow-2xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Tuntas ({passedStudents})
                  </button>
                </div>
              </div>

              {/* Select All / Deselect */}
              <div className="flex items-center justify-between text-xs text-slate-600 pt-1 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSelectAllVisible}
                    className="font-semibold text-[#193D9B] hover:underline cursor-pointer"
                  >
                    Pilih Semua ({filteredStudents.length})
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    type="button"
                    onClick={handleDeselectAllVisible}
                    className="font-medium text-slate-500 hover:text-red-600 hover:underline cursor-pointer"
                  >
                    Batal Pilih
                  </button>
                </div>

                <span className="text-[11px] text-slate-400">
                  {filteredStudents.length} siswa
                </span>
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
              {filteredStudents.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center p-8 text-center">
                  <p className="text-xs font-semibold text-slate-500">Tidak ada siswa ditemukan</p>
                </div>
              ) : (
                filteredStudents.map((s, idx) => {
                  const isChecked = selectedStudentIds.includes(s.id);
                  const scoreCount = Object.keys(s.scores || {}).length;

                  return (
                    <div
                      key={s.id}
                      onClick={() => handleToggleStudent(s.id)}
                      className={`flex items-center justify-between px-4 sm:px-5 py-3 hover:bg-slate-50/80 transition-colors cursor-pointer select-none ${
                        isChecked
                          ? 'bg-blue-50/30 border-l-4 border-l-[#193D9B]'
                          : 'bg-white border-l-4 border-l-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleStudent(s.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-4 h-4 rounded border-slate-300 text-[#193D9B] focus:ring-[#193D9B] cursor-pointer flex-shrink-0"
                        />
                        <span className="text-xs font-mono text-slate-400 w-5 text-center flex-shrink-0">
                          {idx + 1}
                        </span>
                        <div className="min-w-0">
                          <p className={`text-xs sm:text-sm font-semibold truncate ${
                            isChecked ? 'text-slate-900 font-bold' : 'text-slate-700'
                          }`}>
                            {s.name}
                          </p>
                          <span className="text-[11px] text-slate-400">
                            NISN: {s.nisn || '-'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 flex-shrink-0 pl-2">
                        {scoreCount >= 12 ? (
                          <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                            12 Mapel
                          </span>
                        ) : (
                          <span className="text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-100">
                            {scoreCount}/12 Mapel
                          </span>
                        )}
                        <div className="text-right w-14">
                          <span className="text-xs font-bold text-slate-800 block">
                            {s.avgScore || '-'}
                          </span>
                          <span className="text-[10px] text-slate-400 block">
                            Rata-rata
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

