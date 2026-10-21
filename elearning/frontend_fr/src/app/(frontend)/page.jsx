'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { tokenStorage } from '@/lib/common/tokenStorage';
import { elearningApi } from '@/lib/elearningApi';
import Card from '@/components/Card';
import Button from '@/components/Button';
import StatusBadge from '@/components/StatusBadge';
import Modal from '@/components/Modal';
import Input from '@/components/Input';

export default function LMSDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [materials, setMaterials] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);

  // Token Modal State for CBT
  const [selectedExam, setSelectedExam] = useState(null);
  const [examToken, setExamToken] = useState('');
  const [tokenError, setTokenError] = useState('');
  const [isStartingExam, setIsStartingExam] = useState(false);

  useEffect(() => {
    const currentUser = tokenStorage.getUser();
    setUser(currentUser);

    const loadData = async () => {
      setLoading(true);
      try {
        const [mats, tasks, cbtList] = await Promise.all([
          elearningApi.getMaterials(),
          elearningApi.getAssignments(),
          elearningApi.getExams(),
        ]);
        setMaterials(mats || []);
        setAssignments(tasks || []);
        setExams(cbtList || []);
      } catch (e) {
        console.error('Failed to load LMS data:', e);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const role = String(user?.roleName || user?.role || user?.role_name || '').toUpperCase();
  const isSiswa = role.includes('SISWA') || role.includes('STUDENT');
  const isAdmin = role.includes('ADMIN') || role === 'SUPER_ADMIN';
  const isGuru = !isAdmin && !isSiswa;

  const handleOpenExamModal = (exam) => {
    setSelectedExam(exam);
    setExamToken('');
    setTokenError('');
  };

  const handleStartExam = async (e) => {
    e.preventDefault();
    if (!examToken.trim()) {
      setTokenError('Harap masukkan token ujian!');
      return;
    }

    setIsStartingExam(true);
    setTokenError('');
    try {
      await elearningApi.startExamSession(selectedExam.id, examToken, user);
      router.push(`/ujian/${selectedExam.id}/run`);
    } catch (err) {
      setTokenError(err.message || 'Token ujian tidak valid!');
      setIsStartingExam(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 max-w-7xl mx-auto px-2 sm:px-0">
      {/* 1. HERO BANNER */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-700 via-emerald-800 to-teal-900 text-white p-5 sm:p-7 shadow-sm">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/15 text-[11px] font-semibold backdrop-blur-xs text-white border border-white/20">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
              <span>Spenspra Belajar Digital</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              {isSiswa
                ? `Halo, ${user?.fullName || user?.full_name || 'Siswa'}! 👋`
                : `Selamat Datang, ${user?.fullName || user?.full_name || 'Bapak/Ibu Guru'}!`}
            </h1>
            <p className="text-white/90 text-xs sm:text-sm max-w-2xl font-light">
              {isSiswa
                ? `Kelas ${user?.className || user?.class_name || '7A'} • Akses modul pelajaran, tugas mandiri, dan jadwal ujian Anda.`
                : 'Sistem pembelajaran terintegrasi: kelola materi ajar, penugasan siswa, dan pemantauan ujian.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0 pt-2 sm:pt-0">
            {isSiswa ? (
              <Link href="/ujian" className="w-full sm:w-auto">
                <Button variant="accent" size="lg" className="w-full sm:w-auto min-h-[44px] shadow-sm font-bold">
                  <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  Masuk e-Ujian
                </Button>
              </Link>
            ) : (
              <>
                <Link href="/guru/monitoring">
                  <Button variant="danger" size="lg" className="shadow-sm">
                    <span className="w-2 h-2 rounded-full bg-white animate-pulse mr-2" />
                    Live Proctoring
                  </Button>
                </Link>
                <Link href="/guru/ujian">
                  <Button variant="outline" size="lg" className="bg-white/10 text-white border-white/30 hover:bg-white/20">
                    + Buat Ujian
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 2. STATS CARDS */}
      {isSiswa ? (
        <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
          <Link href="/materi" className="block group">
            <Card noPadding className="p-3 sm:p-4 hover:border-emerald-300 transition-all text-center sm:text-left flex flex-col sm:flex-row items-center sm:items-center gap-2 sm:gap-3.5">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-100">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <div className="min-w-0">
                <p className="text-[10px] sm:text-xs font-semibold text-neutral-500 truncate">Materi</p>
                <p className="text-base sm:text-xl font-bold text-neutral-900 leading-tight">{materials.length} <span className="text-xs font-normal text-neutral-500 hidden sm:inline">Modul</span></p>
              </div>
            </Card>
          </Link>

          <Link href="/tugas" className="block group">
            <Card noPadding className="p-3 sm:p-4 hover:border-sky-300 transition-all text-center sm:text-left flex flex-col sm:flex-row items-center sm:items-center gap-2 sm:gap-3.5">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center shrink-0 border border-sky-100">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
              </div>
              <div className="min-w-0">
                <p className="text-[10px] sm:text-xs font-semibold text-neutral-500 truncate">Tugas</p>
                <p className="text-base sm:text-xl font-bold text-neutral-900 leading-tight">{assignments.length} <span className="text-xs font-normal text-neutral-500 hidden sm:inline">Tugas</span></p>
              </div>
            </Card>
          </Link>

          <Link href="/ujian" className="block group">
            <Card noPadding className="p-3 sm:p-4 hover:border-amber-300 transition-all text-center sm:text-left flex flex-col sm:flex-row items-center sm:items-center gap-2 sm:gap-3.5">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-amber-50 text-amber-800 flex items-center justify-center shrink-0 border border-amber-200">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="min-w-0">
                <p className="text-[10px] sm:text-xs font-semibold text-neutral-500 truncate">Ujian</p>
                <p className="text-base sm:text-xl font-bold text-neutral-900 leading-tight">{exams.length} <span className="text-xs font-normal text-neutral-500 hidden sm:inline">Ujian</span></p>
              </div>
            </Card>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card noPadding className="p-4 sm:p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-[12px] bg-primary-50 text-primary-500 flex items-center justify-center shrink-0">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-neutral-500">Materi Pelajaran</p>
              <p className="text-2xl font-bold text-neutral-900">{materials.length} Modul</p>
              <p className="text-[11px] text-success-600 font-medium">Tersedia online</p>
            </div>
          </Card>

          <Card noPadding className="p-4 sm:p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-[12px] bg-secondary-50 text-secondary-500 flex items-center justify-center shrink-0">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-neutral-500">Tugas Mandiri</p>
              <p className="text-2xl font-bold text-neutral-900">{assignments.length} Tugas</p>
              <p className="text-[11px] text-secondary-600 font-medium">Batas pengumpulan aktif</p>
            </div>
          </Card>

          <Card noPadding className="p-4 sm:p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-[12px] bg-accent-50 text-amber-700 flex items-center justify-center shrink-0">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-neutral-500">e-Ujian (CBT)</p>
              <p className="text-2xl font-bold text-neutral-900">{exams.length} Ujian</p>
              <p className="text-[11px] text-amber-700 font-medium">Anti-Cheat Proctoring</p>
            </div>
          </Card>

          <Card noPadding className="p-4 sm:p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-[12px] bg-success-50 text-success-600 flex items-center justify-center shrink-0">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-neutral-500">Proteksi Ujian</p>
              <p className="text-2xl font-bold text-neutral-900">Aktif 100%</p>
              <p className="text-[11px] text-success-600 font-medium">Audit tab switch & blur</p>
            </div>
          </Card>
        </div>
      )}

      {/* 3. SECTION GRID: CBT UJIAN & TUGAS TERBARU */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Left: e-Ujian Aktif (2 Cols) */}
        <div className="lg:col-span-2 space-y-3 sm:space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <h2 className="text-sm sm:text-base font-bold text-neutral-900">
                {isSiswa ? 'Jadwal Ujian Aktif' : 'Jadwal e-Ujian (CBT) Terkini'}
              </h2>
            </div>
            <Link href={isSiswa ? '/ujian' : '/guru/ujian'} className="text-xs font-bold text-emerald-700 hover:text-emerald-800">
              Lihat Semua →
            </Link>
          </div>

          <div className="space-y-3">
            {exams.length === 0 ? (
              <Card noPadding className="p-6 text-center text-xs text-slate-500">
                Belum ada jadwal ujian yang sedang aktif untuk kelas Anda.
              </Card>
            ) : (
              exams.map((exam) => (
                <Card key={exam.id} noPadding className="p-4 sm:p-5 hover:border-emerald-300 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                          {exam.subject}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-700 text-[10px] font-semibold">
                          Kelas {exam.className}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold">
                          {exam.durationMinutes} Menit
                        </span>
                      </div>

                      <h3 className="text-sm sm:text-base font-bold text-neutral-900 truncate">
                        {exam.title}
                      </h3>

                      <div className="flex items-center gap-3 text-[11px] text-neutral-500">
                        <span>{exam.totalQuestions} Butir Soal</span>
                        <span>•</span>
                        <span>Status: Siap Dikerjakan</span>
                      </div>
                    </div>

                    <div className="shrink-0 w-full sm:w-auto pt-2 sm:pt-0 border-t border-slate-100 sm:border-0">
                      {isSiswa ? (
                        <Button
                          variant="accent"
                          size="md"
                          onClick={() => handleOpenExamModal(exam)}
                          className="w-full sm:w-auto min-h-[44px] font-bold shadow-xs cursor-pointer"
                        >
                          <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                          </svg>
                          Mulai Ujian
                        </Button>
                      ) : (
                        <Link href={`/guru/monitoring?examId=${exam.id}`} className="block w-full sm:w-auto">
                          <Button variant="outline" size="md" className="w-full sm:w-auto">
                            Pantau Sesi
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>

        {/* Right: Tugas & Materi Cepat (1 Col) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm sm:text-base font-bold text-neutral-900">
              {isSiswa ? 'Tugas Aktif' : 'Tugas Mandiri Aktif'}
            </h2>
            <Link href={isSiswa ? '/tugas' : '/guru/tugas'} className="text-xs font-bold text-emerald-700 hover:text-emerald-800">
              Lihat Semua →
            </Link>
          </div>

          <div className="space-y-3">
            {assignments.length === 0 ? (
              <Card noPadding className="p-4 text-center text-xs text-slate-500">
                Tidak ada tugas yang perlu dikumpulkan.
              </Card>
            ) : (
              assignments.map((item) => (
                <Card key={item.id} noPadding className="p-4 space-y-2 hover:border-sky-300 transition-colors">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-sky-700">{item.subject}</span>
                    <StatusBadge status="ACTIVE" label="Aktif" />
                  </div>
                  <h4 className="text-xs sm:text-sm font-semibold text-neutral-900 leading-snug">
                    {item.title}
                  </h4>
                  <div className="flex items-center justify-between text-[11px] text-neutral-500 pt-1 border-t border-neutral-100">
                    <span>Tenggat: {new Date(item.dueDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span>
                    <Link href="/tugas" className="text-emerald-700 font-bold hover:underline">
                      Kumpulkan →
                    </Link>
                  </div>
                </Card>
              ))
            )}

            {/* Quick Access Card: Materi Belajar */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200/60 space-y-2">
              <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs sm:text-sm">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                <span>Bahan Ajar & Modul</span>
              </div>
              <p className="text-xs text-neutral-600 leading-relaxed">
                Pelajari materi guru dan unduh modul PDF sebelum mengerjakan tugas atau ujian.
              </p>
              <Link href={isSiswa ? '/materi' : '/guru/materi'} className="block pt-1">
                <Button variant="primary" size="sm" className="w-full font-bold">
                  Buka Bank Materi
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* 4. MODAL MASUK TOKEN UJIAN */}
      <Modal
        isOpen={Boolean(selectedExam)}
        onClose={() => !isStartingExam && setSelectedExam(null)}
        title="Mulai Pengerjaan Ujian"
        subtitle={selectedExam ? `${selectedExam.title} • ${selectedExam.subject}` : ''}
        size="md"
      >
        <form onSubmit={handleStartExam} className="space-y-4">
          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1.5">
            <p className="font-bold flex items-center gap-1.5">
              <span>💡</span>
              <span>Petunjuk Pengerjaan:</span>
            </p>
            <ul className="list-disc list-inside space-y-1 text-[11px] text-amber-800">
              <li>Pastikan koneksi internet stabil saat mengerjakan.</li>
              <li>Kerjakan ujian secara jujur dan mandiri.</li>
              <li>Jangan menutup peramban atau berpindah ke aplikasi lain saat ujian berjalan.</li>
            </ul>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-neutral-800">
              Token Ujian (Diberikan Pengawas)
            </label>
            <Input
              type="text"
              placeholder="Contoh: MAT7A1"
              value={examToken}
              onChange={(e) => setExamToken(e.target.value.toUpperCase())}
              className="text-center font-mono text-base tracking-widest uppercase font-bold"
              error={tokenError}
              autoFocus
            />
            {tokenError && (
              <p className="text-[11px] text-danger-500 font-medium">{tokenError}</p>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100">
            <Button
              type="button"
              variant="outline"
              size="md"
              disabled={isStartingExam}
              onClick={() => setSelectedExam(null)}
            >
              Batal
            </Button>
            <Button
              type="submit"
              variant="accent"
              size="md"
              loading={isStartingExam}
            >
              Mulai Mengerjakan
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
