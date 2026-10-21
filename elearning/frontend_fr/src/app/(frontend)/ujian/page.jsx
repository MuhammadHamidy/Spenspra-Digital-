'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Card from '@/components/Card';
import Button from '@/components/Button';
import StatusBadge from '@/components/StatusBadge';
import Modal from '@/components/Modal';
import Input from '@/components/Input';
import { elearningApi } from '@/lib/elearningApi';
import { tokenStorage } from '@/lib/common/tokenStorage';

export default function StudentExamsHubPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal Token & Kiosk Prep Lock
  const [selectedExam, setSelectedExam] = useState(null);
  const [examToken, setExamToken] = useState('');
  const [tokenError, setTokenError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [prepWarning, setPrepWarning] = useState('');

  useEffect(() => {
    setUser(tokenStorage.getUser());
    loadExams();
  }, []);

  const loadExams = async () => {
    setLoading(true);
    try {
      const data = await elearningApi.getExams();
      setExams(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Kunci Layar sejak siswa memilih ujian (Solusi 2)
  const handleOpenTokenModal = async (exam) => {
    setSelectedExam(exam);
    setExamToken('');
    setTokenError('');
    setPrepWarning('');

    // Masuk mode Layar Penuh seketika
    if (typeof document !== 'undefined') {
      try {
        const root = document.documentElement;
        if (root.requestFullscreen) {
          await root.requestFullscreen();
        } else if (root.webkitRequestFullscreen) {
          await root.webkitRequestFullscreen();
        }
      } catch (err) {
        console.warn('Fullscreen request:', err);
      }
    }

    // Aktifkan Screen Wake Lock agar layar HP tidak redup/mati
    if (typeof navigator !== 'undefined' && 'wakeLock' in navigator) {
      try {
        await navigator.wakeLock.request('screen');
      } catch (err) {
        console.warn('WakeLock request:', err);
      }
    }
  };

  // Pantau fokus layar selama persiapan ujian (deteksi tarikan notif / tombol home)
  useEffect(() => {
    if (!selectedExam) return;

    const handleBlur = () => {
      setPrepWarning('Fokus layar hilang! Terdeteksi menarik panel notifikasi HP, menekan tombol Home, atau beralih aplikasi.');
    };

    const handleVisibility = () => {
      if (document.hidden) {
        setPrepWarning('Terdeteksi meminimalkan jendela peramban atau berpindah tab!');
      }
    };

    window.addEventListener('blur', handleBlur);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [selectedExam]);

  const handleStartExam = async (e) => {
    e.preventDefault();
    if (!examToken.trim()) {
      setTokenError('Harap masukkan token ujian!');
      return;
    }

    setIsVerifying(true);
    setTokenError('');
    try {
      await elearningApi.startExamSession(selectedExam.id, examToken, user);
      router.push(`/ujian/${selectedExam.id}/run`);
    } catch (err) {
      setTokenError(err.message || 'Token tidak valid!');
      setIsVerifying(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 max-w-7xl mx-auto px-2 sm:px-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-lg sm:text-2xl font-bold text-neutral-900 tracking-tight">
            Daftar Ujian Siswa
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 mt-0.5">
            Pilih ujian aktif kelas Anda dan masukkan token dari pengawas.
          </p>
        </div>
      </div>

      {/* Petunjuk Pengerjaan */}
      <div className="p-3.5 sm:p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center gap-3 shadow-2xs">
        <span className="text-xl sm:text-2xl shrink-0">📝</span>
        <div>
          <p className="text-xs sm:text-sm font-bold text-emerald-900">Petunjuk Pengerjaan Ujian</p>
          <p className="text-[11px] sm:text-xs text-emerald-800 leading-relaxed mt-0.5">
            Pastikan koneksi internet stabil. Kerjakan secara mandiri dan jangan menutup peramban selama ujian berlangsung.
          </p>
        </div>
      </div>

      {/* Exam Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-44 bg-neutral-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : exams.length === 0 ? (
        <Card noPadding className="p-10 text-center">
          <p className="text-sm font-bold text-neutral-700">Belum Ada Jadwal Ujian</p>
          <p className="text-xs text-neutral-500 mt-1">Ujian akan muncul di sini saat guru mempublikasikan jadwal untuk kelas Anda.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          {exams.map((exam) => (
            <Card
              key={exam.id}
              noPadding
              className="p-4 sm:p-5 flex flex-col justify-between hover:border-emerald-400 hover:shadow-md transition-all group rounded-2xl"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                      {exam.subject}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600 text-[10px] font-semibold">
                      Kelas {exam.className}
                    </span>
                  </div>
                  <StatusBadge status={exam.status} label={exam.status === 'ACTIVE' ? 'Aktif' : 'Akan Datang'} />
                </div>

                <div>
                  <h3 className="text-sm sm:text-base font-bold text-neutral-900 group-hover:text-emerald-700 transition-colors">
                    {exam.title}
                  </h3>
                  <p className="text-xs text-neutral-500 mt-1 line-clamp-2 leading-relaxed">
                    {exam.description}
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-neutral-50 border border-neutral-100 text-center">
                  <div>
                    <p className="text-[10px] font-medium text-neutral-400">Durasi</p>
                    <p className="text-xs font-bold text-neutral-800">{exam.durationMinutes} Menit</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-medium text-neutral-400">Jumlah Soal</p>
                    <p className="text-xs font-bold text-neutral-800">{exam.totalQuestions} Butir</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-medium text-neutral-400">Sifat</p>
                    <p className="text-xs font-bold text-emerald-700">Mandiri</p>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-neutral-500 pt-1 border-t border-neutral-100">
                  <span>Guru: {exam.teacherName}</span>
                  <span>{new Date(exam.startTime).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span>
                </div>
              </div>

              <div className="pt-3 sm:pt-4 mt-2">
                <Button
                  variant="accent"
                  size="md"
                  className="w-full min-h-[44px] font-bold shadow-xs cursor-pointer"
                  onClick={() => handleOpenTokenModal(exam)}
                >
                  <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                  Mulai Kerjakan Ujian
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Fullscreen Kiosk Preparation View (Solusi 2: Terlock Sejak Memilih Ujian) */}
      {selectedExam && (
        <div className="fixed inset-0 z-50 bg-neutral-950/95 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 select-none">
          <div className="max-w-lg w-full bg-white rounded-2xl p-5 sm:p-7 space-y-4 shadow-2xl border-2 border-emerald-600 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-base shadow-xs shrink-0">
                  🔒
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm sm:text-base font-bold text-neutral-900 tracking-tight">Mode Persiapan Ujian</h2>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                      Layar Terkunci
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-500 font-medium truncate mt-0.5">
                    {selectedExam.title} • {selectedExam.subject} (Kelas {selectedExam.className})
                  </p>
                </div>
              </div>
            </div>

            {/* Peringatan Sistem Anti-Cheat */}
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1.5">
              <p className="font-bold flex items-center gap-1.5 text-amber-950">
                <span>🛡️</span>
                <span>Peraturan Pengawasan Anti-Cheat CBT:</span>
              </p>
              <ul className="list-disc list-inside space-y-1 text-[11px] text-amber-800 leading-relaxed">
                <li>Layar peramban telah dikunci ke mode <strong>Layar Penuh (Kiosk)</strong>.</li>
                <li><strong>Dilarang menarik bilah notifikasi HP</strong>, menekan tombol Home, atau membuka aplikasi lain.</li>
                <li>Jika Anda keluar layar, ujian akan <strong>langsung terkunci</strong> dan membutuhkan PIN Pengawas untuk membukanya.</li>
              </ul>
            </div>

            {/* Peringatan jika terdeteksi blur / notif ditarik */}
            {prepWarning && (
              <div className="p-3 rounded-xl bg-danger-50 border border-danger-200 text-danger-700 text-xs font-semibold flex items-center gap-2 animate-bounce">
                <span className="text-base shrink-0">🚨</span>
                <span className="leading-snug">{prepWarning}</span>
              </div>
            )}

            {/* Form Input Token */}
            <form onSubmit={handleStartExam} className="space-y-4 pt-1">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-neutral-800">
                    Token Ujian
                  </label>
                  <span className="text-[11px] text-neutral-500">Minta token dari pengawas di ruangan</span>
                </div>
                <Input
                  type="text"
                  placeholder="CONTOH: MAT7A1"
                  value={examToken}
                  onChange={(e) => {
                    setExamToken(e.target.value.toUpperCase());
                    setTokenError('');
                  }}
                  className="text-center font-mono text-base tracking-widest uppercase font-black"
                  error={tokenError}
                  autoFocus
                />
                {tokenError && (
                  <p className="text-[11px] text-danger-600 font-semibold">{tokenError}</p>
                )}
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-neutral-100">
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  disabled={isVerifying}
                  onClick={() => {
                    if (confirm('Batalkan persiapan ujian dan buka kembali layar?')) {
                      setSelectedExam(null);
                      if (typeof document !== 'undefined' && document.fullscreenElement && document.exitFullscreen) {
                        document.exitFullscreen().catch(() => {});
                      }
                    }
                  }}
                  className="w-1/3 min-h-[44px]"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  variant="accent"
                  size="md"
                  loading={isVerifying}
                  className="w-2/3 font-bold min-h-[44px]"
                >
                  🚀 Mulai Ujian Sekarang
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
