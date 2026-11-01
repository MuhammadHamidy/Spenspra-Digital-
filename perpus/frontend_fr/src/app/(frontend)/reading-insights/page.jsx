'use client';

import React, { useState, useEffect } from 'react';
import { readingApi } from '@/lib/features/library/api/readingApi';
import { membersApi } from '@/lib/features/library/api/membersApi';
import { booksApi } from '@/lib/features/library/api/booksApi';
import AppIcon from '@/components/AppIcon';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import CircularProgress from '@mui/material/CircularProgress';
import Rating from '@mui/material/Rating';

export default function ReadingInsightsPage() {
  const [activeTab, setActiveTab] = useState('resumes'); // 'resumes' | 'quizzes'
  const [resumes, setResumes] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Dropdown options
  const [members, setMembers] = useState([]);
  const [books, setBooks] = useState([]);

  // Modal State for New Resume
  const [openAddModal, setOpenAddModal] = useState(false);
  const [formData, setFormData] = useState({
    member_id: '',
    book_id: '',
    title: '',
    summary: '',
    key_insights: '',
    favorite_quotes: '',
    rating: 5,
  });

  // Modal State for Grading Resume
  const [openGradeResumeModal, setOpenGradeResumeModal] = useState(false);
  const [selectedResume, setSelectedResume] = useState(null);
  const [gradeResumeForm, setGradeResumeForm] = useState({
    score: 85,
    grader_name: 'Ibu Conie, S.Pd. (Wali Kelas)',
    notes: 'Pemahaman materi bacaan baik dan runut. Refleksi relevan.',
    status: 'TERVERIFIKASI',
  });

  // Modal State for Grading Quiz
  const [openGradeQuizModal, setOpenGradeQuizModal] = useState(false);
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [gradeQuizForm, setGradeQuizForm] = useState({
    score: 90,
    grader_name: 'Petugas Perpustakaan / Wali Kelas',
    notes: 'Analisis esai sangat tajam dan memahami pesan moral pengarang.',
    status: 'DINILAI',
  });

  useEffect(() => {
    loadData();
    loadDropdowns();
    loadQuizzes();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [resList, ins] = await Promise.all([
        readingApi.getReadingResumes('', '', search),
        readingApi.getReadingInsights(),
      ]);

      // Merge with locally stored grading overrides if any
      const gradedOverrides = JSON.parse(localStorage.getItem('spenspra_graded_resumes') || '{}');
      const enrichedResumes = (resList || []).map((r) => {
        if (gradedOverrides[r.id]) {
          return { ...r, ...gradedOverrides[r.id] };
        }
        return r;
      });

      setResumes(enrichedResumes);
      setInsights(ins);
    } catch (err) {
      console.error('Failed to load reading insights:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadDropdowns = async () => {
    try {
      const [mems, bks] = await Promise.all([
        membersApi.getMembers(),
        booksApi.getBooks(),
      ]);
      setMembers(mems || []);
      setBooks(bks || []);
      if (mems?.length > 0) setFormData((prev) => ({ ...prev, member_id: mems[0].id }));
      if (bks?.length > 0) setFormData((prev) => ({ ...prev, book_id: bks[0].id }));
    } catch (err) {
      console.error('Failed to load dropdown options:', err);
    }
  };

  const loadQuizzes = () => {
    try {
      const rawStored = localStorage.getItem('spenspra_quizzes');
      let storedList = rawStored ? JSON.parse(rawStored) : [];

      // If empty, provide rich demo student submissions
      if (!storedList || storedList.length === 0) {
        storedList = [
          {
            id: 'quiz-1',
            loan_id: 'LN-202611-001',
            student_name: 'Ahmad Fauzi',
            class_name: 'Kelas 7A',
            book_title: 'Etika Politik',
            book_author: 'Franz Magnis-Suseno',
            submitted_at: '2026-11-01T08:30:00Z',
            answers: {
              1: 'Etika politik adalah pedoman moral dan kesadaran berbangsa agar kekuasaan digunakan secara adil untuk kesejahteraan rakyat banyak.',
              2: 'Menurut Franz Magnis-Suseno, etika politik menuntut legitimasi kekuasaan agar tunduk pada martabat kemanusiaan dan keadilan sosial (bonum commune).',
              3: 'Faktor yang memengaruhi adalah integritas para pemimpin, kepatuhan hukum, sistem demokrasi terbuka, dan kejujuran warga negara.',
              4: 'Penerapannya di sekolah: musyawarah pemilihan ketua kelas secara tertib dan menghargai pendapat teman tanpa perundungan.',
              5: 'Pesan moral utama: Jabatan dan kepemimpinan adalah amanah untuk melayani, bukan alat untuk mencari keuntungan pribadi.',
            },
            score: null,
            grader_name: null,
            notes: null,
            status: 'MENUNGGU_KOREKSI',
          },
          {
            id: 'quiz-2',
            loan_id: 'LN-202611-002',
            student_name: 'Siti Nurhaliza',
            class_name: 'Kelas 7B',
            book_title: 'Bumi Manusia',
            book_author: 'Pramoedya Ananta Toer',
            submitted_at: '2026-10-31T14:15:00Z',
            answers: {
              1: 'Buku ini menceritakan perjuangan seorang pemuda pribumi (Minke) yang memperjuangkan harga diri dan hak-hak kemanusiaannya di era kolonial.',
              2: 'Pramoedya mendefinisikan perjuangan sebagai keberanian berpikir mandiri dan berbuat adil sejak dalam pikiran tanpa takut ancaman feodalisme.',
              3: 'Dipengaruhi oleh stratifikasi sosial kolonial, ketidakadilan pengadilan kulit putih, dan bangkitnya kesadaran pendidikan.',
              4: 'Penerapannya: tidak membeda-bedakan teman berdasarkan status sosial atau ekonomi di lingkungan sekolah.',
              5: '"Seorang terpelajar harus sudah berbuat adil sejak dalam pikiran, apalagi dalam perbuatan." - Selalu bersikap jujur dan membela kebenaran.',
            },
            score: 95,
            grader_name: 'Ibu Conie, S.Pd. (Wali Kelas 7B)',
            notes: 'Uraian jawaban sangat cerdas, kutipan filosofis Minke dipahami dengan sangat baik.',
            status: 'DINILAI',
          },
        ];
        localStorage.setItem('spenspra_quizzes', JSON.stringify(storedList));
      }

      // Check for grading overrides
      const gradedOverrides = JSON.parse(localStorage.getItem('spenspra_graded_quizzes') || '{}');
      const enrichedQuizzes = storedList.map((q) => {
        const qId = q.id || q.loan_id || q.loanId;
        if (gradedOverrides[qId]) {
          return { ...q, ...gradedOverrides[qId] };
        }
        return q;
      });

      setQuizzes(enrichedQuizzes);
    } catch (e) {
      console.warn('Gagal memuat daftar kuis:', e);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadData();
  };

  // Open Grading Modal for Resume
  const handleOpenGradeResume = (r) => {
    setSelectedResume(r);
    setGradeResumeForm({
      score: r.score || 88,
      grader_name: r.grader_name || 'Ibu Conie, S.Pd. (Wali Kelas)',
      notes: r.notes || 'Rangkuman pemahaman buku baik dan bermanfaat bagi pembaca.',
      status: r.status === 'TERVERIFIKASI' ? 'TERVERIFIKASI' : 'TERVERIFIKASI',
    });
    setOpenGradeResumeModal(true);
  };

  const handleSaveResumeGrade = (e) => {
    e.preventDefault();
    if (!selectedResume) return;

    const overrides = JSON.parse(localStorage.getItem('spenspra_graded_resumes') || '{}');
    overrides[selectedResume.id] = {
      score: parseInt(gradeResumeForm.score, 10),
      grader_name: gradeResumeForm.grader_name,
      notes: gradeResumeForm.notes,
      status: gradeResumeForm.status,
      graded_at: new Date().toISOString(),
    };
    localStorage.setItem('spenspra_graded_resumes', JSON.stringify(overrides));

    // Update state
    setResumes((prev) =>
      prev.map((r) =>
        r.id === selectedResume.id ? { ...r, ...overrides[selectedResume.id] } : r
      )
    );

    setOpenGradeResumeModal(false);
    alert('Penilaian resume bacaan berhasil disimpan!');
  };

  // Open Grading Modal for Quiz
  const handleOpenGradeQuiz = (q) => {
    setSelectedQuiz(q);
    setGradeQuizForm({
      score: q.score || 90,
      grader_name: q.grader_name || 'Ibu Conie, S.Pd. (Wali Kelas)',
      notes: q.notes || 'Jawaban kuis esai relevan dan mencerminkan pemahaman mendalam isi buku.',
      status: 'DINILAI',
    });
    setOpenGradeQuizModal(true);
  };

  const handleSaveQuizGrade = (e) => {
    e.preventDefault();
    if (!selectedQuiz) return;

    const qId = selectedQuiz.id || selectedQuiz.loan_id || selectedQuiz.loanId;
    const overrides = JSON.parse(localStorage.getItem('spenspra_graded_quizzes') || '{}');
    overrides[qId] = {
      score: parseInt(gradeQuizForm.score, 10),
      grader_name: gradeQuizForm.grader_name,
      notes: gradeQuizForm.notes,
      status: 'DINILAI',
      graded_at: new Date().toISOString(),
    };
    localStorage.setItem('spenspra_graded_quizzes', JSON.stringify(overrides));

    // Update state
    setQuizzes((prev) =>
      prev.map((q) => {
        const id = q.id || q.loan_id || q.loanId;
        return id === qId ? { ...q, ...overrides[qId] } : q;
      })
    );

    setOpenGradeQuizModal(false);
    alert('Nilai kuis pemahaman buku berhasil disimpan!');
  };

  const handleCreateResume = async (e) => {
    e.preventDefault();
    try {
      await readingApi.createReadingResume(formData);
      setOpenAddModal(false);
      setFormData({
        member_id: members[0]?.id || '',
        book_id: books[0]?.id || '',
        title: '',
        summary: '',
        key_insights: '',
        favorite_quotes: '',
        rating: 5,
      });
      loadData();
      alert('Resume bacaan dan refleksi literasi berhasil disimpan!');
    } catch (err) {
      alert(err.message || 'Gagal menyimpan resume bacaan');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#1A3D63] uppercase tracking-wider mb-1">
            <span>Perpustakaan SMPN 1 Prambon</span>
            <span>&bull;</span>
            <span className="text-emerald-700 font-bold">Evaluasi & Koreksi Guru / Pustakawan</span>
          </div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">
            Penilaian Literasi &amp; Kuis Pemahaman Buku
          </h1>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            Pustakawan, Wali Kelas, dan Guru Pengajar dapat membaca jawaban siswa, memberi skor nilai (0-100), dan menuliskan catatan masukan evaluasi.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="contained"
            onClick={() => setOpenAddModal(true)}
            sx={{
              bgcolor: '#1A3D63',
              borderRadius: '12px',
              textTransform: 'none',
              fontWeight: 700,
              fontSize: '0.8125rem',
              px: 2.5,
              py: 1,
              '&:hover': { bgcolor: '#0A1931' },
            }}
            startIcon={<AppIcon name="edit" color="white" size={16} />}
          >
            + Tulis Resume Bacaan
          </Button>
        </div>
      </div>

      {/* Aggregate Insights Dashboard Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Card 1: Metrik Utama */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-800">Indikator Literasi</h3>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
              Agregat
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 rounded-2xl bg-purple-50/60 border border-purple-100 text-center">
              <span className="text-[11px] font-bold text-purple-700 uppercase">Total Resume</span>
              <div className="text-3xl font-black text-purple-900 mt-1">
                {insights?.total_resumes_submitted || resumes.length || 0}
              </div>
              <span className="text-[10px] text-purple-600">Karya refleksi</span>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-100 text-center">
              <span className="text-[11px] font-bold text-emerald-700 uppercase">Kuis Masuk</span>
              <div className="text-3xl font-black text-emerald-900 mt-1">
                {quizzes.length}
              </div>
              <span className="text-[10px] text-emerald-600">Jawaban siswa</span>
            </div>
          </div>

          {/* Literacy Quote */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/60 italic text-xs text-slate-600 leading-relaxed">
            "Membaca tanpa merangkum bagai menyantap hidangan tanpa mencernanya. Catatan resume dan refleksi kuis mengubah informasi menjadi kebijaksanaan."
          </div>
        </div>

        {/* Card 2: Top Kategori Minat Membaca */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-800">Genre & Kategori Terfavorit</h3>
            <span className="text-xs text-slate-400">Distribusi</span>
          </div>

          <div className="space-y-3">
            {(insights?.top_categories?.length ? insights.top_categories : [
              { category: 'Kesusastraan & Novel', count: 4, percentage: 40 },
              { category: 'Filsafat & Etika', count: 3, percentage: 30 },
              { category: 'Pengembangan Diri', count: 2, percentage: 20 },
              { category: 'Sains & MIPA', count: 1, percentage: 10 },
            ]).map((cat, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-700">{cat.category}</span>
                  <span className="text-slate-500">{cat.count} buku ({cat.percentage.toFixed(0)}%)</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#1A3D63] to-[#4A7FA7] rounded-full"
                    style={{ width: `${cat.percentage}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Card 3: Leaderboard Pembaca Teraktif */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-800">Peringkat Pembaca Teraktif</h3>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
              Leaderboard
            </span>
          </div>

          <div className="space-y-2.5">
            {(insights?.leaderboard?.length ? insights.leaderboard : [
              { rank: 1, member_name: 'Ahmad Fauzi', member_code: 'MBR-2026-0001', total_resumes: 5 },
              { rank: 2, member_name: 'Siti Nurhaliza', member_code: 'MBR-2026-0002', total_resumes: 4 },
              { rank: 3, member_name: 'Dewi Lestari', member_code: 'MBR-2026-0004', total_resumes: 3 },
            ]).map((lead, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                      lead.rank === 1
                        ? 'bg-amber-400 text-amber-950 shadow-xs'
                        : lead.rank === 2
                        ? 'bg-slate-300 text-slate-800'
                        : 'bg-amber-700/30 text-amber-900'
                    }`}
                  >
                    #{lead.rank}
                  </span>
                  <div>
                    <div className="text-xs font-bold text-slate-800">{lead.member_name}</div>
                    <div className="text-[10px] font-mono text-slate-400">{lead.member_code}</div>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-black text-[#1A3D63]">{lead.total_resumes}</span>
                  <span className="text-[10px] text-slate-400 block">Resume / Kuis</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs Navigation: Resume Literasi vs Jawaban Kuis Pemahaman */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-2xl border border-slate-200">
            <button
              onClick={() => setActiveTab('resumes')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'resumes'
                  ? 'bg-white text-[#1A3D63] shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <span>📄 Resume Membaca Siswa</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-blue-100 text-blue-800">
                {resumes.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('quizzes')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'quizzes'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <span>✍️ Jawaban Kuis Pemahaman Buku</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-100 text-emerald-800">
                {quizzes.length}
              </span>
            </button>
          </div>

          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Cari siswa, judul, atau catatan..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="text-xs px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none"
            />
            <Button
              type="submit"
              size="small"
              variant="contained"
              sx={{ bgcolor: '#1A3D63', borderRadius: '10px', textTransform: 'none', fontWeight: 700 }}
            >
              Cari
            </Button>
          </form>
        </div>

        {/* TAB 1: RESUME MEMBACA */}
        {activeTab === 'resumes' && (
          <div>
            {loading ? (
              <div className="py-16 text-center text-slate-400">
                <CircularProgress size={24} />
              </div>
            ) : resumes.length === 0 ? (
              <div className="py-16 text-center text-slate-400 text-sm">
                Belum ada resume bacaan yang tersimpan. Klik "+ Tulis Resume Bacaan" untuk membuat resume pertama!
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {resumes.map((r) => (
                  <div
                    key={r.id}
                    className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs hover:shadow-md transition-all space-y-3 flex flex-col justify-between"
                  >
                    <div className="space-y-2.5">
                      {/* Top Badges: Category, Rating, Grade Status */}
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                          {r.book_category || 'Kategori Buku'}
                        </span>
                        <div className="flex items-center gap-2">
                          {r.score !== undefined && r.score !== null ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <span>✓ Nilai: {r.score}/100</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              <span>Menunggu Nilai</span>
                            </span>
                          )}
                          <Rating value={r.rating || 5} readOnly size="small" />
                        </div>
                      </div>

                      <h3 className="text-base font-bold text-slate-900 leading-snug">{r.title}</h3>

                      <div className="text-xs text-slate-500 font-medium">
                        Buku: <strong className="text-slate-800">{r.book_title}</strong> {r.book_author ? `oleh ${r.book_author}` : ''}
                      </div>

                      <div className="pt-2 border-t border-slate-100 space-y-2">
                        <div>
                          <span className="text-[10.5px] font-bold text-slate-700 uppercase tracking-wider block mb-0.5">
                            Ringkasan Siswa:
                          </span>
                          <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">{r.summary}</p>
                        </div>

                        <div>
                          <span className="text-[10.5px] font-bold text-slate-700 uppercase tracking-wider block mb-0.5">
                            Poin Pembelajaran (Key Insights):
                          </span>
                          <p className="text-xs text-slate-600 leading-relaxed line-clamp-3 whitespace-pre-line">
                            {r.key_insights}
                          </p>
                        </div>

                        {r.favorite_quotes && (
                          <div className="p-2.5 rounded-xl bg-slate-50 border-l-2 border-[#1A3D63] text-xs italic text-slate-600">
                            "{r.favorite_quotes}"
                          </div>
                        )}

                        {/* Evaluator Feedback Box if already graded */}
                        {r.notes && (
                          <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200/80 text-xs space-y-1">
                            <div className="font-bold text-emerald-900 flex items-center justify-between">
                              <span>Catatan Koreksi &amp; Ulasan Guru:</span>
                              <span className="text-[10px] text-emerald-700 font-normal">
                                {r.grader_name || 'Wali Kelas'}
                              </span>
                            </div>
                            <p className="text-emerald-800 italic">{r.notes}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-bold text-slate-800">
                          {r.member_name || 'Siswa Spenspra'}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {new Date(r.submitted_at || r.created_at || Date.now()).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleOpenGradeResume(r)}
                        className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
                      >
                        <AppIcon name="edit" size={13} />
                        <span>{r.score !== undefined && r.score !== null ? 'Ubah Nilai' : 'Beri Nilai & Koreksi'}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: JAWABAN KUIS PEMAHAMAN BUKU */}
        {activeTab === 'quizzes' && (
          <div className="space-y-4">
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 text-xs text-slate-600 flex items-center justify-between">
              <div>
                <strong>Daftar Kuis Pemahaman Buku (5 Soal Esai Refleksi)</strong>
                <p className="text-slate-500 mt-0.5 text-[11px]">
                  Jawaban siswa yang telah menyelesaikan peminjaman buku. Pustakawan atau Wali Kelas dapat membaca argumen siswa dan memberikan skor nilai.
                </p>
              </div>
              <span className="text-xs font-bold px-3 py-1 bg-white rounded-xl border border-slate-200 text-slate-700">
                {quizzes.length} Kuis Masuk
              </span>
            </div>

            <div className="space-y-4">
              {quizzes.map((q, idx) => (
                <div
                  key={idx}
                  className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4 hover:shadow-md transition-shadow"
                >
                  {/* Top Bar of Quiz Card */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-black text-slate-900">
                          {q.student_name || 'Siswa Spenspra'}
                        </h3>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-600">
                          {q.class_name || 'Kelas 7'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Buku: <strong className="text-slate-800">{q.book_title}</strong> {q.book_author ? `oleh ${q.book_author}` : ''}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      {q.score !== null && q.score !== undefined ? (
                        <div className="text-right">
                          <span className="inline-block px-3 py-1 rounded-full text-xs font-black bg-emerald-50 text-emerald-800 border border-emerald-200">
                            Nilai: {q.score} / 100
                          </span>
                          <span className="text-[10px] text-slate-400 block mt-0.5">
                            Korektor: {q.grader_name || 'Wali Kelas'}
                          </span>
                        </div>
                      ) : (
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                          Menunggu Penilaian Guru
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() => handleOpenGradeQuiz(q)}
                        className="px-3.5 py-1.5 rounded-xl bg-[#1A3D63] hover:bg-[#0A1931] text-white text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                      >
                        <AppIcon name="edit" color="white" size={13} />
                        <span>{q.score !== null && q.score !== undefined ? 'Ubah Nilai' : 'Koreksi & Beri Nilai'}</span>
                      </button>
                    </div>
                  </div>

                  {/* 5 Questions & Answers List */}
                  <div className="space-y-3 bg-slate-50/70 p-4 rounded-xl border border-slate-100 text-xs">
                    <div className="space-y-1">
                      <span className="font-bold text-slate-700 block">
                        1. Apa arti {q.book_title} yang kamu ketahui?
                      </span>
                      <p className="text-slate-800 bg-white p-2.5 rounded-lg border border-slate-200/80 leading-relaxed">
                        {q.answers?.[1] || '-'}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <span className="font-bold text-slate-700 block">
                        2. Jelaskan definisi {q.book_title} menurut {q.book_author || 'Pengarang'}!
                      </span>
                      <p className="text-slate-800 bg-white p-2.5 rounded-lg border border-slate-200/80 leading-relaxed">
                        {q.answers?.[2] || '-'}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <span className="font-bold text-slate-700 block">
                        3. Sebutkan apa saja yang memengaruhi {q.book_title}?
                      </span>
                      <p className="text-slate-800 bg-white p-2.5 rounded-lg border border-slate-200/80 leading-relaxed">
                        {q.answers?.[3] || '-'}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <span className="font-bold text-slate-700 block">
                        4. Bagaimana penerapan materi {q.book_title} dalam kehidupan sehari-hari?
                      </span>
                      <p className="text-slate-800 bg-white p-2.5 rounded-lg border border-slate-200/80 leading-relaxed">
                        {q.answers?.[4] || '-'}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <span className="font-bold text-slate-700 block">
                        5. Pesan moral atau pembelajaran utama apa yang Anda dapatkan dari buku ini?
                      </span>
                      <p className="text-slate-800 bg-white p-2.5 rounded-lg border border-slate-200/80 leading-relaxed">
                        {q.answers?.[5] || '-'}
                      </p>
                    </div>
                  </div>

                  {/* Feedback Notes if Graded */}
                  {q.notes && (
                    <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs space-y-1">
                      <div className="font-bold text-emerald-900 flex items-center justify-between">
                        <span>Catatan Masukan Penilai:</span>
                        <span className="text-[10px] text-emerald-700">{q.grader_name}</span>
                      </div>
                      <p className="text-emerald-800 italic leading-relaxed">{q.notes}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* =========================================================================
          MODAL: FORM PENILAIAN & KOREKSI RESUME BACAAN
          ========================================================================= */}
      <Dialog
        open={openGradeResumeModal}
        onClose={() => setOpenGradeResumeModal(false)}
        maxWidth="sm"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: '24px', p: 1 } } }}
      >
        <form onSubmit={handleSaveResumeGrade}>
          <DialogTitle sx={{ fontWeight: 900, color: '#0F172A', pb: 1 }}>
            <div className="text-base font-black text-slate-900">Penilaian Resume Bacaan Siswa</div>
            <p className="text-xs text-slate-500 font-normal mt-0.5">
              Beri nilai hasil rangkuman buku siswa untuk tugas literasi sekolah.
            </p>
          </DialogTitle>
          <DialogContent dividers sx={{ py: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 text-xs space-y-1">
              <div>
                Siswa: <strong className="text-slate-900">{selectedResume?.member_name || 'Siswa Spenspra'}</strong>
              </div>
              <div>
                Buku: <strong className="text-slate-900">{selectedResume?.book_title}</strong>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Skor Nilai Literasi (0 - 100) *
              </label>
              <input
                type="number"
                min="0"
                max="100"
                required
                value={gradeResumeForm.score}
                onChange={(e) => setGradeResumeForm({ ...gradeResumeForm, score: e.target.value })}
                className="w-full text-base font-black text-blue-700 px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nama Guru / Korektor Penilai *
              </label>
              <input
                type="text"
                required
                value={gradeResumeForm.grader_name}
                onChange={(e) => setGradeResumeForm({ ...gradeResumeForm, grader_name: e.target.value })}
                placeholder="Contoh: Ibu Conie, S.Pd. (Wali Kelas 7B)"
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Status Verifikasi
              </label>
              <select
                value={gradeResumeForm.status}
                onChange={(e) => setGradeResumeForm({ ...gradeResumeForm, status: e.target.value })}
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 font-semibold"
              >
                <option value="TERVERIFIKASI">Terverifikasi / Dinilai Tuntas</option>
                <option value="PERLU_REVISI">Perlu Perbaikan / Tambahan Rangkuman</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Catatan Ulasan &amp; Masukan Guru (Feedback)
              </label>
              <textarea
                rows={3}
                value={gradeResumeForm.notes}
                onChange={(e) => setGradeResumeForm({ ...gradeResumeForm, notes: e.target.value })}
                placeholder="Tuliskan masukan apresiasi atau evaluasi untuk siswa..."
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <button
              type="button"
              onClick={() => setOpenGradeResumeModal(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-[#1A3D63] hover:bg-[#0A1931] text-white rounded-xl text-xs font-bold transition-colors shadow-sm cursor-pointer"
            >
              Simpan Nilai Resume
            </button>
          </DialogActions>
        </form>
      </Dialog>

      {/* =========================================================================
          MODAL: FORM PENILAIAN & KOREKSI KUIS PEMAHAMAN BUKU
          ========================================================================= */}
      <Dialog
        open={openGradeQuizModal}
        onClose={() => setOpenGradeQuizModal(false)}
        maxWidth="sm"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: '24px', p: 1 } } }}
      >
        <form onSubmit={handleSaveQuizGrade}>
          <DialogTitle sx={{ fontWeight: 900, color: '#0F172A', pb: 1 }}>
            <div className="text-base font-black text-slate-900">Koreksi &amp; Penilaian Kuis Siswa</div>
            <p className="text-xs text-slate-500 font-normal mt-0.5">
              Masukkan skor nilai pemahaman esai buku untuk evaluasi peminjaman.
            </p>
          </DialogTitle>
          <DialogContent dividers sx={{ py: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 text-xs space-y-1">
              <div>
                Siswa: <strong className="text-slate-900">{selectedQuiz?.student_name} ({selectedQuiz?.class_name})</strong>
              </div>
              <div>
                Buku: <strong className="text-slate-900">{selectedQuiz?.book_title}</strong>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Skor Nilai Kuis Pemahaman (0 - 100) *
              </label>
              <input
                type="number"
                min="0"
                max="100"
                required
                value={gradeQuizForm.score}
                onChange={(e) => setGradeQuizForm({ ...gradeQuizForm, score: e.target.value })}
                className="w-full text-base font-black text-emerald-700 px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nama Guru / Wali Kelas / Korektor *
              </label>
              <input
                type="text"
                required
                value={gradeQuizForm.grader_name}
                onChange={(e) => setGradeQuizForm({ ...gradeQuizForm, grader_name: e.target.value })}
                placeholder="Contoh: Ibu Conie, S.Pd. (Wali Kelas 7B)"
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Catatan Evaluasi / Masukan Kuis (Feedback)
              </label>
              <textarea
                rows={3}
                value={gradeQuizForm.notes}
                onChange={(e) => setGradeQuizForm({ ...gradeQuizForm, notes: e.target.value })}
                placeholder="Tuliskan catatan apresiasi atau evaluasi jawaban esai siswa..."
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <button
              type="button"
              onClick={() => setOpenGradeQuizModal(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-colors shadow-sm cursor-pointer"
            >
              Simpan Nilai Kuis
            </button>
          </DialogActions>
        </form>
      </Dialog>

      {/* =========================================================================
          MODAL: TULIS RESUME BARU
          ========================================================================= */}
      <Dialog
        open={openAddModal}
        onClose={() => setOpenAddModal(false)}
        maxWidth="md"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: '24px', p: 1 } } }}
      >
        <form onSubmit={handleCreateResume}>
          <DialogTitle sx={{ fontWeight: 800, color: '#0F172A' }}>
            Tulis Resume &amp; Refleksi Bacaan Buku
          </DialogTitle>
          <DialogContent dividers sx={{ py: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Pilih Siswa / Anggota *</label>
                <select
                  value={formData.member_id}
                  onChange={(e) => setFormData({ ...formData, member_id: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.full_name} ({m.member_code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Buku yang Dibaca *</label>
                <select
                  value={formData.book_id}
                  onChange={(e) => setFormData({ ...formData, book_id: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  {books.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Judul Ulasan / Refleksi *</label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Contoh: Pembelajaran Kepemimpinan dan Keadilan"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Ringkasan Isi Buku *</label>
              <textarea
                rows={3}
                required
                value={formData.summary}
                onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                placeholder="Tuliskan rangkuman pokok-pokok cerita atau materi yang dibahas dalam buku..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Poin Pembelajaran / Key Insights *</label>
              <textarea
                rows={3}
                required
                value={formData.key_insights}
                onChange={(e) => setFormData({ ...formData, key_insights: e.target.value })}
                placeholder="1. Poin penting pertama&#10;2. Nilai moral atau wawasan yang didapatkan&#10;3. Hubungan materi dengan kehidupan sehari-hari"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-center">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Kutipan Favorit (Opsional)</label>
                <input
                  type="text"
                  value={formData.favorite_quotes}
                  onChange={(e) => setFormData({ ...formData, favorite_quotes: e.target.value })}
                  placeholder="Kutipan kalimat yang paling berkesan dari buku..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Rating Kepuasan Buku</label>
                <div className="flex items-center gap-2 pt-1">
                  <Rating
                    value={formData.rating}
                    onChange={(_, val) => setFormData({ ...formData, rating: val || 5 })}
                  />
                  <span className="text-xs font-bold text-slate-600">({formData.rating} / 5 Bintang)</span>
                </div>
              </div>
            </div>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <button
              type="button"
              onClick={() => setOpenAddModal(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-[#1A3D63] hover:bg-[#0A1931] text-white rounded-xl text-xs font-bold transition-colors shadow-sm cursor-pointer"
            >
              Simpan Resume
            </button>
          </DialogActions>
        </form>
      </Dialog>
    </div>
  );
}
