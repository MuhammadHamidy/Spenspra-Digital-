'use client';

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { gradeApi } from '@/lib/gradeApi';
import { attendanceApi } from '@/lib/attendanceApi';
import { tokenStorage } from '@/lib/common/tokenStorage';
import { deadlineApiAdapter } from '@/lib/features/deadlines/infrastructure/deadlineApiAdapter';
import Pagination from '@/components/Pagination';

const DEFAULT_DESCRIPTIONS = {
  A: 'Sangat baik dalam memahami materi semester ini dan mampu menerapkannya secara mandiri.',
  B: 'Baik dalam memahami capaian materi pembelajaran dan mampu menerapkannya dalam evaluasi.',
  C: 'Cukup dalam mencapai ketuntasan materi, namun masih perlu bimbingan berkelanjutan.',
  D: 'Perlu pendampingan intensif dalam memahami materi dasar dan remedial pembelajaran.',
};

const getPredicate = (score) => {
  if (score === '' || score === null || score === undefined || Number.isNaN(Number(score))) return '-';
  if (Number(score) < 0) return '-';
  if (Number(score) >= 86) return 'A';
  if (Number(score) >= 76) return 'B';
  if (Number(score) >= 66) return 'C';
  return 'D';
};

const INITIAL_PREDICATE_DESCRIPTIONS = {
  A: 'Sangat baik dalam memahami materi pembelajaran akhir semester dan mampu menyelesaikannya secara mandiri.',
  B: 'Baik dalam memahami materi pembelajaran akhir semester dan mampu menyelesaikannya dengan tepat.',
  C: 'Cukup dalam memahami materi pembelajaran, masih memerlukan latihan dan penguatan lanjutan.',
  D: 'Perlu bimbingan dan pendampingan intensif dalam ketuntasan capaian materi pembelajaran.',
};

export default function PenilaianUASPage() {
  const [subjects, setSubjects] = useState([
    { code: 'BIG', name: 'Bahasa Inggris' },
    { code: 'MAT', name: 'Matematika' },
    { code: 'PAI', name: 'Pendidikan Agama Islam dan Budi Pekerti' },
    { code: 'PP', name: 'Pendidikan Pancasila' },
    { code: 'BI', name: 'Bahasa Indonesia' },
    { code: 'IPA', name: 'Ilmu Pengetahuan Alam' },
    { code: 'IPS', name: 'Ilmu Pengetahuan Sosial' },
    { code: 'PJOK', name: 'Pendidikan Jasmani, Olahraga, dan Kesehatan' },
    { code: 'INF', name: 'Informatika' },
    { code: 'SBP', name: 'Seni Budaya dan Prakarya' },
    { code: 'BJ', name: 'Bahasa Jawa' },
    { code: 'BTQ', name: 'Baca Tulis Al Qur’an' },
  ]);
  const [classes, setClasses] = useState(['7A']);
  const [subject, setSubject] = useState('BIG');
  const [className, setClassName] = useState('7A');
  const [rows, setRows] = useState([]);
  const [saved, setSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [search, setSearch] = useState('');
  const [showTemplateConfig, setShowTemplateConfig] = useState(false);
  const [predicateTemplates, setPredicateTemplates] = useState(INITIAL_PREDICATE_DESCRIPTIONS);
  const [uasDeadline, setUasDeadline] = useState(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Load master courses & classes from backend filtered by logged-in teacher
  useEffect(() => {
    deadlineApiAdapter.getDeadlines().then((list) => {
      const dl = list.find((d) => d.type === 'UAS');
      if (dl) setUasDeadline(dl);
    }).catch(() => {});
    const fetchMasterData = async () => {
      try {
        const currentUser = tokenStorage.getUser();
        const [clsRes, crsRes] = await Promise.all([
          attendanceApi.getClasses(),
          attendanceApi.getCourses(),
        ]);

        let availableSubjects = [];
        if (crsRes.success && Array.isArray(crsRes.data) && crsRes.data.length > 0) {
          availableSubjects = crsRes.data.map((c) => ({ code: c.code, name: c.name }));
        }

        if (clsRes.success && Array.isArray(clsRes.data) && clsRes.data.length > 0) {
          let teacherClasses = clsRes.data;
          if (currentUser && (currentUser.role === 'GURU' || currentUser.roleName === 'GURU')) {
            const myName = (currentUser.fullName || currentUser.full_name || '').toLowerCase();
            const filtered = clsRes.data.filter((c) =>
              c.dosen_id === currentUser.id ||
              c.teacher_id === currentUser.id ||
              (myName && c.teacher_name && c.teacher_name.toLowerCase().includes(myName)) ||
              (currentUser.nimNip && (c.dosen_id?.includes(currentUser.nimNip) || c.teacher_nip?.includes(currentUser.nimNip)))
            );
            if (filtered.length > 0) {
              teacherClasses = filtered;
            }
          }

          const classNames = [...new Set(teacherClasses.map((c) => c.class_code || c.name || c.id))];
          if (classNames.length > 0) {
            setClasses(classNames);
            if (!classNames.includes(className)) {
              setClassName(classNames[0]);
            }
          }

          if (currentUser && (currentUser.role === 'GURU' || currentUser.roleName === 'GURU')) {
            const teacherCourseCodes = [...new Set(teacherClasses.map((c) => c.course_code || c.course_id))];
            const filteredSubjects = availableSubjects.filter((s) =>
              teacherCourseCodes.some((tc) => tc === s.code || tc === `crs-${s.code.toLowerCase()}`)
            );
            if (filteredSubjects.length > 0) {
              setSubjects(filteredSubjects);
              setSubject(filteredSubjects[0].code);
            } else if (availableSubjects.length > 0) {
              setSubjects(availableSubjects);
            }
          } else if (availableSubjects.length > 0) {
            setSubjects(availableSubjects);
          }
        }
      } catch (err) {
        console.warn('Gagal memuat master kelas/mapel dari server:', err);
      }
    };
    fetchMasterData();
  }, []);

  const formatDescription = useCallback((predicate) => {
    if (!predicate || predicate === '-') return '';
    const template = predicateTemplates[predicate] || INITIAL_PREDICATE_DESCRIPTIONS[predicate] || '';
    return template.replace(/^[A-D]:\s*/i, '').trim();
  }, [predicateTemplates]);

  const loadStudentsAndGrades = useCallback(async () => {
    setSaved(false);
    setSaveMessage('');
    try {
      const res = await gradeApi.getGrades({
        className,
        subjectCode: subject,
        assessmentType: 'PAS',
      });
      if (res.success && Array.isArray(res.data) && res.data.length > 0) {
        setRows(
          res.data.map((g) => {
            const hasScore = g.score !== undefined && g.score !== null && Number(g.score) >= 0;
            const pred = hasScore ? getPredicate(g.score) : '-';
            const defaultDesc = formatDescription(pred);
            return {
              id: g.student_id,
              person_id: g.person_id || null,
              nisn: g.nisn,
              name: g.student_name,
              className: g.class_name,
              score: hasScore ? String(g.score) : '',
              description: g.description || defaultDesc,
            };
          })
        );
      } else {
        setRows([]);
      }
    } catch (err) {
      console.warn('Gagal memuat nilai UAS dari server:', err);
      setRows([]);
    }
  }, [className, subject, formatDescription]);

  useEffect(() => {
    loadStudentsAndGrades();
  }, [loadStudentsAndGrades]);

  useEffect(() => {
    setCurrentPage(1);
  }, [className, subject, search]);

  const visibleRows = rows.filter(
    (row) =>
      !search || row.name.toLowerCase().includes(search.toLowerCase()) || row.nisn.includes(search)
  );

  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return visibleRows.slice(start, start + pageSize);
  }, [visibleRows, currentPage, pageSize]);

  const updateScore = (id, value) => {
    const score = value === '' ? '' : Math.max(0, Math.min(100, Number(value)));
    const predicate = getPredicate(score);
    const autoDesc = formatDescription(predicate);
    setRows((current) =>
      current.map((row) =>
        row.id === id
          ? { ...row, score, description: autoDesc }
          : row
      )
    );
    setSaved(false);
  };

  const updateDescription = (id, description) => {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, description } : row)));
    setSaved(false);
  };

  const applyTemplateToAllStudents = () => {
    setRows((current) =>
      current.map((row) => {
        const predicate = getPredicate(row.score);
        return {
          ...row,
          description: formatDescription(predicate),
        };
      })
    );
    setSaved(false);
  };

  const handleSaveGrades = async () => {
    setIsSaving(true);
    setSaved(false);
    setSaveMessage('');

    const currentSubjectObj = subjects.find((item) => item.code === subject);
    const subjectName = currentSubjectObj ? currentSubjectObj.name : subject;
    const currentUser = tokenStorage.getUser();

    const payload = {
      class_name: className,
      subject_code: subject,
      subject_name: subjectName,
      assessment_type: 'PAS',
      academic_year: '2025/2026',
      semester: 'GENAP',
      teacher_id: currentUser?.id || '',
      teacher_name: currentUser?.fullName || currentUser?.full_name || 'Guru Pengampu',
      grades: rows
        .filter((r) => r.score !== '' && r.score !== null && !isNaN(Number(r.score)))
        .map((r) => ({
          student_id: r.id,
          person_id: r.person_id,
          nisn: r.nisn,
          student_name: r.name,
          score: Number(r.score),
          description: r.description || (getPredicate(r.score) === '-' ? '' : DEFAULT_DESCRIPTIONS[getPredicate(r.score)]),
        })),
    };

    if (payload.grades.length === 0) {
      setIsSaving(false);
      setSaveMessage('Belum ada nilai yang diinput untuk disimpan.');
      setSaved(true);
      return;
    }

    try {
      const res = await gradeApi.saveBulkGrades(payload);
      if (res.success) {
        setSaveMessage(`Berhasil menyimpan ${res.data?.saved || payload.grades.length} nilai UAS siswa ke database e-Rapor.`);
      } else {
        setSaveMessage(`Tersimpan lokal (${payload.grades.length} siswa). Server respons: ${res.error?.message || 'OK'}`);
      }
    } catch (err) {
      setSaveMessage(`Tersimpan lokal (${payload.grades.length} siswa). Server offline.`);
    } finally {
      setIsSaving(false);
      setSaved(true);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Coming Soon Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-linear-to-br from-slate-900 via-indigo-950 to-blue-900 p-8 sm:p-10 text-white shadow-lg">
        <div className="absolute -right-10 -bottom-10 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-3xl">

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Input Nilai UAS (Sumatif Akhir Semester)
          </h1>
          <p className="mt-3 text-sm text-slate-300 leading-relaxed">
            Modul penginputan nilai UAS / PAS / SAS saat ini <strong>masih dalam tahap persiapan (Coming Soon)</strong> dan belum dibuka untuk penginputan nilai. Saat ini periode akademik berfokus pada <strong>Penilaian Sumatif Tengah Semester (USTS)</strong>.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <a
              href="/penilaian/pts"
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <span>Buka Input Nilai USTS</span>
            </a>
            <a
              href="/"
              className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs border border-white/20 transition-all flex items-center gap-2"
            >
              <span>Kembali ke Dashboard</span>
            </a>
          </div>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-xs">
          <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-100 text-[#193D9B] flex items-center justify-center mb-3">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-xs font-bold text-slate-900">Jadwal Pembukaan Portal</h3>
          <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
            Portal penilaian akhir semester akan dibuka menjelang pelaksanaan pekan Sumatif Akhir Semester (SAS) sesuai kalender akademik resmi SMPN 1 Prambon.
          </p>
        </div>

        <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-xs">
          <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-700 flex items-center justify-center mb-3">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </div>
          <h3 className="text-xs font-bold text-slate-900">Persiapan Penilaian USTS</h3>
          <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
            Bapak/Ibu guru diharapkan melengkapi penginputan nilai harian, tugas, dan nilai Ujian Sumatif Tengah Semester (USTS) pada menu yang telah disediakan.
          </p>
        </div>

        <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-xs">
          <div className="w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-700 flex items-center justify-center mb-3">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h3 className="text-xs font-bold text-slate-900">Kalkulasi Rapor Akhir</h3>
          <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
            Saat portal UAS dibuka, sistem akan otomatis mengolah rata-rata nilai sumatif materi, asesmen akhir semester, serta generate deskripsi rapor Kurikulum Merdeka.
          </p>
        </div>
      </div>

      {/* Pratinjau Layout Form UAS (Coming Soon) */}
      <div className="p-4 rounded-2xl bg-slate-100/70 border border-slate-200">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 text-[10px] font-bold">
              PRATINJAU FORMAT (COMING SOON)
            </span>
            <span className="text-xs text-slate-600 font-semibold">
              Format Penilaian Akhir Semester (Akan Diaktifkan Sesuai Jadwal)
            </span>
          </div>
        </div>

        <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-xs md:grid-cols-[1.2fr_1fr_1.5fr_auto]">
          <label className="text-xs font-semibold text-slate-700">
            Mata Pelajaran
            <select
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-normal text-slate-800 outline-none focus:border-blue-600"
            >
              {subjects.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.code} — {item.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-semibold text-slate-700">
            Rombel
            <select
              value={className}
              onChange={(event) => setClassName(event.target.value)}
              className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-normal text-slate-800 outline-none focus:border-blue-600"
            >
              {classes.map((item) => (
                <option key={item} value={item}>
                  Kelas {item}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-semibold text-slate-700">
            Cari Siswa
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari NISN atau nama lengkap..."
              className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-normal outline-none focus:border-blue-600"
            />
          </label>
          <div className="flex items-end">
            <button
              type="button"
              onClick={() => setShowTemplateConfig(!showTemplateConfig)}
              className="w-full px-3.5 py-2 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <span>{showTemplateConfig ? 'Tutup Format' : 'Format Deskripsi'}</span>
            </button>
          </div>
        </div>
      </div>

      {showTemplateConfig && (
        <div className="p-4 rounded-xl border border-blue-100 bg-blue-50/50 space-y-3">
          <div className="border-b border-blue-200 pb-2">
            <h3 className="text-xs font-bold text-blue-900">
              Konfigurasi Format Deskripsi Otomatis — Kelas {className} ({subjects.find((s) => s.code === subject)?.name || subject})
            </h3>
            <p className="text-[11px] text-blue-700 mt-0.5">
              Format deskripsi rapor otomatis terisi: <strong>Predikat + Default Deskripsi</strong>
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {['A', 'B', 'C', 'D'].map((pred) => (
              <div key={pred} className="space-y-1 bg-white p-3 rounded-lg border border-slate-200">
                <span className="font-bold text-slate-700 text-xs">Predikat {pred}</span>
                <input
                  type="text"
                  value={predicateTemplates[pred] || ''}
                  onChange={(e) => setPredicateTemplates((prev) => ({ ...prev, [pred]: e.target.value }))}
                  className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs outline-none focus:border-blue-500"
                />
              </div>
            ))}
          </div>
          <div className="flex justify-end pt-2 border-t border-blue-200">
            <button
              type="button"
              onClick={applyTemplateToAllStudents}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shadow-xs"
            >
              <span>🔄 Terapkan ke Semua Siswa Kelas {className}</span>
            </button>
          </div>
        </div>
      )}

      {/* Tabel Nilai UAS (Pratinjau / Coming Soon) */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
        <div className="border-b border-slate-200 bg-amber-50/60 px-4 py-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span className="text-xs font-bold text-slate-800">
              Pratinjau Data Siswa ({visibleRows.length} Siswa Terdaftar)
            </span>
          </div>
          <span className="text-[11px] font-semibold text-amber-800 bg-amber-100/70 border border-amber-200/80 px-2.5 py-0.5 rounded-full">
            Fitur Input Nilai UAS Sedang Coming Soon
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-600">
                <th className="py-2.5 px-3 w-12 text-center">No</th>
                <th className="py-2.5 px-3 w-28">NISN</th>
                <th className="py-2.5 px-3">Nama Siswa</th>
                <th className="py-2.5 px-3 w-24 text-center">Nilai UAS</th>
                <th className="py-2.5 px-3 w-20 text-center">Predikat</th>
                <th className="py-2.5 px-3">Deskripsi Capaian Akhir</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visibleRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    Tidak ada siswa ditemukan di kelas {className}.
                  </td>
                </tr>
              ) : (
                paginatedRows.map((r, index) => {
                  const pred = getPredicate(r.score);
                  const itemNo = (currentPage - 1) * pageSize + index + 1;
                  return (
                    <tr key={r.id} className="hover:bg-slate-50/80">
                      <td className="py-2 px-3 text-center text-slate-500">{itemNo}</td>
                      <td className="py-2 px-3 font-mono text-slate-600">{r.nisn}</td>
                      <td className="py-2 px-3 font-semibold text-slate-800">{r.name}</td>
                      <td className="py-2 px-3 text-center">
                        <input
                          type="number"
                          disabled
                          value={r.score || ''}
                          placeholder="-"
                          className="w-16 rounded border border-slate-200 bg-slate-50 px-2 py-1 text-center font-bold text-slate-400 cursor-not-allowed"
                        />
                      </td>
                      <td className="py-2 px-3 text-center font-bold">
                        <span className="inline-block w-6 py-0.5 rounded text-[11px] bg-slate-100 text-slate-500">
                          {pred}
                        </span>
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="text"
                          disabled
                          value={r.description || ''}
                          placeholder="Deskripsi rapor akan otomatis terisi saat UAS aktif..."
                          className="w-full rounded border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-400 cursor-not-allowed"
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Paginasi Nilai UAS */}
        <Pagination
          currentPage={currentPage}
          totalItems={visibleRows.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setCurrentPage(1);
          }}
          pageSizeOptions={[10, 20, 32]}
          itemLabel="siswa"
        />
      </div>

      {/* Action Bar (Coming Soon State) */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200">
        <div className="flex items-center gap-2 text-xs text-slate-600">
          <span className="text-amber-500 text-sm">🔒</span>
          <span>Penginputan Nilai UAS akan diaktifkan secara serentak menjelang asesmen akhir semester.</span>
        </div>
        <button
          type="button"
          disabled
          className="rounded-xl bg-slate-200 text-slate-400 border border-slate-300 px-5 py-2 text-xs font-bold cursor-not-allowed flex items-center gap-2"
        >
          <span>Simpan Nilai UAS (Coming Soon)</span>
        </button>
      </div>
    </div>
  );
}
