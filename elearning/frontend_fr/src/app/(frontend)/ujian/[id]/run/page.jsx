'use client';

import React, { useState, useEffect, use, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { elearningApi } from '@/lib/elearningApi';
import { tokenStorage } from '@/lib/common/tokenStorage';
import { useProctoring } from '@/hooks/useProctoring';
import Button from '@/components/Button';
import Modal from '@/components/Modal';
import AppIcon from '@/components/AppIcon';

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
  const [hasStartedExam, setHasStartedExam] = useState(false);

  // Answers & Doubtful states
  const [answers, setAnswers] = useState({});
  const [doubtfuls, setDoubtfuls] = useState({});
  const [secondsLeft, setSecondsLeft] = useState(3600);

  // Modals
  const [showConfirmFinish, setShowConfirmFinish] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);
  const [finishResult, setFinishResult] = useState(null);
  const [showReviewSheet, setShowReviewSheet] = useState(false);

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

          // Sinkronkan jawaban lokal ke backend jika ada
          if (sess.sessionId && sess.answers && Object.keys(sess.answers).length > 0) {
            for (const [qId, a] of Object.entries(sess.answers)) {
              elearningApi.saveAnswer(
                sess.sessionId,
                examId,
                currentUser?.id,
                qId,
                a.selectedOption || '',
                a.essayAnswer || '',
                Boolean(a.isDoubtful)
              );
            }
          }
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
    // Sesi ujian terkunci otomatis dicatat langsung bersamaan dengan event pelanggaran terakhir (WINDOW_BLUR, TAB_SWITCH, dll.)
    // Tidak perlu merekam log pelanggaran ganda agar riwayat tetap bersih dan akurat
  }, []);

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
    isFullscreen,
    showWarningModal,
    warningMessage,
    dismissWarning,
    requestFullscreen,
    unlockSession,
    wakeLockActive,
    playAlarmSirene,
    stopAlarmSirene,
    testAlarmAudio,
  } = useProctoring({
    examId,
    maxViolations: 1, // Solusi 2: Zero-Tolerance (1x pelanggaran langsung terkunci)
    zeroTolerance: true,
    enabled: !loading && !finishResult && Boolean(session),
    unlockPin: exam?.supervisorPin || exam?.token || '',
    altUnlockPins: [exam?.supervisorPin, exam?.token].filter(Boolean),
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

  // Kiosk-Mode Touch & Overscroll Lockdown (Cegah munculnya tab bar browser saat scrolling di HP)
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.body.style.overscrollBehavior = 'none';
      document.documentElement.style.overscrollBehavior = 'none';
      return () => {
        document.body.style.overscrollBehavior = '';
        document.documentElement.style.overscrollBehavior = '';
      };
    }
  }, []);

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
    const officialSupervisorPin = String(exam?.supervisorPin || '').trim().toUpperCase();
    const isValidPin = (officialSupervisorPin && entered === officialSupervisorPin) || (examToken && entered === examToken);

    const res = unlockSession(entered);
    if (!res.success && !isValidPin) {
      setSupervisorPinError(res.message || 'PIN Pengawas tidak cocok!');
      setIsUnlocking(false);
      return;
    }

    if (!res.success && isValidPin) {
      unlockSession(entered);
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

  // Handle Select Option (MCQ Tunggal)
  const handleSelectOption = (key) => {
    if (!currentQ || isLocked) return;
    const isCurrentDoubtful = doubtfuls[currentQ.id] || false;
    const newAnswers = {
      ...answers,
      [currentQ.id]: {
        ...answers[currentQ.id],
        selectedOption: key,
        isDoubtful: isCurrentDoubtful,
      },
    };
    setAnswers(newAnswers);

    const activeStudentId = session?.studentId || user?.id || user?.nisn || 'std-active';
    elearningApi.saveAnswer(
      session?.sessionId,
      examId,
      activeStudentId,
      currentQ.id,
      key,
      '',
      isCurrentDoubtful
    );
  };

  // Handle Toggle Option (Pilihan Ganda Kompleks - Multi-Select)
  const handleToggleComplexOption = (key) => {
    if (!currentQ || isLocked) return;
    const isCurrentDoubtful = doubtfuls[currentQ.id] || false;
    const currentList = Array.isArray(answers[currentQ.id]?.selectedOptions)
      ? answers[currentQ.id].selectedOptions
      : [];
    const nextList = currentList.includes(key)
      ? currentList.filter((k) => k !== key)
      : [...currentList, key];

    const newAnswers = {
      ...answers,
      [currentQ.id]: {
        ...answers[currentQ.id],
        selectedOptions: nextList,
        isDoubtful: isCurrentDoubtful,
      },
    };
    setAnswers(newAnswers);

    const activeStudentId = session?.studentId || user?.id || user?.nisn || 'std-active';
    elearningApi.saveAnswer(
      session?.sessionId,
      examId,
      activeStudentId,
      currentQ.id,
      nextList.join(','),
      '',
      isCurrentDoubtful
    );
  };

  // Handle Select True / False (Benar atau Salah)
  const handleSelectTrueFalse = (val) => {
    if (!currentQ || isLocked) return;
    const isCurrentDoubtful = doubtfuls[currentQ.id] || false;
    const newAnswers = {
      ...answers,
      [currentQ.id]: {
        ...answers[currentQ.id],
        selectedOption: val, // 'TRUE' | 'FALSE'
        trueFalseAnswer: val === 'TRUE',
        isDoubtful: isCurrentDoubtful,
      },
    };
    setAnswers(newAnswers);

    const activeStudentId = session?.studentId || user?.id || user?.nisn || 'std-active';
    elearningApi.saveAnswer(
      session?.sessionId,
      examId,
      activeStudentId,
      currentQ.id,
      val,
      '',
      isCurrentDoubtful
    );
  };

  // Handle Select Matching Pair (Menjodohkan / Pencocokan)
  const handleSelectMatchingPair = (pairId, rightVal) => {
    if (!currentQ || isLocked) return;
    const isCurrentDoubtful = doubtfuls[currentQ.id] || false;
    const prevMatching = answers[currentQ.id]?.matchingAnswers || {};
    const nextMatching = { ...prevMatching, [pairId]: rightVal, [String(pairId)]: rightVal };

    const newAnswers = {
      ...answers,
      [currentQ.id]: {
        ...answers[currentQ.id],
        matchingAnswers: nextMatching,
        isDoubtful: isCurrentDoubtful,
      },
    };
    setAnswers(newAnswers);

    const activeStudentId = session?.studentId || user?.id || user?.nisn || 'std-active';
    elearningApi.saveAnswer(
      session?.sessionId,
      examId,
      activeStudentId,
      currentQ.id,
      JSON.stringify(nextMatching),
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

    const activeStudentId = session?.studentId || user?.id || user?.nisn || 'std-active';

    elearningApi.saveAnswer(
      session?.sessionId,
      examId,
      activeStudentId,
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

    const activeStudentId = session?.studentId || user?.id || user?.nisn || 'std-active';
    const ans = answers[currentQ.id];
    elearningApi.saveAnswer(
      session?.sessionId,
      examId,
      activeStudentId,
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
      const activeStudentId = session?.studentId || user?.id || user?.nisn || 'std-active';
      const res = await elearningApi.finishExamSession(session?.sessionId, examId, activeStudentId, answers);
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
    const isScoreVisible = exam?.showScoreToStudent !== false;
    const canReviewAnswers = Boolean(exam?.showAnswersToStudent);

    return (
      <div className="min-h-screen bg-neutral-100 flex items-center justify-center p-4 select-none">
        <div className={`w-full bg-white rounded-[16px] p-6 sm:p-8 shadow-xl text-center space-y-6 animate-in zoom-in-95 transition-all ${showReviewSheet ? 'max-w-2xl' : 'max-w-md'}`}>
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

            {/* Skenario 1: Guru Menyembunyikan Nilai Siswa */}
            {!isScoreVisible ? (
              <div className="pt-2 border-t border-neutral-200 text-left">
                <div className="p-3 rounded-lg bg-neutral-100/90 border border-neutral-200 text-neutral-600 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-neutral-800">
                    <AppIcon name="lock" color="grey" size={14} />
                    <span>Nilai Disembunyikan oleh Guru</span>
                  </div>
                  <p className="text-[11px] text-neutral-500 leading-relaxed">
                    Skor dan hasil evaluasi ujian tidak dipublikasikan secara langsung ke siswa. Silakan hubungi guru pengampu untuk informasi nilai akhir.
                  </p>
                </div>
              </div>
            ) : finishResult.totalMcq === 0 ? (
              /* Skenario 2: Ujian Murni Esai */
              <div className="pt-2 border-t border-neutral-200 space-y-2 text-left">
                <div className="flex items-center justify-between text-xs text-neutral-600">
                  <span>Tipe Ujian:</span>
                  <span className="font-bold text-primary-700 bg-primary-100 px-2.5 py-0.5 rounded-full">
                    Uraian / Esai ({finishResult.totalEssay || questions.length} Soal)
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-success-50 border border-success-200 text-success-900 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-success-800">
                    <span>✓</span>
                    <span>Jawaban Esai Berhasil Disimpan</span>
                  </div>
                  <p className="text-[11px] text-success-700 leading-relaxed">
                    Seluruh lembar jawaban esai Anda telah tersimpan di sistem. Skor akhir akan dinilai dan dipublikasikan oleh Guru Pengampu setelah proses koreksi.
                  </p>
                </div>
              </div>
            ) : (
              /* Skenario 3: Ada Soal Objektif / PG & Nilai Ditampilkan */
              <>
                <div className="flex items-center justify-between text-xs text-neutral-600">
                  <span>Jawaban Benar (Objektif):</span>
                  <span className="font-bold text-success-600">
                    {finishResult.correctCount} / {finishResult.totalMcq} Soal
                  </span>
                </div>

                {finishResult.totalEssay > 0 && (
                  <div className="flex items-center justify-between text-xs text-neutral-600">
                    <span>Soal Uraian / Esai:</span>
                    <span className="font-bold text-primary-700 bg-primary-50 px-2 py-0.5 rounded border border-primary-200">
                      {finishResult.totalEssay} Soal (Koreksi Manual)
                    </span>
                  </div>
                )}

                <div className="pt-2 border-t border-neutral-200 flex items-center justify-between text-sm">
                  <span className="font-bold text-neutral-800">
                    {finishResult.totalEssay > 0 ? 'Skor Sementara (Objektif):' : 'Skor Akhir Ujian:'}
                  </span>
                  <span className="text-2xl font-black text-primary-500">{finishResult.score}</span>
                </div>
              </>
            )}

            {/* Opsi Buka Lembar Jawaban & Pembahasan */}
            {canReviewAnswers && isScoreVisible && (
              <div className="pt-2 border-t border-neutral-200 text-left">
                <button
                  type="button"
                  onClick={() => setShowReviewSheet(!showReviewSheet)}
                  className="w-full py-2.5 px-3.5 rounded-xl border border-primary-300 bg-primary-50 hover:bg-primary-100 text-primary-900 font-bold text-xs flex items-center justify-between transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-1.5">
                    <AppIcon name="file" color="purple" size={15} />
                    <span>{showReviewSheet ? 'Sembunyikan Lembar Jawaban' : 'Lihat Lembar Jawaban & Pembahasan'}</span>
                  </span>
                  <span className="text-xs font-bold text-primary-700">{showReviewSheet ? '▲ Tutup' : '▼ Buka'}</span>
                </button>

                {showReviewSheet && (
                  <div className="mt-3 max-h-80 overflow-y-auto space-y-3 pr-1 text-xs">
                    {(finishResult.reviewItems || []).length === 0 ? (
                      <p className="text-center text-neutral-500 py-3">Tidak ada data pembahasan untuk ditampilkan.</p>
                    ) : (
                      finishResult.reviewItems.map((item, idx) => {
                        const isCorrect = item.isCorrect;
                        const isEssay = item.type === 'ESSAY';
                        const badgeBg = isEssay
                          ? 'bg-blue-50 text-blue-800 border-blue-200'
                          : isCorrect
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-rose-50 text-rose-800 border-rose-200';
                        const badgeText = isEssay ? 'Uraian / Esai' : isCorrect ? 'Benar (+10)' : 'Salah (0)';

                        return (
                          <div key={item.questionId || idx} className="p-3.5 rounded-xl border border-neutral-200 bg-white space-y-2 shadow-2xs">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-neutral-800">Soal No. {item.questionNumber || (idx + 1)}</span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badgeBg}`}>
                                {badgeText}
                              </span>
                            </div>
                            <p className="text-neutral-700 leading-relaxed font-medium">{item.questionText}</p>

                            <div className="p-2.5 rounded-lg bg-neutral-50 border border-neutral-200 space-y-1.5 text-[11px]">
                              <div className="flex items-start gap-1">
                                <span className="text-neutral-500 font-semibold w-24 shrink-0">Jawaban Kamu:</span>
                                <span className={`font-bold flex-1 whitespace-pre-line ${isCorrect ? 'text-emerald-700' : isEssay ? 'text-blue-700' : 'text-rose-600'}`}>
                                  {item.studentAnswerDisplay || '-'}
                                </span>
                              </div>
                              <div className="flex items-start gap-1 pt-1.5 border-t border-neutral-200">
                                <span className="text-neutral-500 font-semibold w-24 shrink-0">Kunci Jawaban:</span>
                                <span className="font-bold text-neutral-900 flex-1 whitespace-pre-line">
                                  {item.correctAnswerDisplay || '-'}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
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

  // Helper mengecek apakah suatu nomor soal sudah dijawab oleh siswa
  const checkIsAnswered = (q) => {
    if (!q) return false;
    const ans = answers[q.id];
    if (!ans) return false;
    if (q.type === 'MCQ' || q.type === 'TRUE_FALSE') {
      return Boolean(ans.selectedOption && String(ans.selectedOption).trim() !== '');
    }
    if (q.type === 'COMPLEX_MCQ') {
      return Array.isArray(ans.selectedOptions) && ans.selectedOptions.length > 0;
    }
    if (q.type === 'MATCHING') {
      const mAns = ans.matchingAnswers || {};
      const pairs = Array.isArray(q.matchingPairs) ? q.matchingPairs : [];
      return pairs.length > 0 && pairs.every((p) => Boolean(mAns[p.id] || mAns[String(p.id)]));
    }
    if (q.type === 'ESSAY') {
      return Boolean(ans.essayAnswer && String(ans.essayAnswer).trim() !== '');
    }
    return Boolean(ans.selectedOption || ans.essayAnswer);
  };

  // Answer status summary
  const totalQuestions = questions.length;
  const answeredCount = questions.filter((q) => checkIsAnswered(q)).length;
  const doubtfulCount = questions.filter((q) => Boolean(doubtfuls[q.id])).length;
  const unansweredCount = Math.max(0, totalQuestions - answeredCount);

  return (
    <div className="min-h-screen bg-neutral-100 flex flex-col select-none relative font-sans overscroll-none touch-pan-y">

      {/* GERBANG MASUK MODE UJIAN (USER GESTURE UNTUK FULLSCREEN & AUDIO ALARM DI HP) */}
      {!hasStartedExam && !finishResult && (
        <div className="fixed inset-0 z-50 bg-neutral-950/90 backdrop-blur-md flex items-center justify-center p-4 select-none">
          <div className="max-w-md w-full bg-white rounded-2xl p-6 sm:p-8 text-center space-y-5 shadow-2xl border border-neutral-200 animate-in zoom-in-95">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#4B3B78] to-[#5B3E96] text-white mx-auto flex items-center justify-center text-2xl font-black shadow-md">
              CBT
            </div>

            <div className="space-y-1.5">
              <h2 className="text-xl font-black text-neutral-900 tracking-tight">
                Ruang Ujian Online CBT Spenspra
              </h2>
              <p className="text-xs text-neutral-600 leading-relaxed">
                {exam?.title} ({exam?.subject || 'Mata Pelajaran'})
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-left text-xs space-y-2 text-amber-950">
              <p className="font-bold flex items-center gap-1.5 text-amber-900">
                <AppIcon name="lock" color="yellow" size={16} />
                <span>Protokol Pengawasan Anti-Cheat Aktif:</span>
              </p>
              <ul className="list-disc pl-4 space-y-1 text-[11px] text-amber-800 leading-relaxed">
                <li>Layar perangkat Anda akan dikunci ke <strong>Mode Layar Penuh (Fullscreen)</strong>.</li>
                <li><strong>Sirene alarm darurat</strong> akan berbunyi otomatis dan lembar ujian terkunci jika menekan tombol <strong>Home</strong>, menarik status bar notifikasi, atau berpindah aplikasi.</li>
                <li>Jika terkunci, hanya <strong>Pengawas Ruangan</strong> yang dapat membukanya kembali dengan PIN Pengawas.</li>
              </ul>
            </div>

            <div className="p-3.5 rounded-xl bg-violet-50/80 border border-violet-200 text-left space-y-2 text-xs">
              <div className="flex items-center gap-1.5 font-bold text-violet-950">
                <AppIcon name="notification" color="purple" size={15} />
                <span>Pengaturan Audio & Mode Hening:</span>
              </div>
              <p className="text-[11px] text-violet-900 leading-relaxed">
                Pastikan HP Anda <strong>TIDAK dalam Mode Hening (Silent / Jangan Ganggu)</strong> dan <strong>Volume Media dinaikkan</strong> agar suara alarm darurat terdengar saat ada pelanggaran.
              </p>
              <button
                type="button"
                onClick={testAlarmAudio}
                className="w-full py-2 px-3 rounded-lg bg-white border border-violet-300 hover:bg-violet-100 text-violet-900 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
              >
                <AppIcon name="timer" color="purple" size={14} />
                <span>Uji Coba Suara & Getaran Alarm</span>
              </button>
            </div>

            <Button
              variant="primary"
              size="lg"
              className="w-full font-bold shadow-md min-h-[48px] text-sm bg-gradient-to-r from-[#4B3B78] to-[#5B3E96] hover:brightness-110 text-white flex items-center justify-center gap-2 cursor-pointer"
              onClick={() => {
                requestFullscreen();
                setHasStartedExam(true);
              }}
            >
              <AppIcon name="lock" color="white" size={16} />
              <span>Kunci Layar Penuh & Mulai Ujian</span>
            </Button>

            <p className="text-[11px] text-neutral-400">
              Durasi pengerjaan: {exam?.durationMinutes || 90} menit • Total {totalQuestions} soal
            </p>
          </div>
        </div>
      )}

      {/* 1. ACCENT HEADER (Tema Brand Spenspra: Deep Violet / Indigo Gradient) */}
      <header className="bg-gradient-to-r from-[#3B2C63] via-[#4B3B78] to-[#5B3E96] text-white px-4 sm:px-6 py-3.5 relative overflow-hidden sticky top-0 z-30 shadow-md">
        {/* Dekoratif lingkaran */}
        <div className="absolute right-4 top-[-20px] w-28 h-28 rounded-full bg-white/5 pointer-events-none" />
        <div className="absolute right-16 top-[-10px] w-16 h-16 rounded-full bg-white/5 pointer-events-none" />
        <div className="absolute right-0 bottom-[-30px] w-20 h-20 rounded-full bg-white/5 pointer-events-none" />

        <div className="max-w-7xl mx-auto flex items-center gap-3">
          {/* Tombol Kembali */}
          <button
            type="button"
            onClick={() => router.push('/ujian')}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors shrink-0 text-white cursor-pointer"
            title="Kembali ke Portal Ujian"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* Judul Ujian */}
          <div className="flex-1 min-w-0">
            <h1 className="text-sm sm:text-base font-bold text-white truncate leading-tight">
              {exam?.title}
            </h1>
            <div className="flex items-center gap-3 mt-0.5">
              <span className="flex items-center gap-1 text-xs font-semibold text-white/80">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                {totalQuestions} Soal
              </span>
              <span className="flex items-center gap-1 text-xs font-semibold text-white/80">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {exam?.durationMinutes || 90} menit
              </span>
            </div>
          </div>

          {/* Timer + Anti-Cheat + Fullscreen */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 text-white text-xs font-semibold border border-white/15">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Anti-Cheat</span>
            </div>
            {violationsCount > 0 && (
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-600 text-white text-xs font-bold animate-bounce shadow-xs">
                <span>⚠️ {violationsCount}/{exam?.maxViolations || 3}</span>
              </div>
            )}
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-mono text-sm font-bold border ${
              secondsLeft < 300
                ? 'bg-red-600 text-white border-red-400 animate-pulse'
                : 'bg-white/15 text-white border-white/20'
            }`}>
              <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{formatTime(secondsLeft)}</span>
            </div>
            <button
              type="button"
              onClick={requestFullscreen}
              className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-white/15 hover:bg-white/25 text-white text-xs font-semibold transition-colors border border-white/20 cursor-pointer"
              title="Layar Penuh"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
              Penuh
            </button>
          </div>
        </div>
      </header>

      {/* 2. MAIN BODY: Left Sidebar (Nomor Soal) + Right (Konten Soal) */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 flex flex-col lg:flex-row gap-5 items-start">

        {/* LEFT SIDEBAR: Nomor Soal */}
        <aside className="w-full lg:w-64 shrink-0 bg-white rounded-[12px] border border-neutral-200 shadow-sm p-4 space-y-3 lg:sticky lg:top-[90px]">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-bold uppercase tracking-widest text-neutral-700">
              Nomor Soal
            </h3>
            <span className="w-5 h-5 rounded-full bg-neutral-800 text-white flex items-center justify-center text-[10px] font-bold shrink-0 cursor-default" title="Klik nomor untuk berpindah soal">
              i
            </span>
          </div>

          {/* Grid Nomor Bulat */}
          <div className="grid grid-cols-5 gap-2">
            {questions.map((q, idx) => {
              const isCurrent = idx === currentIndex;
              const isAnswered = checkIsAnswered(q);
              const isDoubtful = Boolean(doubtfuls[q.id]);

              let circleClass = 'border-2 border-neutral-300 text-neutral-600 bg-white hover:border-neutral-400';
              if (isDoubtful) {
                circleClass = 'border-2 border-amber-500 bg-amber-400 text-neutral-900 font-bold';
              } else if (isAnswered) {
                circleClass = 'border-2 border-success-600 bg-success-600 text-white font-bold';
              }
              if (isCurrent) {
                circleClass = 'border-2 border-primary-600 bg-primary-50 text-primary-700 font-bold ring-2 ring-primary-300 ring-offset-1';
              }

              return (
                <button
                  key={q.id || idx}
                  type="button"
                  onClick={() => setCurrentIndex(idx)}
                  className={`w-full aspect-square rounded-full text-xs font-bold transition-all flex items-center justify-center cursor-pointer ${circleClass}`}
                  title={`Soal No. ${idx + 1}`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>

          {/* Legenda */}
          <div className="pt-3 border-t border-neutral-100 space-y-1.5 text-[11px] text-neutral-600 font-medium">
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-full bg-success-600 border-2 border-success-600 shrink-0" />
              <span>Dijawab ({answeredCount})</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-full bg-amber-400 border-2 border-amber-500 shrink-0" />
              <span>Ragu-Ragu ({doubtfulCount})</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-full bg-white border-2 border-orange-500 shrink-0" />
              <span>Soal Aktif</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-full bg-white border-2 border-neutral-300 shrink-0" />
              <span>Belum Dijawab ({unansweredCount})</span>
            </div>
          </div>

          <Button
            variant="accent"
            size="sm"
            className="w-full mt-1"
            onClick={() => setShowConfirmFinish(true)}
          >
            Selesaikan Ujian
          </Button>
        </aside>

        {/* RIGHT: Konten Soal */}
        <div className="flex-1 min-w-0 space-y-4">
          <div className="bg-white rounded-[12px] border border-neutral-200 shadow-sm p-5 sm:p-7 space-y-5">
            {/* Heading Soal */}
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <h2 className="text-base sm:text-lg font-bold text-neutral-900">
                Soal Nomor {currentIndex + 1}
              </h2>
              {/* Ragu-ragu Toggle */}
              <button
                type="button"
                onClick={handleToggleDoubtful}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer border ${
                  doubtfuls[currentQ?.id]
                    ? 'bg-amber-400 text-neutral-900 border-amber-500'
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
                    <AppIcon name="file" color="yellow" size={15} />
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

              {/* 3. Teks Pertanyaan */}
              <div className="text-sm sm:text-base text-neutral-900 leading-relaxed whitespace-pre-wrap font-medium">
                {currentQ?.questionText}
              </div>

              {/* Petunjuk Pengerjaan Berdasarkan Tipe Soal */}
              {currentQ?.type === 'MCQ' && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 text-xs">
                  <svg className="w-4 h-4 shrink-0 mt-0.5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span><strong>Pilihan Ganda (Tunggal):</strong> Silakan klik salah satu opsi jawaban yang paling tepat.</span>
                </div>
              )}

              {currentQ?.type === 'COMPLEX_MCQ' && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-primary-50 border border-primary-200 text-primary-900 text-xs">
                  <svg className="w-4 h-4 shrink-0 mt-0.5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span><strong>Pilihan Ganda Kompleks:</strong> Centang semua pilihan yang Anda anggap benar (bisa memilih lebih dari satu jawaban).</span>
                </div>
              )}

              {currentQ?.type === 'TRUE_FALSE' && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-950 text-xs">
                  <AppIcon name="survey" color="green" size={16} />
                  <span><strong>Benar / Salah:</strong> Tentukan apakah pernyataan di atas bernilai BENAR atau SALAH dengan menekan salah satu tombol pilihan di bawah.</span>
                </div>
              )}

              {currentQ?.type === 'MATCHING' && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-violet-50 border border-violet-200 text-violet-950 text-xs">
                  <AppIcon name="link" color="purple" size={16} />
                  <span><strong>Pencocokan / Menjodohkan:</strong> Pasangkan setiap premis di kolom kiri dengan pilihan jawaban yang cocok pada kolom kanan.</span>
                </div>
              )}

              {/* 4A. Pilihan Ganda Tunggal (Radio Style) */}
              {currentQ?.type === 'MCQ' && (
                <div className="space-y-2.5 pt-1">
                  {currentQ?.options?.map((opt) => {
                    const isSelected = answers[currentQ.id]?.selectedOption === opt.key;

                    return (
                      <div
                        key={opt.key}
                        onClick={() => handleSelectOption(opt.key)}
                        className={`flex items-center gap-3 p-3.5 sm:p-4 rounded-full border-2 transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-primary-50 border-primary-500 shadow-xs'
                            : 'bg-white border-neutral-200 hover:border-primary-300 hover:bg-neutral-50/50'
                        }`}
                      >
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0 transition-colors ${
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

              {/* 4B. Pilihan Ganda Kompleks (Checkbox Multi-Select) */}
              {currentQ?.type === 'COMPLEX_MCQ' && (
                <div className="space-y-2.5 pt-1">
                  {currentQ?.options?.map((opt) => {
                    const selectedList = Array.isArray(answers[currentQ.id]?.selectedOptions)
                      ? answers[currentQ.id].selectedOptions
                      : [];
                    const isSelected = selectedList.includes(opt.key);

                    return (
                      <div
                        key={opt.key}
                        onClick={() => handleToggleComplexOption(opt.key)}
                        className={`flex items-center gap-3.5 p-3.5 sm:p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-primary-50 border-primary-500 shadow-xs ring-1 ring-primary-500/20'
                            : 'bg-white border-neutral-200 hover:border-primary-300 hover:bg-neutral-50/50'
                        }`}
                      >
                        <div
                          className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black shrink-0 transition-colors border ${
                            isSelected
                              ? 'bg-primary-600 border-primary-600 text-white'
                              : 'bg-white border-neutral-300 text-transparent'
                          }`}
                        >
                          ✓
                        </div>
                        <span className="w-6 h-6 rounded-md bg-neutral-100 text-neutral-700 font-bold text-xs flex items-center justify-center shrink-0">
                          {opt.key}
                        </span>
                        <span className="text-xs sm:text-sm text-neutral-800 leading-normal flex-1">
                          {opt.text}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* 4C. Benar / Salah (True / False Interactive Buttons) */}
              {currentQ?.type === 'TRUE_FALSE' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  {(() => {
                    const ansVal = answers[currentQ.id]?.selectedOption;
                    const isTrue = ansVal === 'TRUE' || answers[currentQ.id]?.trueFalseAnswer === true;
                    const isFalse = ansVal === 'FALSE' || answers[currentQ.id]?.trueFalseAnswer === false;

                    return (
                      <>
                        <button
                          type="button"
                          onClick={() => handleSelectTrueFalse('TRUE')}
                          className={`p-5 rounded-2xl border-2 text-center transition-all cursor-pointer flex items-center justify-center gap-3 ${
                            isTrue
                              ? 'bg-emerald-600 border-emerald-700 text-white shadow-md ring-2 ring-emerald-500/30'
                              : 'bg-white border-neutral-200 hover:border-emerald-400 hover:bg-emerald-50/30 text-neutral-800'
                          }`}
                        >
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-base shrink-0 ${
                            isTrue ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-700'
                          }`}>
                            ✓
                          </div>
                          <div className="text-left">
                            <p className="font-bold text-sm sm:text-base leading-tight">BENAR (TRUE)</p>
                            <p className={`text-xs ${isTrue ? 'text-emerald-100' : 'text-neutral-500'}`}>Pernyataan di atas bernilai benar</p>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleSelectTrueFalse('FALSE')}
                          className={`p-5 rounded-2xl border-2 text-center transition-all cursor-pointer flex items-center justify-center gap-3 ${
                            isFalse
                              ? 'bg-rose-600 border-rose-700 text-white shadow-md ring-2 ring-rose-500/30'
                              : 'bg-white border-neutral-200 hover:border-rose-400 hover:bg-rose-50/30 text-neutral-800'
                          }`}
                        >
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-base shrink-0 ${
                            isFalse ? 'bg-white/20 text-white' : 'bg-rose-100 text-rose-700'
                          }`}>
                            ✕
                          </div>
                          <div className="text-left">
                            <p className="font-bold text-sm sm:text-base leading-tight">SALAH (FALSE)</p>
                            <p className={`text-xs ${isFalse ? 'text-rose-100' : 'text-neutral-500'}`}>Pernyataan di atas bernilai salah</p>
                          </div>
                        </button>
                      </>
                    );
                  })()}
                </div>
              )}

              {/* 4D. Menjodohkan / Pencocokan (Matching Pairs) */}
              {currentQ?.type === 'MATCHING' && (
                <div className="space-y-3 pt-2">
                  {(() => {
                    const pairs = Array.isArray(currentQ?.matchingPairs) ? currentQ.matchingPairs : [];
                    const allRightOptions = Array.from(new Set(pairs.map((p) => p.right))).filter(Boolean);

                    if (pairs.length === 0) {
                      return (
                        <div className="p-4 rounded-xl border border-dashed border-neutral-300 text-center text-xs text-neutral-500">
                          Belum ada item pencocokan untuk butir soal ini.
                        </div>
                      );
                    }

                    return pairs.map((pair, pIdx) => {
                      const selectedRight = answers[currentQ.id]?.matchingAnswers?.[pair.id] ?? answers[currentQ.id]?.matchingAnswers?.[String(pair.id)] ?? '';

                      return (
                        <div
                          key={pair.id || pIdx}
                          className="p-3.5 sm:p-4 rounded-xl border border-neutral-200 bg-neutral-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
                        >
                          <div className="flex items-center gap-2.5 flex-1 min-w-0">
                            <span className="w-7 h-7 rounded-lg bg-neutral-800 text-white font-bold text-xs flex items-center justify-center shrink-0">
                              {pIdx + 1}
                            </span>
                            <p className="text-xs sm:text-sm font-semibold text-neutral-900 leading-snug">
                              {pair.left}
                            </p>
                          </div>

                          <div className="flex items-center gap-2 sm:w-1/2 shrink-0">
                            <span className="text-neutral-400 font-bold hidden sm:inline">↔</span>
                            <select
                              value={selectedRight}
                              onChange={(e) => handleSelectMatchingPair(pair.id, e.target.value)}
                              className={`w-full text-xs sm:text-sm p-2.5 rounded-lg border font-medium transition-colors cursor-pointer ${
                                selectedRight
                                  ? 'bg-violet-50 border-violet-400 text-violet-950 font-semibold ring-1 ring-violet-400/20'
                                  : 'bg-white border-neutral-300 text-neutral-600'
                              }`}
                            >
                              <option value="">-- Pilih Pasangan Jawaban --</option>
                              {allRightOptions.map((optText, oIdx) => (
                                <option key={oIdx} value={optText}>
                                  {optText}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              )}

              {/* 4E. Essay Textarea (Mendukung jawaban per sub-poin a, b, c) */}
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
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-danger-100 text-danger-600 mx-auto flex items-center justify-center shadow-inner shrink-0 animate-bounce">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>

            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-100 text-red-800 text-[11px] font-bold uppercase tracking-wider border border-red-300 animate-pulse">
                <span className="w-2 h-2 rounded-full bg-red-600 animate-ping"></span>
                <AppIcon name="notification" color="red" size={14} />
                <span>ALARM & SIRENE AKTIF!</span>
              </div>
              <h3 className="text-xl font-black text-neutral-900 tracking-tight">
                Lembar Ujian Terkunci!
              </h3>
              <p className="text-xs text-neutral-600 leading-relaxed">
                {warningMessage || 'Terdeteksi menekan tombol Home, menarik panel notifikasi HP, berpindah tab, atau keluar dari peramban ujian.'}
              </p>
            </div>

            {/* Kotak Pengawas Ruangan */}
            <form onSubmit={handleSupervisorUnlockSubmit} className="pt-2 border-t border-neutral-100 space-y-3 text-left">
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <AppIcon name="profile" color="yellow" size={15} />
                  <span>Petunjuk Pengawas Ruangan:</span>
                </p>
                <p className="text-amber-800 leading-relaxed">
                  Sirene darurat sedang berbunyi. Masukkan <strong>PIN Pengawas</strong> atau <strong>Token Ujian</strong> di bawah ini untuk menghentikan sirene dan membuka kembali lembar ujian siswa.
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
                className="w-full font-bold shadow-xs min-h-[44px] flex items-center justify-center gap-2"
              >
                <AppIcon name="unlock" color="black" size={16} />
                <span>Matikan Alarm & Buka Kunci Ujian</span>
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
