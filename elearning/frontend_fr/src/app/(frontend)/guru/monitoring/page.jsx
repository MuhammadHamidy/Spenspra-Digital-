'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Card from '@/components/Card';
import Button from '@/components/Button';
import StatusBadge from '@/components/StatusBadge';
import Modal from '@/components/Modal';
import ConfirmModal from '@/components/ConfirmModal';
import { elearningApi } from '@/lib/elearningApi';
import { tokenStorage } from '@/lib/common/tokenStorage';

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

  const handleSaveEssayScore = async () => {
    if (!activeStudentAnswers) return;
    setSavingGrade(true);
    try {
      const sId = activeStudentAnswers.studentId || activeStudentAnswers.student_id;
      if (typeof window !== 'undefined' && selectedExamId && sId) {
        localStorage.setItem(`essay_grades_${selectedExamId}_${sId}`, JSON.stringify(essayScores));
      }

      let totalEarned = 0;
      let totalMaxPoints = 0;

      examQuestions.forEach((q) => {
        const qPoints = Number(q.points) > 0 ? Number(q.points) : 10;
        totalMaxPoints += qPoints;

        if (q.type === 'MCQ') {
          const ans = studentAnswers[q.id];
          if (ans && ans.selectedOption === q.correctOption) {
            totalEarned += qPoints;
          }
        } else if (q.type === 'ESSAY') {
          const essayScore = Number(essayScores[q.id]) || 0;
          totalEarned += essayScore;
        }
      });

      const finalScore = totalMaxPoints > 0 ? Math.round((totalEarned / totalMaxPoints) * 100) : 100;

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

      setNotice(`✓ Koreksi nilai akhir (${finalScore}) untuk ${activeStudentAnswers.studentName} berhasil disimpan!`);
      setTimeout(() => setNotice(null), 4000);
      loadProctoringData();
      setActiveStudentAnswers(null);
    } catch (err) {
      alert('Gagal menyimpan nilai: ' + err.message);
    } finally {
      setSavingGrade(false);
    }
  };

  const studentAnswers = useMemo(() => {
    if (!activeStudentAnswers) return {};
    let ans = activeStudentAnswers.answers;
    if (!ans || Object.keys(ans).length === 0) {
      const sId = activeStudentAnswers.studentId || activeStudentAnswers.student_id;
      if (typeof window !== 'undefined' && selectedExamId && sId) {
        try {
          const raw = localStorage.getItem(`exam_session_${selectedExamId}_${sId}`);
          if (raw) {
            const parsed = JSON.parse(raw);
            ans = parsed.answers || {};
          }
        } catch (_) {}
      }
    }
    return ans || {};
  }, [activeStudentAnswers, selectedExamId]);

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

        return {
          ...liveSession,
          sessionId: liveSession.sessionId || liveSession.id,
          studentId: stId || liveSession.studentId,
          nisn: st.nisn || liveSession.nisn || '-',
          studentName: st.fullName || st.full_name || liveSession.studentName,
          className: stClass,
          status: liveSession.status || 'IN_PROGRESS',
          violationsCount: Number(liveSession.violationsCount ?? liveSession.violation_count ?? 0),
          violations: liveSession.violations || [],
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
        return {
          sessionId: localSavedSession.id || `session-${stId}`,
          studentId: stId,
          studentName: st.fullName || st.full_name || st.name,
          nisn: st.nisn || '-',
          className: stClass,
          status: localSavedSession.status || 'SUBMITTED',
          score: localSavedSession.score,
          violationsCount: localSavedSession.violationsCount || 0,
          violations: localSavedSession.violations || [],
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
        roster.unshift({
          ...s,
          sessionId: sKey || `ses-${Date.now()}`,
          studentId: sId || 'std-active',
          nisn: s.nisn || s.student_nisn || '-',
          studentName: s.studentName || s.student_name || 'Siswa Peserta',
          className: s.className || s.class_code || selectedExam?.className || '-',
          status: s.status || 'IN_PROGRESS',
          score: s.score,
          violationsCount: Number(s.violationsCount ?? s.violation_count ?? 0),
          violations: s.violations || [],
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
        <div className="flex items-center gap-2 bg-neutral-50 p-2 rounded-[8px] border border-neutral-200 self-start md:self-center">
          <span className="text-xs font-bold text-neutral-700 whitespace-nowrap pl-1">
            Sesi Ujian:
          </span>
          <select
            value={selectedExamId}
            onChange={(e) => setSelectedExamId(e.target.value)}
            className="text-xs font-semibold px-3 py-1.5 rounded-[6px] border border-neutral-300 bg-white text-neutral-900 shadow-2xs focus:outline-hidden focus:border-primary-500 max-w-[280px] truncate"
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
            <span className="text-base">👥</span>
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
            <span className="text-base">🔒</span>
          </div>
          <p className="text-2xl font-bold text-danger-700 mt-1">{lockedCount}</p>
          <p className="text-[10px] text-danger-600 font-bold mt-0.5">Perlu buka kunci pengawas</p>
        </Card>

        {/* Completed */}
        <Card noPadding className="p-4 bg-white border border-success-200 rounded-[12px] hover:border-success-300 transition-colors">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold text-success-700">Telah Selesai</p>
            <span className="text-base">✓</span>
          </div>
          <p className="text-2xl font-bold text-success-700 mt-1">{submittedCount}</p>
          <p className="text-[10px] text-success-600 mt-0.5">Jawaban sudah dikirim</p>
        </Card>

        {/* Violations Count */}
        <Card noPadding className="p-4 bg-amber-50/50 border border-amber-200 rounded-[12px] col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold text-amber-800">Total Pelanggaran</p>
            <span className="text-base">⚠️</span>
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

          <div className="w-full md:w-72">
            <input
              type="search"
              placeholder="Cari nama atau NISN siswa..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-[8px] border border-neutral-300 bg-white focus:outline-hidden focus:border-primary-500"
            />
          </div>
        </div>

        {/* Filter Quick Tabs */}
        <div className="flex items-center gap-1 px-4 py-2 border-b border-neutral-100 overflow-x-auto text-xs bg-white">
          {[
            { id: 'ALL', label: `Semua Peserta (${totalStudents})` },
            { id: 'VIOLATION', label: `⚠️ Melanggar (${violatingList.length})`, highlight: violatingList.length > 0 },
            { id: 'LOCKED', label: `🔒 Layar Terkunci (${lockedCount})`, danger: lockedCount > 0 },
            { id: 'IN_PROGRESS', label: `Sedang Ujian (${inProgressCount})` },
            { id: 'SUBMITTED', label: `Selesai (${submittedCount})` },
            { id: 'NOT_STARTED', label: `Belum Bergabung (${notStartedCount})` },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveFilter(tab.id)}
              className={`px-3 py-1.5 rounded-[6px] font-bold text-xs whitespace-nowrap transition-all cursor-pointer ${
                activeFilter === tab.id
                  ? 'bg-neutral-900 text-white shadow-2xs'
                  : tab.danger
                  ? 'bg-danger-50 text-danger-700 hover:bg-danger-100'
                  : tab.highlight
                  ? 'bg-amber-50 text-amber-800 hover:bg-amber-100'
                  : 'bg-neutral-50 text-neutral-600 hover:bg-neutral-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-neutral-50 text-neutral-500 font-bold border-b border-neutral-200 uppercase text-[10px] tracking-wider">
                <th className="py-3 px-4">Nama Siswa</th>
                <th className="py-3 px-4">Kelas</th>
                <th className="py-3 px-4">Status Sesi</th>
                <th className="py-3 px-4 text-center">Pelanggaran</th>
                <th className="py-3 px-4">Log Pelanggaran Terakhir</th>
                <th className="py-3 px-4 text-right">Aksi Pengawas</th>
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
                  const lastViolation = violations.length > 0 ? violations[violations.length - 1] : null;

                  return (
                    <tr
                      key={s.sessionId || s.studentId}
                      className={`hover:bg-neutral-50/80 transition-colors ${
                        isLocked ? 'bg-danger-50/40' : s.violationsCount > 0 ? 'bg-amber-50/20' : ''
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
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-[999px] text-[10px] font-bold bg-danger-100 text-danger-800 border border-danger-300">
                            🔒 LAYAR TERKUNCI
                          </span>
                        ) : isSubmitted ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-[999px] text-[10px] font-bold bg-success-100 text-success-800 border border-success-300">
                            ✓ SELESAI {s.score !== null && s.score !== undefined ? `(${s.score})` : ''}
                          </span>
                        ) : isNotStarted ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-[999px] text-[10px] font-semibold bg-neutral-100 text-neutral-500 border border-neutral-200">
                            ⏳ Belum Bergabung
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-[999px] text-[10px] font-bold bg-secondary-100 text-secondary-800 border border-secondary-300">
                            <span className="w-1.5 h-1.5 rounded-full bg-secondary-600 animate-pulse" />
                            MENGERJAKAN
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex items-center justify-center min-w-7 h-6 px-2 rounded-[999px] text-xs font-bold ${
                            s.violationsCount >= (selectedExam?.maxViolations || 3)
                              ? 'bg-danger-600 text-white animate-bounce'
                              : s.violationsCount > 0
                              ? 'bg-amber-100 text-amber-900 border border-amber-300'
                              : 'bg-neutral-100 text-neutral-500'
                          }`}
                        >
                          {s.violationsCount || 0}x
                        </span>
                      </td>

                      <td className="py-3 px-4 text-neutral-600">
                        {lastViolation ? (
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] font-bold text-danger-700 bg-danger-100 px-1 rounded">
                                {lastViolation.type}
                              </span>
                              <span className="text-[10px] text-neutral-400 font-mono">
                                {new Date(lastViolation.timestamp).toLocaleTimeString('id-ID')} WIB
                              </span>
                            </div>
                            <p className="text-[11px] text-neutral-700 line-clamp-1 max-w-[220px]">
                              {lastViolation.description}
                            </p>
                          </div>
                        ) : (
                          <span className="text-neutral-400 text-[11px]">- Bersih -</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {s.status !== 'NOT_STARTED' && (
                            <Button
                              variant="outline"
                              size="xs"
                              onClick={() => handleOpenStudentAnswers(s)}
                              className="font-bold cursor-pointer text-primary-700 bg-primary-50/70 hover:bg-primary-100 border-primary-200"
                              title="Periksa dan koreksi lembar jawaban siswa"
                            >
                              📝 Periksa Jawaban
                            </Button>
                          )}

                          {violations.length > 0 && (
                            <Button
                              variant="outline"
                              size="xs"
                              onClick={() => setActiveStudentAudit(s)}
                              className="cursor-pointer"
                            >
                              Riwayat ({violations.length})
                            </Button>
                          )}

                          {isLocked && (
                            <Button
                              variant="accent"
                              size="xs"
                              onClick={() => handleUnlockStudent(s)}
                              className="font-bold cursor-pointer bg-amber-500 hover:bg-amber-600 text-neutral-900"
                            >
                              🔓 Buka Kunci
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
        title="Riwayat Audit Pelanggaran Anti-Cheat"
        subtitle={
          activeStudentAudit
            ? `${activeStudentAudit.studentName} (Kelas ${activeStudentAudit.className || selectedExam?.className})`
            : ''
        }
        size="md"
      >
        <div className="space-y-4">
          <div className="p-3 rounded-[8px] bg-danger-50 border border-danger-200 text-xs flex items-center justify-between">
            <span className="font-medium text-danger-900">Total Pelanggaran Terdeteksi:</span>
            <span className="font-bold text-danger-700 text-sm">
              {activeStudentAudit?.violations?.length || 0} Kali Kejadian
            </span>
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {activeStudentAudit?.violations?.map((v, i) => (
              <div
                key={i}
                className="p-3 rounded-[8px] border border-neutral-200 bg-neutral-50/70 space-y-1 text-xs"
              >
                <div className="flex items-center justify-between font-bold text-neutral-800">
                  <span className="text-[10px] text-danger-700 uppercase bg-danger-100 px-1.5 py-0.5 rounded">
                    Kejadian #{i + 1}: {v.type}
                  </span>
                  <span className="text-[10px] text-neutral-400 font-mono">
                    {new Date(v.timestamp).toLocaleTimeString('id-ID')} WIB
                  </span>
                </div>
                <p className="text-[11px] text-neutral-700 leading-relaxed pt-0.5">
                  {v.description}
                </p>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100">
            {activeStudentAudit?.status === 'LOCKED' && (
              <Button
                variant="accent"
                size="sm"
                onClick={() => {
                  handleUnlockStudent(activeStudentAudit);
                  setActiveStudentAudit(null);
                }}
                className="font-bold cursor-pointer"
              >
                🔓 Buka Kunci Layar Siswa
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

      {/* MODAL PERIKSA & KOREKSI JAWABAN SISWA */}
      <Modal
        isOpen={Boolean(activeStudentAnswers)}
        onClose={() => setActiveStudentAnswers(null)}
        title="Lembar Jawaban & Koreksi Siswa"
        subtitle={
          activeStudentAnswers
            ? `${activeStudentAnswers.studentName} • Kelas ${activeStudentAnswers.className || selectedExam?.className} • Status: ${
                activeStudentAnswers.status === 'SUBMITTED' ? '✓ Telah Selesai' : '⚡ Sedang Mengerjakan'
              }`
            : ''
        }
        size="lg"
      >
        <div className="space-y-5 max-h-[75vh] overflow-y-auto pr-1">
          {/* Info Card */}
          <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <p className="text-neutral-500">Mata Pelajaran:</p>
              <p className="font-bold text-neutral-900">{selectedExam?.subject}</p>
            </div>
            <div>
              <p className="text-neutral-500">Status Pengerjaan:</p>
              <p className="font-bold text-emerald-700">
                {activeStudentAnswers?.status === 'SUBMITTED' ? '✓ Sudah Selesai' : 'Sedang Ujian'}
              </p>
            </div>
            <div>
              <p className="text-neutral-500">Skor Sementara:</p>
              <p className="font-bold text-primary-700 text-sm">
                {activeStudentAnswers?.score !== null && activeStudentAnswers?.score !== undefined
                  ? `${activeStudentAnswers.score} / 100`
                  : 'Menunggu Koreksi Guru'}
              </p>
            </div>
            <div>
              <p className="text-neutral-500">Jumlah Soal:</p>
              <p className="font-bold text-neutral-900">{examQuestions.length} Butir Soal</p>
            </div>
          </div>

          {/* Daftar Butir Soal & Jawaban Siswa */}
          {examQuestions.length === 0 ? (
            <div className="py-8 text-center text-xs text-neutral-400">
              Memuat lembar soal dan jawaban siswa...
            </div>
          ) : (
            <div className="space-y-4">
              {examQuestions.map((q, idx) => {
                const ans = studentAnswers[q.id];
                const isMcq = q.type === 'MCQ';
                const isCorrect = isMcq && ans?.selectedOption === q.correctOption;

                return (
                  <div
                    key={q.id || idx}
                    className="p-4 rounded-xl border border-neutral-200 bg-white shadow-2xs space-y-3"
                  >
                    {/* Header Soal */}
                    <div className="flex items-center justify-between pb-2 border-b border-neutral-100 flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-md font-bold text-xs bg-neutral-900 text-white">
                          Soal #{idx + 1}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          isMcq ? 'bg-primary-100 text-primary-800' : 'bg-purple-100 text-purple-800'
                        }`}>
                          {isMcq ? 'Pilihan Ganda' : 'Uraian / Esai'}
                        </span>
                        <span className="text-[11px] font-semibold text-neutral-500">
                          (Bobot: {q.points || 10} Poin)
                        </span>
                      </div>

                      {isMcq && (
                        <div>
                          {ans?.selectedOption ? (
                            isCorrect ? (
                              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                ✓ BENAR (+{q.points || 10} Poin)
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-danger-100 text-danger-800 border border-danger-300">
                                ✕ SALAH (Kunci: {q.correctOption})
                              </span>
                            )
                          ) : (
                            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-neutral-100 text-neutral-500 border border-neutral-300">
                              Tidak Dijawab
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Stimulus Kasus (jika ada) */}
                    {q.stimulusText && (
                      <div className="p-3 rounded-lg bg-amber-50/70 border border-amber-200 text-amber-950 text-xs whitespace-pre-wrap leading-relaxed">
                        <strong className="block text-amber-900 mb-1">📑 Wacana / Stimulus:</strong>
                        {q.stimulusText}
                      </div>
                    )}

                    {/* Gambar Soal (jika ada) */}
                    {q.imageUrl && (
                      <div className="p-2 rounded-lg bg-neutral-50 border border-neutral-200 flex justify-center">
                        <img
                          src={q.imageUrl}
                          alt={`Gambar Soal #${idx + 1}`}
                          className="max-h-48 w-auto rounded object-contain"
                        />
                      </div>
                    )}

                    {/* Teks Pertanyaan */}
                    <div className="text-xs sm:text-sm font-semibold text-neutral-800 leading-relaxed whitespace-pre-wrap">
                      {q.questionText}
                    </div>

                    {/* Jika Soal Pilihan Ganda: Tampilkan Opsi & Jawaban Siswa */}
                    {isMcq && (
                      <div className="space-y-1.5 pt-1">
                        {q.options?.map((opt) => {
                          const isStudentPick = ans?.selectedOption === opt.key;
                          const isKey = q.correctOption === opt.key;

                          let optClass = 'bg-neutral-50 border-neutral-200 text-neutral-700';
                          if (isKey) {
                            optClass = 'bg-emerald-50 border-emerald-400 text-emerald-900 font-semibold ring-1 ring-emerald-400';
                          } else if (isStudentPick && !isKey) {
                            optClass = 'bg-danger-50 border-danger-400 text-danger-900 font-semibold';
                          }

                          return (
                            <div
                              key={opt.key}
                              className={`p-2.5 rounded-lg border text-xs flex items-center justify-between gap-2 ${optClass}`}
                            >
                              <div className="flex items-center gap-2">
                                <span className={`w-6 h-6 rounded flex items-center justify-center font-bold text-xs shrink-0 ${
                                  isStudentPick ? 'bg-primary-600 text-white' : 'bg-neutral-200 text-neutral-700'
                                }`}>
                                  {opt.key}
                                </span>
                                <span>{opt.text}</span>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                {isStudentPick && (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-primary-600 text-white">
                                    Pilihan Siswa
                                  </span>
                                )}
                                {isKey && (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-700 text-white">
                                    ✓ Kunci Benar
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Jika Soal Esai: Tampilkan Teks Jawaban Siswa & Form Koreksi Nilai Guru */}
                    {!isMcq && (
                      <div className="space-y-3 pt-1">
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
                            <span>✍️</span>
                            <span>Lembar Jawaban Siswa:</span>
                          </label>
                          <div className="p-3.5 rounded-xl bg-purple-50/70 border border-purple-200 text-xs sm:text-sm text-neutral-900 leading-relaxed font-sans whitespace-pre-wrap min-h-20">
                            {ans?.essayAnswer?.trim() ? (
                              ans.essayAnswer
                            ) : (
                              <span className="text-neutral-400 italic">
                                (Siswa tidak/belum menuliskan jawaban untuk butir esai ini)
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Pedoman Acuan Penilaian Guru */}
                        {q.essayRubric && (
                          <div className="p-2.5 rounded-lg bg-neutral-50 border border-neutral-200 text-xs text-neutral-600 space-y-0.5">
                            <span className="font-bold text-neutral-700">📖 Pedoman / Kunci Acuan Koreksi Guru:</span>
                            <p className="whitespace-pre-wrap">{q.essayRubric}</p>
                          </div>
                        )}

                        {/* Input Penilaian Guru untuk Esai Ini */}
                        <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div>
                            <label className="text-xs font-bold text-amber-950">
                              Beri Skor / Nilai Esai Ini:
                            </label>
                            <p className="text-[11px] text-amber-800">
                              Maksimal bobot nilai: <strong>{q.points || 10} Poin</strong>
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min="0"
                              max={q.points || 100}
                              value={essayScores[q.id] !== undefined ? essayScores[q.id] : ''}
                              onChange={(e) =>
                                setEssayScores({
                                  ...essayScores,
                                  [q.id]: Math.min(Number(q.points) || 100, Math.max(0, Number(e.target.value))),
                                })
                              }
                              placeholder="0"
                              className="w-20 p-2 text-center text-xs font-bold rounded-lg border border-amber-300 bg-white"
                            />
                            <span className="text-xs font-bold text-amber-900">/ {q.points || 10} Poin</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Action Footer Modal */}
          <div className="flex items-center justify-between pt-3 border-t border-neutral-200 gap-2">
            <Button
              variant="outline"
              size="md"
              onClick={() => setActiveStudentAnswers(null)}
              className="cursor-pointer"
            >
              Tutup
            </Button>

            <Button
              variant="primary"
              size="md"
              disabled={savingGrade}
              onClick={handleSaveEssayScore}
              className="font-bold cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {savingGrade ? 'Menyimpan Nilai...' : '💾 Simpan Koreksi & Nilai Akhir'}
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
