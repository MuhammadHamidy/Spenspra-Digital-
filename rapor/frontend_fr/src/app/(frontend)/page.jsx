'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { gradeApi } from '@/lib/gradeApi';
import { attendanceApi } from '@/lib/attendanceApi';
import { accountApiAdapter } from '@/lib/features/auth/infrastructure/accountApiAdapter';
import { tokenStorage } from '@/lib/common/tokenStorage';
import { deadlineApiAdapter } from '@/lib/features/deadlines/infrastructure/deadlineApiAdapter';

import { getSchoolAcademicPeriod, syncSchoolAcademicPeriod } from '@/lib/academicPeriod';

const DEFAULT_KKM = 75.0;

export default function MainPage() {
  const [user, setUser] = useState(null);
  const [academicYear, setAcademicYear] = useState(() => getSchoolAcademicPeriod().year || '2026/2027');
  const [semester, setSemester] = useState(() => getSchoolAcademicPeriod().semester || 'GANJIL');
  const [schoolKkm, setSchoolKkm] = useState(() => getSchoolAcademicPeriod().kkm || 75);
  const [levelFilter, setLevelFilter] = useState('ALL');
  const [deadlines, setDeadlines] = useState([]);
  const [endorsements, setEndorsements] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Data Scope Guru Pengampu & Wali Kelas
  const [teacherClassCodes, setTeacherClassCodes] = useState([]);
  const [teacherSubjectCodes, setTeacherSubjectCodes] = useState([]);
  const [walasClass, setWalasClass] = useState(null);
  const [teacherGrades, setTeacherGrades] = useState([]);

  // Data Murni dari Backend API
  const [serverSummary, setServerSummary] = useState(null);

  useEffect(() => {
    const currentUser = tokenStorage.getUser();
    setUser(currentUser);

    // Ambil sinkronisasi periode & KKM dari server Super Admin
    syncSchoolAcademicPeriod().then((period) => {
      if (period?.year) setAcademicYear(period.year);
      if (period?.semester) setSemester(period.semester);
      if (period?.kkm) setSchoolKkm(period.kkm);
    });
  }, []);

  useEffect(() => {
    const loadDashboardData = async () => {
      setIsLoading(true);
      try {
        const currentUser = tokenStorage.getUser();
        setUser(currentUser);
        const roleStr = String(currentUser?.roleName || currentUser?.role || '').toUpperCase();
        const isPrivileged = roleStr.includes('ADMIN') || roleStr.includes('KEPALA');
        const isTeacher = !isPrivileged;

        const promises = [
          gradeApi.getMonitoringSummary(schoolKkm).catch(() => null),
          deadlineApiAdapter.getDeadlines().catch(() => []),
          gradeApi.getEndorsements({ academicYear, semester }).catch(() => ({ data: [] })),
        ];

        if (isTeacher) {
          promises.push(attendanceApi.getClasses().catch(() => ({ data: [] })));
          promises.push(accountApiAdapter.getTeachers().catch(() => []));
          promises.push(gradeApi.getGrades({ academicYear, semester }).catch(() => ({ data: [] })));
        }

        const [sumRes, dlRes, endRes, clsRes, teachersRes, allGradesRes] = await Promise.all(promises);

        if (sumRes?.success && sumRes?.data) {
          setServerSummary(sumRes.data);
        } else {
          setServerSummary(null);
        }

        if (Array.isArray(dlRes)) {
          setDeadlines(dlRes);
        } else {
          setDeadlines([]);
        }

        if (endRes?.success && Array.isArray(endRes?.data)) {
          setEndorsements(endRes.data);
        } else {
          setEndorsements([]);
        }

        if (isTeacher && clsRes?.success && Array.isArray(clsRes.data)) {
          const myId = currentUser.id;
          const myNip = currentUser.nimNip || currentUser.nip || '';
          const myName = (currentUser.fullName || currentUser.full_name || '').toLowerCase();

          // 1. Dapatkan kelas dan mapel yang benar-benar ditugaskan ke guru ini
          const filtered = clsRes.data.filter((c) =>
            c.dosen_id === myId ||
            c.teacher_id === myId ||
            (myName && c.teacher_name && c.teacher_name.toLowerCase().includes(myName)) ||
            (myNip && (c.dosen_id?.includes(myNip) || c.teacher_nip?.includes(myNip)))
          );

          const tClasses = new Set();
          const tSubjects = new Set();
          const myTeachingPairs = new Set();

          filtered.forEach((c) => {
            const cName = (c.class_code || c.name || '').replace(/^Kelas\s*/i, '').trim();
            const rawSub = (c.course_code || c.course_id || '').toLowerCase().trim();
            if (cName) tClasses.add(cName);
            if (rawSub) {
              const cleanSub = rawSub.replace(/^crs-/, '');
              tSubjects.add(cleanSub);
              tSubjects.add(rawSub);
              if (cName) {
                myTeachingPairs.add(`${cName.toLowerCase()}__${cleanSub}`);
                myTeachingPairs.add(`${cName.toLowerCase()}__${rawSub}`);
              }
            }
          });

          // 2. Jika guru pernah menginput nilai sebelumnya, sertakan subject & class yang diinputnya
          if (allGradesRes?.success && Array.isArray(allGradesRes.data)) {
            allGradesRes.data.forEach((g) => {
              if (g.teacher_id && g.teacher_id === myId) {
                const s = (g.subject_code || '').toLowerCase().trim();
                const c = (g.class_name || '').replace(/^Kelas\s*/i, '').trim();
                if (s) {
                  tSubjects.add(s);
                  tSubjects.add(s.replace(/^crs-/, ''));
                }
                if (c) tClasses.add(c);
                if (s && c) {
                  myTeachingPairs.add(`${c.toLowerCase()}__${s}`);
                }
              }
            });
          }

          let myWalas = currentUser.className || currentUser.class_name;
          if (Array.isArray(teachersRes)) {
            const me = teachersRes.find(
              (t) =>
                t.id === currentUser.id ||
                (currentUser.nimNip && t.nim_nip === currentUser.nimNip) ||
                (t.full_name && currentUser.fullName && t.full_name.toLowerCase() === currentUser.fullName.toLowerCase())
            );
            if (me?.class_name) {
              myWalas = me.class_name;
            }
          }

          if (myWalas) {
            const cleanWalas = myWalas.replace(/^Kelas\s*/i, '').trim();
            setWalasClass(cleanWalas);
          } else {
            setWalasClass(null);
          }

          const classArray = [...tClasses];
          const subjectArray = [...tSubjects];
          setTeacherClassCodes(classArray);
          setTeacherSubjectCodes(subjectArray);

          // 3. Filter nilai HANYA untuk mata pelajaran dan kelas yang diampu guru ini
          if (allGradesRes?.success && Array.isArray(allGradesRes.data)) {
            const relevantGrades = allGradesRes.data.filter((g) => {
              if (g.score === null || g.score === undefined || Number(g.score) < 0) return false;
              if (g.teacher_id && g.teacher_id === myId) return true;

              const gClass = (g.class_name || '').replace(/^Kelas\s*/i, '').trim().toLowerCase();
              const gSub = (g.subject_code || '').toLowerCase().trim();
              const cleanSub = gSub.replace(/^crs-/, '');

              // Harus mapel yang diampu guru!
              const isMySubject = tSubjects.has(gSub) || tSubjects.has(cleanSub);
              if (!isMySubject) return false;

              // Harus kelas yang diajar guru ini
              const isMyClass = classArray.some((c) => c.toLowerCase() === gClass);
              return isMyClass;
            });
            setTeacherGrades(relevantGrades);
          } else {
            setTeacherGrades([]);
          }
        }
      } catch (err) {
        console.warn('Gagal memuat data analitik dashboard:', err);
        setServerSummary(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboardData();
  }, [academicYear, semester, schoolKkm]);

  const role = String(user?.roleName || user?.role || '').toUpperCase();
  const isAdmin = role.includes('ADMIN') || role === 'SUPER_ADMIN';
  const isKepalaSekolah = role.includes('KEPALA');
  const isTeacher = !isAdmin && !isKepalaSekolah;

  // ──────────────────────────────────────────────────────────
  // Perhitungan Data Murni (Scoped untuk Guru & Wali Kelas)
  // ──────────────────────────────────────────────────────────
  const rawClasses = useMemo(() => {
    if (isTeacher) {
      if (!teacherGrades || teacherGrades.length === 0) return [];
      const classMap = new Map();
      teacherGrades.forEach((g) => {
        const cName = (g.class_name || '').replace(/^Kelas\s*/i, '').trim();
        if (!cName) return;
        if (!classMap.has(cName)) {
          classMap.set(cName, { name: cName, scores: [], belowKkm: 0 });
        }
        const item = classMap.get(cName);
        const score = Number(g.score);
        item.scores.push(score);
        if (score < schoolKkm) {
          item.belowKkm++;
        }
      });

      return Array.from(classMap.values())
        .map((c) => {
          const graded = c.scores.length;
          const sum = c.scores.reduce((acc, val) => acc + val, 0);
          const avg = graded > 0 ? Number((sum / graded).toFixed(1)) : 0;
          const passed = Math.max(0, graded - c.belowKkm);
          const level = c.name.charAt(0);
          return {
            name: c.name,
            level,
            graded,
            belowKkm: c.belowKkm,
            passed,
            avg,
          };
        })
        .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    }

    if (!serverSummary?.classes || !Array.isArray(serverSummary.classes)) return [];
    return serverSummary.classes.map((c) => {
      const graded = Number(c.graded_count) || 0;
      const belowKkm = Number(c.below_kkm) || 0;
      const passed = Math.max(0, graded - belowKkm);
      const avg = Number(c.average_score?.toFixed(1)) || 0;
      const name = c.class_name ? c.class_name.replace(/^Kelas\s*/i, '') : '-';
      const level = name.charAt(0);
      return {
        name,
        level,
        graded,
        belowKkm,
        passed,
        avg,
      };
    });
  }, [serverSummary, isTeacher, teacherGrades, schoolKkm]);

  const filteredClasses = useMemo(() => {
    if (levelFilter === 'ALL') return rawClasses;
    return rawClasses.filter((c) => c.level === levelFilter);
  }, [rawClasses, levelFilter]);

  const rawSubjects = useMemo(() => {
    if (isTeacher) {
      if (!teacherGrades || teacherGrades.length === 0) return [];
      const subMap = new Map();
      teacherGrades.forEach((g) => {
        const sCode = (g.subject_code || '').toLowerCase().trim();
        const sName = g.subject_name || g.subject_code || 'Mata Pelajaran';
        if (!sCode) return;
        if (!subMap.has(sCode)) {
          subMap.set(sCode, { code: sCode, name: sName, scores: [] });
        }
        subMap.get(sCode).scores.push(Number(g.score));
      });

      return Array.from(subMap.values())
        .map((s) => {
          const graded = s.scores.length;
          const sum = s.scores.reduce((acc, val) => acc + val, 0);
          const avg = graded > 0 ? Number((sum / graded).toFixed(1)) : 0;
          return {
            code: s.code,
            name: s.name,
            avg,
            graded,
          };
        })
        .sort((a, b) => b.avg - a.avg);
    }

    if (!serverSummary?.subjects || !Array.isArray(serverSummary.subjects)) return [];
    return [...serverSummary.subjects]
      .map((s) => ({
        code: s.subject_code || '',
        name: s.subject_name || s.subject_code || 'Mata Pelajaran',
        avg: Number(s.average_score?.toFixed(1)) || 0,
        graded: Number(s.graded_count) || 0,
      }))
      .sort((a, b) => b.avg - a.avg);
  }, [serverSummary, isTeacher, teacherGrades]);

  // Metrik Sekolah / Scoped Guru
  const metrics = useMemo(() => {
    if (isTeacher && teacherGrades.length > 0) {
      const validScores = teacherGrades.filter(
        (g) => g.score !== null && g.score !== undefined && Number(g.score) >= 0
      );
      const totalGraded = validScores.length;
      const sumScore = validScores.reduce((acc, g) => acc + Number(g.score), 0);
      const schoolAvg = totalGraded > 0 ? Number((sumScore / totalGraded).toFixed(1)) : 0;
      const totalRemedial = validScores.filter((g) => Number(g.score) < schoolKkm).length;
      const totalPassed = Math.max(0, totalGraded - totalRemedial);
      const masteryRate = totalGraded > 0 ? Math.round((totalPassed / totalGraded) * 100) : 0;
      const endorsedCount = endorsements.filter((e) => e.status === 'APPROVED' || e.signature_data).length;

      return {
        totalStudents: totalGraded,
        totalGraded,
        schoolAvg,
        totalRemedial,
        totalPassed,
        masteryRate,
        endorsedCount,
        totalEndorsementsExpected: endorsements.length || rawClasses.length || 0,
      };
    }

    const totalStudents = Number(serverSummary?.total_students) || 0;
    const totalGraded = Number(serverSummary?.total_graded_students) || 0;
    const schoolAvg = serverSummary?.average_score ? Number(serverSummary.average_score.toFixed(1)) : 0;
    const totalRemedial = Number(serverSummary?.below_kkm) || 0;
    const totalPassed = Math.max(0, totalGraded - totalRemedial);
    const masteryRate = totalGraded > 0 ? Math.round((totalPassed / totalGraded) * 100) : 0;
    const endorsedCount = endorsements.filter((e) => e.status === 'APPROVED' || e.signature_data).length;

    return {
      totalStudents,
      totalGraded,
      schoolAvg,
      totalRemedial,
      totalPassed,
      masteryRate,
      endorsedCount,
      totalEndorsementsExpected: endorsements.length || rawClasses.length || 0,
    };
  }, [serverSummary, endorsements, rawClasses, isTeacher, teacherGrades, schoolKkm]);

  // Distribusi Predikat (Murni dari Backend / Scoped Guru)
  const predicateDistribution = useMemo(() => {
    if (isTeacher && teacherGrades.length > 0) {
      let a = 0, b = 0, c = 0, d = 0;
      teacherGrades.forEach((g) => {
        const pred = (g.predicate || '').toUpperCase();
        if (pred === 'A') a++;
        else if (pred === 'B') b++;
        else if (pred === 'C') c++;
        else if (pred === 'D') d++;
      });
      const total = a + b + c + d;

      return {
        A: { count: a, percent: total > 0 ? Math.round((a / total) * 100) : 0 },
        B: { count: b, percent: total > 0 ? Math.round((b / total) * 100) : 0 },
        C: { count: c, percent: total > 0 ? Math.round((c / total) * 100) : 0 },
        D: { count: d, percent: total > 0 ? Math.round((d / total) * 100) : 0 },
        total,
      };
    }

    const p = serverSummary?.predicate_distribution;
    const a = Number(p?.A) || 0;
    const b = Number(p?.B) || 0;
    const c = Number(p?.C) || 0;
    const d = Number(p?.D) || 0;
    const total = a + b + c + d;

    return {
      A: { count: a, percent: total > 0 ? Math.round((a / total) * 100) : 0 },
      B: { count: b, percent: total > 0 ? Math.round((b / total) * 100) : 0 },
      C: { count: c, percent: total > 0 ? Math.round((c / total) * 100) : 0 },
      D: { count: d, percent: total > 0 ? Math.round((d / total) * 100) : 0 },
      total,
    };
  }, [serverSummary, isTeacher, teacherGrades]);

  // Siswa Berprestasi & Remedial (Murni dari Backend / Scoped Guru)
  const topStudents = useMemo(() => {
    if (isTeacher) {
      if (!teacherGrades || teacherGrades.length === 0) return [];
      const stuMap = new Map();
      teacherGrades.forEach((g) => {
        const sid = g.student_id || g.nisn || g.student_name;
        if (!sid) return;
        if (!stuMap.has(sid)) {
          stuMap.set(sid, {
            student_id: g.student_id,
            nisn: g.nisn,
            student_name: g.student_name,
            class_name: (g.class_name || '').replace(/^Kelas\s*/i, '').trim(),
            scores: [],
          });
        }
        stuMap.get(sid).scores.push(Number(g.score));
      });

      return Array.from(stuMap.values())
        .map((s) => {
          const sum = s.scores.reduce((acc, val) => acc + val, 0);
          const avg = s.scores.length > 0 ? Number((sum / s.scores.length).toFixed(1)) : 0;
          return {
            ...s,
            average_score: avg,
          };
        })
        .sort((a, b) => b.average_score - a.average_score)
        .slice(0, 5);
    }

    if (!serverSummary?.top_students || !Array.isArray(serverSummary.top_students)) return [];
    return serverSummary.top_students.slice(0, 5);
  }, [serverSummary, isTeacher, teacherGrades]);

  const remedialStudents = useMemo(() => {
    if (isTeacher) {
      if (!teacherGrades || teacherGrades.length === 0) return [];
      const belowList = teacherGrades.filter((g) => Number(g.score) >= 0 && Number(g.score) < schoolKkm);
      const stuMap = new Map();
      belowList.forEach((g) => {
        const sid = g.student_id || g.nisn || g.student_name;
        if (!sid) return;
        const score = Number(g.score);
        const subName = g.subject_name || g.subject_code || 'Mapel';
        if (!stuMap.has(sid)) {
          stuMap.set(sid, {
            student_id: g.student_id,
            nisn: g.nisn,
            student_name: g.student_name,
            class_name: (g.class_name || '').replace(/^Kelas\s*/i, '').trim(),
            lowest_score: score,
            subjects: [subName],
          });
        } else {
          const item = stuMap.get(sid);
          if (score < item.lowest_score) {
            item.lowest_score = score;
          }
          if (!item.subjects.includes(subName)) {
            item.subjects.push(subName);
          }
        }
      });

      return Array.from(stuMap.values())
        .sort((a, b) => a.lowest_score - b.lowest_score)
        .slice(0, 5);
    }

    if (!serverSummary?.remedial_students || !Array.isArray(serverSummary.remedial_students)) return [];
    return serverSummary.remedial_students.slice(0, 5);
  }, [serverSummary, isTeacher, teacherGrades, schoolKkm]);

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* ────────────────────────────────────────────────────────── */}
      {/* HEADER UTAMA & FILTER PERIODIK */}
      {/* ────────────────────────────────────────────────────────── */}
      <section className="bg-white border border-slate-200 border-l-4 border-l-[#4B3B78] rounded-xl p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="max-w-2xl space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-md bg-[#EDEAF5] px-2.5 py-0.5 text-xs font-semibold text-[#4B3B78] border border-[#B9B0D2]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#4B3B78]" />
                SMP NEGERI 1 PRAMBON
              </span>
              <span className="text-xs text-slate-500 font-medium">• Sistem Penilaian e-Rapor</span>
              {isTeacher && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-semibold text-blue-800 border border-blue-200">
                  <span>Scope Guru:</span>
                  <strong>{rawClasses.length} Rombel</strong>
                  <span>•</span>
                  <strong>{rawSubjects.length} Mapel</strong>
                  {walasClass && <span>• Walas {walasClass}</span>}
                </span>
              )}
            </div>

            <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
              {isTeacher ? 'Dashboard Capaian Nilai Kelas & Mapel Diampu' : 'Dashboard Analitik Penilaian & Capaian Rapor'}
            </h1>
            <p className="text-xs text-slate-500 leading-relaxed">
              {isTeacher
                ? 'Pemantauan capaian nilai siswa khusus untuk rombongan belajar dan mata pelajaran yang Anda ampu serta kelas perwalian.'
                : 'Supervisi terpadu mutu pembelajaran, ketuntasan KKM setiap rombel kelas, serta verifikasi pengesahan tanda tangan digital Kepala Sekolah.'}
            </p>
          </div>

          {/* Filter Bar Toolbar & Quick Action */}
          <div className="flex flex-wrap items-center gap-3 bg-slate-50/80 p-2.5 rounded-lg border border-slate-200 shrink-0">
            <div className="flex items-center gap-2.5 bg-white px-3.5 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Tahun Ajaran: <strong className="text-slate-900">{academicYear}</strong></span>
              <span className="text-slate-300">•</span>
              <span>Semester: <strong className="text-slate-900">{semester === 'GANJIL' ? 'Ganjil' : 'Genap'}</strong></span>
            </div>

            <div className="self-center">
              {isAdmin || isKepalaSekolah ? (
                <Link
                  href="/admin/monitoring"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#193D9B] hover:bg-[#1E4DBD] text-white text-xs font-semibold shadow-2xs transition-colors"
                >
                  <span>Monitoring e-Rapor</span>
                  <span>→</span>
                </Link>
              ) : (
                <Link
                  href="/wali-kelas"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#193D9B] hover:bg-[#1E4DBD] text-white text-xs font-semibold shadow-2xs transition-colors"
                >
                  <span>Rekap Nilai Walas</span>
                  <span>→</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ────────────────────────────────────────────────────────── */}
      {/* 4 KARTU METRIK UTAMA (EXECUTIVE KPI) */}
      {/* ────────────────────────────────────────────────────────── */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Rerata Nilai */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <p className="text-xs font-semibold text-slate-500">
            {isTeacher ? 'Rata-rata Kelas Diampu' : 'Rata-rata Nilai Sekolah'}
          </p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 tracking-tight">
              {metrics.schoolAvg > 0 ? metrics.schoolAvg : '-'}
            </span>
            {metrics.schoolAvg > 0 && (
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
                metrics.schoolAvg >= schoolKkm
                  ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                  : 'text-rose-700 bg-rose-50 border-rose-200'
              }`}>
                {metrics.schoolAvg >= schoolKkm ? `+${(metrics.schoolAvg - schoolKkm).toFixed(1)} KKM` : `${(metrics.schoolAvg - schoolKkm).toFixed(1)} KKM`}
              </span>
            )}
          </div>
          <p className="mt-1.5 text-[11px] text-slate-400">Standar KKM: {schoolKkm}</p>
        </div>

        {/* Metric 2: Tingkat Ketuntasan Belajar */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <p className="text-xs font-semibold text-slate-500">Tingkat Ketuntasan</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black text-emerald-600 tracking-tight">
              {metrics.totalGraded > 0 ? `${metrics.masteryRate}%` : '-'}
            </span>
            <span className="text-xs font-semibold text-slate-500">
              {metrics.totalGraded > 0 ? `(${metrics.totalPassed}/${metrics.totalGraded} dinilai)` : 'Belum ada data'}
            </span>
          </div>
          <p className="mt-1.5 text-[11px] text-slate-400">Target kelulusan nilai &gt;= 75</p>
        </div>

        {/* Metric 3: Siswa Perlu Remedial */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <p className="text-xs font-semibold text-slate-500">Perlu Bimbingan / Remedial</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black text-amber-600 tracking-tight">
              {metrics.totalRemedial}
            </span>
            <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
              {metrics.totalRemedial > 0 ? 'Perlu tindakan' : 'Semua tuntas'}
            </span>
          </div>
          <p className="mt-1.5 text-[11px] text-slate-400">Nilai capaian di bawah batas KKM</p>
        </div>

        {/* Metric 4: Pengesahan Rapor Kepala Sekolah */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <p className="text-xs font-semibold text-slate-500">Pengesahan Rapor KS</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 tracking-tight">
              {metrics.endorsedCount}
            </span>
            <span className="text-xs text-slate-500 font-semibold">
              / {metrics.totalEndorsementsExpected > 0 ? `${metrics.totalEndorsementsExpected} Rombel` : '-'}
            </span>
          </div>
          <p className="mt-1.5 text-[11px] text-slate-400">Verifikasi tanda tangan digital</p>
        </div>
      </section>

      {/* ────────────────────────────────────────────────────────── */}
      {/* GRID CHART UTAMA (ROW 1: CHART NILAI KELAS & DISTRIBUSI PREDIKAT) */}
      {/* ────────────────────────────────────────────────────────── */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* CHART 1: Komparasi Rata-rata Nilai per Kelas vs KKM (8 Kolom) */}
        <div className="lg:col-span-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                    Komparasi Rata-rata Nilai per Kelas
                  </h2>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                    KKM: {schoolKkm}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {isTeacher
                    ? 'Grafik capaian rerata rombongan belajar yang Anda ampu & kelas perwalian.'
                    : 'Grafik perbandingan capaian rerata seluruh rombongan belajar.'}
                </p>
              </div>

              {/* Filter Tingkat Kelas */}
              {rawClasses.length > 0 && (
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs shrink-0">
                  {[
                    { key: 'ALL', label: 'Semua' },
                    { key: '7', label: 'Kls 7' },
                    { key: '8', label: 'Kls 8' },
                    { key: '9', label: 'Kls 9' },
                  ].map((f) => (
                    <button
                      key={f.key}
                      type="button"
                      onClick={() => setLevelFilter(f.key)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                        levelFilter === f.key
                          ? 'bg-white text-slate-900 shadow-2xs'
                          : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Visual Bar Chart SVG/CSS */}
            {filteredClasses.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-center p-6 border-b border-slate-100">
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-2">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <p className="text-xs font-bold text-slate-700">Belum Ada Data Penilaian Kelas</p>
                <p className="text-[11px] text-slate-400 max-w-sm mt-0.5">
                  Diagram rata-rata kelas akan muncul otomatis setelah nilai peserta didik disimpan oleh guru pengampu.
                </p>
              </div>
            ) : (
              <div className="mt-6 relative">
                <div className="relative h-64 border-b border-slate-200 flex items-end justify-around gap-2 sm:gap-4 px-2 pt-6">
                  {/* Horizontal Guide Lines */}
                  <div className="absolute inset-x-0 top-0 border-t border-slate-100" />
                  <div className="absolute inset-x-0 top-1/4 border-t border-slate-100" />
                  <div className="absolute inset-x-0 top-2/4 border-t border-slate-100" />
                  <div className="absolute inset-x-0 top-3/4 border-t border-slate-100" />

                  {/* Garis KKM 75 Line */}
                  <div
                    className="absolute inset-x-0 border-t-2 border-dashed border-rose-400 z-10 pointer-events-none"
                    style={{ bottom: '50%' }}
                  >
                    <span className="absolute -top-3 right-2 bg-rose-50 text-rose-700 text-[10px] font-black px-1.5 py-0.5 rounded border border-rose-200">
                      Garis KKM 75.0
                    </span>
                  </div>

                  {/* Bars for Each Class */}
                  {filteredClasses.map((c) => {
                    const heightPercent = Math.min(100, Math.max(8, ((c.avg - 50) / 50) * 100));
                    const isAboveKkm = c.avg >= schoolKkm;

                    return (
                      <div
                        key={c.name}
                        className="group relative flex-1 flex flex-col items-center h-full justify-end"
                      >
                        {/* Hover Tooltip */}
                        <div className="absolute -top-14 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 bg-slate-900 text-white rounded-lg p-2 text-center shadow-lg text-[10px] whitespace-nowrap">
                          <p className="font-bold text-white">Kelas {c.name}</p>
                          <p className="text-blue-200">Rerata: <strong className="text-white">{c.avg}</strong></p>
                          <p className="text-slate-300">Tuntas: {c.passed} • Remedial: {c.belowKkm}</p>
                        </div>

                        {/* Nilai di Atas Bar */}
                        <span className={`text-xs font-black mb-1.5 transition-transform group-hover:scale-110 ${
                          isAboveKkm ? 'text-[#4B3B78]' : 'text-rose-600'
                        }`}>
                          {c.avg}
                        </span>

                        {/* Batang Bar */}
                        <div
                          className={`w-full max-w-[48px] rounded-t-xl transition-all duration-500 group-hover:brightness-110 shadow-sm relative ${
                            isAboveKkm
                              ? 'bg-gradient-to-t from-[#4B3B78] to-[#4F8FBB]'
                              : 'bg-gradient-to-t from-amber-600 to-rose-500'
                          }`}
                          style={{ height: `${heightPercent}%` }}
                        >
                          <div className="absolute inset-x-0 top-0 h-1 bg-white/40 rounded-t-xl" />
                        </div>

                        {/* Label Kelas */}
                        <div className="mt-3 text-center">
                          <span className="text-xs font-bold text-slate-800 block">
                            Kelas {c.name}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {c.graded} Nilai
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Quick Footer */}
          <div className="mt-6 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-4 text-slate-600">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-[#4B3B78]" />
                <span>Rata-rata Di Atas KKM (&gt;= 75)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-[#F2C94C]" />
                <span>Di Bawah KKM (&lt; 75)</span>
              </span>
            </div>

            <Link
              href="/wali-kelas"
              className="text-xs font-bold text-[#4B3B78] hover:text-[#3D2E66] transition flex items-center gap-1"
            >
              <span>Buka Rekapitulasi Rapor per Rombel</span>
              <span>→</span>
            </Link>
          </div>
        </div>

        {/* CHART 2: Distribusi Predikat Capaian Rapor (4 Kolom) */}
        <div className="lg:col-span-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                Distribusi Predikat Nilai Rapor
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {isTeacher
                  ? 'Proporsi predikat capaian siswa pada kelas & mapel yang Anda ampu.'
                  : 'Proporsi predikat capaian A, B, C, dan D siswa sekolah.'}
              </p>
            </div>

            {/* Segmented Meter */}
            <div className="mt-5 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                <span>Distribusi Keseluruhan</span>
                <span className="text-slate-400 font-semibold">{predicateDistribution.total} Nilai Masuk</span>
              </div>
              <div className="h-4 w-full rounded-full bg-slate-100 overflow-hidden flex shadow-inner">
                {predicateDistribution.total === 0 ? (
                  <div className="w-full bg-slate-200 h-full" />
                ) : (
                  <>
                    <div
                      style={{ width: `${predicateDistribution.A.percent}%` }}
                      className="bg-emerald-500 h-full transition-all"
                      title={`Predikat A: ${predicateDistribution.A.count}`}
                    />
                    <div
                      style={{ width: `${predicateDistribution.B.percent}%` }}
                      className="bg-blue-500 h-full transition-all"
                      title={`Predikat B: ${predicateDistribution.B.count}`}
                    />
                    <div
                      style={{ width: `${predicateDistribution.C.percent}%` }}
                      className="bg-amber-400 h-full transition-all"
                      title={`Predikat C: ${predicateDistribution.C.count}`}
                    />
                    <div
                      style={{ width: `${predicateDistribution.D.percent}%` }}
                      className="bg-rose-500 h-full transition-all"
                      title={`Predikat D: ${predicateDistribution.D.count}`}
                    />
                  </>
                )}
              </div>
            </div>

            {/* List Detail Predikat */}
            <div className="mt-6 space-y-3">
              <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500 text-white font-black text-sm flex items-center justify-center shadow-xs">
                    A
                  </div>
                  <div>
                    <p className="text-xs font-bold text-emerald-950">Sangat Baik (88 – 100)</p>
                    <p className="text-[11px] text-emerald-700">{predicateDistribution.A.count} Nilai</p>
                  </div>
                </div>
                <span className="text-sm font-black text-emerald-800">{predicateDistribution.A.percent}%</span>
              </div>

              <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-600 text-white font-black text-sm flex items-center justify-center shadow-xs">
                    B
                  </div>
                  <div>
                    <p className="text-xs font-bold text-blue-950">Baik / Tuntas (76 – 87)</p>
                    <p className="text-[11px] text-blue-700">{predicateDistribution.B.count} Nilai</p>
                  </div>
                </div>
                <span className="text-sm font-black text-blue-800">{predicateDistribution.B.percent}%</span>
              </div>

              <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-500 text-white font-black text-sm flex items-center justify-center shadow-xs">
                    C
                  </div>
                  <div>
                    <p className="text-xs font-bold text-amber-950">Cukup (65 – 75)</p>
                    <p className="text-[11px] text-amber-700">{predicateDistribution.C.count} Nilai</p>
                  </div>
                </div>
                <span className="text-sm font-black text-amber-800">{predicateDistribution.C.percent}%</span>
              </div>

              <div className="p-3 rounded-xl bg-rose-50/70 border border-rose-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-rose-500 text-white font-black text-sm flex items-center justify-center shadow-xs">
                    D
                  </div>
                  <div>
                    <p className="text-xs font-bold text-rose-950">Perlu Bimbingan (&lt; 65)</p>
                    <p className="text-[11px] text-rose-700">{predicateDistribution.D.count} Nilai</p>
                  </div>
                </div>
                <span className="text-sm font-black text-rose-800">{predicateDistribution.D.percent}%</span>
              </div>
            </div>
          </div>

          <p className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-400 text-center">
            Rentang predikat otomatis sesuai Kurikulum Merdeka
          </p>
        </div>
      </section>

      {/* ────────────────────────────────────────────────────────── */}
      {/* GRID CHART 3 & 4 (CAPAIAN MAPEL & KETUNTASAN PER KELAS) */}
      {/* ────────────────────────────────────────────────────────── */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* CHART 3: Analisis Capaian Rata-Rata per Mata Pelajaran (7 Kolom) */}
        <div className="lg:col-span-7 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                  Analisis Rata-rata per Mata Pelajaran
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                  {rawSubjects.length} Mapel Terdata
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Capaian nilai rerata mata pelajaran dari data penilaian e-Rapor.
              </p>
            </div>
          </div>

          {rawSubjects.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center p-6">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-2">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <p className="text-xs font-bold text-slate-700">Belum Ada Nilai Mata Pelajaran</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Statistik mata pelajaran akan tampil setelah guru melakukan input nilai.
              </p>
            </div>
          ) : (
            <div className="mt-5 space-y-3">
              {rawSubjects.map((sub, idx) => {
                const isHighest = idx === 0 && rawSubjects.length > 1;
                const isLowest = idx === rawSubjects.length - 1 && rawSubjects.length > 1;
                const isAboveKkm = sub.avg >= schoolKkm;
                const barWidth = Math.min(100, Math.max(8, ((sub.avg - 50) / 50) * 100));

                return (
                  <div key={sub.code || idx} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-700">{sub.name}</span>
                        {isHighest && (
                          <span className="text-[10px] font-black bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded">
                            Tertinggi
                          </span>
                        )}
                        {isLowest && (
                          <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded">
                            Perlu Penguatan
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`font-black ${isAboveKkm ? 'text-[#193D9B]' : 'text-rose-600'}`}>
                          {sub.avg}
                        </span>
                        <span className="text-[10px] text-slate-400">({sub.graded} siswa)</span>
                      </div>
                    </div>

                    <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden flex relative">
                      <div
                        className="absolute top-0 bottom-0 w-0.5 bg-rose-400 z-10"
                        style={{ left: '50%' }}
                        title="Garis KKM 75"
                      />
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isAboveKkm
                            ? isHighest
                              ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
                              : 'bg-gradient-to-r from-blue-500 to-[#193D9B]'
                            : 'bg-gradient-to-r from-rose-500 to-amber-500'
                        }`}
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Garis vertikal penanda KKM 75.0</span>
            <span className="font-semibold">Skala 50 – 100</span>
          </div>
        </div>

        {/* CHART 4: Rasio Ketuntasan Belajar per Kelas (5 Kolom) */}
        <div className="lg:col-span-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                Rasio Ketuntasan Belajar per Kelas
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Perbandingan siswa tuntas vs siswa yang memerlukan remedial.
              </p>
            </div>

            {filteredClasses.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-center p-6">
                <p className="text-xs font-bold text-slate-700">Belum Ada Data Rombel</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Rasio ketuntasan akan terhitung otomatis sesuai data rombel.
                </p>
              </div>
            ) : (
              <div className="mt-5 space-y-4">
                {filteredClasses.map((c) => {
                  const total = c.graded || 1;
                  const passPercent = c.graded > 0 ? Math.round((c.passed / total) * 100) : 0;
                  const remPercent = c.graded > 0 ? 100 - passPercent : 0;

                  return (
                    <div key={c.name} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-800">Kelas {c.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-emerald-700 font-bold">{c.passed} Tuntas</span>
                          <span className="text-slate-300">•</span>
                          <span className="text-amber-700 font-bold">{c.belowKkm} Remedial</span>
                          <span className="text-slate-400 font-medium text-[11px]">({passPercent}%)</span>
                        </div>
                      </div>

                      <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
                        <div
                          className="bg-emerald-500 h-full transition-all duration-500"
                          style={{ width: `${passPercent}%` }}
                        />
                        <div
                          className="bg-amber-500 h-full transition-all duration-500"
                          style={{ width: `${remPercent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="mt-6 p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span>Total Tuntas: {metrics.totalPassed}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span>Remedial: {metrics.totalRemedial}</span>
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Siswa dengan capaian di bawah batas KKM 75 berhak mengikuti program tindak lanjut remedial.
            </p>
          </div>
        </div>
      </section>

      {/* ────────────────────────────────────────────────────────── */}
      {/* ACTIONABLE INSIGHTS: TOP STUDENTS & REMEDIAL FOCUS */}
      {/* ────────────────────────────────────────────────────────── */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card: Top Siswa Berprestasi */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                🏆 Siswa Peraih Rata-Rata Tertinggi
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Peringkat capaian nilai tertinggi dari penilaian yang masuk
              </p>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
              Prestasi
            </span>
          </div>

          {topStudents.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              Belum ada data peringkat siswa berprestasi untuk periode ini.
            </div>
          ) : (
            <div className="mt-4 divide-y divide-slate-100">
              {topStudents.map((s, i) => (
                <div key={s.student_id || s.nisn || i} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center font-black text-xs ${
                      i === 0 ? 'bg-amber-400 text-slate-950 shadow-xs' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {i + 1}
                    </span>
                    <div>
                      <p className="font-bold text-slate-900">{s.student_name}</p>
                      <p className="text-[11px] text-slate-400">NISN: {s.nisn || '-'} • Kelas {s.class_name}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-sm font-black text-emerald-600">{Number(s.average_score?.toFixed(1)) || s.average_score}</span>
                    <span className="text-[10px] text-slate-400 block">Rata-rata</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Card: Siswa Butuh Pendampingan Remedial */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                ⚠️ Siswa Prioritas Pendampingan Remedial
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Peserta didik dengan nilai di bawah KKM 75
              </p>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
              Perlu Tindakan
            </span>
          </div>

          {remedialStudents.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              {metrics.totalGraded > 0
                ? 'Seluruh siswa yang dinilai telah mencapai KKM 75 (tidak ada remedial).'
                : 'Belum ada data penilaian remedial untuk periode ini.'}
            </div>
          ) : (
            <div className="mt-4 divide-y divide-slate-100">
              {remedialStudents.map((s, i) => (
                <div key={s.student_id || s.nisn || i} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                  <div>
                    <p className="font-bold text-slate-900">{s.student_name}</p>
                    <p className="text-[11px] text-slate-400">
                      Kelas {s.class_name} • Mapel: <span className="text-amber-700 font-semibold">{Array.isArray(s.subjects) ? s.subjects.join(', ') : (s.subjects || s.subject || 'Mapel Rapor')}</span>
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="text-sm font-black text-rose-600">{Number(s.lowest_score?.toFixed(1)) || s.lowest_score}</span>
                    <span className="text-[10px] text-rose-500 font-semibold block">KKM {schoolKkm}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ────────────────────────────────────────────────────────── */}
      {/* JADWAL & STATUS TENGGAT PENILAIAN RAPOR (COMPACT WIDGET) */}
      {/* ────────────────────────────────────────────────────────── */}
      {deadlines && deadlines.length > 0 && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#193D9B] flex items-center justify-center">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900">Jadwal & Batas Waktu Pengisian Nilai</h3>
                <p className="text-[11px] text-slate-400">Agenda resmi penilaian e-Rapor SMPN 1 Prambon</p>
              </div>
            </div>

            {isAdmin && (
              <Link
                href="/admin/monitoring"
                className="text-xs font-bold text-blue-600 hover:text-blue-800 transition"
              >
                Atur Batas Waktu →
              </Link>
            )}
          </div>

          <div className="mt-3.5 grid grid-cols-1 md:grid-cols-2 gap-3">
            {deadlines.map((dl) => {
              const dDate = dl.deadline_at ? new Date(dl.deadline_at) : null;
              const isExpired = dDate ? dDate < new Date() : false;
              const isOpen = dl.is_open && !isExpired;

              return (
                <div key={dl.id || dl.type} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{dl.title}</span>
                      {isOpen ? (
                        <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          Aktif Dibuka
                        </span>
                      ) : (
                        <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                          Ditutup
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Batas Waktu: {dDate ? dDate.toLocaleDateString('id-ID', { dateStyle: 'full' }) : 'Belum diatur'}
                    </p>
                  </div>

                  <Link
                    href={dl.type === 'PTS' ? '/penilaian/pts' : '/penilaian/uas'}
                    className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-[#193D9B] font-bold text-xs hover:bg-slate-100 shadow-2xs transition"
                  >
                    Input Nilai →
                  </Link>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
