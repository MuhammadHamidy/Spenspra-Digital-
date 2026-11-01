'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Navbar from '@/components/perpus/home/Navbar';
import PerpusFooterMain from '@/components/perpus/home/PerpusFooterMain';
import { tokenStorage } from '@/lib/common/tokenStorage';
import { redirectToSsoLogin } from '@/lib/features/beranda/ssoHelper';
import { literacyAssignmentApi } from '@/lib/features/library/api/literacyAssignmentApi';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';

export default function TugasLiterasiPage() {
  const [user, setUser] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal pengerjaan tugas
  const [openModal, setOpenModal] = useState(false);
  const [activeTask, setActiveTask] = useState(null);
  const [submissionForm, setSubmissionForm] = useState({
    book_title: '',
    book_author: '',
    pages_read: '',
    summary: '',
    moral_value: '',
  });

  // Modal lihat feedback/nilai
  const [openDetailModal, setOpenDetailModal] = useState(false);
  const [activeDetailSubmission, setActiveDetailSubmission] = useState(null);

  useEffect(() => {
    // 1. Ambil data profil SSO
    const localUser = tokenStorage.getUser();
    if (localUser) {
      const resolved = {
        id: localUser.id || localUser.userId || 'std-sso',
        nama: localUser.nama || localUser.fullName || localUser.full_name || 'Siswa Spenspra',
        peran: localUser.peran || localUser.roleName || 'SISWA',
        kelas_atau_jabatan: localUser.kelas_atau_jabatan || localUser.className || localUser.kelas || 'Kelas 7B',
        nisn_atau_nip: localUser.nisn_atau_nip || localUser.identityNumber || localUser.nimNip || '202607001',
        foto: localUser.photoUrl || localUser.foto || null,
      };
      setUser(resolved);
      loadTasks(resolved);
    } else {
      setLoading(false);
    }
  }, []);

  const loadTasks = (currentUser) => {
    setLoading(true);
    try {
      const allTasks = literacyAssignmentApi.getAssignments();
      const allSubs = literacyAssignmentApi.getSubmissions();

      // Filter tugas yang relevan untuk kelas siswa ini dari SSO
      const relevantTasks = allTasks.filter((t) =>
        literacyAssignmentApi.isTaskTargetingStudent(t, currentUser?.kelas_atau_jabatan)
      );

      setAssignments(relevantTasks);
      setSubmissions(allSubs);
    } catch (e) {
      console.error('Gagal memuat tugas literasi:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenSubmitModal = (task) => {
    setActiveTask(task);
    // Cek apakah sudah ada draft submission siswa ini
    const existing = submissions.find(
      (s) =>
        s.assignment_id === task.id &&
        (s.student_id === user?.id || s.student_nisn === user?.nisn_atau_nip)
    );

    if (existing) {
      setSubmissionForm({
        book_title: existing.book_title || '',
        book_author: existing.book_author || '',
        pages_read: existing.pages_read || '',
        summary: existing.summary || '',
        moral_value: existing.moral_value || '',
      });
    } else {
      setSubmissionForm({
        book_title: task.book_title || '',
        book_author: '',
        pages_read: '',
        summary: '',
        moral_value: '',
      });
    }
    setOpenModal(true);
  };

  const handleSubmitTask = (e) => {
    e.preventDefault();
    if (!activeTask || !user) return;

    literacyAssignmentApi.submitAssignment({
      assignment_id: activeTask.id,
      student_id: user.id,
      student_name: user.nama,
      student_nisn: user.nisn_atau_nip,
      student_class: user.kelas_atau_jabatan,
      book_title: submissionForm.book_title,
      book_author: submissionForm.book_author,
      pages_read: submissionForm.pages_read,
      summary: submissionForm.summary,
      moral_value: submissionForm.moral_value,
    });

    setOpenModal(false);
    loadTasks(user);
    alert('Tugas literasi berhasil dikirim ke guru/wali kelas Anda!');
  };

  const handleOpenDetailModal = (sub, task) => {
    setActiveDetailSubmission({ ...sub, taskTitle: task.title });
    setOpenDetailModal(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between font-sans selection:bg-[#1E2538] selection:text-white">
      <div>
        <Navbar user={user} />

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-[#1E2538] to-[#3B4664] rounded-3xl p-8 sm:p-10 text-white shadow-xl relative overflow-hidden mb-10">
            <div className="absolute right-0 bottom-0 translate-x-10 translate-y-10 opacity-10 pointer-events-none">
              <svg className="w-96 h-96" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
              </svg>
            </div>

            <div className="relative z-10 max-w-2xl">
              <span className="inline-block px-3.5 py-1 rounded-full text-xs font-bold tracking-wider uppercase bg-white/20 backdrop-blur-sm text-purple-200 mb-3 border border-white/20">
                Gerakan Literasi Sekolah
              </span>
              <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
                Tugas Kegiatan Literasi
              </h1>
              <p className="text-slate-200 text-sm sm:text-base mt-2.5 leading-relaxed">
                Kerjakan tugas literasi membaca buku yang ditugaskan oleh Perpustakaan dan Bapak/Ibu Wali Kelas untuk menumbuhkan wawasan serta budi pekerti.
              </p>

              {user && (
                <div className="mt-5 flex flex-wrap items-center gap-3 text-xs bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-2xl w-fit border border-white/10">
                  <span className="font-semibold text-purple-200">Siswa SSO Terverifikasi:</span>
                  <span className="font-bold text-white">{user.nama}</span>
                  <span className="bg-purple-500/40 text-purple-100 px-2.5 py-0.5 rounded-full font-bold">
                    {user.kelas_atau_jabatan}
                  </span>
                  <span className="text-slate-300">NISN: {user.nisn_atau_nip}</span>
                </div>
              )}
            </div>
          </div>

          {/* Kondisi Siswa Belum Login SSO */}
          {!user ? (
            <div className="bg-white rounded-3xl p-10 border border-slate-200 text-center shadow-xs my-6 max-w-xl mx-auto">
              <div className="w-16 h-16 rounded-2xl bg-purple-50 text-[#4B3B78] flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                </svg>
              </div>
              <h3 className="text-lg font-bold text-slate-800">Login SSO Diperlukan</h3>
              <p className="text-slate-500 text-xs sm:text-sm mt-1.5 leading-relaxed">
                Silakan masuk dengan akun Single Sign-On (SSO) sekolah Anda untuk melihat tugas literasi yang ditujukan ke kelas Anda.
              </p>
              <button
                type="button"
                onClick={() => redirectToSsoLogin()}
                className="mt-6 px-6 py-3 bg-[#1E2538] hover:bg-[#141B2B] text-white text-xs font-bold rounded-xl transition-all shadow-md cursor-pointer"
              >
                Masuk dengan SSO Sekolah
              </button>
            </div>
          ) : loading ? (
            <div className="py-20 text-center text-slate-400 text-sm">
              <div className="w-8 h-8 border-4 border-[#1E2538] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              Memuat tugas literasi untuk {user.kelas_atau_jabatan}...
            </div>
          ) : assignments.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 border border-slate-200 text-center shadow-xs my-6">
              <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                </svg>
              </div>
              <h3 className="text-base font-bold text-slate-800">Tidak Ada Tugas Literasi Aktif</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                Saat ini belum ada penugasan kegiatan literasi baru untuk {user.kelas_atau_jabatan}. Tetap semangat membaca buku di perpustakaan!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {assignments.map((task) => {
                const mySub = submissions.find(
                  (s) =>
                    s.assignment_id === task.id &&
                    (s.student_id === user.id || s.student_nisn === user.nisn_atau_nip)
                );

                const isSubmitted = !!mySub;
                const isGraded = mySub && mySub.status === 'DINILAI';

                return (
                  <div
                    key={task.id}
                    className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-7 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div>
                      {/* Badge Sasaran & Status */}
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                        <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700">
                          🎯 Sasaran: {task.target_classes?.join(', ')}
                        </span>

                        {isGraded ? (
                          <span className="px-3 py-1 rounded-full text-[11px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                            ✓ Dinilai: {mySub.score} / 100
                          </span>
                        ) : isSubmitted ? (
                          <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            ⏳ Menunggu Koreksi
                          </span>
                        ) : (
                          <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            Belum Dikerjakan
                          </span>
                        )}
                      </div>

                      {/* Judul Tugas */}
                      <h2 className="text-lg font-bold text-slate-900 leading-snug">
                        {task.title}
                      </h2>

                      {/* Deskripsi / Petunjuk */}
                      <p className="text-xs text-slate-600 mt-2.5 leading-relaxed bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                        {task.description}
                      </p>

                      {/* Meta Tugas */}
                      <div className="mt-4 space-y-1.5 text-xs text-slate-500">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400">📅 Batas Pengumpulan:</span>
                          <span className="font-semibold text-slate-800">
                            {new Date(task.due_date).toLocaleDateString('id-ID', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400">👤 Penugasan Oleh:</span>
                          <span className="font-semibold text-slate-700">{task.created_by}</span>
                        </div>
                      </div>
                    </div>

                    {/* Tombol Aksi */}
                    <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-between gap-3">
                      {isGraded ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleOpenDetailModal(mySub, task)}
                            className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer text-center"
                          >
                            Lihat Nilai &amp; Feedback Guru
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenSubmitModal(task)}
                            className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer text-center"
                          >
                            Ubah
                          </button>
                        </>
                      ) : isSubmitted ? (
                        <>
                          <span className="text-xs text-amber-700 font-medium">
                            Terkirim pada{' '}
                            {new Date(mySub.submitted_at).toLocaleDateString('id-ID', {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleOpenSubmitModal(task)}
                            className="py-2 px-4 bg-[#1E2538] hover:bg-[#141B2B] text-white rounded-xl text-xs font-bold transition-colors cursor-pointer text-center"
                          >
                            Perbarui Tugas
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleOpenSubmitModal(task)}
                          className="w-full py-3 px-5 bg-[#1E2538] hover:bg-[#141B2B] text-white rounded-xl text-xs sm:text-sm font-bold transition-all shadow-xs hover:shadow-md cursor-pointer flex items-center justify-center gap-2"
                        >
                          <span>Kerjakan Tugas Literasi Sekarang</span>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/>
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>

      <PerpusFooterMain />

      {/* Modal Pengerjaan Tugas Literasi */}
      <Dialog
        open={openModal}
        onClose={() => setOpenModal(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          style: { borderRadius: '24px', padding: '10px' },
        }}
      >
        <DialogTitle className="font-extrabold text-slate-900 pb-2">
          {activeTask?.title}
        </DialogTitle>
        <form onSubmit={handleSubmitTask}>
          <DialogContent className="space-y-4">
            {/* Info Siswa SSO (ReadOnly) */}
            <div className="p-3.5 bg-purple-50 rounded-2xl border border-purple-100 flex flex-wrap items-center justify-between text-xs text-purple-900 gap-2">
              <div>
                <span className="font-semibold block">Siswa: {user?.nama}</span>
                <span className="text-purple-700">NISN: {user?.nisn_atau_nip}</span>
              </div>
              <span className="bg-[#4B3B78] text-white font-bold px-3 py-1 rounded-full">
                {user?.kelas_atau_jabatan}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Judul Buku yang Dibaca *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Misal: Laskar Pelangi / Bumi Manusia"
                  value={submissionForm.book_title}
                  onChange={(e) => setSubmissionForm({ ...submissionForm, book_title: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#1E2538]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Pengarang / Penulis Buku *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Misal: Andrea Hirata"
                  value={submissionForm.book_author}
                  onChange={(e) => setSubmissionForm({ ...submissionForm, book_author: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#1E2538]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Jumlah Halaman yang Telah Dibaca (Halaman) *
              </label>
              <input
                type="number"
                required
                min="1"
                placeholder="Contoh: 35"
                value={submissionForm.pages_read}
                onChange={(e) => setSubmissionForm({ ...submissionForm, pages_read: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#1E2538]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Ringkasan / Intisari Bacaan *
              </label>
              <textarea
                required
                rows={4}
                placeholder="Uraikan gagasan utama, alur cerita, atau intisari pengetahuan yang Anda peroleh dari buku tersebut..."
                value={submissionForm.summary}
                onChange={(e) => setSubmissionForm({ ...submissionForm, summary: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#1E2538]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Refleksi Diri &amp; Nilai Moral Keteladanan *
              </label>
              <textarea
                required
                rows={3}
                placeholder="Pesan moral atau nilai positif apa yang dapat Anda terapkan dalam kehidupan sehari-hari di sekolah maupun di rumah..."
                value={submissionForm.moral_value}
                onChange={(e) => setSubmissionForm({ ...submissionForm, moral_value: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#1E2538]"
              />
            </div>
          </DialogContent>
          <DialogActions className="px-6 pb-4">
            <Button onClick={() => setOpenModal(false)} color="inherit" style={{ borderRadius: '12px', textTransform: 'none' }}>
              Batal
            </Button>
            <Button
              type="submit"
              variant="contained"
              style={{
                backgroundColor: '#1E2538',
                borderRadius: '12px',
                textTransform: 'none',
                fontWeight: 'bold',
                padding: '8px 20px',
              }}
            >
              Kirim Tugas Literasi
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Modal Detail Nilai & Feedback Guru */}
      <Dialog
        open={openDetailModal}
        onClose={() => setOpenDetailModal(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          style: { borderRadius: '24px', padding: '10px' },
        }}
      >
        <DialogTitle className="font-extrabold text-slate-900 pb-2">
          Hasil Penilaian Tugas Literasi
        </DialogTitle>
        <DialogContent className="space-y-4">
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 text-center">
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider block">
              Nilai Skor Akhir
            </span>
            <div className="text-4xl font-black text-emerald-800 my-1">
              {activeDetailSubmission?.score} <span className="text-lg font-normal text-emerald-600">/ 100</span>
            </div>
            <p className="text-xs text-emerald-700 font-medium">
              Dinilai oleh: <strong>{activeDetailSubmission?.grader_name || 'Wali Kelas'}</strong>
            </p>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-xs">
            <p className="font-bold text-slate-700">Catatan &amp; Feedback Guru:</p>
            <p className="text-slate-600 italic">
              &quot;{activeDetailSubmission?.teacher_notes || 'Bagus, terus tingkatkan gemar membaca Anda!'}&quot;
            </p>
          </div>

          <div className="text-xs text-slate-500 space-y-1">
            <p><strong>Buku yang Dibaca:</strong> {activeDetailSubmission?.book_title} ({activeDetailSubmission?.book_author})</p>
            <p><strong>Waktu Penilaian:</strong> {new Date(activeDetailSubmission?.graded_at || activeDetailSubmission?.submitted_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          </div>
        </DialogContent>
        <DialogActions className="px-6 pb-4">
          <Button onClick={() => setOpenDetailModal(false)} variant="contained" style={{ backgroundColor: '#1E2538', borderRadius: '12px', textTransform: 'none' }}>
            Tutup
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
