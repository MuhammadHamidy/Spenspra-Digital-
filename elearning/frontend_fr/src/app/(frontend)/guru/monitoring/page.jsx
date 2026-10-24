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

  // Merge official class roster with live student sessions
  const mergedRoster = useMemo(() => {
    const safeSessions = Array.isArray(sessions) ? sessions : [];

    if (classStudents.length === 0) {
      return safeSessions;
    }

    return classStudents.map((st) => {
      const stId = String(st.id || st.nisn || '');
      const stNisn = String(st.nisn || '');
      const stName = st.fullName || st.full_name || st.name || 'Siswa';
      const stClass = st.className || st.class_name || selectedExam?.className || '-';

      // Find active live session by ID, NISN, or Name
      const liveSession = safeSessions.find((s) => {
        const sId = String(s.studentId || s.student_id || '');
        const sNisn = String(s.nisn || s.student_nisn || '');
        const sName = String(s.studentName || s.student_name || '').trim().toLowerCase();
        const targetName = stName.trim().toLowerCase();

        return (
          (stId && sId === stId) ||
          (stNisn && sNisn === stNisn) ||
          (sName && targetName && sName === targetName)
        );
      });

      if (liveSession) {
        return {
          ...liveSession,
          sessionId: liveSession.sessionId || liveSession.id,
          studentId: stId,
          nisn: st.nisn || liveSession.nisn || '-',
          studentName: stName,
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
          studentName: stName,
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
        studentName: stName,
        nisn: st.nisn || '-',
        className: stClass,
        status: 'NOT_STARTED',
        score: null,
        violationsCount: 0,
        violations: [],
      };
    });
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
