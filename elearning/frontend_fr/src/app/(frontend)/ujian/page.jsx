'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Card from '@/components/Card';
import Button from '@/components/Button';
import StatusBadge from '@/components/StatusBadge';
import Input from '@/components/Input';
import { elearningApi } from '@/lib/elearningApi';
import { tokenStorage } from '@/lib/common/tokenStorage';

export default function StudentExamsHubPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [exams, setExams] = useState([]);
  const [examSessions, setExamSessions] = useState({});
  const [loading, setLoading] = useState(true);

  // Modal Token & Kiosk Prep Lock
  const [selectedExam, setSelectedExam] = useState(null);
  const [examToken, setExamToken] = useState('');
  const [tokenError, setTokenError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [prepWarning, setPrepWarning] = useState('');

  useEffect(() => {
    const currentUser = tokenStorage.getUser();
    setUser(currentUser);
    loadExams(currentUser);
  }, []);

  const loadExams = async (currentUser) => {
    setLoading(true);
    try {
      const data = await elearningApi.getExams();
      setExams(data || []);

      const u = currentUser || tokenStorage.getUser();
      if (u && data) {
        const uId = u.id || u.nisn || 'guest';
        const sessionMap = {};
        for (const ex of data) {
          const sess = await elearningApi.getStudentExamSession(ex.id, uId);
          if (sess) {
            sessionMap[ex.id] = sess;
          }
        }
        setExamSessions(sessionMap);
      }
    } catch (e) {
      console.error('Failed to load exams:', e);
    } finally {
      setLoading(false);
    }
  };

  // Normalizer for class comparison (e.g., "Kelas 7A" -> "7a", "VII-A" -> "7a")
  const normalizeClass = (c) => {
    if (!c) return '';
    let norm = String(c).toLowerCase().trim()
      .replace(/^kelas\s*/, '')
      .replace(/^rombel\s*/, '')
      .replace(/[^a-z0-9]/g, '');

    // Roman numeral normalization
    norm = norm.replace(/^viii/, '8').replace(/^vii/, '7').replace(/^ix/, '9');
    return norm;
  };

  // Filter exams strictly to student's enrolled class (Requirement 9)
  const studentClass = user?.className || user?.class_name || user?.rombel || '';
  const studentClassNorm = normalizeClass(studentClass);

  const filteredExams = useMemo(() => {
    if (!studentClassNorm) return exams; // Fallback if no class in profile
    return exams.filter((ex) => {
      const examClassNorm = normalizeClass(ex.className);
      return (
        examClassNorm === studentClassNorm ||
        examClassNorm.startsWith(studentClassNorm) ||
        studentClassNorm.startsWith(examClassNorm)
      );
    });
  }, [exams, studentClassNorm]);

  // Kunci Layar sejak siswa memilih ujian
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

  // Pantau fokus layar selama persiapan ujian
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
    <div className="space-y-5 max-w-7xl mx-auto px-2 sm:px-0 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-[12px] border border-neutral-200">
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 tracking-tight">
            Jadwal e-Ujian & Penilaian CBT
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500">
            Berikut jadwal ujian aktif khusus untuk <strong>Kelas {studentClass || 'Anda'}</strong>. Masukkan token pengawas untuk mulai.
          </p>
        </div>

        {studentClass && (
          <div className="self-start sm:self-center px-3 py-1.5 rounded-[999px] bg-primary-50 border border-primary-200 text-primary-800 text-xs font-bold flex items-center gap-1.5">
            <span>🎓</span>
            <span>Rombel: Kelas {studentClass}</span>
          </div>
        )}
      </div>

      {/* Petunjuk Anti-Cheat */}
      <div className="p-4 rounded-[12px] bg-emerald-50/80 border border-emerald-200 text-emerald-950 flex items-start gap-3">
        <span className="text-2xl shrink-0 mt-0.5">🛡️</span>
        <div className="space-y-1">
          <p className="text-xs sm:text-sm font-bold text-emerald-950">
            Petunjuk Keamanan Ujian Daring (Kiosk Anti-Cheat)
          </p>
          <p className="text-[11px] sm:text-xs text-emerald-800 leading-relaxed">
            Sistem dilengkapi pengawas otomatis. Dilarang membuka tab lain, berpindah aplikasi, atau menarik bilah notifikasi. Pelanggaran melebihi batas toleransi akan langsung mengunci layar ujian.
          </p>
        </div>
      </div>

      {/* Exam Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-48 bg-neutral-100 rounded-[12px] animate-pulse border border-neutral-200" />
          ))}
        </div>
      ) : filteredExams.length === 0 ? (
        <Card noPadding className="p-12 text-center rounded-[12px] bg-white border border-neutral-200">
          <span className="text-3xl">📅</span>
          <p className="text-sm font-bold text-neutral-800 mt-2">Tidak Ada Jadwal Ujian untuk Kelas Anda</p>
          <p className="text-xs text-neutral-500 mt-1 max-w-md mx-auto">
            {studentClass
              ? `Saat ini belum ada jadwal ujian CBT yang diterbitkan untuk Kelas ${studentClass}.`
              : 'Akun Anda belum memiliki penugasan rombel kelas aktif.'}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredExams.map((exam) => {
            const session = examSessions[exam.id];
            const isCompleted = session?.status === 'SUBMITTED';
            const isLocked = session?.status === 'LOCKED';
            const isInProgress = session?.status === 'IN_PROGRESS';

            return (
              <Card
                key={exam.id}
                noPadding
                className={`p-5 flex flex-col justify-between transition-all rounded-[12px] border ${
                  isCompleted
                    ? 'border-success-300 bg-white shadow-2xs'
                    : isLocked
                    ? 'border-danger-300 bg-danger-50/20'
                    : 'border-neutral-200 bg-white hover:border-primary-400 hover:shadow-xs'
                }`}
              >
                <div className="space-y-3.5">
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded-[999px] bg-primary-100 text-primary-800 text-[10px] font-bold">
                        {exam.subject}
                      </span>
                      <span className="px-2 py-0.5 rounded-[999px] bg-neutral-100 text-neutral-700 text-[10px] font-semibold">
                        Kelas {exam.className}
                      </span>
                    </div>

                    {isCompleted ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-[999px] text-[10px] font-bold bg-success-100 text-success-800 border border-success-300">
                        ✓ Telah Selesai
                      </span>
                    ) : isLocked ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-[999px] text-[10px] font-bold bg-danger-100 text-danger-800 border border-danger-300 animate-pulse">
                        🔒 Terkunci
                      </span>
                    ) : (
                      <StatusBadge
                        status={exam.status || 'ACTIVE'}
                        label={exam.status === 'ACTIVE' ? 'Sedang Berlangsung' : 'Akan Datang'}
                      />
                    )}
                  </div>

                  {/* Title & Description */}
                  <div>
                    <h3 className="text-base font-bold text-neutral-900 tracking-tight">
                      {exam.title}
                    </h3>
                    <p className="text-xs text-neutral-500 mt-1 line-clamp-2 leading-relaxed">
                      {exam.description || 'Ujian berbasis komputer (CBT) dengan pengawasan anti-cheat.'}
                    </p>
                  </div>

                  {/* Schedule & Timing Info (Requirement 6) */}
                  <div className="p-3 rounded-[8px] bg-neutral-50 border border-neutral-200 space-y-2 text-xs">
                    <div className="flex items-center justify-between text-neutral-700">
                      <span className="text-[11px] font-medium text-neutral-500 flex items-center gap-1">
                        <span>📅</span> Tanggal:
                      </span>
                      <span className="font-bold text-neutral-800">
                        {exam.scheduledDate || (exam.startDateTime ? exam.startDateTime.split('T')[0] : 'Hari Ini')}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-neutral-700">
                      <span className="text-[11px] font-medium text-neutral-500 flex items-center gap-1">
                        <span>⏰</span> Jam / Batas Akhir:
                      </span>
                      <span className="font-bold text-neutral-800 font-mono">
                        {exam.startTime || '08:00'} - {exam.endTime || '09:30'} WIB
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-neutral-200/60 text-center">
                      <div>
                        <p className="text-[10px] text-neutral-400 font-medium">Durasi Ujian</p>
                        <p className="text-xs font-bold text-neutral-800">{exam.durationMinutes} Menit</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-neutral-400 font-medium">Pengajar</p>
                        <p className="text-xs font-bold text-neutral-800 truncate">{exam.teacherName || 'Guru Mapel'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Score Card if Submitted (Requirement 6) */}
                  {isCompleted && (
                    <div className="p-3 rounded-[8px] bg-success-50 border border-success-200 flex items-center justify-between">
                      <div className="space-y-0.5">
                        <p className="text-[11px] font-semibold text-success-800">Hasil Penilaian CBT:</p>
                        <p className="text-[10px] text-success-600">
                          {session.submittedAt
                            ? `Dikumpulkan: ${new Date(session.submittedAt).toLocaleTimeString('id-ID')} WIB`
                            : 'Jawaban tersimpan di sistem'}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-2xl font-black text-success-700">
                          {session.score !== undefined && session.score !== null ? session.score : 0}
                        </span>
                        <span className="text-xs font-bold text-success-600"> / 100</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Action Button */}
                <div className="pt-4 mt-1">
                  {isCompleted ? (
                    <Button
                      variant="outline"
                      size="md"
                      disabled
                      className="w-full min-h-[42px] font-bold bg-neutral-100 text-neutral-500 border-neutral-200 cursor-not-allowed"
                    >
                      ✓ Ujian Telah Dikerjakan (Skor: {session.score ?? '-'})
                    </Button>
                  ) : isLocked ? (
                    <Button
                      variant="outline"
                      size="md"
                      disabled
                      className="w-full min-h-[42px] font-bold bg-danger-50 text-danger-700 border-danger-300 cursor-not-allowed"
                    >
                      🔒 Layar Terkunci - Hubungi Pengawas
                    </Button>
                  ) : isInProgress ? (
                    <Button
                      variant="primary"
                      size="md"
                      className="w-full min-h-[42px] font-bold shadow-xs cursor-pointer"
                      onClick={() => router.push(`/ujian/${exam.id}/run`)}
                    >
                      ⚡ Lanjutkan Pengerjaan Ujian
                    </Button>
                  ) : (
                    <Button
                      variant="primary"
                      size="md"
                      className="w-full min-h-[42px] font-bold shadow-xs cursor-pointer"
                      onClick={() => handleOpenTokenModal(exam)}
                    >
                      🔑 Masukkan Token & Mulai Ujian
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Fullscreen Kiosk Preparation View */}
      {selectedExam && (
        <div className="fixed inset-0 z-50 bg-neutral-950/95 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 select-none overflow-y-auto">
          <div className="max-w-md w-full my-auto bg-white rounded-[12px] p-5 sm:p-6 space-y-4 shadow-2xl border-2 border-primary-600 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-[8px] bg-primary-600 text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
                  🔒
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-neutral-900 tracking-tight">
                    Mode Kiosk Pengawas Ujian
                  </h2>
                  <p className="text-[11px] text-neutral-500 font-medium">
                    {selectedExam.title} • Kelas {selectedExam.className}
                  </p>
                </div>
              </div>
            </div>

            {/* Peringatan Sistem Anti-Cheat */}
            <div className="p-3.5 rounded-[8px] bg-amber-50 border border-amber-200 text-amber-950 text-xs space-y-1">
              <p className="font-bold flex items-center gap-1.5 text-amber-900">
                <span>🛡️</span>
                <span>Protokol Keamanan CBT:</span>
              </p>
              <ul className="list-disc list-inside space-y-1 text-[11px] text-amber-900 leading-relaxed">
                <li>Layar otomatis dikunci ke mode <strong>Layar Penuh (Kiosk)</strong>.</li>
                <li><strong>Jangan meminimalkan peramban</strong>, menarik bilah notifikasi, atau membuka aplikasi lain.</li>
                <li>Toleransi pelanggaran: <strong>Maks. {selectedExam.maxViolations || 3}x</strong> sebelum terkunci permanen.</li>
              </ul>
            </div>

            {/* Peringatan jika terdeteksi blur */}
            {prepWarning && (
              <div className="p-3 rounded-[8px] bg-danger-50 border border-danger-200 text-danger-700 text-xs font-semibold flex items-center gap-2">
                <span className="text-base shrink-0">🚨</span>
                <span className="leading-snug">{prepWarning}</span>
              </div>
            )}

            {/* Form Input Token */}
            <form onSubmit={handleStartExam} className="space-y-3.5 pt-1">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-neutral-800">
                    Token Sesi Ujian:
                  </label>
                  <span className="text-[11px] text-neutral-500">Minta kepada guru/pengawas</span>
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

              <div className="flex flex-col-reverse sm:flex-row items-center gap-2 pt-2 border-t border-neutral-100">
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
                  className="w-full sm:w-1/3 min-h-[42px] cursor-pointer"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  loading={isVerifying}
                  className="w-full sm:w-2/3 font-bold min-h-[42px] cursor-pointer"
                >
                  Mulai Ujian Sekarang
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
