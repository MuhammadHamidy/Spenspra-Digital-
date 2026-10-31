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
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-900/50 backdrop-blur-xs overflow-hidden">
      {/* Studio Container */}
      <div className="flex flex-col h-full w-full bg-slate-100 overflow-hidden">
        
        {/* Top Header Bar */}
        <header className="flex-shrink-0 bg-slate-900 text-white px-5 sm:px-8 py-3.5 border-b border-slate-800 flex items-center justify-between gap-4 shadow-md z-20">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition cursor-pointer"
              title="Kembali ke Halaman Wali Kelas"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span>Kembali</span>
            </button>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-blue-500/20 text-blue-300 border border-blue-500/30 uppercase tracking-wider">
                  Studio Cetak Massal Rapor
                </span>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Kelas {selectedClass} • Tahun Ajaran {activeAcademicYear} ({activeSemester})
                </span>
              </div>
              <h1 className="text-base sm:text-lg font-bold text-white leading-tight mt-0.5">
                Cetak Rapor Siswa 1 Rombel (Bulk PDF Generator)
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700 text-xs">
              <span className="text-slate-400">Total Siap Cetak:</span>
              <span className="font-bold text-emerald-400 font-mono text-sm">
                {studentsToPrint.length}
              </span>
              <span className="text-slate-400">/ {totalStudents} Siswa</span>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer"
              title="Tutup Studio Cetak"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </header>

        {/* 2-Column Split Workspace Body */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          
          {/* ================= LEFT COLUMN: SETTINGS & GUIDELINES ================= */}
          <aside className="w-full lg:w-[420px] xl:w-[450px] bg-white border-r border-slate-200 flex flex-col justify-between overflow-y-auto shadow-sm flex-shrink-0 z-10">
            <div className="p-5 sm:p-6 space-y-6">
              
              {/* Step 1: Pengaturan Dokumen Rapor */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-lg bg-blue-600 text-white font-black text-xs flex items-center justify-center">
                    1
                  </div>
                  <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                    Pengaturan Dokumen Rapor
                  </h2>
                </div>

                <div className="space-y-4 bg-slate-50/70 p-4 rounded-2xl border border-slate-200">
                  {/* Ukuran Kertas */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Ukuran Kertas Rapor:
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setPaperSize('A4')}
                        className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                          paperSize === 'A4'
                            ? 'bg-blue-50 border-blue-600 text-blue-900 ring-2 ring-blue-500/20'
                            : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs">Kertas A4</span>
                          {paperSize === 'A4' && (
                            <span className="w-2 h-2 rounded-full bg-blue-600" />
                          )}
                        </div>
                        <p className="text-[10px] text-slate-500 mt-0.5">210 × 297 mm (Standar)</p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPaperSize('F4')}
                        className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                          paperSize === 'F4'
                            ? 'bg-blue-50 border-blue-600 text-blue-900 ring-2 ring-blue-500/20'
                            : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs">Kertas F4 / Folio</span>
                          {paperSize === 'F4' && (
                            <span className="w-2 h-2 rounded-full bg-blue-600" />
                          )}
                        </div>
                        <p className="text-[10px] text-slate-500 mt-0.5">215 × 330 mm (Panjang)</p>
                      </button>
                    </div>
                  </div>

                  {/* Titimangsa Tanggal */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Titimangsa Tanggal Cetak Rapor:
                    </label>
                    <input
                      type="text"
                      value={reportDate}
                      onChange={(e) => setReportDate(e.target.value)}
                      placeholder="Contoh: 31 Oktober 2026"
                      className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
                    />
                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                      <span className="text-[10px] text-slate-400 font-medium">Contoh Cepat:</span>
                      <button
                        type="button"
                        onClick={() => setReportDate(getDynamicReportDate(''))}
                        className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-[10px] text-slate-600 hover:bg-slate-100 font-semibold cursor-pointer"
                      >
                        Hari Ini
                      </button>
                      <button
                        type="button"
                        onClick={() => setReportDate('20 Desember 2026')}
                        className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-[10px] text-slate-600 hover:bg-slate-100 font-semibold cursor-pointer"
                      >
                        20 Des 2026
                      </button>
                      <button
                        type="button"
                        onClick={() => setReportDate('20 Juni 2027')}
                        className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-[10px] text-slate-600 hover:bg-slate-100 font-semibold cursor-pointer"
                      >
                        20 Jun 2027
                      </button>
                    </div>
                  </div>

                  {/* Format Pengesahan Rapor */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Format Pengesahan Lembar Rapor:
                    </label>
                    <select
                      value={endorsementFormat}
                      onChange={(e) => setEndorsementFormat(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 cursor-pointer"
                    >
                      <option value="STANDARD">Format Standar (2 Kolom: Walas & Orang Tua)</option>
                      <option value="KEPSEK">Pengesahan Kepala Sekolah (3 Kolom)</option>
                      <option value="ADMIN">Pengesahan Tim Kurikulum / TU (3 Kolom)</option>
                    </select>
                    <p className="text-[11px] text-emerald-700 font-medium mt-1.5 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100 flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5 flex-shrink-0 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span>
                        {endorsementFormat === 'STANDARD'
                          ? 'Format resmi langsung siap cetak oleh Wali Kelas'
                          : endorsementFormat === 'ADMIN'
                          ? `Disahkan oleh ${endorsement?.admin_name || endorsement?.principal_name || 'Admin Kurikulum'}`
                          : `Disahkan oleh ${endorsement?.principal_name || 'Kepala SMPN 1 Prambon'}`}
                      </span>
                    </p>
                  </div>

                  {/* Info Wali Kelas */}
                  <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[11px] text-slate-400 font-medium block">Wali Kelas:</span>
                      <span className="font-bold text-slate-800">{teacherName || 'Wali Kelas'}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[11px] text-slate-400 font-medium block">NIP:</span>
                      <span className="font-mono text-slate-600 font-semibold">{teacherNip || '-'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 3: Panduan & Tips Cetak PDF (Sangat Membantu Guru) */}
              <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-2 text-amber-900">
                  <svg className="w-4 h-4 text-amber-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <h3 className="text-xs font-bold tracking-tight">
                    Panduan Saat Jendela Cetak Terbuka:
                  </h3>
                </div>
                <ol className="text-[11px] text-amber-800 space-y-1.5 list-decimal list-inside leading-relaxed font-medium">
                  <li>
                    Pilih <strong>Destination / Tujuan</strong>: <u>Simpan sebagai PDF (Save as PDF)</u> atau printer Anda.
                  </li>
                  <li>
                    Di <strong>Pages / Halaman</strong>: Biarkan <u>Semua (All)</u>.
                  </li>
                  <li>
                    <strong>PENTING:</strong> Centang opsi <u>Background graphics / Grafik latar belakang</u> agar kop dan watermark sekolah tercetak jernih.
                  </li>
                </ol>
              </div>

            </div>

            {/* Bottom Actions Area */}
            <div className="p-5 sm:p-6 bg-slate-50 border-t border-slate-200 space-y-2.5">
              <button
                type="button"
                onClick={handleBulkPrint}
                disabled={studentsToPrint.length === 0 || isGenerating}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-sm shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed group"
              >
                <svg className="w-5 h-5 transition-transform group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                <span>
                  {isGenerating
                    ? 'Menyiapkan Lembar Rapor...'
                    : `Cetak Semua Rapor (${studentsToPrint.length} Siswa)`}
                </span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownloadCombinedHTML}
                  disabled={studentsToPrint.length === 0}
                  className="flex-1 py-2 px-3 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  title="Unduh berkas HTML gabungan untuk arsip offline"
                >
                  <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  <span>Unduh Arsip HTML</span>
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="py-2 px-4 rounded-xl border border-slate-300 text-slate-600 hover:bg-slate-100 text-xs font-semibold transition cursor-pointer"
                >
                  Batal
                </button>
              </div>

              <p className="text-center text-[10px] text-slate-400">
                1 Siswa = 1 Halaman A4/F4 (Pemisah Halaman Otomatis)
              </p>
            </div>
          </aside>

          {/* ================= RIGHT COLUMN: STUDENT SELECTION LIST ================= */}
          <main className="flex-1 flex flex-col overflow-hidden bg-slate-50 p-4 sm:p-6 lg:p-8">
            <div className="flex flex-col h-full bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
              
              {/* Header: Title & Filters */}
              <div className="p-4 sm:p-5 border-b border-slate-200 bg-white space-y-3.5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white font-black text-xs flex items-center justify-center">
                      2
                    </div>
                    <div>
                      <h2 className="text-sm sm:text-base font-bold text-slate-900 leading-tight">
                        Pilih Siswa yang Akan Dicetak
                      </h2>
                      <p className="text-xs text-slate-500">
                        Pilih siswa secara massal atau centang satu per satu.
                      </p>
                    </div>
                  </div>

                  {/* Counter Badge */}
                  <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-xl px-3 py-1.5">
                    <span className="text-xs font-semibold text-blue-900">
                      Terpilih: <strong>{studentsToPrint.length}</strong> dari {totalStudents} Siswa
                    </span>
                  </div>
                </div>

                {/* Search Bar & Quick Filters */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
                  
                  {/* Search Input */}
                  <div className="relative flex-1 max-w-md">
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
                      placeholder="Cari nama atau NISN siswa..."
                      className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-300 bg-slate-50/80 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 transition"
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
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setFilterType('ALL')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                        filterType === 'ALL'
                          ? 'bg-slate-900 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Semua ({totalStudents})
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterType('COMPLETE')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                        filterType === 'COMPLETE'
                          ? 'bg-emerald-700 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Nilai Lengkap ({completeStudents})
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterType('PASSED')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                        filterType === 'PASSED'
                          ? 'bg-indigo-700 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Tuntas KKM ({passedStudents})
                    </button>
                  </div>
                </div>

                {/* Bulk Select / Deselect Bar */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSelectAllVisible}
                      className="font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Pilih Semua yang Tampil ({filteredStudents.length})</span>
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={handleDeselectAllVisible}
                      className="font-semibold text-slate-500 hover:text-red-600 hover:underline cursor-pointer"
                    >
                      Batal Pilih
                    </button>
                  </div>

                  <span className="text-[11px] text-slate-400">
                    Menampilkan {filteredStudents.length} siswa
                  </span>
                </div>
              </div>

              {/* Student Table / Card Roster */}
              <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
                {filteredStudents.length === 0 ? (
                  <div className="h-64 flex flex-col items-center justify-center p-8 text-center">
                    <svg className="w-12 h-12 text-slate-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-sm font-bold text-slate-700">Tidak ada siswa yang sesuai</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Coba ganti kata kunci pencarian atau ganti filter.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {filteredStudents.map((s, idx) => {
                      const isChecked = selectedStudentIds.includes(s.id);
                      const scoreCount = Object.keys(s.scores || {}).length;

                      return (
                        <div
                          key={s.id}
                          onClick={() => handleToggleStudent(s.id)}
                          className={`flex items-center justify-between px-4 sm:px-6 py-3.5 hover:bg-slate-50/90 transition-all cursor-pointer select-none ${
                            isChecked
                              ? 'bg-blue-50/50 border-l-4 border-l-blue-600'
                              : 'bg-white border-l-4 border-l-transparent'
                          }`}
                        >
                          <div className="flex items-center gap-3.5 min-w-0">
                            {/* Checkbox */}
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleStudent(s.id)}
                              onClick={(e) => e.stopPropagation()}
                              className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer flex-shrink-0"
                            />

                            {/* No Urut */}
                            <span className="text-xs font-mono font-bold text-slate-400 w-6 text-center flex-shrink-0">
                              {idx + 1}
                            </span>

                            {/* Student Info */}
                            <div className="min-w-0">
                              <p className={`text-xs sm:text-sm font-bold truncate ${
                                isChecked ? 'text-blue-950 font-extrabold' : 'text-slate-800'
                              }`}>
                                {s.name}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[11px] font-mono text-slate-500">
                                  NISN: {s.nisn || '-'}
                                </span>
                                {s.rank && (
                                  <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-100">
                                    Peringkat {s.rank}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Completeness & Score */}
                          <div className="flex items-center gap-3 sm:gap-4 flex-shrink-0 pl-2">
                            {/* Score count badge */}
                            {scoreCount >= 12 ? (
                              <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                <svg className="w-3 h-3 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                                <span>12/12 Mapel</span>
                              </span>
                            ) : (
                              <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                <span>{scoreCount}/12 Mapel</span>
                              </span>
                            )}

                            {/* Average Score */}
                            <div className="text-right w-16">
                              <span className="text-xs sm:text-sm font-black text-slate-800 block">
                                {s.avgScore || '-'}
                              </span>
                              <span className="text-[10px] text-slate-400 font-medium block">
                                Rata-rata
                              </span>
                            </div>

                            {/* Checkmark indicator */}
                            <div className="w-6 flex items-center justify-center">
                              {isChecked ? (
                                <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
                                  ✓
                                </span>
                              ) : (
                                <span className="w-5 h-5 rounded-full border border-slate-300" />
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Roster Footer Bar */}
              <div className="p-3.5 sm:p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
                <span className="font-medium">
                  {studentsToPrint.length === totalStudents
                    ? 'Semua siswa di rombel ini akan dicetak.'
                    : `${studentsToPrint.length} dari ${totalStudents} siswa terpilih untuk dicetak.`}
                </span>

                <span className="font-bold text-slate-800 font-mono">
                  {studentsToPrint.length} Dokumen / Halaman PDF
                </span>
              </div>
            </div>
          </main>

        </div>
      </div>
    </div>
  );
}

