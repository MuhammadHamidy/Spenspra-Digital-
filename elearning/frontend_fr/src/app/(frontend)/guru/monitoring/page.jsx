'use client';

import React, { useState, useEffect } from 'react';
import Card from '@/components/Card';
import Button from '@/components/Button';
import StatusBadge from '@/components/StatusBadge';
import Modal from '@/components/Modal';
import { elearningApi } from '@/lib/elearningApi';
import { tokenStorage } from '@/lib/common/tokenStorage';

export default function LiveProctoringMonitoringPage() {
  const [user, setUser] = useState(null);
  const [exams, setExams] = useState([]);
  const [selectedExamId, setSelectedExamId] = useState('cbt-001');
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeStudentAudit, setActiveStudentAudit] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    setUser(tokenStorage.getUser());
    loadExamsList();
  }, []);

  const loadExamsList = async () => {
    try {
      const data = await elearningApi.getExams();
      setExams(data || []);
      if (data && data.length > 0 && !selectedExamId) {
        setSelectedExamId(data[0].id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadProctoringData = async () => {
    if (!selectedExamId) return;
    try {
      const liveData = await elearningApi.getLiveProctoringData(selectedExamId);
      setSessions(liveData || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Poll live updates every 4 seconds
  useEffect(() => {
    setLoading(true);
    loadProctoringData();
    const interval = setInterval(loadProctoringData, 4000);
    return () => clearInterval(interval);
  }, [selectedExamId]);

  const handleUnlockStudent = async (studentSession) => {
    const confirmUnlock = confirm(
      `Buka kunci lembar ujian untuk siswa: ${studentSession.studentName}?\nSiswa akan diberikan dispensasi untuk melanjutkan pengerjaan.`
    );
    if (!confirmUnlock) return;

    try {
      await elearningApi.unlockStudentSession(selectedExamId, studentSession.sessionId);
      alert(`Kunci ujian untuk ${studentSession.studentName} berhasil dibuka.`);
      loadProctoringData();
    } catch (e) {
      alert('Gagal membuka kunci: ' + e.message);
    }
  };

  const selectedExam = exams.find((e) => e.id === selectedExamId) || exams[0];

  const filteredSessions = sessions.filter((s) =>
    s.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.className && s.className.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Statistics
  const totalStudents = sessions.length;
  const inProgressCount = sessions.filter((s) => s.status === 'IN_PROGRESS').length;
  const lockedCount = sessions.filter((s) => s.status === 'LOCKED').length;
  const submittedCount = sessions.filter((s) => s.status === 'SUBMITTED').length;
  const totalViolations = sessions.reduce((acc, curr) => acc + (curr.violationsCount || 0), 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-danger-500 animate-ping"></span>
            <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 tracking-tight">
              Live Proctoring & Pengawas Anti-Cheat
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-neutral-500 mt-0.5">
            Audit aktivitas siswa secara langsung: deteksi buka tab lain, pindah aplikasi, dan keluar dari layar ujian.
          </p>
        </div>

        {/* Exam Selector */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-neutral-700 whitespace-nowrap">
            Pilih Sesi Ujian:
          </label>
          <select
            value={selectedExamId}
            onChange={(e) => setSelectedExamId(e.target.value)}
            className="text-xs font-semibold px-3 py-2 rounded-[8px] border border-neutral-300 bg-white text-neutral-800 shadow-2xs focus:outline-hidden focus:border-primary-500"
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
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        <Card noPadding className="p-4 bg-white border border-neutral-200">
          <p className="text-[11px] font-semibold text-neutral-400">Total Peserta</p>
          <p className="text-xl sm:text-2xl font-bold text-neutral-900 mt-0.5">{totalStudents}</p>
          <p className="text-[10px] text-neutral-500">Terdaftar di sesi</p>
        </Card>

        <Card noPadding className="p-4 bg-secondary-50/50 border border-secondary-200">
          <p className="text-[11px] font-semibold text-secondary-600">Sedang Ujian</p>
          <p className="text-xl sm:text-2xl font-bold text-secondary-700 mt-0.5">{inProgressCount}</p>
          <p className="text-[10px] text-secondary-600">Aktif di peramban</p>
        </Card>

        <Card noPadding className="p-4 bg-danger-50/70 border border-danger-200">
          <p className="text-[11px] font-semibold text-danger-600">Layar Terkunci</p>
          <p className="text-xl sm:text-2xl font-bold text-danger-700 mt-0.5">{lockedCount}</p>
          <p className="text-[10px] text-danger-600 font-bold">Melebihi toleransi</p>
        </Card>

        <Card noPadding className="p-4 bg-success-50/50 border border-success-200">
          <p className="text-[11px] font-semibold text-success-600">Telah Selesai</p>
          <p className="text-xl sm:text-2xl font-bold text-success-700 mt-0.5">{submittedCount}</p>
          <p className="text-[10px] text-success-600">Jawaban tersimpan</p>
        </Card>

        <Card noPadding className="p-4 bg-accent-50/50 border border-amber-200 col-span-2 lg:col-span-1">
          <p className="text-[11px] font-semibold text-amber-700">Total Pelanggaran</p>
          <p className="text-xl sm:text-2xl font-bold text-amber-800 mt-0.5">{totalViolations}</p>
          <p className="text-[10px] text-amber-700">Tab switch & blur</p>
        </Card>
      </div>

      {/* Main Roster Table */}
      <Card noPadding className="overflow-hidden border border-neutral-200 bg-white">
        {/* Table Toolbar */}
        <div className="p-4 border-b border-neutral-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-success-500 animate-pulse" />
            <p className="text-xs font-bold text-neutral-800">
              Sinkronisasi Otomatis Setiap 4 Detik
            </p>
            <span className="text-xs text-neutral-400">|</span>
            <span className="text-xs font-mono font-bold text-primary-500">
              Token: {selectedExam?.token || 'MAT7A1'}
            </span>
          </div>

          <div className="w-full sm:w-64">
            <input
              type="search"
              placeholder="Cari nama siswa..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs px-3 py-1.5 rounded-[6px] border border-neutral-300 focus:outline-hidden focus:border-primary-500"
            />
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-neutral-50/80 text-neutral-500 font-bold border-b border-neutral-200 uppercase text-[10px] tracking-wider">
                <th className="py-3 px-4">Nama Siswa</th>
                <th className="py-3 px-4">Kelas</th>
                <th className="py-3 px-4">Status Sesi</th>
                <th className="py-3 px-4 text-center">Pelanggaran</th>
                <th className="py-3 px-4">Log Pelanggaran Terakhir</th>
                <th className="py-3 px-4 text-right">Aksi Pengawas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filteredSessions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-neutral-400">
                    Belum ada siswa yang bergabung pada sesi ini.
                  </td>
                </tr>
              ) : (
                filteredSessions.map((s) => {
                  const isLocked = s.status === 'LOCKED';
                  const isSubmitted = s.status === 'SUBMITTED';
                  const lastViolation = s.violations && s.violations.length > 0 ? s.violations[s.violations.length - 1] : null;

                  return (
                    <tr
                      key={s.sessionId}
                      className={`hover:bg-neutral-50/80 transition-colors ${
                        isLocked ? 'bg-danger-50/30' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4 font-semibold text-neutral-900">
                        <div className="flex items-center gap-2">
                          <div className={`w-7 h-7 rounded-[6px] flex items-center justify-center font-bold text-xs ${
                            isLocked
                              ? 'bg-danger-100 text-danger-700'
                              : isSubmitted
                              ? 'bg-success-100 text-success-700'
                              : 'bg-primary-100 text-primary-700'
                          }`}>
                            {s.studentName.charAt(0)}
                          </div>
                          <span className="truncate max-w-[180px]">{s.studentName}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-neutral-600 font-medium">
                        {s.className || '7A'}
                      </td>

                      <td className="py-3.5 px-4">
                        <StatusBadge
                          status={s.status}
                          label={
                            isLocked
                              ? 'TERKUNCI'
                              : isSubmitted
                              ? `SELESAI (Nilai: ${s.score ?? '-'})`
                              : 'MENGERJAKAN'
                          }
                        />
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center justify-center min-w-7 h-6 px-2 rounded-[999px] text-xs font-bold ${
                            s.violationsCount >= (selectedExam?.maxViolations || 3)
                              ? 'bg-danger-600 text-white'
                              : s.violationsCount > 0
                              ? 'bg-accent-500 text-neutral-900'
                              : 'bg-neutral-100 text-neutral-600'
                          }`}
                        >
                          {s.violationsCount || 0}x
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-neutral-600">
                        {lastViolation ? (
                          <div className="space-y-0.5">
                            <span className="text-[10px] font-bold text-danger-600 uppercase">
                              [{lastViolation.type}]
                            </span>
                            <p className="text-[11px] text-neutral-600 line-clamp-1 max-w-[220px]">
                              {lastViolation.description}
                            </p>
                          </div>
                        ) : (
                          <span className="text-neutral-400 text-[11px]">- Bersih -</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {s.violations && s.violations.length > 0 && (
                            <Button
                              variant="outline"
                              size="xs"
                              onClick={() => setActiveStudentAudit(s)}
                            >
                              Riwayat Audit
                            </Button>
                          )}

                          {isLocked && (
                            <Button
                              variant="accent"
                              size="xs"
                              onClick={() => handleUnlockStudent(s)}
                              className="font-bold shadow-2xs"
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
        title="Audit Pelanggaran Proctoring"
        subtitle={activeStudentAudit ? `${activeStudentAudit.studentName} (Kelas ${activeStudentAudit.className})` : ''}
        size="md"
      >
        <div className="space-y-4">
          <div className="p-3 rounded-[8px] bg-neutral-50 border border-neutral-200 text-xs flex items-center justify-between">
            <span className="text-neutral-600">Total Riwayat Pelanggaran:</span>
            <span className="font-bold text-danger-600 text-sm">
              {activeStudentAudit?.violations?.length || 0} Kejadian
            </span>
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {activeStudentAudit?.violations?.map((v, i) => (
              <div
                key={i}
                className="p-3 rounded-[8px] border border-danger-200 bg-danger-50/50 space-y-1 text-xs"
              >
                <div className="flex items-center justify-between font-bold text-danger-700">
                  <span className="text-[10px] uppercase">Kejadian #{i + 1}: {v.type}</span>
                  <span className="text-[10px] text-neutral-400 font-normal">
                    {new Date(v.timestamp).toLocaleTimeString('id-ID')} WIB
                  </span>
                </div>
                <p className="text-[11px] text-neutral-700 leading-relaxed">
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
              >
                🔓 Buka Kunci Layar Siswa
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveStudentAudit(null)}
            >
              Tutup
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
