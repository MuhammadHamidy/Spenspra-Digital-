'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { booksApi } from '@/lib/features/library/api/booksApi';
import { Barcode } from '@/lib/common/barcodeGenerator';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import CircularProgress from '@mui/material/CircularProgress';

export default function BooksInventoryPage() {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedBook, setSelectedBook] = useState(null);
  const [openDetailModal, setOpenDetailModal] = useState(false);
  const [openAddModal, setOpenAddModal] = useState(false);
  const [openBatchBarcodeModal, setOpenBatchBarcodeModal] = useState(false);
  const [addingCopies, setAddingCopies] = useState(false);
  const [copiesToAdd, setCopiesToAdd] = useState(1);

  // Batch Sequential Barcode Generator Configuration
  const [barcodeConfig, setBarcodeConfig] = useState({
    prefix: 'PERPUS-',
    includeYear: true,
    startNumber: 1,
    padLength: 4, // 0001, 0002...
    copyStyle: 'SUFFIX', // 'SUFFIX' (PERPUS-2026-0001-C01) | 'CONTINUOUS' (PERPUS-2026-00001, 00002...)
  });
  const [isApplyingBatch, setIsApplyingBatch] = useState(false);
  const [batchFeedback, setBatchFeedback] = useState(null);

  // Single Item Barcode Inline Edit State in Detail Modal
  const [editingItemId, setEditingItemId] = useState(null);
  const [editBarcodeValue, setEditBarcodeValue] = useState('');
  const [savingSingleBarcode, setSavingSingleBarcode] = useState(false);

  // Form State for Add Book
  const [formData, setFormData] = useState({
    title: '',
    author: '',
    isbn: '',
    publisher: '',
    publish_year: 2024,
    category: 'Teknologi & Komputer',
    call_number: 'Rak A-01',
    description: '',
    cover_url: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400',
    total_copies: 2,
    customPrefix: 'PERPUS-',
    useCustomBarcode: false,
  });

  const CATEGORIES = [
    'ALL',
    'Teknologi & Komputer',
    'Sains & Matematika',
    'Sastra & Fiksi',
    'Sejarah & Sosial',
    'Filsafat & Agama',
    'Bisnis & Manajemen',
    'Umum',
  ];

  useEffect(() => {
    loadBooks();
    try {
      const saved = localStorage.getItem('lib_barcode_config');
      if (saved) {
        setBarcodeConfig((prev) => ({ ...prev, ...JSON.parse(saved) }));
      }
    } catch (e) {}
  }, [category]);

  const loadBooks = async () => {
    setLoading(true);
    try {
      const data = await booksApi.getBooks(search, category === 'ALL' ? '' : category);
      setBooks(data || []);
    } catch (err) {
      console.error('Failed to load books:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadBooks();
  };

  // Helper: Menghitung penomoran barcode berurutan secara otomatis
  const computeSequentialBarcodes = (bookList, config) => {
    const currentYear = new Date().getFullYear();
    const yearPrefix = config.includeYear ? `${currentYear}-` : '';
    let currentBookSeq = parseInt(config.startNumber, 10) || 1;
    let continuousSeq = parseInt(config.startNumber, 10) || 1;

    const itemsToUpdate = [];
    const previewList = [];

    bookList.forEach((book) => {
      const items =
        book.items && book.items.length > 0
          ? book.items
          : Array.from({ length: book.total_copies || 1 }, (_, i) => ({
              id: `item-${book.id}-${i + 1}`,
              copy_number: i + 1,
              barcode: `LIB-BK-${book.id?.slice?.(0, 4) || 'BK'}-C0${i + 1}`,
              status: 'AVAILABLE',
            }));

      const bookItemsPreview = [];

      items.forEach((item, cIdx) => {
        let newBarcode = '';
        if (config.copyStyle === 'CONTINUOUS') {
          const numStr = String(continuousSeq).padStart(config.padLength, '0');
          newBarcode = `${config.prefix.trim()}${yearPrefix}${numStr}`;
          continuousSeq++;
        } else {
          const numStr = String(currentBookSeq).padStart(config.padLength, '0');
          const copyNum = item.copy_number || cIdx + 1;
          const copyStr = String(copyNum).padStart(2, '0');
          newBarcode = `${config.prefix.trim()}${yearPrefix}${numStr}-C${copyStr}`;
        }

        itemsToUpdate.push({
          item_id: item.id,
          book_id: book.id,
          book_title: book.title,
          old_barcode: item.barcode,
          barcode: newBarcode,
        });

        bookItemsPreview.push({
          id: item.id,
          copy_number: item.copy_number || cIdx + 1,
          old_barcode: item.barcode,
          new_barcode: newBarcode,
        });
      });

      if (config.copyStyle !== 'CONTINUOUS') {
        currentBookSeq++;
      }

      previewList.push({
        bookId: book.id,
        title: book.title,
        author: book.author,
        callNumber: book.call_number,
        items: bookItemsPreview,
      });
    });

    return { itemsToUpdate, previewList, totalCount: itemsToUpdate.length };
  };

  // Handler: Terapkan penomoran barcode massal berurutan ke semua buku
  const handleApplyBatchBarcodes = async () => {
    setIsApplyingBatch(true);
    setBatchFeedback(null);

    try {
      const { itemsToUpdate } = computeSequentialBarcodes(books, barcodeConfig);
      if (itemsToUpdate.length === 0) {
        alert('Tidak ada eksemplar buku untuk diperbarui.');
        setIsApplyingBatch(false);
        return;
      }

      // 1. Kirim pembaruan ke backend
      await booksApi.batchRenumberBarcodes(
        itemsToUpdate.map((it) => ({
          item_id: it.item_id,
          barcode: it.barcode,
        }))
      );

      // 2. Simpan cache lokal untuk Kios scan langsung & offline
      try {
        const localMap = JSON.parse(localStorage.getItem('lib_custom_item_barcodes') || '{}');
        itemsToUpdate.forEach((it) => {
          localMap[it.barcode] = {
            id: it.item_id,
            barcode: it.barcode,
            book_id: it.book_id,
            title: it.book_title,
            status: 'AVAILABLE',
            condition: 'GOOD',
          };
        });
        localStorage.setItem('lib_custom_item_barcodes', JSON.stringify(localMap));
      } catch (e) {}

      // 3. Update state buku secara realtime
      setBooks((prevBooks) => {
        return prevBooks.map((b) => {
          const updatedItems = (b.items || []).map((it) => {
            const match = itemsToUpdate.find((m) => m.item_id === it.id);
            return match ? { ...it, barcode: match.barcode } : it;
          });
          return { ...b, items: updatedItems };
        });
      });

      // 4. Simpan konfigurasi terakhir
      try {
        localStorage.setItem('lib_barcode_config', JSON.stringify(barcodeConfig));
      } catch (e) {}

      setBatchFeedback({
        type: 'success',
        message: `Berhasil menomori ulang ${itemsToUpdate.length} eksemplar buku fisik secara berurutan!`,
      });

      setTimeout(() => {
        setOpenBatchBarcodeModal(false);
        setBatchFeedback(null);
        loadBooks();
      }, 1500);
    } catch (err) {
      setBatchFeedback({
        type: 'error',
        message: err.message || 'Gagal menerapkan penomoran barcode.',
      });
    } finally {
      setIsApplyingBatch(false);
    }
  };

  // Handler: Edit barcode tunggal per eksemplar
  const handleSaveSingleBarcode = async (itemId) => {
    if (!editBarcodeValue.trim()) {
      alert('Kode barcode tidak boleh kosong');
      return;
    }
    setSavingSingleBarcode(true);
    try {
      const cleanCode = editBarcodeValue.trim();
      await booksApi.updateItemBarcode(itemId, cleanCode);

      // Update selectedBook
      if (selectedBook && selectedBook.items) {
        const updatedItems = selectedBook.items.map((it) =>
          it.id === itemId ? { ...it, barcode: cleanCode } : it
        );
        setSelectedBook({ ...selectedBook, items: updatedItems });
      }

      // Update books state
      setBooks((prev) =>
        prev.map((b) => {
          if (b.items) {
            return {
              ...b,
              items: b.items.map((it) => (it.id === itemId ? { ...it, barcode: cleanCode } : it)),
            };
          }
          return b;
        })
      );

      // Sync ke local overrides
      try {
        const localMap = JSON.parse(localStorage.getItem('lib_custom_item_barcodes') || '{}');
        localMap[cleanCode] = {
          id: itemId,
          barcode: cleanCode,
          book_id: selectedBook?.id,
          title: selectedBook?.title,
          status: 'AVAILABLE',
        };
        localStorage.setItem('lib_custom_item_barcodes', JSON.stringify(localMap));
      } catch (e) {}

      setEditingItemId(null);
      setEditBarcodeValue('');
    } catch (err) {
      alert(err.message || 'Gagal menyimpan barcode baru.');
    } finally {
      setSavingSingleBarcode(false);
    }
  };

  const handleOpenDetail = async (book) => {
    try {
      const fullBook = await booksApi.getBook(book.id);
      setSelectedBook(fullBook || book);
      setOpenDetailModal(true);
    } catch (err) {
      setSelectedBook(book);
      setOpenDetailModal(true);
    }
  };

  const handleAddCopies = async () => {
    if (!selectedBook) return;
    setAddingCopies(true);
    try {
      await booksApi.addCopies(selectedBook.id, copiesToAdd);
      const updated = await booksApi.getBook(selectedBook.id);
      setSelectedBook(updated);
      loadBooks();
      alert(`Berhasil menambahkan ${copiesToAdd} eksemplar fisik barcode!`);
    } catch (err) {
      alert(err.message || 'Gagal menambahkan eksemplar');
    } finally {
      setAddingCopies(false);
    }
  };

  const handleCreateBook = async (e) => {
    e.preventDefault();
    try {
      await booksApi.createBook({
        ...formData,
        publish_year: parseInt(formData.publish_year, 10),
        total_copies: parseInt(formData.total_copies, 10),
      });
      setOpenAddModal(false);
      setFormData({
        title: '',
        author: '',
        isbn: '',
        publisher: '',
        publish_year: 2024,
        category: 'Teknologi & Komputer',
        call_number: 'Rak A-01',
        description: '',
        cover_url: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400',
        total_copies: 2,
      });
      loadBooks();
      alert('Buku dan eksemplar barcode berhasil ditambahkan ke katalog!');
    } catch (err) {
      alert(err.message || 'Gagal menambahkan buku');
    }
  };

  const handleDeleteBook = async (bookId, title) => {
    if (confirm(`Hapus buku "${title}" dan seluruh eksemplarnya dari katalog?`)) {
      try {
        await booksApi.deleteBook(bookId);
        loadBooks();
      } catch (err) {
        alert(err.message || 'Gagal menghapus buku');
      }
    }
  };

  // Filter by status if selected
  const filteredBooks = books.filter((b) => {
    if (statusFilter === 'ALL') return true;
    const avail = b.available_copies ?? b.total_copies ?? 1;
    if (statusFilter === 'AVAILABLE') return avail > 0;
    if (statusFilter === 'BORROWED') return avail < (b.total_copies ?? 1);
    if (statusFilter === 'EMPTY') return avail === 0;
    return true;
  });

  // Calculate stats for bottom cards
  const totalTitles = books.length;
  const totalCopies = books.reduce((acc, b) => acc + (b.total_copies || 1), 0);
  const totalAvailable = books.reduce(
    (acc, b) => acc + (b.available_copies !== undefined ? b.available_copies : b.total_copies || 1),
    0
  );
  const totalInLoans = Math.max(0, totalCopies - totalAvailable);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* 1. Page Header: Title + Unified Book Catalog Actions (Tambah Manual & Import Excel) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Daftar Koleksi Buku
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Perpustakaan SMPN 1 Prambon &bull; Kelola katalog buku, entri manual, dan import data eksemplar.
          </p>
        </div>

        {/* Unified Book Input Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/books/import"
            className="px-4 py-2.5 rounded-xl border border-slate-300 hover:border-slate-400 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-2 transition-all shadow-xs"
          >
            <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            <span>Import Excel</span>
          </Link>

          <button
            onClick={() => setOpenAddModal(true)}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/25 flex items-center gap-2 transition-all cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            <span>Tambah Buku Manual</span>
          </button>
        </div>
      </div>

      {/* 2. Top 3 Summary Stat Cards (Pindah ke atas agar langsung terbaca pustakawan) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {/* Card 1: Total Koleksi Judul */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Total Koleksi Judul
            </span>
            <h4 className="text-2xl font-black text-slate-900 mt-0.5">{totalTitles} Judul</h4>
            <p className="text-[11px] text-slate-500 font-medium">Terdaftar di katalog sistem</p>
          </div>
        </div>

        {/* Card 2: Total Eksemplar Fisik */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Buku Tersedia di Rak
            </span>
            <h4 className="text-2xl font-black text-emerald-600 mt-0.5">
              {totalAvailable} Eksemplar
            </h4>
            <p className="text-[11px] text-slate-500 font-medium">Siap untuk dipinjam siswa</p>
          </div>
        </div>

        {/* Card 3: Dalam Peminjaman */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Dalam Peminjaman
            </span>
            <h4 className="text-2xl font-black text-indigo-600 mt-0.5">{totalInLoans} Buku</h4>
            <p className="text-[11px] text-slate-500 font-medium">Beredar pada anggota siswa</p>
          </div>
        </div>
      </div>

      {/* 3. DEDICATED BARCODE UTILITIES (Tata letak terpisah dari penambahan/import buku) */}
      <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-mono font-bold text-xs shrink-0">
            |||
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-800">
              Manajemen &amp; Cetak Barcode Koleksi
            </h3>
            <p className="text-[11px] text-slate-500">
              Konfigurasi penomoran barcode fisik dan pencetakan stiker barcode buku.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setBatchFeedback(null);
              setOpenBatchBarcodeModal(true);
            }}
            className="px-3.5 py-2 rounded-xl border border-amber-300 hover:border-amber-400 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
            title="Atur format barcode kustom dan generate penomoran berurutan"
          >
            <svg className="w-3.5 h-3.5 text-amber-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>Atur Format Barcode</span>
          </button>

          <Link
            href="/books/print-labels"
            className="px-3.5 py-2 rounded-xl border border-slate-300 hover:border-slate-400 bg-white text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
          >
            <svg className="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            <span>Cetak Label Barcode</span>
          </Link>
        </div>
      </div>

      {/* 2. Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="flex-1 w-full flex items-center gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Cari judul buku, pengarang, ISBN, atau nomor rak..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:outline-none transition-all"
            />
            <svg className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            Cari
          </button>
        </form>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="text-xs rounded-xl border border-slate-200 bg-slate-50 py-2 px-3 focus:outline-none font-semibold text-slate-700 cursor-pointer"
          >
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat === 'ALL' ? 'Semua Kategori' : cat}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs rounded-xl border border-slate-200 bg-slate-50 py-2 px-3 focus:outline-none font-semibold text-slate-700 cursor-pointer"
          >
            <option value="ALL">Semua Status</option>
            <option value="AVAILABLE">Tersedia</option>
            <option value="BORROWED">Dalam Peminjaman</option>
            <option value="EMPTY">Stok Habis</option>
          </select>
        </div>
      </div>

      {/* 3. Main Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
            <CircularProgress size={32} />
            <span className="text-xs font-medium">Memuat katalog koleksi buku...</span>
          </div>
        ) : filteredBooks.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <p className="text-sm font-bold text-slate-700">Tidak ada koleksi buku ditemukan</p>
            <p className="text-xs text-slate-400 mt-1">Coba sesuaikan kata kunci pencarian atau filter kategori Anda.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th className="px-5 py-3.5">Buku & Detail</th>
                  <th className="px-5 py-3.5">Kategori</th>
                  <th className="px-5 py-3.5">Lokasi Rak</th>
                  <th className="px-5 py-3.5 text-center">Eksemplar</th>
                  <th className="px-5 py-3.5 text-center">Status</th>
                  <th className="px-5 py-3.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredBooks.map((b) => {
                  const avail = b.available_copies ?? b.total_copies ?? 1;
                  const total = b.total_copies ?? 1;
                  const isAvailable = avail > 0;
                  const isPartiallyBorrowed = avail < total && avail > 0;

                  return (
                    <tr key={b.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Book & Detail */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-14 rounded-lg bg-slate-100 overflow-hidden shrink-0 border border-slate-200/80 shadow-xs">
                            <img
                              src={b.cover_url || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=200'}
                              alt={b.title}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.target.src = 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=200';
                              }}
                            />
                          </div>
                          <div>
                            <Link
                              href={`/books/${b.id || 'BK-2024-089'}`}
                              className="font-bold text-slate-900 hover:text-blue-600 transition-colors text-left line-clamp-1 cursor-pointer"
                            >
                              {b.title}
                            </Link>
                            <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                              {b.author} &bull; {b.publisher || 'Penerbit'} ({b.publish_year || 2024})
                            </p>
                            <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                              ISBN: {b.isbn || '978-602-0000-0'}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          {b.category || 'Umum'}
                        </span>
                      </td>

                      {/* Shelf / Location */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold text-slate-700">
                          <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                          </svg>
                          <span>{b.call_number || 'Rak A-01'}</span>
                        </div>
                      </td>

                      {/* Copies & Stock */}
                      <td className="px-5 py-3.5 text-center whitespace-nowrap">
                        <div className="inline-flex flex-col items-center">
                          <span className="font-bold text-slate-800">
                            {avail} / {total}
                          </span>
                          <span className="text-[10px] text-slate-400">tersedia</span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-3.5 text-center whitespace-nowrap">
                        {avail === 0 ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            Dipinjam Penuh
                          </span>
                        ) : isPartiallyBorrowed ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            Sebagian Dipinjam
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Tersedia
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenDetail(b)}
                            title="Lihat Detail & Barcode"
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDeleteBook(b.id, b.title)}
                            title="Hapus Buku"
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Detail & Barcode */}
      <Dialog
        open={openDetailModal}
        onClose={() => setOpenDetailModal(false)}
        maxWidth="md"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: '20px', p: 1 } } }}
      >
        {selectedBook && (
          <>
            <DialogTitle sx={{ fontWeight: 800, color: '#0F172A', pb: 1 }}>
              Detail Koleksi & Eksemplar Barcode
            </DialogTitle>
            <DialogContent dividers sx={{ py: 3 }}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-3">
                  <div className="h-56 rounded-xl bg-slate-100 overflow-hidden shadow-xs">
                    <img
                      src={selectedBook.cover_url || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400'}
                      alt={selectedBook.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900 leading-tight">
                      {selectedBook.title}
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">{selectedBook.author}</p>
                  </div>
                  <div className="text-xs space-y-1 text-slate-600 pt-2 border-t border-slate-100">
                    <div><span className="font-semibold">ISBN:</span> {selectedBook.isbn || '-'}</div>
                    <div><span className="font-semibold">Penerbit:</span> {selectedBook.publisher || '-'} ({selectedBook.publish_year || '-'})</div>
                    <div><span className="font-semibold">Kategori:</span> {selectedBook.category}</div>
                    <div><span className="font-semibold">Lokasi Rak:</span> {selectedBook.call_number || '-'}</div>
                  </div>
                </div>

                <div className="md:col-span-2 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-sm text-slate-800">
                      Eksemplar Fisik ({selectedBook.items?.length || selectedBook.total_copies || 0} Unit)
                    </h4>
                    <div className="flex items-center gap-2">
                      <select
                        value={copiesToAdd}
                        onChange={(e) => setCopiesToAdd(parseInt(e.target.value, 10))}
                        className="text-xs border border-slate-200 rounded-lg p-1.5 bg-slate-50"
                      >
                        <option value={1}>+1 Eksemplar</option>
                        <option value={2}>+2 Eksemplar</option>
                        <option value={5}>+5 Eksemplar</option>
                      </select>
                      <button
                        onClick={handleAddCopies}
                        disabled={addingCopies}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {addingCopies ? 'Menambah...' : 'Tambah Eksemplar'}
                      </button>
                    </div>
                  </div>

                  <div className="max-h-72 overflow-y-auto space-y-2.5 pr-1">
                    {selectedBook.items && selectedBook.items.length > 0 ? (
                      selectedBook.items.map((it) => {
                        const isEditing = editingItemId === it.id;
                        return (
                          <div
                            key={it.id}
                            className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                          >
                            <div className="flex-1">
                              {isEditing ? (
                                <div className="space-y-1.5">
                                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                                    Edit Kode Barcode Eksemplar #{it.copy_number}:
                                  </label>
                                  <div className="flex items-center gap-1.5">
                                    <input
                                      type="text"
                                      value={editBarcodeValue}
                                      onChange={(e) => setEditBarcodeValue(e.target.value)}
                                      className="px-2.5 py-1 text-xs font-mono font-bold rounded-lg border border-blue-400 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 max-w-[200px]"
                                      autoFocus
                                    />
                                    <button
                                      type="button"
                                      onClick={() => handleSaveSingleBarcode(it.id)}
                                      disabled={savingSingleBarcode}
                                      className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                                      title="Simpan Barcode"
                                    >
                                      {savingSingleBarcode ? '...' : '✓ Simpan'}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingItemId(null);
                                        setEditBarcodeValue('');
                                      }}
                                      className="px-2 py-1 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold transition-all cursor-pointer"
                                      title="Batal"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono text-xs font-black text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200 shadow-2xs">
                                      {it.barcode}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingItemId(it.id);
                                        setEditBarcodeValue(it.barcode);
                                      }}
                                      className="px-2 py-0.5 rounded-md text-[10px] font-bold text-[#0066CC] hover:text-blue-900 bg-blue-50/80 hover:bg-blue-100 border border-blue-200 transition-colors flex items-center gap-1 cursor-pointer"
                                      title="Ubah kode barcode eksemplar ini"
                                    >
                                      <span>✏️</span>
                                      <span>Edit</span>
                                    </button>
                                  </div>
                                  <div className="text-[11px] text-slate-400">
                                    Eksemplar #{it.copy_number} &bull; Kondisi: {it.condition || 'Baik'} &bull; Status:{' '}
                                    <span className={it.status === 'AVAILABLE' ? 'text-emerald-600 font-bold' : 'text-blue-600 font-bold'}>
                                      {it.status === 'AVAILABLE' ? 'Tersedia di Rak' : 'Dipinjam'}
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>
                            <div className="bg-white p-1 rounded-md border border-slate-200 scale-90 self-start sm:self-auto">
                              <Barcode value={it.barcode} height={30} width={1} fontSize={10} />
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-xs text-slate-400 py-4">Belum ada eksemplar fisik terdaftar.</p>
                    )}
                  </div>
                </div>
              </div>
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
              <button
                onClick={() => setOpenDetailModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Tutup
              </button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Modal Tambah Buku Baru */}
      <Dialog
        open={openAddModal}
        onClose={() => setOpenAddModal(false)}
        maxWidth="sm"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: '20px', p: 1 } } }}
      >
        <form onSubmit={handleCreateBook}>
          <DialogTitle sx={{ fontWeight: 800, color: '#0F172A' }}>
            Tambah Koleksi Buku Baru
          </DialogTitle>
          <DialogContent dividers sx={{ py: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Judul Buku *</label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Contoh: Pemrograman Python Modern"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Pengarang / Penulis *</label>
                <input
                  type="text"
                  required
                  value={formData.author}
                  onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                  placeholder="Nama Penulis"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">ISBN</label>
                <input
                  type="text"
                  value={formData.isbn}
                  onChange={(e) => setFormData({ ...formData, isbn: e.target.value })}
                  placeholder="978-602-xxxx-xx"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Penerbit</label>
                <input
                  type="text"
                  value={formData.publisher}
                  onChange={(e) => setFormData({ ...formData, publisher: e.target.value })}
                  placeholder="Gramedia / Andi"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tahun Terbit</label>
                <input
                  type="number"
                  value={formData.publish_year}
                  onChange={(e) => setFormData({ ...formData, publish_year: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Kategori</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  {CATEGORIES.filter((c) => c !== 'ALL').map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Lokasi Rak / Call No.</label>
                <input
                  type="text"
                  value={formData.call_number}
                  onChange={(e) => setFormData({ ...formData, call_number: e.target.value })}
                  placeholder="Rak A-01"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Jumlah Eksemplar Fisik Awal</label>
              <input
                type="number"
                min="1"
                max="20"
                value={formData.total_copies}
                onChange={(e) => setFormData({ ...formData, total_copies: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Sistem akan otomatis mencetak kode barcode unik untuk setiap eksemplar.
              </p>
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
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm cursor-pointer"
            >
              Simpan & Cetak Barcode
            </button>
          </DialogActions>
        </form>
      </Dialog>

      {/* =========================================================================
          MODAL: GENERATOR BARCODE KUSTOM & PENOMORAN BERURUTAN MASSAL
          Requirement: "iya buatkan barcode kustom dan bisa menyeluruh secara urut anpa harus di input manual perbuku"
          ========================================================================= */}
      {openBatchBarcodeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200">
            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-amber-500 text-white flex items-center justify-center text-xl shadow-md shadow-amber-500/25 shrink-0">
                  ⚡
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-black text-slate-900 leading-tight">
                    Generator Barcode Kustom &amp; Penomoran Berurutan
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Terapkan format barcode kustom ke seluruh koleksi buku secara berurutan tanpa input manual satu per satu.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpenBatchBarcodeModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center text-sm font-bold transition-all cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
              {batchFeedback && (
                <div
                  className={`p-4 rounded-2xl border text-xs font-semibold flex items-center gap-2.5 ${
                    batchFeedback.type === 'success'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-rose-50 border-rose-200 text-rose-800'
                  }`}
                >
                  <span className="text-base">{batchFeedback.type === 'success' ? '✓' : '⚠️'}</span>
                  <span>{batchFeedback.message}</span>
                </div>
              )}

              {/* Grid 2 Columns: Config Controls & Live Preview */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Left Column: Config Controls (5 cols) */}
                <div className="lg:col-span-5 bg-slate-50 p-5 rounded-2xl border border-slate-200/80 space-y-4">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <span>⚙️</span>
                    <span>Pengaturan Format Barcode</span>
                  </h4>

                  {/* 1. Prefix Barcode */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Awalan (Prefix) Barcode
                    </label>
                    <input
                      type="text"
                      value={barcodeConfig.prefix}
                      onChange={(e) =>
                        setBarcodeConfig({ ...barcodeConfig, prefix: e.target.value.toUpperCase() })
                      }
                      placeholder="Contoh: PERPUS-, SMKN1-, LIB-BK-"
                      className="w-full px-3 py-2 text-xs font-mono font-bold uppercase rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">
                      Bisa disesuaikan dengan kode sekolah atau perpustakaan Anda.
                    </p>
                  </div>

                  {/* 2. Sertakan Tahun */}
                  <div className="flex items-center gap-2.5 pt-1">
                    <input
                      type="checkbox"
                      id="includeYearCheck"
                      checked={barcodeConfig.includeYear}
                      onChange={(e) =>
                        setBarcodeConfig({ ...barcodeConfig, includeYear: e.target.checked })
                      }
                      className="w-4 h-4 text-amber-600 rounded border-slate-300 focus:ring-amber-500 cursor-pointer"
                    />
                    <label htmlFor="includeYearCheck" className="text-xs font-bold text-slate-700 cursor-pointer">
                      Sertakan Tahun Berjalan ({new Date().getFullYear()}-)
                    </label>
                  </div>

                  {/* 3. Nomor Urut Mulai & Digit Padding */}
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Nomor Mulai
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={barcodeConfig.startNumber}
                        onChange={(e) =>
                          setBarcodeConfig({
                            ...barcodeConfig,
                            startNumber: Math.max(1, parseInt(e.target.value, 10) || 1),
                          })
                        }
                        className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Digit Penomoran
                      </label>
                      <select
                        value={barcodeConfig.padLength}
                        onChange={(e) =>
                          setBarcodeConfig({
                            ...barcodeConfig,
                            padLength: parseInt(e.target.value, 10),
                          })
                        }
                        className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                      >
                        <option value={3}>3 Digit (001)</option>
                        <option value={4}>4 Digit (0001)</option>
                        <option value={5}>5 Digit (00001)</option>
                        <option value={6}>6 Digit (000001)</option>
                      </select>
                    </div>
                  </div>

                  {/* 4. Gaya Penomoran Eksemplar Ganda */}
                  <div className="pt-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Gaya Penomoran Eksemplar
                    </label>
                    <div className="space-y-2">
                      <label
                        onClick={() => setBarcodeConfig({ ...barcodeConfig, copyStyle: 'SUFFIX' })}
                        className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                          barcodeConfig.copyStyle === 'SUFFIX'
                            ? 'bg-amber-50 border-amber-300 text-amber-900 font-bold shadow-2xs'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        <input
                          type="radio"
                          name="copyStyleRadio"
                          checked={barcodeConfig.copyStyle === 'SUFFIX'}
                          onChange={() => {}}
                          className="mt-0.5 text-amber-600 focus:ring-amber-500"
                        />
                        <div>
                          <p className="font-bold">Per Judul + Suffix Eksemplar (-C01)</p>
                          <p className="text-[10px] font-mono text-slate-500 mt-0.5">
                            {barcodeConfig.prefix}{barcodeConfig.includeYear ? `${new Date().getFullYear()}-` : ''}0001-C01, ...-C02
                          </p>
                        </div>
                      </label>

                      <label
                        onClick={() => setBarcodeConfig({ ...barcodeConfig, copyStyle: 'CONTINUOUS' })}
                        className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                          barcodeConfig.copyStyle === 'CONTINUOUS'
                            ? 'bg-amber-50 border-amber-300 text-amber-900 font-bold shadow-2xs'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        <input
                          type="radio"
                          name="copyStyleRadio"
                          checked={barcodeConfig.copyStyle === 'CONTINUOUS'}
                          onChange={() => {}}
                          className="mt-0.5 text-amber-600 focus:ring-amber-500"
                        />
                        <div>
                          <p className="font-bold">Nomor Seri Fisik Berkelanjutan</p>
                          <p className="text-[10px] font-mono text-slate-500 mt-0.5">
                            {barcodeConfig.prefix}{barcodeConfig.includeYear ? `${new Date().getFullYear()}-` : ''}00001, ...00002
                          </p>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Summary Box */}
                  <div className="bg-amber-100/60 border border-amber-200/90 rounded-xl p-3 text-[11px] text-amber-900 leading-relaxed font-medium">
                    💡 <strong>Otomatis &amp; Rapi:</strong> Seluruh buku fisik di perpustakaan akan diurutkan dan diberikan stiker barcode baru secara sistematis. Scanner di Kios Siswa akan langsung membaca kode baru ini.
                  </div>
                </div>

                {/* Right Column: Interactive Live Preview Table (7 cols) */}
                <div className="lg:col-span-7 space-y-3">
                  {(() => {
                    const { previewList, totalCount } = computeSequentialBarcodes(books, barcodeConfig);
                    return (
                      <>
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                            <span>👁️</span>
                            <span>Pratinjau Hasil Penomoran ({totalCount} Eksemplar)</span>
                          </h4>
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-blue-50 border border-blue-200 text-[#0066CC]">
                            {books.length} Judul Buku Terpilih
                          </span>
                        </div>

                        <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-2xs">
                          <div className="max-h-96 overflow-y-auto">
                            <table className="w-full text-left text-xs">
                              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-100 sticky top-0 z-10 backdrop-blur-sm">
                                <tr>
                                  <th className="px-3 py-2.5">Buku &amp; Eksemplar</th>
                                  <th className="px-3 py-2.5">Barcode Lama</th>
                                  <th className="px-3 py-2.5">Barcode Baru (Otomatis)</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {previewList.map((b) =>
                                  b.items.map((item) => (
                                    <tr key={`${b.bookId}-${item.copy_number}`} className="hover:bg-slate-50/70">
                                      <td className="px-3 py-2">
                                        <span className="font-bold text-slate-900 block truncate max-w-[200px]" title={b.title}>
                                          {b.title}
                                        </span>
                                        <span className="text-[10px] text-slate-400">
                                          Eksemplar #{item.copy_number} {b.callNumber ? `• ${b.callNumber}` : ''}
                                        </span>
                                      </td>
                                      <td className="px-3 py-2 font-mono text-[11px] text-slate-400 line-through">
                                        {item.old_barcode || '-'}
                                      </td>
                                      <td className="px-3 py-2">
                                        <span className="font-mono text-[11px] font-black px-2 py-0.5 rounded bg-blue-50 border border-blue-200 text-[#0066CC]">
                                          {item.new_barcode}
                                        </span>
                                      </td>
                                    </tr>
                                  ))
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setOpenBatchBarcodeModal(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleApplyBatchBarcodes}
                disabled={isApplyingBatch}
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-extrabold shadow-md shadow-amber-500/25 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                {isApplyingBatch ? (
                  <>
                    <CircularProgress size={14} color="inherit" />
                    <span>Menerapkan Penomoran...</span>
                  </>
                ) : (
                  <>
                    <span>⚡ Terapkan Penomoran ke Seluruh Buku</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
