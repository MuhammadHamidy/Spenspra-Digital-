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

  // Modal Token
  const [selectedExam, setSelectedExam] = useState(null);
  const [examToken, setExamToken] = useState('');
  const [tokenError, setTokenError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

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

  const handleOpenTokenModal = (exam) => {
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
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 tracking-tight">
            Portal e-Ujian (CBT Online)
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 mt-0.5">
            Sistem evaluasi digital terproteksi dengan pengawasan proctoring anti-cheat real-time.
          </p>
        </div>
      </div>

      {/* Proctoring Rules Alert */}
      <div className="p-4 sm:p-5 rounded-[12px] bg-primary-50 border border-primary-200 text-primary-900 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-accent-500 animate-ping"></span>
            <h3 className="text-xs sm:text-sm font-bold text-primary-900">
              Protokol Integritas & Anti-Kecurangan (Anti-Cheat Engine)
            </h3>
          </div>
          <p className="text-xs text-primary-800/80 leading-relaxed max-w-3xl">
            Sistem memantau seluruh aktivitas jendela browser. Membuka tab lain, keluar dari fullscreen, menekan pintasan inspeksi (F12/Ctrl+Shift+I), atau meminimalkan browser akan otomatis terekam dalam audit pengawas dan dapat mengunci lembar ujian Anda.
          </p>
        </div>
        <div className="shrink-0 flex items-center gap-2">
          <span className="px-3 py-1 rounded-[999px] bg-white text-primary-700 text-xs font-bold border border-primary-200 shadow-2xs">
            🛡️ Proteksi Aktif
          </span>
        </div>
      </div>

      {/* Exam Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-44 bg-neutral-100 rounded-[12px] animate-pulse" />
          ))}
        </div>
      ) : exams.length === 0 ? (
        <Card noPadding className="p-12 text-center">
          <p className="text-sm font-bold text-neutral-700">Belum ada jadwal ujian</p>
          <p className="text-xs text-neutral-500 mt-1">Ujian akan muncul jika guru telah mempublikasikan jadwal ujian untuk kelas Anda.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {exams.map((exam) => (
            <Card
              key={exam.id}
              noPadding
              className="p-5 flex flex-col justify-between hover:border-primary-400 hover:shadow-md transition-all group"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-[999px] bg-primary-100 text-primary-700 text-[10px] font-bold">
                      {exam.subject}
                    </span>
                    <span className="px-2 py-0.5 rounded-[999px] bg-neutral-100 text-neutral-600 text-[10px] font-semibold">
                      Kelas {exam.className}
                    </span>
                  </div>
                  <StatusBadge status={exam.status} label={exam.status === 'ACTIVE' ? 'Sedang Berlangsung' : 'Akan Datang'} />
                </div>

                <div>
                  <h3 className="text-base font-bold text-neutral-900 group-hover:text-primary-600 transition-colors">
                    {exam.title}
                  </h3>
                  <p className="text-xs text-neutral-500 mt-1 line-clamp-2 leading-relaxed">
                    {exam.description}
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-2 p-2.5 rounded-[8px] bg-neutral-50 border border-neutral-100 text-center">
                  <div>
                    <p className="text-[10px] font-medium text-neutral-400">Durasi</p>
                    <p className="text-xs font-bold text-neutral-800">{exam.durationMinutes} Menit</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-medium text-neutral-400">Jumlah Soal</p>
                    <p className="text-xs font-bold text-neutral-800">{exam.totalQuestions} Butir</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-medium text-neutral-400">Toleransi</p>
                    <p className="text-xs font-bold text-danger-600">{exam.maxViolations}x Keluar</p>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-neutral-400 pt-1">
                  <span>Guru: {exam.teacherName}</span>
                  <span>Jadwal: {new Date(exam.startTime).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span>
                </div>
              </div>

              <div className="pt-4 mt-2">
                <Button
                  variant="primary"
                  size="md"
                  className="w-full"
                  onClick={() => handleOpenTokenModal(exam)}
                >
                  <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                  Masukkan Token Ujian
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Token Modal */}
      <Modal
        isOpen={Boolean(selectedExam)}
        onClose={() => !isVerifying && setSelectedExam(null)}
        title="Konfirmasi Token Ujian"
        subtitle={selectedExam ? `${selectedExam.title} - ${selectedExam.subject}` : ''}
        size="md"
      >
        <form onSubmit={handleStartExam} className="space-y-4">
          <div className="p-3.5 rounded-[8px] bg-danger-50 border border-danger-200 text-danger-800 text-xs space-y-1.5">
            <p className="font-bold flex items-center gap-1.5 text-danger-900">
              <svg className="w-4 h-4 text-danger-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Peringatan Pengawasan Otomatis
            </p>
            <ul className="list-disc list-inside space-y-0.5 text-[11px] text-danger-700">
              <li>Saat menekan <strong>Mulai Ujian</strong>, layar akan otomatis beralih ke Fullscreen.</li>
              <li>Jangan berpindah aplikasi, membuka tab lain, atau keluar dari layar penuh.</li>
              <li>Batas toleransi pelanggaran: <strong>{selectedExam?.maxViolations || 3} kali</strong>. Melebihi batas = Ujian TERKUNCI.</li>
            </ul>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-neutral-800">
              Token Ujian (Minta ke Pengawas Kelas)
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
              disabled={isVerifying}
              onClick={() => setSelectedExam(null)}
            >
              Batal
            </Button>
            <Button
              type="submit"
              variant="accent"
              size="md"
              loading={isVerifying}
            >
              Mulai Ujian Sekarang
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
