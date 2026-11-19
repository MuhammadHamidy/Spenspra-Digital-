'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Card from '@/components/Card';
import Button from '@/components/Button';
import StatusBadge from '@/components/StatusBadge';
import Modal from '@/components/Modal';
import ConfirmModal from '@/components/ConfirmModal';
import AppIcon from '@/components/AppIcon';
import { elearningApi } from '@/lib/elearningApi';
import { tokenStorage } from '@/lib/common/tokenStorage';

// Pemeriksaan apakah sebuah event benar-benar merupakan pelanggaran kecurangan siswa
const isActualCheatingViolation = (type) => {
  const t = String(type || '').toUpperCase();
  return ['WINDOW_BLUR', 'TAB_SWITCH', 'FULLSCREEN_EXIT', 'INSPECT_ATTEMPT', 'PAGE_HIDE'].includes(t);
};

const formatViolationTypeLabel = (type) => {
  switch (type) {
    case 'WINDOW_BLUR':
      return 'Muncul Notifikasi / Buka Aplikasi Lain';
    case 'TAB_SWITCH':
      return 'Membuka Tab Lain';
    case 'FULLSCREEN_EXIT':
      return 'Keluar Layar Penuh Ujian';
    case 'PAGE_HIDE':
      return 'Menutup / Meminimalkan Ujian';
    case 'INSPECT_ATTEMPT':
      return 'Membuka Menu Pengembang';
    case 'SUPERVISOR_UNLOCK':
      return 'Buka Kunci Pengawas';
    case 'MAX_VIOLATIONS_REACHED':
      return 'Layar Terkunci Otomatis';
    default:
      return type || 'Pelanggaran Layar';
  }
};

const formatViolationDesc = (desc, type) => {
  if (!desc || (typeof desc === 'string' && (desc.trim().startsWith('{') || desc.includes('visibilityState')))) {
    if (type === 'WINDOW_BLUR') return 'Layar ujian tertutup sementara karena muncul notifikasi lain, menarik menu atas HP, menekan tombol Home, atau berpindah aplikasi.';
    if (type === 'TAB_SWITCH') return 'Membuka tab baru di browser atau beralih ke jendela browser lain saat ujian.';
    if (type === 'FULLSCREEN_EXIT') return 'Keluar dari mode layar penuh (fullscreen) saat mengerjakan ujian.';
    if (type === 'PAGE_HIDE') return 'Aplikasi ujian disembunyikan atau diminimalkan ke latar belakang.';
    if (type === 'INSPECT_ATTEMPT') return 'Mencoba membuka inspect element atau menu pengembang peramban.';
    if (type === 'SUPERVISOR_UNLOCK') return 'Layar ujian yang terkunci berhasil dibuka kembali oleh pengawas menggunakan token / PIN resmi.';
    if (type === 'MAX_VIOLATIONS_REACHED') return 'Sesi ujian otomatis terkunci karena terdeteksi keluar dari layar ujian.';
    return 'Terdeteksi keluar dari tampilan lembar ujian CBT.';
  }
  if (typeof desc === 'string') {
    if (desc.includes('Fokus') || desc.includes('WINDOW_BLUR')) {
      return 'Layar ujian tertutup sementara karena muncul notifikasi lain, menarik menu atas HP, menekan tombol Home, atau berpindah aplikasi.';
    }
    if (desc.includes('beralih aplikasi') || desc.includes('TAB_SWITCH')) {
      return 'Membuka tab baru di browser atau beralih ke jendela browser lain saat ujian.';
    }
    if (desc.includes('Layar Penuh') || desc.includes('FULLSCREEN_EXIT')) {
      return 'Keluar dari mode layar penuh (fullscreen) saat mengerjakan ujian.';
    }
  }
  return desc;
};

// Normalisasi tipe soal ke 5 jenis utama: MCQ, COMPLEX_MCQ, TRUE_FALSE, MATCHING, ESSAY
const normalizeQuestionType = (q) => {
  const raw = String(q?.type || q?.question_type || q?.questionType || '').trim().toUpperCase();
  if (raw === 'MCQ' || raw === 'PILIHAN_GANDA' || raw === 'PG') return 'MCQ';
  if (raw === 'COMPLEX_MCQ' || raw.includes('KOMPLEKS') || raw === 'COMPLEX' || raw === 'PG_KOMPLEKS') return 'COMPLEX_MCQ';
  if (raw === 'TRUE_FALSE' || raw.includes('BENAR') || raw.includes('SALAH') || raw === 'TF') return 'TRUE_FALSE';
  if (raw === 'MATCHING' || raw.includes('JODOH') || raw.includes('COCOK')) return 'MATCHING';
  if (raw === 'ESSAY' || raw.includes('URAIAN') || raw.includes('ESAI')) return 'ESSAY';

  // Fallback melalui inspeksi struktur atribut butir soal
  if (Array.isArray(q?.matchingPairs) && q.matchingPairs.length > 0) return 'MATCHING';
  if (q?.trueFalseAnswer !== undefined && q?.trueFalseAnswer !== null) return 'TRUE_FALSE';
  if (Array.isArray(q?.correctOptions) && q.correctOptions.length > 1) return 'COMPLEX_MCQ';
  if (Array.isArray(q?.options) && q.options.length > 0) {
    if (q?.correctOptions && Array.isArray(q.correctOptions) && q.correctOptions.length > 1) return 'COMPLEX_MCQ';
    return 'MCQ';
  }
  return 'ESSAY';
};

// Resolusi jawaban siswa dari berbagai format penyimpanan (ID, nomor urut, atau index)
const resolveStudentAnswer = (q, idx, answersObj) => {
  if (!answersObj) return null;
  const direct =
    answersObj[q.id] ??
    answersObj[String(q.id)] ??
    answersObj[q.questionNumber] ??
    answersObj[idx + 1] ??
    answersObj[String(idx + 1)] ??
    answersObj[`q-${idx + 1}`] ??
    answersObj[`q_${idx + 1}`];
  if (direct !== undefined && direct !== null) return direct;

  const values = Object.values(answersObj);
  const byQuestionId = values.find(
    (v) => v && typeof v === 'object' && (v.questionId === q.id || v.question_id === q.id || String(v.questionId) === String(q.id))
  );
  if (byQuestionId) return byQuestionId;

  if (values[idx] !== undefined) return values[idx];
  return null;
};

export default function LiveProctoringMonitoringPage() {
  const [user, setUser] = useState(null);
  const [exams, setExams] = useState([]);
  const [selectedExamId, setSelectedExamId] = useState('');
  const [sessions, setSessions] = useState([]);
  const [classStudents, setClassStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeStudentAudit, setActiveStudentAudit] = useState(null);
  const [activeStudentAnswers, setActiveStudentAnswers] = useState(null);
  const [examQuestions, setExamQuestions] = useState([]);
  const [essayScores, setEssayScores] = useState({});
  const [savingGrade, setSavingGrade] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('ALL'); // ALL, VIOLATION, LOCKED, IN_PROGRESS, SUBMITTED, NOT_STARTED
  const [notice, setNotice] = useState(null);
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Ya, Buka Kunci',
    cancelText: 'Batal',
    isDanger: false,
    onConfirm: null,
  });

  useEffect(() => {
    setUser(tokenStorage.getUser());
    loadExamsList();
  }, []);

  const loadExamsList = async () => {
    try {
      const data = await elearningApi.getExams();
      const list = data || [];
      setExams(list);

      if (list.length > 0 && !selectedExamId) {
        // Automatically detect active exam or scheduled exam for today
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];

        const activeExam = list.find((ex) => {
          if (ex.status === 'ACTIVE') return true;
          if (ex.scheduledDate === todayStr) return true;
          if (ex.startDateTime && ex.endDateTime) {
            const start = new Date(ex.startDateTime);
            const end = new Date(ex.endDateTime);
            return now >= start && now <= end;
          }
          return false;
        });

        setSelectedExamId(activeExam ? activeExam.id : list[0].id);
      }
    } catch (e) {
      console.error('Failed to load exams list:', e);
    }
  };

  const selectedExam = useMemo(() => {
    return (Array.isArray(exams) ? exams : []).find((e) => e.id === selectedExamId) || exams[0] || null;
  }, [exams, selectedExamId]);

  const loadProctoringData = async () => {
    if (!selectedExamId) return;
    try {
      const currentExam = exams.find((e) => e.id === selectedExamId) || selectedExam;

      // 1. Fetch live proctoring websocket/storage sessions
      const liveData = await elearningApi.getLiveProctoringData(selectedExamId);
      const liveSessions = Array.isArray(liveData) ? liveData : liveData?.sessions || [];
      setSessions(Array.isArray(liveSessions) ? liveSessions : []);

      // 2. Fetch official class roster for this exam
      if (currentExam?.className) {
        const students = await elearningApi.getStudentsByClass(currentExam.className);
        setClassStudents(Array.isArray(students) ? students : []);
      }
    } catch (e) {
      console.error('Failed to load proctoring data:', e);
    } finally {
      setLoading(false);
    }
  };

  // Poll live updates every 4 seconds
  useEffect(() => {
    if (selectedExamId) {
      setLoading(true);
      loadProctoringData();
      const interval = setInterval(loadProctoringData, 4000);
      return () => clearInterval(interval);
    }
  }, [selectedExamId, exams]);

  const handleUnlockStudent = (studentItem) => {
    setConfirmModal({
      isOpen: true,
      title: 'Buka Kunci Layar Siswa',
      message: `Buka kunci lembar ujian untuk siswa: ${studentItem.studentName}?\nSiswa akan diberikan dispensasi untuk melanjutkan pengerjaan.`,
      confirmText: 'Ya, Berikan Dispensasi',
      cancelText: 'Batal',
      isDanger: false,
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        try {
          await elearningApi.unlockStudentSession(selectedExamId, studentItem.sessionId);
          setNotice(`Kunci ujian untuk ${studentItem.studentName} berhasil dibuka.`);
          setTimeout(() => setNotice(null), 4000);
          loadProctoringData();
        } catch (e) {
          setNotice(`Gagal membuka kunci: ${e.message}`);
          setTimeout(() => setNotice(null), 4000);
        }
      },
    });
  };

  const handleOpenStudentAnswers = async (studentItem) => {
    setActiveStudentAnswers(studentItem);
    try {
      const qs = await elearningApi.getExamQuestions(selectedExamId);
      setExamQuestions(qs || []);

      // Ambil lembar jawaban segar langsung dari database server PostgreSQL
      const effSessionId = studentItem.sessionId || studentItem.id;
      if (effSessionId && !String(effSessionId).startsWith('not-joined')) {
        const freshAnswers = await elearningApi.getSessionAnswers(effSessionId);
        if (freshAnswers && Object.keys(freshAnswers).length > 0) {
          const merged = { ...(studentItem.answers || {}), ...freshAnswers };
          studentItem.answers = merged;
          setActiveStudentAnswers({ ...studentItem, answers: merged });
        }
      }

      const sId = studentItem.studentId || studentItem.student_id;
      let initialScores = studentItem.essayGrades || {};
      if (typeof window !== 'undefined' && selectedExamId && sId) {
        try {
          const raw = localStorage.getItem(`essay_grades_${selectedExamId}_${sId}`);
          if (raw) initialScores = JSON.parse(raw);
        } catch (_) {}
      }
      setEssayScores(initialScores);
    } catch (err) {
      console.error('Gagal memuat butir soal:', err);
    }
  };

  const studentAnswers = useMemo(() => {
    if (!activeStudentAnswers) return {};
    let ans = activeStudentAnswers.answers;
    if (!ans || Object.keys(ans).length === 0) {
      const sId = activeStudentAnswers.studentId || activeStudentAnswers.student_id;
      const sessId = activeStudentAnswers.sessionId || activeStudentAnswers.id;
      if (typeof window !== 'undefined' && selectedExamId) {
        try {
          const keys = [
            `exam_session_${selectedExamId}_${sId}`,
            `exam_session_${sessId}`,
          ];
          for (const k of keys) {
            const raw = localStorage.getItem(k);
            if (raw) {
              const parsed = JSON.parse(raw);
              if (parsed.answers && Object.keys(parsed.answers).length > 0) {
                ans = parsed.answers;
                break;
              }
            }
          }
          if (!ans && localStorage) {
            for (let i = 0; i < localStorage.length; i++) {
              const k = localStorage.key(i);
              if (k && k.startsWith(`exam_session_${selectedExamId}_`)) {
                const parsed = JSON.parse(localStorage.getItem(k) || '{}');
                if (parsed.answers && Object.keys(parsed.answers).length > 0) {
                  const pName = (parsed.studentName || '').toLowerCase();
                  const curName = (activeStudentAnswers.studentName || '').toLowerCase();
                  if (curName && (pName.includes(curName) || curName.includes(pName))) {
                    ans = parsed.answers;
                    break;
                  }
                }
              }
            }
          }
        } catch (_) {}
      }
    }
    return ans || {};
  }, [activeStudentAnswers, selectedExamId]);

  // Kalkulasi rincian skor secara live untuk semua 5 jenis soal
  const scoreBreakdown = useMemo(() => {
    let totalMax = 0;
    let totalEarned = 0;
    let autoCorrectCount = 0;
    let autoTotalCount = 0;

    examQuestions.forEach((q, idx) => {
      const qPoints = Number(q.points) > 0 ? Number(q.points) : 10;
      totalMax += qPoints;
      const qType = normalizeQuestionType(q);
      const ans = resolveStudentAnswer(q, idx, studentAnswers);

      if (qType === 'MCQ') {
        autoTotalCount++;
        const studentOpt = typeof ans === 'string' ? ans : (ans?.selectedOption || ans?.selected_option || '');
        const correctOpt = q.correctOption || q.correct_option || 'A';
        if (studentOpt && studentOpt.trim().toUpperCase() === correctOpt.trim().toUpperCase()) {
          totalEarned += qPoints;
          autoCorrectCount++;
        }
      } else if (qType === 'COMPLEX_MCQ') {
        autoTotalCount++;
        let studentOpts = [];
        if (Array.isArray(ans?.selectedOptions)) {
          studentOpts = ans.selectedOptions;
        } else if (typeof ans?.selectedOption === 'string' && ans.selectedOption) {
          studentOpts = ans.selectedOption.split(',').map((s) => s.trim());
        } else if (typeof ans === 'string' && ans) {
          studentOpts = ans.split(',').map((s) => s.trim());
        }
        const correctOpts = Array.isArray(q.correctOptions) && q.correctOptions.length > 0
          ? q.correctOptions
          : (q.correctOption ? [q.correctOption] : ['A']);
        const sSorted = [...studentOpts].filter(Boolean).map((s) => s.toUpperCase()).sort().join(',');
        const cSorted = [...correctOpts].filter(Boolean).map((s) => s.toUpperCase()).sort().join(',');
        if (sSorted && sSorted === cSorted) {
          totalEarned += qPoints;
          autoCorrectCount++;
        }
      } else if (qType === 'TRUE_FALSE') {
        autoTotalCount++;
        const rawStudent = ans?.selectedOption ?? (ans?.trueFalseAnswer !== undefined ? (ans.trueFalseAnswer ? 'TRUE' : 'FALSE') : (typeof ans === 'string' ? ans : ''));
        const sNorm = String(rawStudent || '').trim().toUpperCase();
        const isStudentTrue = sNorm === 'TRUE' || sNorm === 'BENAR' || sNorm === 'T' || rawStudent === true;
        const isStudentFalse = sNorm === 'FALSE' || sNorm === 'SALAH' || sNorm === 'F' || rawStudent === false;

        const rawCorrect = q.trueFalseAnswer !== undefined ? (q.trueFalseAnswer ? 'TRUE' : 'FALSE') : (q.correctOption || 'TRUE');
        const cNorm = String(rawCorrect || '').trim().toUpperCase();
        const isCorrectTrue = cNorm === 'TRUE' || cNorm === 'BENAR' || cNorm === 'T' || q.trueFalseAnswer === true;

        if ((isStudentTrue && isCorrectTrue) || (isStudentFalse && !isCorrectTrue)) {
          totalEarned += qPoints;
          autoCorrectCount++;
        }
      } else if (qType === 'MATCHING') {
        autoTotalCount++;
        let matchingAns = ans?.matchingAnswers;
        if (!matchingAns && typeof ans?.selectedOption === 'string' && ans.selectedOption.startsWith('{')) {
          try { matchingAns = JSON.parse(ans.selectedOption); } catch (_) {}
        }
        if (!matchingAns && typeof ans === 'string' && ans.startsWith('{')) {
          try { matchingAns = JSON.parse(ans); } catch (_) {}
        }
        matchingAns = matchingAns || {};
        const pairs = Array.isArray(q.matchingPairs) ? q.matchingPairs : [];
        if (pairs.length > 0) {
          let matched = 0;
          pairs.forEach((p) => {
            const studentVal = matchingAns[p.id] ?? matchingAns[String(p.id)] ?? '';
            if (studentVal && studentVal.trim().toLowerCase() === (p.right || '').trim().toLowerCase()) {
              matched++;
            }
          });
          const ratio = matched / pairs.length;
          totalEarned += Math.round(ratio * qPoints);
          if (ratio === 1) autoCorrectCount++;
        }
      } else if (qType === 'ESSAY') {
        const essayScore = Number(essayScores[q.id]) || 0;
        totalEarned += Math.min(qPoints, Math.max(0, essayScore));
      }
    });

    const finalScore = totalMax > 0 ? Math.round((totalEarned / totalMax) * 100) : 100;
    return { totalMax, totalEarned, finalScore, autoCorrectCount, autoTotalCount };
  }, [examQuestions, studentAnswers, essayScores]);

  const handleSaveEssayScore = async () => {
    if (!activeStudentAnswers) return;
    setSavingGrade(true);
    try {
      const sId = activeStudentAnswers.studentId || activeStudentAnswers.student_id;
      if (typeof window !== 'undefined' && selectedExamId && sId) {
        localStorage.setItem(`essay_grades_${selectedExamId}_${sId}`, JSON.stringify(essayScores));
      }

      const { finalScore } = scoreBreakdown;

      const sessionKey = `exam_session_${selectedExamId}_${sId}`;
      const existing = elearningApi.getStudentExamSession(selectedExamId, sId);
      if (existing) {
        existing.score = finalScore;
        existing.essayGrades = essayScores;
        localStorage.setItem(sessionKey, JSON.stringify(existing));
      }

      const monitorKey = `proctoring_${selectedExamId}`;
      const liveSessions = JSON.parse(localStorage.getItem(monitorKey) || '[]');
      const idx = liveSessions.findIndex((s) => s.studentId === sId || s.sessionId === activeStudentAnswers.sessionId);
      if (idx >= 0) {
        liveSessions[idx].score = finalScore;
        liveSessions[idx].essayGrades = essayScores;
        localStorage.setItem(monitorKey, JSON.stringify(liveSessions));
      }

      // Sinkronkan nilai hasil koreksi ke database backend jika ada sessionId
      const effSessionId = activeStudentAnswers.sessionId || activeStudentAnswers.id;
      if (effSessionId && !String(effSessionId).startsWith('not-joined')) {
        try {
          await fetch(`/api/elearning/sessions/${effSessionId}/finish`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ score: finalScore }),
          });
        } catch (_) {}
      }

      setNotice(`Koreksi nilai akhir (${finalScore}) untuk ${activeStudentAnswers.studentName} berhasil disimpan!`);
      setTimeout(() => setNotice(null), 4000);
      loadProctoringData();
      setActiveStudentAnswers(null);
    } catch (err) {
      alert('Gagal menyimpan nilai: ' + err.message);
    } finally {
      setSavingGrade(false);
    }
  };

  // Merge official class roster with live student sessions
  const mergedRoster = useMemo(() => {
    const safeSessions = Array.isArray(sessions) ? sessions : [];

    if (classStudents.length === 0) {
      return safeSessions;
    }

    const matchedSessionKeys = new Set();
    const matchedStudentIds = new Set();

    const roster = classStudents.map((st) => {
      const stId = String(st.id || st.nisn || '');
      const stNisn = String(st.nisn || '');
      const stName = (st.fullName || st.full_name || st.name || 'Siswa').trim().toLowerCase();
      const stClass = st.className || st.class_name || selectedExam?.className || '-';

      // Find active live session by ID, NISN, or Name (including partial match)
      const liveSession = safeSessions.find((s) => {
        const sKey = String(s.sessionId || s.id || '');
        if (matchedSessionKeys.has(sKey)) return false;

        const sId = String(s.studentId || s.student_id || '');
        const sNisn = String(s.nisn || s.student_nisn || '');
        const sName = String(s.studentName || s.student_name || '').trim().toLowerCase();

        return (
          (stId && sId === stId) ||
          (stNisn && sNisn === stNisn) ||
          (sName && stName && (sName === stName || sName.includes(stName) || stName.includes(sName)))
        );
      });

      if (liveSession) {
        matchedSessionKeys.add(String(liveSession.sessionId || liveSession.id || ''));
        matchedStudentIds.add(String(liveSession.studentId || liveSession.student_id || ''));

        const vList = liveSession.violations || [];
        const actualViolCount = vList.filter((v) => isActualCheatingViolation(v.type)).length;
        const finalViolCount = actualViolCount > 0 ? actualViolCount : (vList.length === 0 ? Number(liveSession.violationsCount ?? liveSession.violation_count ?? 0) : 0);

        return {
          ...liveSession,
          sessionId: liveSession.sessionId || liveSession.id,
          studentId: stId || liveSession.studentId,
          nisn: st.nisn || liveSession.nisn || '-',
          studentName: st.fullName || st.full_name || liveSession.studentName,
          className: stClass,
          status: liveSession.status || 'IN_PROGRESS',
          violationsCount: finalViolCount,
          violations: vList,
        };
      }

      // Check offline submitted session in localStorage
      let localSavedSession = null;
      if (typeof window !== 'undefined' && selectedExam?.id) {
        try {
          const raw = localStorage.getItem(`exam_session_${selectedExam.id}_${stId}`);
          if (raw) localSavedSession = JSON.parse(raw);
        } catch (_) {}
      }

      if (localSavedSession) {
        const vList = localSavedSession.violations || [];
        const actualViolCount = vList.filter((v) => isActualCheatingViolation(v.type)).length;
        const finalViolCount = actualViolCount > 0 ? actualViolCount : (vList.length === 0 ? Number(localSavedSession.violationsCount || 0) : 0);

        return {
          sessionId: localSavedSession.id || `session-${stId}`,
          studentId: stId,
          studentName: st.fullName || st.full_name || st.name,
          nisn: st.nisn || '-',
          className: stClass,
          status: localSavedSession.status || 'SUBMITTED',
          score: localSavedSession.score,
          violationsCount: finalViolCount,
          violations: vList,
          answers: localSavedSession.answers || {},
        };
      }

      // Default: Not yet joined
      return {
        sessionId: `not-joined-${stId}`,
        studentId: stId,
        studentName: st.fullName || st.full_name || st.name,
        nisn: st.nisn || '-',
        className: stClass,
        status: 'NOT_STARTED',
        score: null,
        violationsCount: 0,
        violations: [],
      };
    });

    // PENTING: Siswa yang aktif mengerjakan tetapi tidak tercatat di roster kelas resmi,
    // tetap harus dimunculkan di bagian atas daftar monitor!
    safeSessions.forEach((s) => {
      const sKey = String(s.sessionId || s.id || '');
      const sId = String(s.studentId || s.student_id || '');
      if (!matchedSessionKeys.has(sKey) && (!sId || !matchedStudentIds.has(sId))) {
        const vList = s.violations || [];
        const actualViolCount = vList.filter((v) => isActualCheatingViolation(v.type)).length;
        const finalViolCount = actualViolCount > 0 ? actualViolCount : (vList.length === 0 ? Number(s.violationsCount ?? s.violation_count ?? 0) : 0);

        roster.unshift({
          ...s,
          sessionId: sKey || `ses-${Date.now()}`,
          studentId: sId || 'std-active',
          nisn: s.nisn || s.student_nisn || '-',
          studentName: s.studentName || s.student_name || 'Siswa Peserta',
          className: s.className || s.class_code || selectedExam?.className || '-',
          status: s.status || 'IN_PROGRESS',
          score: s.score,
          violationsCount: finalViolCount,
          violations: vList,
        });
      }
    });

    return roster;
  }, [classStudents, sessions, selectedExam]);

  // Statistics
  const totalStudents = mergedRoster.length;
  const inProgressCount = mergedRoster.filter((s) => s.status === 'IN_PROGRESS').length;
  const lockedCount = mergedRoster.filter((s) => s.status === 'LOCKED').length;
  const submittedCount = mergedRoster.filter((s) => s.status === 'SUBMITTED').length;
  const notStartedCount = mergedRoster.filter((s) => s.status === 'NOT_STARTED').length;
  const violatingList = mergedRoster.filter((s) => (s.violationsCount || 0) > 0);
  const totalViolations = mergedRoster.reduce((acc, curr) => acc + (curr.violationsCount || 0), 0);

  // Filtered Roster
  const filteredRoster = useMemo(() => {
    return mergedRoster.filter((s) => {
      // Tab Filter
      if (activeFilter === 'VIOLATION' && (s.violationsCount || 0) === 0) return false;
      if (activeFilter === 'LOCKED' && s.status !== 'LOCKED') return false;
      if (activeFilter === 'IN_PROGRESS' && s.status !== 'IN_PROGRESS') return false;
      if (activeFilter === 'SUBMITTED' && s.status !== 'SUBMITTED') return false;
      if (activeFilter === 'NOT_STARTED' && s.status !== 'NOT_STARTED') return false;

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = (s.studentName || '').toLowerCase().includes(q);
        const matchesNisn = (s.nisn || '').toLowerCase().includes(q);
        return matchesName || matchesNisn;
      }
      return true;
    });
  }, [mergedRoster, activeFilter, searchQuery]);

  // JIKA SEDANG MEMERIKSA JAWABAN SISWA: Tampilkan sebagai Halaman Penuh Mandiri (Bukan Modal Pop-up)
  if (activeStudentAnswers) {
    const { totalMax, totalEarned, finalScore, autoCorrectCount, autoTotalCount } = scoreBreakdown;

    return (
      <div className="space-y-6 max-w-5xl mx-auto pb-24 animate-in fade-in duration-200">
        {/* Top Header & Navigation Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-[12px] border border-neutral-200 shadow-2xs">
          <div className="space-y-1.5">
            <button
              onClick={() => setActiveStudentAnswers(null)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-600 hover:text-primary-700 transition-colors mb-1 cursor-pointer"
            >
              <AppIcon name="arrow-back" color="grey" size={14} />
              <span>Kembali ke Live Monitoring</span>
            </button>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 tracking-tight">
                Lembar Jawaban & Koreksi Siswa
              </h1>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                activeStudentAnswers.status === 'SUBMITTED'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border border-amber-200'
              }`}>
                {activeStudentAnswers.status === 'SUBMITTED' ? 'Telah Selesai' : 'Sedang Mengerjakan'}
              </span>
            </div>
            <p className="text-xs text-neutral-500">
              <span className="font-bold text-neutral-800">{activeStudentAnswers.studentName}</span> • Kelas {activeStudentAnswers.className || selectedExam?.className} • NISN: {activeStudentAnswers.nisn || '-'}
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <Button
              variant="outline"
              size="md"
              onClick={() => setActiveStudentAnswers(null)}
              className="cursor-pointer text-xs font-semibold"
            >
              Kembali
            </Button>
            <Button
              variant="primary"
              size="md"
              disabled={savingGrade}
              onClick={handleSaveEssayScore}
              className="font-bold cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 shadow-xs"
            >
              <AppIcon name="tick" color="white" size={14} />
              <span>{savingGrade ? 'Menyimpan...' : 'Simpan Koreksi & Nilai'}</span>
            </Button>
          </div>
        </div>

        {/* KPI Stats Cards Siswa */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          <div className="p-4 bg-white rounded-xl border border-neutral-200 space-y-1">
            <p className="text-[11px] font-semibold text-neutral-500">Mata Pelajaran</p>
            <p className="text-base font-bold text-neutral-900 truncate">{selectedExam?.subject || selectedExam?.title}</p>
            <p className="text-[10px] text-neutral-400">Target: Kelas {selectedExam?.className || '-'}</p>
          </div>
          <div className="p-4 bg-white rounded-xl border border-neutral-200 space-y-1">
            <p className="text-[11px] font-semibold text-neutral-500">Status Sesi</p>
            <p className="text-base font-bold text-emerald-700">
              {activeStudentAnswers.status === 'SUBMITTED' ? 'Sudah Selesai' : 'Sedang Ujian'}
            </p>
            <p className="text-[10px] text-neutral-400">
              Pelanggaran: {((activeStudentAnswers.violations || []).filter((v) => isActualCheatingViolation(v.type)).length) || activeStudentAnswers.violationsCount || 0}x
            </p>
          </div>
          <div className="p-4 bg-white rounded-xl border border-neutral-200 space-y-1">
            <p className="text-[11px] font-semibold text-neutral-500">Jawaban Objektif Benar</p>
            <p className="text-base font-bold text-primary-700">{autoCorrectCount} / {autoTotalCount} Butir</p>
            <p className="text-[10px] text-neutral-400">PG, PGK, B/S, Jodoh</p>
          </div>
          <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-200 space-y-1">
            <p className="text-[11px] font-semibold text-emerald-800">Skor Akhir Siswa</p>
            <p className="text-xl font-black text-emerald-700">{finalScore} / 100</p>
            <p className="text-[10px] text-emerald-800 font-medium">{totalEarned} dari {totalMax} total poin</p>
          </div>
        </div>

        {/* Daftar Butir Soal & Jawaban Siswa */}
        {examQuestions.length === 0 ? (
          <div className="py-20 text-center space-y-3 bg-white rounded-xl border border-neutral-200">
            <div className="w-10 h-10 border-3 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-semibold text-neutral-600">Memuat lembar soal dan jawaban siswa...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {examQuestions.map((q, idx) => {
              const qType = normalizeQuestionType(q);
              const qPoints = Number(q.points) > 0 ? Number(q.points) : 10;
              const ans = resolveStudentAnswer(q, idx, studentAnswers);

              // Tipe Spesifik Data
              let typeBadgeClass = 'bg-neutral-100 text-neutral-700';
              let typeLabel = 'Soal';
              if (qType === 'MCQ') {
                typeBadgeClass = 'bg-blue-50 text-blue-700 border border-blue-200';
                typeLabel = 'Pilihan Ganda';
              } else if (qType === 'COMPLEX_MCQ') {
                typeBadgeClass = 'bg-sky-50 text-sky-700 border border-sky-200';
                typeLabel = 'Pilihan Ganda Kompleks';
              } else if (qType === 'TRUE_FALSE') {
                typeBadgeClass = 'bg-teal-50 text-teal-700 border border-teal-200';
                typeLabel = 'Benar / Salah';
              } else if (qType === 'MATCHING') {
                typeBadgeClass = 'bg-amber-50 text-amber-800 border border-amber-200';
                typeLabel = 'Menjodohkan / Pencocokan';
              } else if (qType === 'ESSAY') {
                typeBadgeClass = 'bg-purple-50 text-purple-700 border border-purple-200';
                typeLabel = 'Uraian / Esai';
              }

              // Periksa status jawaban untuk masing-masing tipe
              let statusBadge = null;

              if (qType === 'MCQ') {
                const studentOption = typeof ans === 'string' ? ans : (ans?.selectedOption || ans?.selected_option || '');
                const correctOption = q.correctOption || q.correct_option || 'A';
                const isAnswered = Boolean(studentOption && studentOption.trim());
                const isCorrect = isAnswered && studentOption.trim().toUpperCase() === correctOption.trim().toUpperCase();

                if (!isAnswered) {
                  statusBadge = (
                    <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-neutral-100 text-neutral-500 border border-neutral-200">
                      Tidak Dijawab
                    </span>
                  );
                } else if (isCorrect) {
                  statusBadge = (
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 inline-flex items-center gap-1">
                      <AppIcon name="tick" color="green" size={11} />
                      <span>BENAR (+{qPoints} Poin)</span>
                    </span>
                  );
                } else {
                  statusBadge = (
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-danger-100 text-danger-800 border border-danger-300 inline-flex items-center gap-1">
                      <AppIcon name="close-cancel" color="red" size={11} />
                      <span>SALAH (0 Poin)</span>
                    </span>
                  );
                }
              } else if (qType === 'COMPLEX_MCQ') {
                let studentOpts = [];
                if (Array.isArray(ans?.selectedOptions)) {
                  studentOpts = ans.selectedOptions;
                } else if (typeof ans?.selectedOption === 'string' && ans.selectedOption) {
                  studentOpts = ans.selectedOption.split(',').map((s) => s.trim());
                } else if (typeof ans === 'string' && ans) {
                  studentOpts = ans.split(',').map((s) => s.trim());
                }
                const correctOpts = Array.isArray(q.correctOptions) && q.correctOptions.length > 0
                  ? q.correctOptions
                  : (q.correctOption ? [q.correctOption] : ['A']);
                const sSorted = [...studentOpts].filter(Boolean).map((s) => s.toUpperCase()).sort().join(',');
                const cSorted = [...correctOpts].filter(Boolean).map((s) => s.toUpperCase()).sort().join(',');
                const isAnswered = studentOpts.length > 0;
                const isCorrect = isAnswered && sSorted === cSorted;

                if (!isAnswered) {
                  statusBadge = (
                    <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-neutral-100 text-neutral-500 border border-neutral-200">
                      Tidak Dijawab
                    </span>
                  );
                } else if (isCorrect) {
                  statusBadge = (
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 inline-flex items-center gap-1">
                      <AppIcon name="tick" color="green" size={11} />
                      <span>BENAR (+{qPoints} Poin)</span>
                    </span>
                  );
                } else {
                  statusBadge = (
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-danger-100 text-danger-800 border border-danger-300 inline-flex items-center gap-1">
                      <AppIcon name="close-cancel" color="red" size={11} />
                      <span>SALAH (Kunci: {correctOpts.join(', ')})</span>
                    </span>
                  );
                }
              } else if (qType === 'TRUE_FALSE') {
                const rawStudent = ans?.selectedOption ?? (ans?.trueFalseAnswer !== undefined ? (ans.trueFalseAnswer ? 'TRUE' : 'FALSE') : (typeof ans === 'string' ? ans : ''));
                const sNorm = String(rawStudent || '').trim().toUpperCase();
                const isStudentTrue = sNorm === 'TRUE' || sNorm === 'BENAR' || sNorm === 'T' || rawStudent === true;
                const isStudentFalse = sNorm === 'FALSE' || sNorm === 'SALAH' || sNorm === 'F' || rawStudent === false;
                const isAnswered = isStudentTrue || isStudentFalse;

                const rawCorrect = q.trueFalseAnswer !== undefined ? (q.trueFalseAnswer ? 'TRUE' : 'FALSE') : (q.correctOption || 'TRUE');
                const cNorm = String(rawCorrect || '').trim().toUpperCase();
                const isCorrectTrue = cNorm === 'TRUE' || cNorm === 'BENAR' || cNorm === 'T' || q.trueFalseAnswer === true;

                const isCorrect = isAnswered && ((isStudentTrue && isCorrectTrue) || (isStudentFalse && !isCorrectTrue));

                if (!isAnswered) {
                  statusBadge = (
                    <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-neutral-100 text-neutral-500 border border-neutral-200">
                      Tidak Dijawab
                    </span>
                  );
                } else if (isCorrect) {
                  statusBadge = (
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 inline-flex items-center gap-1">
                      <AppIcon name="tick" color="green" size={11} />
                      <span>BENAR (+{qPoints} Poin)</span>
                    </span>
                  );
                } else {
                  statusBadge = (
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-danger-100 text-danger-800 border border-danger-300 inline-flex items-center gap-1">
                      <AppIcon name="close-cancel" color="red" size={11} />
                      <span>SALAH (Kunci: {isCorrectTrue ? 'Benar' : 'Salah'})</span>
                    </span>
                  );
                }
              } else if (qType === 'MATCHING') {
                let matchingAns = ans?.matchingAnswers;
                if (!matchingAns && typeof ans?.selectedOption === 'string' && ans.selectedOption.startsWith('{')) {
                  try { matchingAns = JSON.parse(ans.selectedOption); } catch (_) {}
                }
                if (!matchingAns && typeof ans === 'string' && ans.startsWith('{')) {
                  try { matchingAns = JSON.parse(ans); } catch (_) {}
                }
                matchingAns = matchingAns || {};
                const pairs = Array.isArray(q.matchingPairs) ? q.matchingPairs : [];
                let matchedCorrect = 0;
                pairs.forEach((p) => {
                  const studentVal = matchingAns[p.id] ?? matchingAns[String(p.id)] ?? '';
                  if (studentVal && studentVal.trim().toLowerCase() === (p.right || '').trim().toLowerCase()) {
                    matchedCorrect++;
                  }
                });
                const earnedPoints = pairs.length > 0 ? Math.round((matchedCorrect / pairs.length) * qPoints) : 0;

                statusBadge = (
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                    earnedPoints === qPoints
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : earnedPoints > 0
                      ? 'bg-amber-100 text-amber-800 border-amber-300'
                      : 'bg-danger-100 text-danger-800 border-danger-300'
                  } border inline-flex items-center gap-1`}>
                    <span>+{earnedPoints} / {qPoints} Poin ({matchedCorrect}/{pairs.length} Cocok)</span>
                  </span>
                );
              } else if (qType === 'ESSAY') {
                const currentScore = essayScores[q.id];
                const isScored = currentScore !== undefined && currentScore !== '' && currentScore !== null;
                statusBadge = (
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                    isScored ? 'bg-purple-100 text-purple-800 border-purple-300' : 'bg-amber-100 text-amber-800 border-amber-300'
                  } border`}>
                    {isScored ? `Telah Dinilai (${currentScore}/${qPoints} Poin)` : 'Menunggu Penilaian Guru'}
                  </span>
                );
              }

              return (
                <div
                  key={q.id || idx}
                  className="p-5 rounded-xl border border-neutral-200 bg-white shadow-2xs space-y-4"
                >
                  {/* Header Soal */}
                  <div className="flex items-center justify-between pb-3 border-b border-neutral-100 flex-wrap gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded-md font-bold text-xs bg-neutral-900 text-white">
                        Soal #{idx + 1}
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold ${typeBadgeClass}`}>
                        {typeLabel}
                      </span>
                      <span className="text-xs font-semibold text-neutral-500">
                        (Bobot: {qPoints} Poin)
                      </span>
                    </div>

                    <div>{statusBadge}</div>
                  </div>

                  {/* Stimulus Kasus (jika ada) */}
                  {q.stimulusText && (
                    <div className="p-3.5 rounded-lg bg-amber-50/70 border border-amber-200 text-amber-950 text-xs sm:text-sm whitespace-pre-wrap leading-relaxed">
                      <strong className="flex items-center gap-1.5 text-amber-900 mb-1 font-bold">
                        <AppIcon name="file" color="yellow" size={14} />
                        <span>Wacana / Stimulus:</span>
                      </strong>
                      {q.stimulusText}
                    </div>
                  )}

                  {/* Gambar Soal (jika ada) */}
                  {q.imageUrl && (
                    <div className="p-3 rounded-lg bg-neutral-50 border border-neutral-200 flex justify-center">
                      <img
                        src={q.imageUrl}
                        alt={`Gambar Soal #${idx + 1}`}
                        className="max-h-56 w-auto rounded object-contain"
                      />
                    </div>
                  )}

                  {/* Teks Pertanyaan */}
                  <div className="text-sm sm:text-base font-semibold text-neutral-900 leading-relaxed whitespace-pre-wrap">
                    {q.questionText}
                  </div>

                  {/* KONTEN TIPE 1: PILIHAN GANDA (MCQ) */}
                  {qType === 'MCQ' && (
                    <div className="space-y-2 pt-1">
                      <div className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">
                        Pilihan Jawaban & Hasil:
                      </div>
                      <div className="grid grid-cols-1 gap-2">
                        {q.options?.map((opt) => {
                          const studentOption = typeof ans === 'string' ? ans : (ans?.selectedOption || ans?.selected_option || '');
                          const correctOption = q.correctOption || q.correct_option || 'A';
                          const isStudentPick = studentOption.trim().toUpperCase() === opt.key.toUpperCase();
                          const isKey = correctOption.trim().toUpperCase() === opt.key.toUpperCase();

                          let cardStyle = 'bg-neutral-50/60 border-neutral-200 text-neutral-700';
                          if (isKey) {
                            cardStyle = 'bg-emerald-50/80 border-emerald-400 text-emerald-950 font-medium ring-1 ring-emerald-400';
                          } else if (isStudentPick && !isKey) {
                            cardStyle = 'bg-danger-50/80 border-danger-400 text-danger-950 font-medium';
                          }

                          return (
                            <div
                              key={opt.key}
                              className={`p-3 rounded-lg border text-xs sm:text-sm flex items-center justify-between gap-3 ${cardStyle}`}
                            >
                              <div className="flex items-center gap-2.5">
                                <span
                                  className={`w-7 h-7 rounded-md flex items-center justify-center font-bold text-xs shrink-0 ${
                                    isStudentPick
                                      ? isKey
                                        ? 'bg-emerald-600 text-white'
                                        : 'bg-danger-600 text-white'
                                      : isKey
                                      ? 'bg-emerald-200 text-emerald-800'
                                      : 'bg-neutral-200 text-neutral-700'
                                  }`}
                                >
                                  {opt.key}
                                </span>
                                <span className="leading-snug">{opt.text}</span>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                {isStudentPick && (
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    isKey ? 'bg-emerald-700 text-white' : 'bg-danger-700 text-white'
                                  }`}>
                                    {isKey ? 'Pilihan Siswa (Benar)' : 'Pilihan Siswa (Salah)'}
                                  </span>
                                )}
                                {isKey && !isStudentPick && (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-700 text-white inline-flex items-center gap-1">
                                    <AppIcon name="tick" color="white" size={10} />
                                    <span>Kunci Jawaban</span>
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* KONTEN TIPE 2: PILIHAN GANDA KOMPLEKS (COMPLEX_MCQ) */}
                  {qType === 'COMPLEX_MCQ' && (
                    <div className="space-y-2.5 pt-1">
                      {(() => {
                        let studentOpts = [];
                        if (Array.isArray(ans?.selectedOptions)) {
                          studentOpts = ans.selectedOptions;
                        } else if (typeof ans?.selectedOption === 'string' && ans.selectedOption) {
                          studentOpts = ans.selectedOption.split(',').map((s) => s.trim());
                        } else if (typeof ans === 'string' && ans) {
                          studentOpts = ans.split(',').map((s) => s.trim());
                        }
                        const correctOpts = Array.isArray(q.correctOptions) && q.correctOptions.length > 0
                          ? q.correctOptions
                          : (q.correctOption ? [q.correctOption] : ['A']);

                        return (
                          <>
                            <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
                              <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">
                                Opsi Jawaban (Multi-Pilihan):
                              </span>
                              <div className="text-[11px] text-neutral-600">
                                Kunci Benar: <strong className="text-emerald-700 font-bold">{correctOpts.join(', ')}</strong> | Dipilih Siswa: <strong className="text-primary-700 font-bold">{studentOpts.length > 0 ? studentOpts.join(', ') : '(Tidak Dijawab)'}</strong>
                              </div>
                            </div>
                            <div className="grid grid-cols-1 gap-2">
                              {q.options?.map((opt) => {
                                const isStudentPick = studentOpts.map((s) => s.toUpperCase()).includes(opt.key.toUpperCase());
                                const isKey = correctOpts.map((k) => k.toUpperCase()).includes(opt.key.toUpperCase());

                                let cardStyle = 'bg-neutral-50/60 border-neutral-200 text-neutral-700';
                                if (isKey) {
                                  cardStyle = 'bg-emerald-50/80 border-emerald-400 text-emerald-950 font-medium ring-1 ring-emerald-400';
                                } else if (isStudentPick && !isKey) {
                                  cardStyle = 'bg-danger-50/80 border-danger-400 text-danger-950 font-medium';
                                }

                                return (
                                  <div
                                    key={opt.key}
                                    className={`p-3 rounded-lg border text-xs sm:text-sm flex items-center justify-between gap-3 ${cardStyle}`}
                                  >
                                    <div className="flex items-center gap-2.5">
                                      <div
                                        className={`w-6 h-6 rounded flex items-center justify-center font-bold text-xs border shrink-0 ${
                                          isStudentPick
                                            ? 'bg-primary-600 border-primary-700 text-white'
                                            : 'bg-white border-neutral-300 text-neutral-400'
                                        }`}
                                      >
                                        {isStudentPick ? '✓' : ''}
                                      </div>
                                      <span className="font-bold text-neutral-800 shrink-0">{opt.key}.</span>
                                      <span className="leading-snug">{opt.text}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                      {isStudentPick && (
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                          isKey ? 'bg-emerald-700 text-white' : 'bg-danger-700 text-white'
                                        }`}>
                                          {isKey ? 'Dipilih Siswa (Benar)' : 'Dipilih Siswa (Salah)'}
                                        </span>
                                      )}
                                      {isKey && !isStudentPick && (
                                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-700 text-white inline-flex items-center gap-1">
                                          <AppIcon name="tick" color="white" size={10} />
                                          <span>Kunci Benar</span>
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  )}

                  {/* KONTEN TIPE 3: BENAR / SALAH (TRUE_FALSE) */}
                  {qType === 'TRUE_FALSE' && (
                    <div className="space-y-2.5 pt-1">
                      {(() => {
                        const rawStudent = ans?.selectedOption ?? (ans?.trueFalseAnswer !== undefined ? (ans.trueFalseAnswer ? 'TRUE' : 'FALSE') : (typeof ans === 'string' ? ans : ''));
                        const sNorm = String(rawStudent || '').trim().toUpperCase();
                        const isStudentTrue = sNorm === 'TRUE' || sNorm === 'BENAR' || sNorm === 'T' || rawStudent === true;
                        const isStudentFalse = sNorm === 'FALSE' || sNorm === 'SALAH' || sNorm === 'F' || rawStudent === false;

                        const rawCorrect = q.trueFalseAnswer !== undefined ? (q.trueFalseAnswer ? 'TRUE' : 'FALSE') : (q.correctOption || 'TRUE');
                        const cNorm = String(rawCorrect || '').trim().toUpperCase();
                        const isCorrectTrue = cNorm === 'TRUE' || cNorm === 'BENAR' || cNorm === 'T' || q.trueFalseAnswer === true;

                        return (
                          <>
                            <div className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">
                              Pernyataan Benar atau Salah:
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {/* Option BENAR */}
                              <div className={`p-4 rounded-xl border flex items-center justify-between gap-3 ${
                                isCorrectTrue
                                  ? 'bg-emerald-50 border-emerald-400 text-emerald-950 ring-1 ring-emerald-400'
                                  : isStudentTrue
                                  ? 'bg-danger-50 border-danger-400 text-danger-950'
                                  : 'bg-neutral-50 border-neutral-200 text-neutral-700'
                              }`}>
                                <div className="flex items-center gap-2.5">
                                  <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                                    isStudentTrue
                                      ? isCorrectTrue ? 'bg-emerald-600 text-white' : 'bg-danger-600 text-white'
                                      : isCorrectTrue ? 'bg-emerald-200 text-emerald-900' : 'bg-neutral-200 text-neutral-700'
                                  }`}>
                                    B
                                  </span>
                                  <div>
                                    <p className="font-bold text-sm">BENAR</p>
                                    <p className="text-[11px] text-neutral-500">Pernyataan bernilai benar</p>
                                  </div>
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                  {isStudentTrue && (
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                      isCorrectTrue ? 'bg-emerald-700 text-white' : 'bg-danger-700 text-white'
                                    }`}>
                                      {isCorrectTrue ? 'Pilihan Siswa (Benar)' : 'Pilihan Siswa (Salah)'}
                                    </span>
                                  )}
                                  {isCorrectTrue && !isStudentTrue && (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-700 text-white inline-flex items-center gap-1">
                                      <AppIcon name="tick" color="white" size={10} />
                                      <span>Kunci Benar</span>
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Option SALAH */}
                              <div className={`p-4 rounded-xl border flex items-center justify-between gap-3 ${
                                !isCorrectTrue
                                  ? 'bg-emerald-50 border-emerald-400 text-emerald-950 ring-1 ring-emerald-400'
                                  : isStudentFalse
                                  ? 'bg-danger-50 border-danger-400 text-danger-950'
                                  : 'bg-neutral-50 border-neutral-200 text-neutral-700'
                              }`}>
                                <div className="flex items-center gap-2.5">
                                  <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                                    isStudentFalse
                                      ? !isCorrectTrue ? 'bg-emerald-600 text-white' : 'bg-danger-600 text-white'
                                      : !isCorrectTrue ? 'bg-emerald-200 text-emerald-900' : 'bg-neutral-200 text-neutral-700'
                                  }`}>
                                    S
                                  </span>
                                  <div>
                                    <p className="font-bold text-sm">SALAH</p>
                                    <p className="text-[11px] text-neutral-500">Pernyataan bernilai salah</p>
                                  </div>
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                  {isStudentFalse && (
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                      !isCorrectTrue ? 'bg-emerald-700 text-white' : 'bg-danger-700 text-white'
                                    }`}>
                                      {!isCorrectTrue ? 'Pilihan Siswa (Benar)' : 'Pilihan Siswa (Salah)'}
                                    </span>
                                  )}
                                  {!isCorrectTrue && !isStudentFalse && (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-700 text-white inline-flex items-center gap-1">
                                      <AppIcon name="tick" color="white" size={10} />
                                      <span>Kunci Benar</span>
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  )}

                  {/* KONTEN TIPE 4: MENJODOHKAN / PENCOCOKAN (MATCHING) */}
                  {qType === 'MATCHING' && (
                    <div className="space-y-2.5 pt-1">
                      {(() => {
                        let matchingAns = ans?.matchingAnswers;
                        if (!matchingAns && typeof ans?.selectedOption === 'string' && ans.selectedOption.startsWith('{')) {
                          try { matchingAns = JSON.parse(ans.selectedOption); } catch (_) {}
                        }
                        if (!matchingAns && typeof ans === 'string' && ans.startsWith('{')) {
                          try { matchingAns = JSON.parse(ans); } catch (_) {}
                        }
                        matchingAns = matchingAns || {};
                        const pairs = Array.isArray(q.matchingPairs) ? q.matchingPairs : [];

                        return (
                          <>
                            <div className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">
                              Pasangan Menjodohkan / Pencocokan:
                            </div>
                            <div className="overflow-x-auto rounded-lg border border-neutral-200">
                              <table className="w-full text-xs text-left">
                                <thead className="bg-neutral-50 text-neutral-700 font-bold border-b border-neutral-200">
                                  <tr>
                                    <th className="py-2.5 px-3 w-10 text-center">#</th>
                                    <th className="py-2.5 px-3">Premis / Pernyataan (Kiri)</th>
                                    <th className="py-2.5 px-3">Jawaban Dipilih Siswa</th>
                                    <th className="py-2.5 px-3">Kunci Pasangan Seharusnya</th>
                                    <th className="py-2.5 px-3 w-28 text-center">Status</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-neutral-200 bg-white">
                                  {pairs.map((p, pIdx) => {
                                    const studentVal = matchingAns[p.id] ?? matchingAns[String(p.id)] ?? '';
                                    const matchOk = Boolean(studentVal && studentVal.trim().toLowerCase() === (p.right || '').trim().toLowerCase());

                                    return (
                                      <tr key={p.id || pIdx} className={matchOk ? 'bg-emerald-50/40' : 'bg-danger-50/30'}>
                                        <td className="py-2.5 px-3 text-center font-bold text-neutral-500">{pIdx + 1}</td>
                                        <td className="py-2.5 px-3 font-semibold text-neutral-900">{p.left}</td>
                                        <td className="py-2.5 px-3">
                                          {studentVal ? (
                                            <span className={`font-semibold ${matchOk ? 'text-emerald-900' : 'text-danger-900'}`}>
                                              {studentVal}
                                            </span>
                                          ) : (
                                            <span className="text-neutral-400 italic">(Tidak Dijawab)</span>
                                          )}
                                        </td>
                                        <td className="py-2.5 px-3 font-semibold text-emerald-800">{p.right}</td>
                                        <td className="py-2.5 px-3 text-center">
                                          {matchOk ? (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                              <AppIcon name="tick" color="green" size={10} />
                                              <span>Cocok</span>
                                            </span>
                                          ) : (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-danger-100 text-danger-800 border border-danger-300">
                                              <AppIcon name="close-cancel" color="red" size={10} />
                                              <span>Tidak Cocok</span>
                                            </span>
                                          )}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  )}

                  {/* KONTEN TIPE 5: URAIAN / ESAI (ESSAY) */}
                  {qType === 'ESSAY' && (
                    <div className="space-y-3.5 pt-1">
                      {(() => {
                        const essayText = typeof ans === 'string'
                          ? ans
                          : (ans?.essayAnswer || ans?.essay_answer || ans?.text || ans?.answer || ans?.content || '');

                        return (
                          <>
                            <div className="space-y-1.5">
                              <label className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
                                <AppIcon name="edit" color="purple" size={14} />
                                <span>Lembar Jawaban Teks Siswa:</span>
                              </label>
                              <div className="p-4 rounded-xl bg-purple-50/60 border border-purple-200 text-xs sm:text-sm text-neutral-900 leading-relaxed font-sans whitespace-pre-wrap min-h-24">
                                {essayText && essayText.trim() ? (
                                  essayText.trim()
                                ) : (
                                  <span className="text-neutral-400 italic">
                                    (Siswa tidak/belum menuliskan jawaban untuk butir esai ini)
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Pedoman Acuan Koreksi Guru */}
                            {q.essayRubric && (
                              <div className="p-3 rounded-lg bg-neutral-50 border border-neutral-200 text-xs text-neutral-600 space-y-1">
                                <span className="font-bold text-neutral-700 flex items-center gap-1.5">
                                  <AppIcon name="document-book" color="grey" size={13} />
                                  <span>Pedoman / Kunci Acuan Koreksi Guru:</span>
                                </span>
                                <p className="whitespace-pre-wrap leading-relaxed">{q.essayRubric}</p>
                              </div>
                            )}

                            {/* Form Penilaian Skor Guru */}
                            <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                              <div>
                                <label className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                                  <AppIcon name="star" color="yellow" size={14} />
                                  <span>Beri Skor / Nilai Esai Ini:</span>
                                </label>
                                <p className="text-[11px] text-amber-800 mt-0.5">
                                  Maksimal bobot nilai: <strong>{qPoints} Poin</strong>. Nilai akhir di atas akan otomatis terkalkulasi.
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  min="0"
                                  max={qPoints}
                                  value={essayScores[q.id] !== undefined ? essayScores[q.id] : ''}
                                  onChange={(e) =>
                                    setEssayScores({
                                      ...essayScores,
                                      [q.id]: Math.min(qPoints, Math.max(0, Number(e.target.value))),
                                    })
                                  }
                                  placeholder="0"
                                  className="w-24 p-2 text-center text-sm font-bold rounded-xl border-2 border-amber-300 bg-white shadow-2xs focus:outline-hidden focus:ring-4 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
                                />
                                <span className="text-xs font-bold text-amber-950">/ {qPoints} Poin</span>
                              </div>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Sticky Action Footer */}
        <div className="sticky bottom-4 z-40 bg-neutral-900/95 backdrop-blur-md text-white p-4 rounded-xl shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-neutral-700 animate-in slide-in-from-bottom-2">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold text-lg">
              {finalScore}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold tracking-wide uppercase text-neutral-300">
                  Total Nilai Akhir:
                </span>
                <span className="text-sm font-extrabold text-emerald-400">
                  {finalScore} / 100
                </span>
              </div>
              <p className="text-[11px] text-neutral-400">
                Poin diperoleh: {totalEarned} dari {totalMax} total bobot soal
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="md"
              onClick={() => setActiveStudentAnswers(null)}
              className="cursor-pointer text-xs font-bold text-white border-neutral-600 hover:bg-neutral-800"
            >
              Kembali
            </Button>
            <Button
              variant="primary"
              size="md"
              disabled={savingGrade}
              onClick={handleSaveEssayScore}
              className="font-bold cursor-pointer bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 shadow-md"
            >
              <AppIcon name="tick" color="white" size={14} />
              <span>{savingGrade ? 'Menyimpan...' : 'Simpan Koreksi & Nilai Akhir'}</span>
            </Button>
          </div>
        </div>

        {notice && (
          <div className="fixed bottom-5 right-5 z-50 bg-neutral-900 text-white px-4 py-2.5 rounded-[8px] text-xs font-medium shadow-lg animate-in fade-in">
            {notice}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-[12px] border border-neutral-200">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 tracking-tight">
              Live Proctoring Pengawas CBT
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-[999px] text-[11px] font-bold bg-danger-50 text-danger-700 border border-danger-200">
              <span className="w-2 h-2 rounded-full bg-danger-500 animate-ping" />
              Live Anti-Cheat
            </span>
          </div>
          <p className="text-xs text-neutral-500">
            Audit aktivitas siswa secara real-time: deteksi tab switch, keluar fullscreen, dan otomatis kunci layar ujian jika melebihi toleransi.
          </p>
        </div>

        {/* Exam Selector */}
        <div className="w-full md:w-auto flex items-center gap-2 bg-neutral-50 p-2 rounded-[8px] border border-neutral-200 self-start md:self-center">
          <span className="text-xs font-bold text-neutral-700 whitespace-nowrap pl-1">
            Sesi Ujian:
          </span>
          <select
            value={selectedExamId}
            onChange={(e) => setSelectedExamId(e.target.value)}
            className="flex-1 md:flex-none text-xs font-semibold px-3 py-1.5 rounded-[6px] border border-neutral-300 bg-white text-neutral-900 shadow-2xs focus:outline-hidden focus:border-primary-500 min-w-0 md:max-w-[280px] truncate"
          >
            {exams.map((ex) => (
              <option key={ex.id} value={ex.id}>
                {ex.title} (Kelas {ex.className})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* Total Roster */}
        <Card noPadding className="p-4 bg-white border border-neutral-200 rounded-[12px] hover:border-neutral-300 transition-colors">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold text-neutral-500">Total Siswa Kelas</p>
            <AppIcon name="student" color="blue" size={18} />
          </div>
          <p className="text-2xl font-bold text-neutral-900 mt-1">{totalStudents}</p>
          <p className="text-[10px] text-neutral-500 mt-0.5">
            Kelas {selectedExam?.className || '-'} ({notStartedCount} belum mulai)
          </p>
        </Card>

        {/* In Progress */}
        <Card noPadding className="p-4 bg-white border border-secondary-200 rounded-[12px] hover:border-secondary-300 transition-colors">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold text-secondary-700">Sedang Mengerjakan</p>
            <span className="w-2 h-2 rounded-full bg-secondary-500 animate-pulse" />
          </div>
          <p className="text-2xl font-bold text-secondary-700 mt-1">{inProgressCount}</p>
          <p className="text-[10px] text-secondary-600 mt-0.5">Aktif di layar ujian CBT</p>
        </Card>

        {/* Screen Locked */}
        <Card noPadding className="p-4 bg-danger-50/50 border border-danger-200 rounded-[12px] hover:border-danger-300 transition-colors">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold text-danger-700">Layar Terkunci</p>
            <AppIcon name="lock" color="red" size={18} />
          </div>
          <p className="text-2xl font-bold text-danger-700 mt-1">{lockedCount}</p>
          <p className="text-[10px] text-danger-600 font-bold mt-0.5">Perlu buka kunci pengawas</p>
        </Card>

        {/* Completed */}
        <Card noPadding className="p-4 bg-white border border-success-200 rounded-[12px] hover:border-success-300 transition-colors">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold text-success-700">Telah Selesai</p>
            <AppIcon name="circle-tick" color="green" size={18} />
          </div>
          <p className="text-2xl font-bold text-success-700 mt-1">{submittedCount}</p>
          <p className="text-[10px] text-success-600 mt-0.5">Jawaban sudah dikirim</p>
        </Card>

        {/* Violations Count */}
        <Card noPadding className="p-4 bg-amber-50/50 border border-amber-200 rounded-[12px] col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold text-amber-800">Total Pelanggaran</p>
            <AppIcon name="caution" color="yellow" size={18} />
          </div>
          <p className="text-2xl font-bold text-amber-800 mt-1">{totalViolations}</p>
          <p className="text-[10px] text-amber-700 mt-0.5">
            {violatingList.length} siswa tercatat melanggar
          </p>
        </Card>
      </div>

      {/* Main Roster Table */}
      <Card noPadding className="overflow-hidden border border-neutral-200 bg-white rounded-[12px]">
        {/* Table Toolbar */}
        <div className="p-4 border-b border-neutral-100 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-neutral-50/60">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-success-500 animate-pulse" />
              <p className="text-xs font-bold text-neutral-800">
                Sinkron Otomatis (4s)
              </p>
            </div>
            <span className="text-neutral-300">|</span>
            <span className="text-xs font-mono font-bold text-primary-700 bg-primary-50 px-2 py-0.5 rounded border border-primary-200">
              Token: {selectedExam?.token || '-'}
            </span>
            <span className="text-neutral-300">|</span>
            <span className="text-xs text-neutral-600 font-medium">
              Toleransi: <strong>{selectedExam?.maxViolations || 3}x Pelanggaran</strong>
            </span>
          </div>

          <div className="w-full md:w-80">
            <input
              type="search"
              placeholder="Cari nama atau NISN siswa..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs px-3.5 py-2 rounded-xl border-2 border-slate-200 bg-white font-medium text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:border-[#4B3B78] focus:ring-4 focus:ring-[#4B3B78]/10 shadow-2xs transition-all"
            />
          </div>
        </div>

        {/* Filter Quick Tabs (Segmented Control Affordance) */}
        <div className="p-2.5 border-b border-slate-100 bg-slate-50/60 overflow-x-auto">
          <div className="inline-flex items-center gap-1.5 p-1 bg-slate-100/90 rounded-2xl border border-slate-200/90 shadow-2xs">
            {[
              { id: 'ALL', label: 'Semua Peserta', count: totalStudents },
              { id: 'VIOLATION', label: 'Melanggar', count: violatingList.length, highlight: violatingList.length > 0 },
              { id: 'LOCKED', label: 'Layar Terkunci', count: lockedCount, danger: lockedCount > 0 },
              { id: 'IN_PROGRESS', label: 'Sedang Ujian', count: inProgressCount },
              { id: 'SUBMITTED', label: 'Selesai', count: submittedCount },
              { id: 'NOT_STARTED', label: 'Belum Bergabung', count: notStartedCount },
            ].map((tab) => {
              const isActive = activeFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveFilter(tab.id)}
                  className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all cursor-pointer ${
                    isActive
                      ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
                      : tab.danger
                      ? 'text-rose-700 hover:bg-rose-50/80 hover:text-rose-800'
                      : tab.highlight
                      ? 'text-amber-800 hover:bg-amber-50/80 hover:text-amber-900'
                      : 'text-slate-600 hover:bg-white/60 hover:text-slate-900'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      isActive
                        ? 'bg-[#4B3B78] text-white'
                        : tab.danger
                        ? 'bg-rose-100 text-rose-700'
                        : tab.highlight
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-slate-200/80 text-slate-600'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* MOBILE & TABLET VIEW (< lg): Responsive Student Cards */}
        <div className="lg:hidden divide-y divide-neutral-100">
          {loading ? (
            <div className="py-8 text-center text-xs text-neutral-400">
              Memuat data sinkronisasi kelas...
            </div>
          ) : filteredRoster.length === 0 ? (
            <div className="py-8 text-center text-xs text-neutral-400">
              Tidak ada siswa yang sesuai dengan filter ini.
            </div>
          ) : (
            filteredRoster.map((s) => {
              const isLocked = s.status === 'LOCKED';
              const isSubmitted = s.status === 'SUBMITTED';
              const isNotStarted = s.status === 'NOT_STARTED';
              const violations = s.violations || [];
              const actualViolations = violations.filter((v) => isActualCheatingViolation(v.type));
              const lastViolation = actualViolations.length > 0
                ? actualViolations[actualViolations.length - 1]
                : (violations.length > 0 ? violations[violations.length - 1] : null);
              const realViolCount = actualViolations.length > 0
                ? actualViolations.length
                : (violations.length === 0 ? Number(s.violationsCount || 0) : 0);

              return (
                <div
                  key={s.sessionId || s.studentId}
                  className={`p-4 space-y-3 ${
                    isLocked ? 'bg-danger-50/40' : realViolCount > 0 ? 'bg-amber-50/20' : 'bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-[8px] flex items-center justify-center font-bold text-xs shrink-0 ${
                          isLocked
                            ? 'bg-danger-600 text-white'
                            : isSubmitted
                            ? 'bg-success-600 text-white'
                            : isNotStarted
                            ? 'bg-neutral-100 text-neutral-500'
                            : 'bg-primary-600 text-white'
                        }`}
                      >
                        {s.studentName.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-xs sm:text-sm text-neutral-900 truncate">
                          {s.studentName}
                        </p>
                        <p className="text-[11px] text-neutral-500 font-medium">
                          Kelas {s.className || selectedExam?.className || '-'} • <span className="font-mono">NISN: {s.nisn || '-'}</span>
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0">
                      {isLocked ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200 whitespace-nowrap">
                          <AppIcon name="lock" color="red" size={11} />
                          <span>TERKUNCI</span>
                        </span>
                      ) : isSubmitted ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          <span>SELESAI {s.score !== null && s.score !== undefined ? `(${s.score})` : ''}</span>
                        </span>
                      ) : isNotStarted ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-500 border border-slate-200 whitespace-nowrap">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                          <span>Belum Mulai</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200 whitespace-nowrap">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                          <span>MENGERJAKAN</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Violation info row */}
                  <div className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-200/70 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[11px] font-bold border shrink-0 ${
                          realViolCount >= (selectedExam?.maxViolations || 3)
                            ? 'bg-rose-600 text-white border-rose-700'
                            : realViolCount > 0
                            ? 'bg-amber-100 text-amber-900 border-amber-300'
                            : 'bg-slate-100 text-slate-500 border-slate-200'
                        }`}
                      >
                        Pelanggaran: {realViolCount}x
                      </span>
                      {lastViolation ? (
                        <span className="text-[11px] text-neutral-600 truncate">
                          {formatViolationTypeLabel(lastViolation.type)} ({new Date(lastViolation.timestamp).toLocaleTimeString('id-ID')} WIB)
                        </span>
                      ) : (
                        <span className="text-[11px] text-neutral-400">Tidak ada pelanggaran</span>
                      )}
                    </div>
                  </div>

                  {/* Actions row */}
                  {(s.status !== 'NOT_STARTED' || violations.length > 0 || isLocked) && (
                    <div className="flex flex-wrap items-center gap-2">
                      {s.status !== 'NOT_STARTED' && (
                        <Button
                          variant="primary"
                          size="xs"
                          onClick={() => handleOpenStudentAnswers(s)}
                          className="flex-1 font-bold cursor-pointer flex items-center justify-center gap-1.5 shadow-xs whitespace-nowrap"
                        >
                          <AppIcon name="edit" color="white" size={13} />
                          <span>Periksa Jawaban</span>
                        </Button>
                      )}
                      {violations.length > 0 && (
                        <Button
                          variant="outline"
                          size="xs"
                          onClick={() => setActiveStudentAudit(s)}
                          className="font-semibold cursor-pointer border-slate-300 hover:border-slate-400 hover:bg-slate-50 text-slate-700 shadow-2xs whitespace-nowrap"
                        >
                          Riwayat ({violations.length})
                        </Button>
                      )}
                      {isLocked && (
                        <Button
                          variant="accent"
                          size="xs"
                          onClick={() => handleUnlockStudent(s)}
                          className="font-bold cursor-pointer flex items-center justify-center gap-1.5 shadow-xs whitespace-nowrap"
                        >
                          <AppIcon name="unlock" color="grey" size={13} />
                          <span>Buka Kunci</span>
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* DESKTOP VIEW (>= lg): Table Content */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-neutral-50 text-neutral-500 font-bold border-b border-neutral-200 uppercase text-[10px] tracking-wider">
                <th className="py-3 px-4 whitespace-nowrap">Nama Siswa</th>
                <th className="py-3 px-4 whitespace-nowrap">Kelas</th>
                <th className="py-3 px-4 whitespace-nowrap">Status Sesi</th>
                <th className="py-3 px-4 text-center whitespace-nowrap">Pelanggaran</th>
                <th className="py-3 px-4 whitespace-nowrap">Log Pelanggaran Terakhir</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">Aksi Pengawas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-neutral-400">
                    Memuat data sinkronisasi kelas...
                  </td>
                </tr>
              ) : filteredRoster.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-neutral-400">
                    Tidak ada siswa yang sesuai dengan filter ini.
                  </td>
                </tr>
              ) : (
                filteredRoster.map((s) => {
                  const isLocked = s.status === 'LOCKED';
                  const isSubmitted = s.status === 'SUBMITTED';
                  const isNotStarted = s.status === 'NOT_STARTED';
                  const violations = s.violations || [];
                  const actualViolations = violations.filter((v) => isActualCheatingViolation(v.type));
                  const lastViolation = actualViolations.length > 0
                    ? actualViolations[actualViolations.length - 1]
                    : (violations.length > 0 ? violations[violations.length - 1] : null);
                  const realViolCount = actualViolations.length > 0
                    ? actualViolations.length
                    : (violations.length === 0 ? Number(s.violationsCount || 0) : 0);

                  return (
                    <tr
                      key={s.sessionId || s.studentId}
                      className={`hover:bg-neutral-50/80 transition-colors ${
                        isLocked ? 'bg-danger-50/40' : realViolCount > 0 ? 'bg-amber-50/20' : ''
                      }`}
                    >
                      <td className="py-3 px-4 font-semibold text-neutral-900">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-7 h-7 rounded-[8px] flex items-center justify-center font-bold text-xs shrink-0 ${
                              isLocked
                                ? 'bg-danger-600 text-white'
                                : isSubmitted
                                ? 'bg-success-600 text-white'
                                : isNotStarted
                                ? 'bg-neutral-100 text-neutral-500'
                                : 'bg-primary-600 text-white'
                            }`}
                          >
                            {s.studentName.charAt(0)}
                          </div>
                          <div className="space-y-0.5">
                            <p className="font-bold text-neutral-900 truncate max-w-[200px]">
                              {s.studentName}
                            </p>
                            <p className="text-[10px] text-neutral-400 font-mono">
                              NISN: {s.nisn || '-'}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-neutral-600 font-medium whitespace-nowrap">
                        Kelas {s.className || selectedExam?.className || '-'}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        {isLocked ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs select-none">
                            <AppIcon name="lock" color="red" size={12} />
                            <span>LAYAR TERKUNCI</span>
                          </span>
                        ) : isSubmitted ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs select-none">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            <span>SELESAI {s.score !== null && s.score !== undefined ? `(${s.score})` : ''}</span>
                          </span>
                        ) : isNotStarted ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-500 border border-slate-200 select-none">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                            <span>Belum Bergabung</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs select-none">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                            <span>MENGERJAKAN</span>
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex items-center justify-center min-w-7 h-6 px-2.5 rounded-full text-xs font-bold border ${
                            realViolCount >= (selectedExam?.maxViolations || 3)
                              ? 'bg-rose-600 text-white border-rose-700 shadow-xs animate-bounce'
                              : realViolCount > 0
                              ? 'bg-amber-100 text-amber-900 border-amber-300 shadow-2xs'
                              : 'bg-slate-100 text-slate-500 border-slate-200'
                          }`}
                        >
                          {realViolCount}x
                        </span>
                      </td>

                      <td className="py-3 px-4 text-neutral-600">
                        {lastViolation ? (
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] font-bold text-danger-700 bg-danger-100 px-1.5 py-0.5 rounded">
                                {formatViolationTypeLabel(lastViolation.type)}
                              </span>
                              <span className="text-[10px] text-neutral-400 font-mono">
                                {new Date(lastViolation.timestamp).toLocaleTimeString('id-ID')} WIB
                              </span>
                            </div>
                            <p className="text-[11px] text-neutral-700 line-clamp-1 max-w-[260px]" title={formatViolationDesc(lastViolation.description, lastViolation.type)}>
                              {formatViolationDesc(lastViolation.description, lastViolation.type)}
                            </p>
                          </div>
                        ) : (
                          <span className="text-neutral-400 text-[11px]">- Bersih -</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          {s.status !== 'NOT_STARTED' && (
                            <Button
                              variant="primary"
                              size="xs"
                              onClick={() => handleOpenStudentAnswers(s)}
                              className="font-bold cursor-pointer flex items-center gap-1.5 shadow-xs"
                              title="Periksa dan koreksi lembar jawaban siswa"
                            >
                              <AppIcon name="edit" color="white" size={13} />
                              <span>Periksa Jawaban</span>
                            </Button>
                          )}

                          {violations.length > 0 && (
                            <Button
                              variant="outline"
                              size="xs"
                              onClick={() => setActiveStudentAudit(s)}
                              className="font-semibold cursor-pointer border-slate-300 hover:border-slate-400 hover:bg-slate-50 text-slate-700 shadow-2xs"
                            >
                              Riwayat ({violations.length})
                            </Button>
                          )}

                          {isLocked && (
                            <Button
                              variant="accent"
                              size="xs"
                              onClick={() => handleUnlockStudent(s)}
                              className="font-bold cursor-pointer flex items-center gap-1.5 shadow-xs"
                            >
                              <AppIcon name="unlock" color="grey" size={13} />
                              <span>Buka Kunci</span>
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Audit Detail Modal */}
      <Modal
        isOpen={Boolean(activeStudentAudit)}
        onClose={() => setActiveStudentAudit(null)}
        title="Riwayat Audit Aktivitas & Pelanggaran Layar"
        subtitle={
          activeStudentAudit
            ? `${activeStudentAudit.studentName} (Kelas ${activeStudentAudit.className || selectedExam?.className})`
            : ''
        }
        size="md"
      >
        <div className="space-y-4">
          {(() => {
            const rawViolations = activeStudentAudit?.violations || [];
            const actualViolations = rawViolations.filter((v) => isActualCheatingViolation(v.type));
            const totalActual = actualViolations.length > 0 ? actualViolations.length : (rawViolations.length === 0 ? Number(activeStudentAudit?.violationsCount || 0) : 0);
            let violIndexCounter = 0;

            return (
              <>
                <div className={`p-3.5 rounded-xl border text-xs flex items-center justify-between ${
                  totalActual > 0
                    ? 'bg-danger-50 border-danger-200 text-danger-900'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                }`}>
                  <div className="space-y-0.5">
                    <span className="font-bold text-xs">Total Pelanggaran Siswa:</span>
                    <p className="text-[11px] text-neutral-500">
                      (Membuka tab baru, muncul notifikasi/keluar aplikasi, keluar fullscreen)
                    </p>
                  </div>
                  <span className={`font-black text-sm px-3 py-1 rounded-full shrink-0 ${
                    totalActual > 0 ? 'bg-danger-200 text-danger-900' : 'bg-emerald-200 text-emerald-900'
                  }`}>
                    {totalActual} Kali Kejadian
                  </span>
                </div>

                <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                  {rawViolations.length === 0 ? (
                    <div className="py-6 text-center text-xs text-neutral-400">
                      Belum ada catatan aktivitas atau pelanggaran untuk siswa ini.
                    </div>
                  ) : (
                    rawViolations.map((v, i) => {
                      const isCheating = isActualCheatingViolation(v.type);
                      const isUnlock = v.type === 'SUPERVISOR_UNLOCK';

                      let badgeClass = 'bg-neutral-100 text-neutral-700 border-neutral-200';
                      let cardClass = 'bg-neutral-50/70 border-neutral-200';
                      let tagLabel = 'Catatan Sistem';

                      if (isCheating) {
                        violIndexCounter++;
                        badgeClass = 'bg-danger-100 text-danger-800 border-danger-300';
                        cardClass = 'bg-danger-50/40 border-danger-200';
                        tagLabel = `Pelanggaran #${violIndexCounter}`;
                      } else if (isUnlock) {
                        badgeClass = 'bg-emerald-100 text-emerald-800 border-emerald-300';
                        cardClass = 'bg-emerald-50/50 border-emerald-200';
                        tagLabel = 'Tindakan Pengawas';
                      } else {
                        badgeClass = 'bg-amber-100 text-amber-800 border-amber-300';
                        cardClass = 'bg-amber-50/50 border-amber-200';
                        tagLabel = 'Status Sistem';
                      }

                      return (
                        <div
                          key={i}
                          className={`p-3.5 rounded-xl border space-y-1.5 text-xs ${cardClass}`}
                        >
                          <div className="flex items-center justify-between font-bold flex-wrap gap-1">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${badgeClass}`}>
                              {tagLabel}: {formatViolationTypeLabel(v.type)}
                            </span>
                            <span className="text-[10px] text-neutral-400 font-mono">
                              {new Date(v.timestamp).toLocaleTimeString('id-ID')} WIB
                            </span>
                          </div>
                          <p className="text-[11px] text-neutral-700 leading-relaxed pt-0.5">
                            {formatViolationDesc(v.description, v.type)}
                          </p>
                        </div>
                      );
                    })
                  )}
                </div>
              </>
            );
          })()}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100">
            {activeStudentAudit?.status === 'LOCKED' && (
              <Button
                variant="accent"
                size="sm"
                onClick={() => {
                  handleUnlockStudent(activeStudentAudit);
                  setActiveStudentAudit(null);
                }}
                className="font-bold cursor-pointer flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-neutral-900"
              >
                <AppIcon name="unlock" color="grey" size={14} />
                <span>Buka Kunci Layar Siswa</span>
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveStudentAudit(null)}
              className="cursor-pointer"
            >
              Tutup
            </Button>
          </div>
        </div>
      </Modal>

      {notice && (
        <div className="fixed bottom-5 right-5 z-50 bg-neutral-900 text-white px-4 py-2.5 rounded-[8px] text-xs font-medium shadow-lg animate-in fade-in">
          {notice}
        </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmModal
        {...confirmModal}
        onCancel={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
