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
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import CircularProgress from '@mui/material/CircularProgress';
import Rating from '@mui/material/Rating';

export default function ReadingInsightsPage() {
  const [resumes, setResumes] = useState([]);
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [openAddModal, setOpenAddModal] = useState(false);

  // Dropdown options
  const [members, setMembers] = useState([]);
  const [books, setBooks] = useState([]);

  // Form State
  const [formData, setFormData] = useState({
    member_id: '',
    book_id: '',
    title: '',
    summary: '',
    key_insights: '',
    favorite_quotes: '',
    rating: 5,
  });

  useEffect(() => {
    loadData();
    loadDropdowns();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [resList, ins] = await Promise.all([
        readingApi.getReadingResumes('', '', search),
        readingApi.getReadingInsights(),
      ]);
      setResumes(resList || []);
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

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadData();
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
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">
            Pencatatan Resume & Insight Kebiasaan Membaca
          </h1>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            Wadah refleksi literasi anggota, dokumentasi poin pembelajaran buku, dan analitik budaya membaca.
          </p>
        </div>

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
                {insights?.total_resumes_submitted || 0}
              </div>
              <span className="text-[10px] text-purple-600">Karya refleksi</span>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-100 text-center">
              <span className="text-[11px] font-bold text-amber-700 uppercase">Kepuasan Buku</span>
              <div className="text-3xl font-black text-amber-900 mt-1 flex items-center justify-center gap-1">
                {(insights?.average_rating || 5.0).toFixed(1)}
                <span className="text-amber-500 text-xl leading-none">★</span>
              </div>
              <span className="text-[10px] text-amber-600">Rating rata-rata</span>
            </div>
          </div>

          {/* Literacy Quote */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/60 italic text-xs text-slate-600 leading-relaxed">
            "Membaca tanpa merangkum bagai menyantap hidangan tanpa mencernanya. Catatan resume mengubah informasi menjadi kebijaksanaan."
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
              { category: 'Teknologi', count: 4, percentage: 40 },
              { category: 'Sastra & Fiksi', count: 3, percentage: 30 },
              { category: 'Pengembangan Diri', count: 2, percentage: 20 },
              { category: 'Sains & Sejarah', count: 1, percentage: 10 },
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
                  <span className="text-[10px] text-slate-400 block">Resume</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Resumes Feed Section */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Daftar Resume Bacaan Anggota</h2>
            <p className="text-xs text-slate-500">Kumpulan catatan dan poin pembelajaran yang telah disubmit</p>
          </div>

          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Cari judul resume atau poin insight..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="text-xs px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none"
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
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                      {r.book_category || 'Kategori Buku'}
                    </span>
                    <Rating value={r.rating} readOnly size="small" />
                  </div>

                  <h3 className="text-base font-bold text-slate-800 leading-snug">{r.title}</h3>

                  <div className="text-xs text-slate-500 font-medium">
                    Buku: <strong className="text-slate-700">{r.book_title}</strong> {r.book_author ? `oleh ${r.book_author}` : ''}
                  </div>

                  <div className="pt-2 border-t border-slate-100 space-y-2">
                    <div>
                      <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-0.5">
                        Ringkasan Bacaan:
                      </span>
                      <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">{r.summary}</p>
                    </div>

                    <div>
                      <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-0.5">
                        Poin Pembelajaran (Key Insights):
                      </span>
                      <p className="text-xs text-slate-600 leading-relaxed line-clamp-3 whitespace-pre-line">
                        {r.key_insights}
                      </p>
                    </div>

                    {r.favorite_quotes && (
                      <div className="p-2.5 rounded-xl bg-slate-50 border-l-2 border-[#1A3D63] text-xs italic text-slate-600">
                        {r.favorite_quotes}
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                  <div className="font-semibold text-slate-600">
                    Oleh: {r.member_name || 'Anggota'}
                  </div>
                  <div>
                    {new Date(r.submitted_at).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Tulis Resume Baru */}
      <Dialog
        open={openAddModal}
        onClose={() => setOpenAddModal(false)}
        maxWidth="md"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: '24px', p: 1 } } }}
      >
        <form onSubmit={handleCreateResume}>
          <DialogTitle sx={{ fontWeight: 900, color: '#0A1931' }}>
            Tulis Resume & Refleksi Bacaan Buku
          </DialogTitle>
          <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2, py: 2.5 }}>
            <div className="grid grid-cols-2 gap-3">
              <TextField
                select
                label="Pilih Anggota Penulis"
                required
                fullWidth
                size="small"
                value={formData.member_id}
                onChange={(e) => setFormData({ ...formData, member_id: e.target.value })}
              >
                {members.map((m) => (
                  <MenuItem key={m.id} value={m.id}>
                    {m.full_name} ({m.member_code})
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                select
                label="Pilih Buku yang Dibaca"
                required
                fullWidth
                size="small"
                value={formData.book_id}
                onChange={(e) => setFormData({ ...formData, book_id: e.target.value })}
              >
                {books.map((b) => (
                  <MenuItem key={b.id} value={b.id}>
                    {b.title}
                  </MenuItem>
                ))}
              </TextField>
            </div>

            <TextField
              label="Judul Catatan / Refleksi Resume"
              required
              fullWidth
              size="small"
              placeholder="Contoh: Penerapan Prinsip Clean Code pada Proyek Web"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />

            <TextField
              label="Ringkasan Bacaan (Summary)"
              required
              multiline
              rows={3}
              fullWidth
              size="small"
              placeholder="Jelaskan ringkasan alur atau gagasan pokok buku..."
              value={formData.summary}
              onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
            />

            <TextField
              label="Poin Pembelajaran (Key Insights)"
              required
              multiline
              rows={3}
              fullWidth
              size="small"
              placeholder="1. Poin penting pertama&#10;2. Poin penting kedua&#10;3. Pelajaran yang dapat diterapkan"
              value={formData.key_insights}
              onChange={(e) => setFormData({ ...formData, key_insights: e.target.value })}
            />

            <TextField
              label="Kutipan Favorit (Favorite Quote)"
              fullWidth
              size="small"
              placeholder='Contoh: "Bermimpilah, karena Tuhan akan memeluk mimpi-mimpi itu."'
              value={formData.favorite_quotes}
              onChange={(e) => setFormData({ ...formData, favorite_quotes: e.target.value })}
            />

            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-700">Rating Kepuasan Buku:</span>
              <Rating
                value={formData.rating}
                onChange={(_, val) => setFormData({ ...formData, rating: val || 5 })}
              />
            </div>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button
              onClick={() => setOpenAddModal(false)}
              sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 600 }}
            >
              Batal
            </Button>
            <Button
              type="submit"
              variant="contained"
              sx={{ bgcolor: '#1A3D63', borderRadius: '10px', textTransform: 'none', fontWeight: 700 }}
            >
              Publikasikan Resume
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </div>
  );
}
