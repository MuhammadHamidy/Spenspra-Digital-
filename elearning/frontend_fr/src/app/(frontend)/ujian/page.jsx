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

      {/* Token Modal */}
      <Modal
        isOpen={Boolean(selectedExam)}
        onClose={() => !isVerifying && setSelectedExam(null)}
        title="Konfirmasi Token Ujian"
        subtitle={selectedExam ? `${selectedExam.title} • ${selectedExam.subject}` : ''}
        size="md"
      >
        <form onSubmit={handleStartExam} className="space-y-4">
          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1">
            <p className="font-bold flex items-center gap-1.5">
              <span>💡</span>
              <span>Petunjuk Pengerjaan:</span>
            </p>
            <ul className="list-disc list-inside space-y-1 text-[11px] text-amber-800">
              <li>Pastikan koneksi internet stabil.</li>
              <li>Kerjakan ujian secara jujur dan mandiri.</li>
              <li>Jangan berpindah ke aplikasi lain agar lembar ujian tidak terkunci.</li>
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
