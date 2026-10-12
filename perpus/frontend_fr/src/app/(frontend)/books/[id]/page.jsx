'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { booksApi } from '@/lib/features/library/api/booksApi';
import { Barcode } from '@/lib/common/barcodeGenerator';
import CircularProgress from '@mui/material/CircularProgress';

export default function BookDetailPage() {
  const params = useParams();
  const router = useRouter();
  const bookId = params?.id;

  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('metadata'); // 'metadata' | 'history' | 'location'

  useEffect(() => {
    if (bookId) {
      loadBookDetails();
    }
  }, [bookId]);

  const loadBookDetails = async () => {
    setLoading(true);
    try {
      const data = await booksApi.getBook(bookId);
      if (data) {
        setBook(data);
      } else {
        // Fallback default sample data matching Image 2
        setBook({
          id: bookId,
          catalog_id: 'BK-2024-089',
          title: 'Laskar Pelangi',
          author: 'Andrea Hirata',
          publisher: 'Bentang Pustaka',
          isbn: '978-979-1227-02-5',
          category: 'Fiksi',
          sub_category: 'Novel Kontemporer',
          publish_year: 2005,
          total_pages: 529,
          language: 'Bahasa Indonesia',
          total_copies: 5,
          available_copies: 3,
          cover_url: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600',
          description:
            'Laskar Pelangi adalah novel pertama karya Andrea Hirata yang diterbitkan oleh Bentang Pustaka pada tahun 2005. Novel ini bercerita tentang kehidupan 10 anak dari keluarga miskin yang bersekolah di sebuah sekolah Muhammadiyah di Belitung yang penuh dengan keterbatasan.',
          shelf_location: 'Rak Sastra A-04',
          input_by: 'Admin Pustaka',
          updated_at: '15 Mei 2024',
        });
      }
    } catch (err) {
      console.warn('Could not fetch book detail from backend, using fallback:', err);
      setBook({
        id: bookId,
        catalog_id: 'BK-2024-089',
        title: 'Laskar Pelangi',
        author: 'Andrea Hirata',
        publisher: 'Bentang Pustaka',
        isbn: '978-979-1227-02-5',
        category: 'Fiksi',
        sub_category: 'Novel Kontemporer',
        publish_year: 2005,
        total_pages: 529,
        language: 'Bahasa Indonesia',
        total_copies: 5,
        available_copies: 3,
        cover_url: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600',
        description:
          'Laskar Pelangi adalah novel pertama karya Andrea Hirata yang diterbitkan oleh Bentang Pustaka pada tahun 2005. Novel ini bercerita tentang kehidupan 10 anak dari keluarga miskin yang bersekolah di sebuah sekolah Muhammadiyah di Belitung yang penuh dengan keterbatasan.',
        shelf_location: 'Rak Sastra A-04',
        input_by: 'Admin Pustaka',
        updated_at: '15 Mei 2024',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCopyId = () => {
    const idText = book?.catalog_id || book?.id || 'BK-2024-089';
    navigator.clipboard?.writeText(idText);
    alert(`ID Katalog "${idText}" berhasil disalin ke papan klip!`);
  };

  const handleDelete = async () => {
    if (confirm(`Yakin ingin menghapus koleksi buku "${book?.title}" dari sistem?`)) {
      try {
        await booksApi.deleteBook(bookId);
        router.push('/books');
      } catch (err) {
        alert(err.message || 'Gagal menghapus buku');
      }
    }
  };

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-slate-400 gap-3">
        <CircularProgress size={32} />
        <span className="text-xs font-semibold">Memuat informasi buku...</span>
      </div>
    );
  }

  const catalogId = book?.catalog_id || `BK-${new Date().getFullYear()}-${String(book?.id || '089').slice(0, 3).toUpperCase()}`;
  const totalCopies = book?.total_copies || 5;
  const availableCopies = book?.available_copies ?? 3;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* 1. Top Header with Back Button and Actions */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link
            href="/books"
            className="text-xs font-bold text-slate-500 hover:text-blue-600 flex items-center gap-1.5 transition-colors mb-1.5"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Kembali ke Daftar Buku</span>
          </Link>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Detail Informasi Buku
          </h1>
          <p className="text-xs font-mono text-slate-400 mt-0.5">
            ID Katalog: <span className="font-bold text-slate-600">{catalogId}</span>
          </p>
        </div>

        {/* Top Right Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => alert('Tautan koleksi buku disalin ke clipboard!')}
            className="px-3.5 py-2 rounded-xl border border-slate-200 hover:border-slate-300 bg-white text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            <span>Bagikan</span>
          </button>

          <button
            onClick={() => alert('Mode edit data buku dibuka.')}
            className="px-3.5 py-2 rounded-xl border border-amber-200 hover:border-amber-300 bg-amber-50/50 text-amber-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            <span>Edit Data</span>
          </button>

          <button
            onClick={handleDelete}
            className="px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            <span>Hapus</span>
          </button>
        </div>
      </div>

      {/* 2. Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Book Cover, Stock Counters & Barcode Label (4.5 cols / ~38%) */}
        <div className="lg:col-span-4 space-y-5">
          {/* Book Cover with Status Badge */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="relative aspect-[3/4] rounded-xl overflow-hidden bg-slate-100 shadow-sm">
              <img
                src={book?.cover_url || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600'}
                alt={book?.title}
                className="w-full h-full object-cover"
              />
              <span className="absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-black bg-emerald-500 text-white shadow-md">
                TERSEDIA
              </span>
            </div>

            {/* Total Stok vs Tersedia Counters */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 text-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Total Stok
                </span>
                <h4 className="text-xl font-black text-slate-900 mt-0.5">{totalCopies}</h4>
              </div>

              <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-100 text-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">
                  Tersedia
                </span>
                <h4 className="text-xl font-black text-blue-700 mt-0.5">{availableCopies}</h4>
              </div>
            </div>
          </div>

          {/* Barcode & Label Buku Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3.5">
            <div>
              <div className="flex items-center gap-1.5 text-blue-600 font-bold text-xs">
                <span>#</span>
                <h3 className="text-sm font-bold text-slate-900">Barcode & Label Buku</h3>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Gunakan barcode ini untuk pelabelan fisik buku.
              </p>
            </div>

            {/* Dotted Barcode Box */}
            <div className="p-4 rounded-xl border border-dashed border-slate-300 bg-slate-50/70 flex flex-col items-center justify-center space-y-2 text-center">
              <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-xs">
                <Barcode value={catalogId} height={42} width={1.4} fontSize={11} />
              </div>
              <p className="text-[10px] text-slate-400 font-mono tracking-wider font-semibold">
                PERPUSTAKAAN SMPN 1 PRAMBON
              </p>
            </div>

            {/* Unduh & Cetak Buttons */}
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <button
                onClick={() => alert(`Barcode ${catalogId} berhasil diunduh.`)}
                className="py-2 px-3 border border-slate-200 hover:border-slate-300 bg-white text-slate-700 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <svg className="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span>Unduh</span>
              </button>

              <button
                onClick={() => window.print()}
                className="py-2 px-3 border border-slate-200 hover:border-slate-300 bg-white text-slate-700 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <svg className="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                <span>Cetak</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Book Metadata Tabs, Specs & Synopsis (8 cols / ~62%) */}
        <div className="lg:col-span-8 bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/80 shadow-xs space-y-6">
          {/* Tabs Navigation */}
          <div className="flex border-b border-slate-200 gap-6">
            <button
              onClick={() => setActiveTab('metadata')}
              className={`pb-3 text-xs font-bold flex items-center gap-1.5 transition-colors border-b-2 cursor-pointer ${
                activeTab === 'metadata'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-400 hover:text-slate-700'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <span>Metadata</span>
            </button>

            <button
              onClick={() => setActiveTab('history')}
              className={`pb-3 text-xs font-bold flex items-center gap-1.5 transition-colors border-b-2 cursor-pointer ${
                activeTab === 'history'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-400 hover:text-slate-700'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Riwayat Pinjam</span>
            </button>

            <button
              onClick={() => setActiveTab('location')}
              className={`pb-3 text-xs font-bold flex items-center gap-1.5 transition-colors border-b-2 cursor-pointer ${
                activeTab === 'location'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-400 hover:text-slate-700'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>Penempatan</span>
            </button>
          </div>

          {/* Book Title & Author */}
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight tracking-tight">
              {book?.title || 'Laskar Pelangi'}
            </h2>
            <p className="text-sm font-semibold text-blue-600 mt-1">
              oleh {book?.author || 'Andrea Hirata'}
            </p>
          </div>

          {/* Two-Column Metadata Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8 pt-2 text-xs">
            <div className="space-y-1">
              <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">
                Penerbit
              </span>
              <p className="font-bold text-slate-900 text-sm">
                {book?.publisher || 'Bentang Pustaka'}
              </p>
            </div>

            <div className="space-y-1">
              <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">
                Kategori Utama
              </span>
              <p className="font-bold text-slate-900 text-sm">
                {book?.category || 'Fiksi'}
              </p>
            </div>

            <div className="space-y-1">
              <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">
                Nomor ISBN
              </span>
              <p className="font-mono font-bold text-slate-900 text-sm">
                {book?.isbn || '978-979-1227-02-5'}
              </p>
            </div>

            <div className="space-y-1">
              <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">
                Sub Kategori
              </span>
              <p className="font-bold text-slate-900 text-sm">
                {book?.sub_category || 'Novel Kontemporer'}
              </p>
            </div>

            <div className="space-y-1">
              <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">
                Tahun Terbit
              </span>
              <p className="font-bold text-slate-900 text-sm">
                {book?.publish_year || 2005}
              </p>
            </div>

            <div className="space-y-1">
              <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">
                Jumlah Halaman
              </span>
              <p className="font-bold text-slate-900 text-sm">
                {book?.total_pages || 529} Halaman
              </p>
            </div>

            <div className="space-y-1">
              <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">
                Bahasa
              </span>
              <p className="font-bold text-slate-900 text-sm">
                {book?.language || 'Bahasa Indonesia'}
              </p>
            </div>

            <div className="space-y-1">
              <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">
                ID Katalog
              </span>
              <p className="font-mono font-bold text-slate-900 text-sm">
                {catalogId}
              </p>
            </div>
          </div>

          {/* Sinopsis / Deskripsi Quote Block */}
          <div className="pt-4 border-t border-slate-100 space-y-2">
            <div className="flex items-center gap-1.5 text-slate-700 font-bold text-xs">
              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h7" />
              </svg>
              <span>Sinopsis / Deskripsi</span>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border-l-4 border-blue-600 text-xs text-slate-600 italic leading-relaxed">
              &ldquo;{book?.description || 'Laskar Pelangi adalah novel pertama karya Andrea Hirata yang menceritakan perjuangan anak-anak Belitung dalam menuntut ilmu.'}&rdquo;
            </div>
          </div>

          {/* Bottom Info Bar & Action Buttons */}
          <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-xs">
            <div className="flex items-center gap-3 text-slate-400 font-medium">
              <span>Diinput oleh: <strong className="text-slate-700">{book?.input_by || 'Admin Pustaka'}</strong></span>
              <span>&bull;</span>
              <span>Update Terakhir: <strong className="text-slate-700">{book?.updated_at || '15 Mei 2024'}</strong></span>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                onClick={handleCopyId}
                className="px-3.5 py-2 border border-slate-200 hover:border-slate-300 bg-white text-slate-700 font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                </svg>
                <span>Salin ID</span>
              </button>

              <Link
                href="/circulation"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md shadow-blue-600/25 flex items-center gap-2 transition-all cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                <span>Pinjamkan Buku</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
