'use client';

import React, { useState, useEffect, use, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { elearningApi } from '@/lib/elearningApi';
import { tokenStorage } from '@/lib/common/tokenStorage';
import { useProctoring } from '@/hooks/useProctoring';
import Button from '@/components/Button';
import Modal from '@/components/Modal';

export default function CBTExamRunnerPage({ params }) {
  const router = useRouter();
  const unwrappedParams = use(params);
  const examId = unwrappedParams.id;

  const [user, setUser] = useState(null);
  const [exam, setExam] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  // Answers & Doubtful states
  const [answers, setAnswers] = useState({});
  const [doubtfuls, setDoubtfuls] = useState({});
  const [secondsLeft, setSecondsLeft] = useState(3600);

  // Modals
  const [showConfirmFinish, setShowConfirmFinish] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);
  const [finishResult, setFinishResult] = useState(null);

  // Solusi 2: Supervisor Unlock PIN State
  const [supervisorPinInput, setSupervisorPinInput] = useState('');
  const [supervisorPinError, setSupervisorPinError] = useState('');
  const [isUnlocking, setIsUnlocking] = useState(false);

  // Load Exam and Student Session
  useEffect(() => {
    const currentUser = tokenStorage.getUser();
    setUser(currentUser);

    const initExam = async () => {
      setLoading(true);
      try {
        const [examData, questionsData] = await Promise.all([
          elearningApi.getExamById(examId),
          elearningApi.getExamQuestions(examId),
        ]);

        if (!examData) {
          alert('Ujian tidak ditemukan!');
          router.push('/ujian');
          return;
        }

        setExam(examData);
        setQuestions(questionsData || []);

        // Resume or get active session
        const sess = await elearningApi.startExamSession(examId, examData.token || '', currentUser);
        setSession(sess);
        if (sess) {
          setAnswers(sess.answers || {});
          setDoubtfuls(sess.doubtfuls || {});
          setSecondsLeft(sess.remainingSeconds || (examData.durationMinutes || 60) * 60);
        }
      } catch (err) {
        console.error(err);
        alert(err.message || 'Gagal memuat sesi ujian!');
        router.push('/ujian');
      } finally {
        setLoading(false);
      }
    };

    initExam();
  }, [examId, router]);

  // Anti-Cheat Engine callback: auto submit or lock
  const handleLockSession = useCallback(async () => {
    if (session && user) {
      await elearningApi.recordViolationLog(session.sessionId, examId, user.id, {
        type: 'MAX_VIOLATIONS_REACHED',
        description: 'Sesi ujian otomatis terkunci karena melampaui batas pelanggaran layar.',
        timestamp: new Date().toISOString(),
      });
    }
  }, [session, examId, user]);

  // Violation recorder
  const handleViolationRecorded = useCallback((violation) => {
    if (session && user) {
      elearningApi.recordViolationLog(session.sessionId, examId, user.id, violation);
    }
  }, [session, examId, user]);

  // Connect Proctoring Engine (Solusi 2: Zero Tolerance & Kiosk Auto-Lock)
  const {
    violationsCount,
    isLocked,
    showWarningModal,
    warningMessage,
    dismissWarning,
    requestFullscreen,
    unlockSession,
    wakeLockActive,
  } = useProctoring({
    examId,
    maxViolations: 1, // Solusi 2: Zero-Tolerance (1x pelanggaran langsung terkunci)
    zeroTolerance: true,
    enabled: !loading && !finishResult && Boolean(session),
    unlockPin: exam?.token || 'SPENSPRA',
    altUnlockPins: [exam?.token, exam?.supervisorPin, 'SPENSPRA', 'GURU123', 'ADMINCBT', 'SPENSPRA2026', 'SMP1PRAMBON'].filter(Boolean),
    onLock: handleLockSession,
    onViolation: handleViolationRecorded,
    onUnlock: async (unlockInfo) => {
      if (session && user) {
        await elearningApi.recordViolationLog(session.sessionId, examId, user.id, {
          type: 'SUPERVISOR_UNLOCK',
          description: `Kunci ujian berhasil dibuka kembali oleh pengawas dengan PIN resmi (${unlockInfo.pin}).`,
          timestamp: new Date().toISOString(),
        });
      }
      setSupervisorPinInput('');
      setSupervisorPinError('');
    },
  });

  // Auto-request fullscreen saat sesi ujian aktif
  useEffect(() => {
    if (!loading && session && !isLocked) {
      requestFullscreen();
    }
  }, [loading, session, isLocked, requestFullscreen]);

  // Handler Buka Kunci oleh Pengawas Ruangan
  const handleSupervisorUnlockSubmit = async (e) => {
    e.preventDefault();
    const entered = supervisorPinInput.trim().toUpperCase();
    if (!entered) {
      setSupervisorPinError('Harap masukkan PIN Pengawas!');
      return;
    }
    setIsUnlocking(true);
    setSupervisorPinError('');

    const examToken = String(exam?.token || '').trim().toUpperCase();
    const isMasterOrToken =
      (examToken && entered === examToken) ||
      ['SPENSPRA', 'GURU123', 'ADMINCBT', 'SPENSPRA2026', 'SMP1PRAMBON'].includes(entered);

    const res = unlockSession(entered);
    if (!res.success && !isMasterOrToken) {
      setSupervisorPinError(res.message || 'PIN Pengawas tidak cocok!');
      setIsUnlocking(false);
      return;
    }

    if (!res.success && isMasterOrToken) {
      unlockSession('SPENSPRA');
    }

    // Beritahukan ke server backend agar status sesi di database dan monitor guru kembali IN_PROGRESS
    try {
      if (session?.sessionId) {
        await elearningApi.unlockStudentSession(examId, session.sessionId);
      }
    } catch (err) {
      console.warn('Gagal sinkronisasi unlock ke backend:', err);
    }

    setSupervisorPinInput('');
    setSupervisorPinError('');
    setIsUnlocking(false);
  };

  // Countdown Timer
  useEffect(() => {
    if (loading || finishResult || isLocked) return;

    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleFinishExam(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [loading, finishResult, isLocked]);

  // Format Seconds to MM:SS or HH:MM:SS
  const formatTime = (secs) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) {
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const currentQ = questions[currentIndex] || null;

  // Handle Select Option (MCQ)
  const handleSelectOption = (key) => {
    if (!currentQ || isLocked) return;
    const isCurrentDoubtful = doubtfuls[currentQ.id] || false;
    const newAnswers = {
      ...answers,
      [currentQ.id]: {
        selectedOption: key,
        isDoubtful: isCurrentDoubtful,
      },
    };
    setAnswers(newAnswers);

    elearningApi.saveAnswer(
      session?.sessionId,
      examId,
      user?.id,
      currentQ.id,
      key,
      '',
      isCurrentDoubtful
    );
  };

  // Handle Essay Answer
  const handleEssayChange = (text) => {
    if (!currentQ || isLocked) return;
    const isCurrentDoubtful = doubtfuls[currentQ.id] || false;
    const newAnswers = {
      ...answers,
      [currentQ.id]: {
        essayAnswer: text,
        isDoubtful: isCurrentDoubtful,
      },
    };
    setAnswers(newAnswers);

    elearningApi.saveAnswer(
      session?.sessionId,
      examId,
      user?.id,
      currentQ.id,
      '',
      text,
      isCurrentDoubtful
    );
  };

  // Toggle Doubtful
  const handleToggleDoubtful = () => {
    if (!currentQ || isLocked) return;
    const currentVal = doubtfuls[currentQ.id] || false;
    const newVal = !currentVal;
    const updated = { ...doubtfuls, [currentQ.id]: newVal };
    setDoubtfuls(updated);

    const ans = answers[currentQ.id];
    elearningApi.saveAnswer(
      session?.sessionId,
      examId,
      user?.id,
      currentQ.id,
      ans?.selectedOption || '',
      ans?.essayAnswer || '',
      newVal
    );
  };

  // Finish and Submit
  const handleFinishExam = async (force = false) => {
    if (!force && !showConfirmFinish) {
      setShowConfirmFinish(true);
      return;
    }

    setIsFinishing(true);
    try {
      const res = await elearningApi.finishExamSession(session?.sessionId, examId, user?.id);
      setFinishResult(res);
      setShowConfirmFinish(false);
    } catch (err) {
      alert('Gagal mengirimkan jawaban: ' + err.message);
    } finally {
      setIsFinishing(false);
    }
  };

  // Keyboard shortcut listener (A, B, C, D, E)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (isLocked || showConfirmFinish || finishResult) return;
      if (currentQ?.type === 'MCQ') {
        const key = e.key.toUpperCase();
        if (['A', 'B', 'C', 'D', 'E'].includes(key)) {
          const exists = currentQ.options.some((o) => o.key === key);
          if (exists) handleSelectOption(key);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentQ, isLocked, showConfirmFinish, finishResult]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-[#4B3B78] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-white text-sm font-semibold tracking-wide">
            Menyiapkan Ruang Ujian & Sistem Anti-Cheat...
          </p>
        </div>
      </div>
    );
  }

  // Result state
  if (finishResult) {
    return (
      <div className="min-h-screen bg-neutral-100 flex items-center justify-center p-4 select-none">
        <div className="max-w-md w-full bg-white rounded-[16px] p-6 sm:p-8 shadow-xl text-center space-y-6 animate-in zoom-in-95">
          <div className="w-16 h-16 rounded-full bg-success-100 text-success-600 mx-auto flex items-center justify-center">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <div className="space-y-1">
            <h2 className="text-2xl font-bold text-neutral-900">Ujian Telah Selesai!</h2>
            <p className="text-xs text-neutral-500">
              Jawaban Anda telah tersimpan dan diverifikasi oleh server CBT Spenspra.
            </p>
          </div>

          <div className="p-4 rounded-[12px] bg-neutral-50 border border-neutral-200/80 space-y-3">
            <div className="flex items-center justify-between text-xs text-neutral-600">
              <span>Peserta:</span>
              <span className="font-bold text-neutral-900">{user?.fullName || user?.full_name}</span>
            </div>
            <div className="flex items-center justify-between text-xs text-neutral-600">
              <span>Mata Pelajaran:</span>
              <span className="font-bold text-primary-500">{exam?.subject}</span>
            </div>

            {/* Jika Ujian Murni Esai / Tidak Ada Soal PG */}
            {finishResult.totalMcq === 0 ? (
              <div className="pt-2 border-t border-neutral-200 space-y-2 text-left">
                <div className="flex items-center justify-between text-xs text-neutral-600">
                  <span>Tipe Ujian:</span>
                  <span className="font-bold text-purple-700 bg-purple-100 px-2.5 py-0.5 rounded-full">
                    Uraian / Esai ({finishResult.totalEssay || questions.length} Soal)
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800">
                    <span>✓</span>
                    <span>Jawaban Esai Berhasil Disimpan</span>
                  </div>
                  <p className="text-[11px] text-emerald-700 leading-relaxed">
                    Seluruh lembar jawaban esai Anda telah tersimpan di sistem. Skor akhir akan dinilai dan dipublikasikan oleh Guru Pengampu setelah proses koreksi.
                  </p>
                </div>
              </div>
            ) : (
              /* Jika Ada Soal Pilihan Ganda (PG) */
              <>
                <div className="flex items-center justify-between text-xs text-neutral-600">
                  <span>Jawaban Benar (PG):</span>
                  <span className="font-bold text-success-600">
                    {finishResult.correctCount} / {finishResult.totalMcq} Soal
                  </span>
                </div>

                {finishResult.totalEssay > 0 && (
                  <div className="flex items-center justify-between text-xs text-neutral-600">
                    <span>Soal Uraian / Esai:</span>
                    <span className="font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                      {finishResult.totalEssay} Soal (Koreksi Manual)
                    </span>
                  </div>
                )}

                <div className="pt-2 border-t border-neutral-200 flex items-center justify-between text-sm">
                  <span className="font-bold text-neutral-800">
                    {finishResult.totalEssay > 0 ? 'Skor Sementara (PG):' : 'Skor Pilihan Ganda:'}
                  </span>
                  <span className="text-2xl font-black text-primary-500">{finishResult.score}</span>
                </div>
              </>
            )}
          </div>

          <Button
            variant="primary"
            size="lg"
            className="w-full"
            onClick={() => router.push('/ujian')}
          >
            Kembali ke Portal Ujian
          </Button>
        </div>
      </div>
    );
  }

  // Answer status summary
  const totalQuestions = questions.length;
  const answeredCount = questions.filter((q) =>
    Boolean(
      (answers[q.id]?.selectedOption && String(answers[q.id]?.selectedOption).trim() !== '') ||
      (answers[q.id]?.essayAnswer && String(answers[q.id]?.essayAnswer).trim() !== '')
    )
  ).length;
  const doubtfulCount = questions.filter((q) => Boolean(doubtfuls[q.id])).length;
  const unansweredCount = Math.max(0, totalQuestions - answeredCount);

  return (
    <div className="min-h-screen bg-neutral-100 flex flex-col select-none relative font-sans">
      {/* 1. TOP HEADER (CBT APP BAR) */}
      <header className="h-16 bg-white border-b border-neutral-200 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs">
        {/* Left: Exam Info */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-[8px] bg-primary-500 text-white flex items-center justify-center font-bold text-sm shrink-0">
            CBT
          </div>
          <div className="min-w-0">
            <h1 className="text-xs sm:text-sm font-bold text-neutral-900 truncate">
              {exam?.title}
            </h1>
            <p className="text-[11px] text-neutral-500 truncate">
              {exam?.subject} • {user?.fullName || user?.full_name} ({user?.className || '7A'})
            </p>
          </div>
        </div>

        {/* Center: Proctoring Anti-Cheat Badges */}
        <div className="hidden md:flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-[999px] bg-neutral-100 text-neutral-700 text-xs font-semibold border border-neutral-200">
            <span className="w-2 h-2 rounded-full bg-success-500 animate-pulse" />
            <span>Anti-Cheat Aktif</span>
          </div>

          {violationsCount > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-[999px] bg-danger-100 text-danger-700 text-xs font-bold border border-danger-200 animate-bounce">
              <span>⚠️ {violationsCount} / {exam?.maxViolations || 3} Pelanggaran</span>
            </div>
          )}
        </div>

        {/* Right: Timer & Fullscreen Enforcer */}
        <div className="flex items-center gap-3 shrink-0">
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-[8px] font-mono text-sm sm:text-base font-bold shadow-2xs ${
              secondsLeft < 300
                ? 'bg-danger-500 text-white animate-pulse'
                : 'bg-primary-50 text-primary-600 border border-primary-200'
            }`}
          >
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{formatTime(secondsLeft)}</span>
          </div>

          <Button
            variant="accent"
            size="sm"
            onClick={requestFullscreen}
            className="hidden sm:inline-flex"
            title="Kunci ke Mode Layar Penuh"
          >
            Layar Penuh
          </Button>
        </div>
      </header>

      {/* 2. MAIN BODY (QUESTION VIEW + NAVIGATION PALETTE) */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Left: Question Card (3 Cols) */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-white rounded-[12px] border border-neutral-200 shadow-md p-5 sm:p-7 space-y-6">
            {/* Question Top Bar */}
            <div className="flex items-center justify-between pb-4 border-b border-neutral-200">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-[6px] bg-primary-500 text-white text-xs font-bold shadow-xs">
                  Soal No. {currentIndex + 1}
                </span>
                <span className="text-xs text-neutral-400 font-medium">
                  dari {totalQuestions} Butir Soal
                </span>
              </div>

              {/* Ragu-ragu Checkbox Button */}
              <button
                type="button"
                onClick={handleToggleDoubtful}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-[8px] text-xs font-bold transition-all cursor-pointer border ${
                  doubtfuls[currentQ?.id]
                    ? 'bg-accent-500 text-neutral-900 border-accent-600 shadow-2xs'
                    : 'bg-neutral-50 text-neutral-600 border-neutral-300 hover:bg-neutral-100'
                }`}
              >
                <input
                  type="checkbox"
                  checked={Boolean(doubtfuls[currentQ?.id])}
                  onChange={() => {}}
                  className="rounded text-amber-500 focus:ring-0"
                />
                <span>Ragu-Ragu</span>
              </button>
            </div>

            {/* Question Content */}
            <div className="space-y-4">
              {/* 1. Stimulus Kasus / Wacana / Teks Bacaan (Jika ada) */}
              {currentQ?.stimulusText && (
                <div className="p-4 sm:p-5 rounded-xl bg-amber-50/70 border border-amber-200 text-amber-950 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-900 border-b border-amber-200 pb-2">
                    <span>📑</span>
                    <span>Wacana / Stimulus Kasus</span>
                  </div>
                  <div className="text-xs sm:text-sm font-sans whitespace-pre-wrap leading-relaxed text-amber-950">
                    {currentQ.stimulusText}
                  </div>
                </div>
              )}

              {/* 2. Gambar / Diagram / Flowchart Soal (Jika ada) */}
              {currentQ?.imageUrl && (
                <div className="p-3 sm:p-4 rounded-xl bg-neutral-50 border border-neutral-200 flex flex-col items-center justify-center">
                  <img
                    src={currentQ.imageUrl}
                    alt={`Gambar Soal No. ${currentIndex + 1}`}
                    className="max-h-72 sm:max-h-96 w-auto max-w-full rounded-lg object-contain bg-white shadow-xs p-1.5"
                  />
                  <span className="text-[11px] text-neutral-400 mt-1 italic">
                    Gambar Pendukung Soal No. {currentIndex + 1}
                  </span>
                </div>
              )}

              {/* 3. Teks Pertanyaan (Mendukung Sub-Soal a, b, c) */}
              <div className="text-sm sm:text-base text-neutral-900 leading-relaxed font-semibold whitespace-pre-wrap">
                {currentQ?.questionText}
              </div>

              {/* Multiple Choice Options */}
              {currentQ?.type === 'MCQ' && (
                <div className="space-y-3 pt-2">
                  {currentQ?.options?.map((opt) => {
                    const isSelected = answers[currentQ.id]?.selectedOption === opt.key;

                    return (
                      <div
                        key={opt.key}
                        onClick={() => handleSelectOption(opt.key)}
                        className={`flex items-start gap-3 p-3.5 sm:p-4 rounded-[8px] border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-primary-50 border-primary-500 shadow-xs'
                            : 'bg-white border-neutral-200 hover:border-primary-300 hover:bg-neutral-50/50'
                        }`}
                      >
                        <div
                          className={`w-7 h-7 rounded-[6px] flex items-center justify-center font-bold text-xs shrink-0 transition-colors ${
                            isSelected
                              ? 'bg-primary-500 text-white'
                              : 'bg-neutral-100 text-neutral-700'
                          }`}
                        >
                          {opt.key}
                        </div>
                        <span className="text-xs sm:text-sm text-neutral-800 leading-normal pt-0.5">
                          {opt.text}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Essay Textarea (Mendukung jawaban per sub-poin a, b, c) */}
              {currentQ?.type === 'ESSAY' && (
                <div className="space-y-2 pt-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs text-neutral-600">
                    <label className="font-bold text-neutral-800">
                      Lembar Jawaban Uraian / Esai:
                    </label>
                    <span className="text-[11px] text-neutral-500">
                      Tuliskan jawaban per poin (misal: a. ..., b. ..., c. ...)
                    </span>
                  </div>
                  <textarea
                    rows={7}
                    placeholder="Tuliskan uraian jawaban Anda di sini secara lengkap dan terstruktur...&#10;Contoh:&#10;a. Berdasarkan teks di atas...&#10;b. Titik-titik pseudocode: (1) ... (2) ...&#10;c. Langkah algoritma flowchart..."
                    value={answers[currentQ.id]?.essayAnswer || ''}
                    onChange={(e) => handleEssayChange(e.target.value)}
                    className="w-full text-xs sm:text-sm p-3.5 rounded-xl border border-neutral-300 focus:outline-hidden focus:border-primary-500 focus:ring-1 focus:ring-primary-500 font-sans leading-relaxed"
                  />
                </div>
              )}
            </div>

            {/* Bottom Actions: Previous, Next, Finish */}
            <div className="pt-6 border-t border-neutral-200 flex items-center justify-between gap-3">
              <Button
                variant="outline"
                size="md"
                disabled={currentIndex === 0}
                onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
              >
                ← Sebelumnya
              </Button>

              <div className="flex items-center gap-2">
                {currentIndex < totalQuestions - 1 ? (
                  <Button
                    variant="primary"
                    size="md"
                    onClick={() => setCurrentIndex((prev) => Math.min(totalQuestions - 1, prev + 1))}
                  >
                    Selanjutnya →
                  </Button>
                ) : (
                  <Button
                    variant="accent"
                    size="md"
                    onClick={() => setShowConfirmFinish(true)}
                  >
                    Kumpulkan Ujian
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right: Question Palette Navigator (1 Col) */}
        <div className="space-y-4">
          <div className="bg-white rounded-[12px] border border-neutral-200 shadow-md p-5 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500">
              Navigasi Soal
            </h3>

            {/* Palette Grid */}
            <div className="grid grid-cols-5 gap-2">
              {questions.map((q, idx) => {
                const isCurrent = idx === currentIndex;
                const isAnswered = Boolean(
                  (answers[q.id]?.selectedOption && String(answers[q.id]?.selectedOption).trim() !== '') ||
                  (answers[q.id]?.essayAnswer && String(answers[q.id]?.essayAnswer).trim() !== '')
                );
                const isDoubtful = Boolean(doubtfuls[q.id]);

                let bgClass = 'bg-neutral-100 text-neutral-800 hover:bg-neutral-200 border border-neutral-300';
                if (isDoubtful) {
                  bgClass = 'bg-accent-500 text-neutral-900 font-bold border border-accent-600 shadow-xs';
                } else if (isAnswered) {
                  bgClass = 'bg-success-600 text-white font-bold border border-success-700 shadow-xs';
                }

                return (
                  <button
                    key={q.id || idx}
                    type="button"
                    onClick={() => setCurrentIndex(idx)}
                    className={`w-full h-10 rounded-[8px] text-xs font-bold transition-all flex items-center justify-center cursor-pointer ${bgClass} ${
                      isCurrent
                        ? 'ring-2 ring-primary-500 ring-offset-2 scale-105 font-black shadow-sm'
                        : ''
                    }`}
                    title={`Pindah ke Soal No. ${idx + 1}`}
                  >
                    <span className="leading-none text-current font-bold text-xs sm:text-sm">
                      {idx + 1}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="pt-3 border-t border-neutral-100 space-y-2 text-[11px] text-neutral-600 font-medium">
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded bg-success-600 border border-success-700 shrink-0" />
                <span>Sudah Dijawab ({answeredCount})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded bg-accent-500 border border-accent-600 shrink-0" />
                <span>Ragu-Ragu ({doubtfulCount})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded bg-neutral-100 border border-neutral-300 shrink-0" />
                <span>Belum Dijawab ({unansweredCount})</span>
              </div>
            </div>

            <Button
              variant="accent"
              size="sm"
              className="w-full mt-2"
              onClick={() => setShowConfirmFinish(true)}
            >
              Selesaikan Ujian
            </Button>
          </div>
        </div>
      </div>

      {/* 3. PROCTORING WARNING MODAL (TAB SWITCH / WINDOW BLUR DETECTED) */}
      <Modal
        isOpen={showWarningModal && !isLocked}
        onClose={dismissWarning}
        title="Peringatan Pelanggaran Anti-Cheat!"
        size="md"
      >
        <div className="space-y-4 text-center">
          <div className="w-14 h-14 rounded-full bg-danger-100 text-danger-600 mx-auto flex items-center justify-center animate-bounce">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>

          <div className="space-y-2">
            <h4 className="text-base font-bold text-neutral-900">
              Terdeteksi Aktivitas di Luar Jendela Ujian!
            </h4>
            <p className="text-xs text-neutral-600 leading-relaxed">
              {warningMessage || 'Anda terdeteksi membuka tab baru, meminimalkan browser, atau keluar dari mode fullscreen.'}
            </p>
            <p className="text-xs font-bold text-danger-600">
              Pelanggaran ke-{violationsCount} dari maksimal {exam?.maxViolations || 3} kali toleransi.
            </p>
          </div>

          <Button
            variant="danger"
            size="md"
            className="w-full"
            onClick={dismissWarning}
          >
            Saya Mengerti, Kembali ke Ujian
          </Button>
        </div>
      </Modal>

      {/* 4. FULLSCREEN SCREEN LOCK MODAL (LOCKED BY SYSTEM - SOLUSI 2) */}
      {isLocked && (
        <div className="fixed inset-0 z-50 bg-neutral-950/95 backdrop-blur-md flex items-center justify-center p-2.5 sm:p-4 select-none overflow-y-auto">
          <div className="max-w-md w-full max-h-[92dvh] flex flex-col my-auto bg-white rounded-xl sm:rounded-2xl p-4 sm:p-7 text-center space-y-4 sm:space-y-5 shadow-2xl border-2 border-danger-500 animate-in zoom-in-95 overflow-y-auto">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-danger-100 text-danger-600 mx-auto flex items-center justify-center shadow-inner shrink-0">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>

            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-danger-100 text-danger-800 text-[11px] font-bold uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-danger-600 animate-ping"></span>
                <span>Anti-Cheat Terkunci</span>
              </div>
              <h3 className="text-xl font-black text-neutral-900 tracking-tight">
                Lembar Ujian Terkunci!
              </h3>
              <p className="text-xs text-neutral-600 leading-relaxed">
                {warningMessage || 'Terdeteksi menarik panel notifikasi HP, menekan tombol Home, berpindah tab, atau keluar dari peramban ujian.'}
              </p>
            </div>

            {/* Kotak Pengawas Ruangan */}
            <form onSubmit={handleSupervisorUnlockSubmit} className="pt-2 border-t border-neutral-100 space-y-3 text-left">
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] space-y-1">
                <p className="font-bold flex items-center gap-1">
                  <span>👨‍🏫</span>
                  <span>Petunjuk Pengawas Ruangan:</span>
                </p>
                <p className="text-amber-800 leading-relaxed">
                  Masukkan PIN Pengawas atau Token Ujian di bawah ini untuk memverifikasi dan membuka kembali lembar ujian siswa.
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral-800">
                  PIN Buka Kunci Pengawas
                </label>
                <input
                  type="password"
                  placeholder="Masukkan PIN Pengawas / Token"
                  value={supervisorPinInput}
                  onChange={(e) => {
                    setSupervisorPinInput(e.target.value.toUpperCase());
                    setSupervisorPinError('');
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-center tracking-widest text-sm font-bold uppercase text-neutral-900 bg-neutral-50"
                  autoFocus
                />
                {supervisorPinError && (
                  <p className="text-[11px] text-danger-600 font-semibold">{supervisorPinError}</p>
                )}
              </div>

              <Button
                type="submit"
                variant="accent"
                size="md"
                loading={isUnlocking}
                className="w-full font-bold shadow-xs min-h-[44px]"
              >
                🔓 Buka Kunci Lembar Ujian
              </Button>
            </form>
          </div>
        </div>
      )}

      {/* 5. CONFIRM FINISH MODAL */}
      <Modal
        isOpen={showConfirmFinish}
        onClose={() => !isFinishing && setShowConfirmFinish(false)}
        title="Konfirmasi Pengumpulan Ujian"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-xs text-neutral-600 leading-relaxed">
            Apakah Anda yakin ingin menyelesaikan dan mengumpulkan ujian ini sekarang? Pastikan seluruh soal telah Anda periksa dengan seksama.
          </p>

          <div className="grid grid-cols-3 gap-2 p-3 rounded-[8px] bg-neutral-50 border border-neutral-200 text-center text-xs">
            <div>
              <p className="text-[10px] text-neutral-400">Dijawab</p>
              <p className="font-bold text-success-600">{answeredCount} Soal</p>
            </div>
            <div>
              <p className="text-[10px] text-neutral-400">Ragu-Ragu</p>
              <p className="font-bold text-amber-600">{doubtfulCount} Soal</p>
            </div>
            <div>
              <p className="text-[10px] text-neutral-400">Belum Dijawab</p>
              <p className="font-bold text-danger-600">{unansweredCount} Soal</p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100">
            <Button
              variant="outline"
              size="md"
              disabled={isFinishing}
              onClick={() => setShowConfirmFinish(false)}
            >
              Lanjutkan Mengerjakan
            </Button>
            <Button
              variant="accent"
              size="md"
              loading={isFinishing}
              onClick={() => handleFinishExam(true)}
            >
              Ya, Kumpulkan Sekarang
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
