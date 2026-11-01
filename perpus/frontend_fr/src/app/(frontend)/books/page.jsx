'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { booksApi } from '@/lib/features/library/api/booksApi';
import { Barcode } from '@/lib/common/barcodeGenerator';
import { getCategoryFromDDC, generateCallNumber } from '@/lib/common/excelHelper';
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
  const [openEditModal, setOpenEditModal] = useState(false);
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

  // Form State for Add Book (Synchronized with Excel Import Standard)
  const [formData, setFormData] = useState({
    title: '',
    author: '',
    isbn: '',
    publisher: '',
    city: 'Jakarta',
    publish_year: 2024,
    category: 'Teknologi & Terapan',
    ddc: '004',
    shelf_location: 'Rak A-01',
    description: '',
    cover_url: '',
    total_copies: 2,
    customPrefix: 'PERPUS-',
    useCustomBarcode: false,
  });

  // Form State for Edit Book
  const [editFormData, setEditFormData] = useState({
    id: '',
    title: '',
    author: '',
    isbn: '',
    publisher: '',
    city: '',
    publish_year: 2024,
    category: 'Umum',
    ddc: '000',
    shelf_location: 'Rak A-01',
    description: '',
    cover_url: '',
  });

  const CATEGORIES = [
    'ALL',
    'Karya Umum & Komputer',
    'Filsafat & Psikologi',
    'Agama',
    'Ilmu Sosial & Pendidikan',
    'Bahasa & Linguistik',
    'Sains & Matematika',
    'Teknologi & Terapan',
    'Kesenian & Olahraga',
    'Kesusastraan & Novel',
    'Sejarah & Geografi',
    'Buku Paket Pelajaran',
    'Pengembangan Diri',
    'Teknologi & Komputer',
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

  // Handle upload cover image from local computer/device
  const handleCoverUpload = (e, isEdit = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 3 * 1024 * 1024) {
      alert('Ukuran file foto cover maksimal 3 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      if (isEdit) {
        setEditFormData((prev) => ({ ...prev, cover_url: dataUrl }));
      } else {
        setFormData((prev) => ({ ...prev, cover_url: dataUrl }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCreateBook = async (e) => {
    e.preventDefault();
    try {
      const fullPublisher = formData.city
        ? `${formData.city} : ${formData.publisher}`
        : formData.publisher;
      const baseCallNumber = generateCallNumber(formData.ddc, formData.author, formData.title);
      const callNumber = formData.shelf_location
        ? `${baseCallNumber} [${formData.shelf_location}]`
        : baseCallNumber;

      await booksApi.createBook({
        title: formData.title,
        author: formData.author,
        isbn: formData.isbn,
        publisher: fullPublisher,
        publish_year: parseInt(formData.publish_year, 10) || new Date().getFullYear(),
        category: formData.category,
        call_number: callNumber,
        description: formData.description,
        cover_url: formData.cover_url || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400',
        total_copies: parseInt(formData.total_copies, 10) || 1,
      });

      setOpenAddModal(false);
      setFormData({
        title: '',
        author: '',
        isbn: '',
        publisher: '',
        city: 'Jakarta',
        publish_year: 2024,
        category: 'Karya Umum & Komputer',
        ddc: '004',
        shelf_location: 'Rak A-01',
        description: '',
        cover_url: '',
        total_copies: 2,
      });
      loadBooks();
      alert('Buku dan eksemplar barcode berhasil didaftarkan ke katalog!');
    } catch (err) {
      alert(err.message || 'Gagal menambahkan buku');
    }
  };

  const handleOpenEdit = (b) => {
    let publisher = b.publisher || '';
    let city = '';
    if (publisher.includes(' : ')) {
      const parts = publisher.split(' : ');
      city = parts[0]?.trim() || '';
      publisher = parts.slice(1).join(' : ')?.trim() || '';
    }

    let ddc = '000';
    let shelf = 'Rak A-01';
    if (b.call_number) {
      const ddcMatch = b.call_number.match(/^([0-9]{3}(\.[0-9]+)?)/);
      if (ddcMatch) ddc = ddcMatch[1];
      const shelfMatch = b.call_number.match(/\[(.*?)\]/);
      if (shelfMatch) {
        shelf = shelfMatch[1];
      } else if (b.call_number.toLowerCase().includes('rak')) {
        shelf = b.call_number;
      }
    }

    setEditFormData({
      id: b.id,
      title: b.title || '',
      author: b.author || '',
      isbn: b.isbn || '',
      publisher,
      city,
      publish_year: b.publish_year || 2024,
      category: b.category || 'Umum',
      ddc,
      shelf_location: shelf,
      description: b.description || '',
      cover_url: b.cover_url || '',
    });
    setOpenEditModal(true);
  };

  const handleUpdateBook = async (e) => {
    e.preventDefault();
    try {
      const fullPublisher = editFormData.city
        ? `${editFormData.city} : ${editFormData.publisher}`
        : editFormData.publisher;
      const baseCallNumber = generateCallNumber(editFormData.ddc, editFormData.author, editFormData.title);
      const callNumber = editFormData.shelf_location
        ? `${baseCallNumber} [${editFormData.shelf_location}]`
        : baseCallNumber;

      await booksApi.updateBook(editFormData.id, {
        title: editFormData.title,
        author: editFormData.author,
        isbn: editFormData.isbn,
        publisher: fullPublisher,
        publish_year: parseInt(editFormData.publish_year, 10) || new Date().getFullYear(),
        category: editFormData.category,
        call_number: callNumber,
        description: editFormData.description,
        cover_url: editFormData.cover_url,
      });

      setOpenEditModal(false);
      loadBooks();
      alert('Perubahan data buku dan foto cover berhasil disimpan!');
    } catch (err) {
      alert(err.message || 'Gagal memperbarui data buku');
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
            className="px-3.5 py-2 rounded-xl border border-[#B9B0D2] hover:border-[#4B3B78] bg-[#EDEAF5] hover:bg-[#FAF9FD] text-[#4B3B78] text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
            title="Atur format barcode kustom dan generate penomoran berurutan"
          >
            <svg className="w-3.5 h-3.5 text-[#4B3B78]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                            onClick={() => handleOpenEdit(b)}
                            title="Edit Informasi & Foto Buku"
                            className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
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
        maxWidth="md"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: '24px', p: 1 } } }}
      >
        <form onSubmit={handleCreateBook}>
          <DialogTitle sx={{ fontWeight: 900, color: '#0F172A', display: 'flex', alignItems: 'center', justifyContent: 'between', pb: 1 }}>
            <div>
              <div className="text-base font-black text-slate-900">Tambah Koleksi Buku Baru</div>
              <p className="text-xs text-slate-500 font-normal mt-0.5">
                Formulir pendaftaran judul dan eksemplar buku baru (sinkron dengan kolom standar impor Excel).
              </p>
            </div>
          </DialogTitle>
          <DialogContent dividers sx={{ py: 3, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            {/* Foto / Cover Buku Upload & Preview Section */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/90 flex flex-col sm:flex-row gap-4 items-center">
              <div className="w-20 h-28 rounded-xl bg-slate-200 border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden shrink-0 shadow-xs relative group">
                {formData.cover_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={formData.cover_url} alt="Cover Buku" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center p-2 text-slate-400">
                    <svg className="w-6 h-6 mx-auto mb-1 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="text-[9px] font-bold block leading-tight">Foto Sampul</span>
                  </div>
                )}
              </div>

              <div className="flex-1 space-y-2 w-full">
                <label className="block text-xs font-bold text-slate-800">
                  Foto Sampul / Cover Buku
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  <label className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    <span>Pilih Foto dari Komputer / HP</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleCoverUpload(e, false)}
                      className="hidden"
                    />
                  </label>
                  {formData.cover_url && (
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, cover_url: '' })}
                      className="text-xs text-rose-600 hover:underline font-semibold"
                    >
                      Hapus Foto
                    </button>
                  )}
                </div>
                <input
                  type="url"
                  placeholder="Atau tempel URL gambar sampul di sini (opsional)..."
                  value={formData.cover_url}
                  onChange={(e) => setFormData({ ...formData, cover_url: e.target.value })}
                  className="w-full text-xs px-3 py-1.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>

            {/* Judul & Pengarang */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Judul Buku *</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Contoh: Bumi Manusia"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
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
            </div>

            {/* Penerbit & Kota Terbit */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Penerbit *</label>
                <input
                  type="text"
                  required
                  value={formData.publisher}
                  onChange={(e) => setFormData({ ...formData, publisher: e.target.value })}
                  placeholder="Contoh: Gramedia / Lentera Dipantara"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Kota Terbit *</label>
                <input
                  type="text"
                  required
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="Contoh: Jakarta / Surabaya"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>

            {/* Tahun Terbit & ISBN */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tahun Terbit *</label>
                <input
                  type="number"
                  required
                  value={formData.publish_year}
                  onChange={(e) => setFormData({ ...formData, publish_year: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">ISBN *</label>
                <input
                  type="text"
                  required
                  value={formData.isbn}
                  onChange={(e) => setFormData({ ...formData, isbn: e.target.value })}
                  placeholder="978-602-xxxx-xx"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>

            {/* Klasifikasi DDC & Nomor Rak */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Klasifikasi DDC *
                </label>
                <input
                  type="text"
                  required
                  value={formData.ddc}
                  onChange={(e) => {
                    const newDDC = e.target.value;
                    const autoCat = getCategoryFromDDC(newDDC);
                    setFormData({ ...formData, ddc: newDDC, category: autoCat });
                  }}
                  placeholder="Contoh: 813 / 510 / 004"
                  className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Otomatis memetakan kategori perpustakaan dan nomor panggil buku.
                </p>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nomor Rak / Lokasi Rak *
                </label>
                <input
                  type="text"
                  required
                  value={formData.shelf_location}
                  onChange={(e) => setFormData({ ...formData, shelf_location: e.target.value })}
                  placeholder="Contoh: Rak Sastra 01, Rak A-02"
                  className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Posisi rak fisik agar siswa mudah menemukan buku di ruangan.
                </p>
              </div>
            </div>

            {/* Kategori & Eksemplar */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Kategori Buku</label>
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
                <label className="block text-xs font-bold text-slate-700 mb-1">Jumlah Eksemplar Fisik Awal *</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  required
                  value={formData.total_copies}
                  onChange={(e) => setFormData({ ...formData, total_copies: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Sistem otomatis mencetak barcode / QR Code unik untuk setiap eksemplar.
                </p>
              </div>
            </div>

            {/* Deskripsi */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Deskripsi / Sinopsis (Opsional)</label>
              <textarea
                rows={2}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Tuliskan ringkasan singkat atau sinopsis buku..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
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
              Simpan &amp; Generate Barcode
            </button>
          </DialogActions>
        </form>
      </Dialog>

      {/* =========================================================================
          MODAL: EDIT KOLEKSI BUKU & FOTO COVER
          ========================================================================= */}
      <Dialog
        open={openEditModal}
        onClose={() => setOpenEditModal(false)}
        maxWidth="md"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: '24px', p: 1 } } }}
      >
        <form onSubmit={handleUpdateBook}>
          <DialogTitle sx={{ fontWeight: 900, color: '#0F172A', pb: 1 }}>
            <div className="text-base font-black text-slate-900">Edit Informasi &amp; Foto Buku</div>
            <p className="text-xs text-slate-500 font-normal mt-0.5">
              Perbarui judul, pengarang, nomor rak, nomor DDC, sinopsis, atau ganti foto sampul buku.
            </p>
          </DialogTitle>
          <DialogContent dividers sx={{ py: 3, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            {/* Foto / Cover Buku Upload & Preview Section */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/90 flex flex-col sm:flex-row gap-4 items-center">
              <div className="w-20 h-28 rounded-xl bg-slate-200 border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden shrink-0 shadow-xs relative group">
                {editFormData.cover_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={editFormData.cover_url} alt="Cover Buku" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center p-2 text-slate-400">
                    <svg className="w-6 h-6 mx-auto mb-1 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="text-[9px] font-bold block leading-tight">Foto Sampul</span>
                  </div>
                )}
              </div>

              <div className="flex-1 space-y-2 w-full">
                <label className="block text-xs font-bold text-slate-800">
                  Ganti Foto Sampul / Cover Buku
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  <label className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    <span>Pilih Foto Baru dari Komputer / HP</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleCoverUpload(e, true)}
                      className="hidden"
                    />
                  </label>
                  {editFormData.cover_url && (
                    <button
                      type="button"
                      onClick={() => setEditFormData({ ...editFormData, cover_url: '' })}
                      className="text-xs text-rose-600 hover:underline font-semibold"
                    >
                      Hapus Foto
                    </button>
                  )}
                </div>
                <input
                  type="url"
                  placeholder="Atau tempel URL gambar sampul di sini (opsional)..."
                  value={editFormData.cover_url}
                  onChange={(e) => setEditFormData({ ...editFormData, cover_url: e.target.value })}
                  className="w-full text-xs px-3 py-1.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-600"
                />
              </div>
            </div>

            {/* Judul & Pengarang */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Judul Buku *</label>
                <input
                  type="text"
                  required
                  value={editFormData.title}
                  onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 font-semibold text-slate-900"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Pengarang / Penulis *</label>
                <input
                  type="text"
                  required
                  value={editFormData.author}
                  onChange={(e) => setEditFormData({ ...editFormData, author: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>

            {/* Penerbit & Kota Terbit */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Penerbit *</label>
                <input
                  type="text"
                  required
                  value={editFormData.publisher}
                  onChange={(e) => setEditFormData({ ...editFormData, publisher: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Kota Terbit</label>
                <input
                  type="text"
                  value={editFormData.city}
                  onChange={(e) => setEditFormData({ ...editFormData, city: e.target.value })}
                  placeholder="Contoh: Jakarta"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>

            {/* Tahun Terbit & ISBN */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tahun Terbit</label>
                <input
                  type="number"
                  value={editFormData.publish_year}
                  onChange={(e) => setEditFormData({ ...editFormData, publish_year: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">ISBN</label>
                <input
                  type="text"
                  value={editFormData.isbn}
                  onChange={(e) => setEditFormData({ ...editFormData, isbn: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 font-mono"
                />
              </div>
            </div>

            {/* Klasifikasi DDC & Nomor Rak */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Klasifikasi DDC
                </label>
                <input
                  type="text"
                  value={editFormData.ddc}
                  onChange={(e) => {
                    const newDDC = e.target.value;
                    const autoCat = getCategoryFromDDC(newDDC);
                    setEditFormData({ ...editFormData, ddc: newDDC, category: autoCat });
                  }}
                  className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nomor Rak / Lokasi Rak
                </label>
                <input
                  type="text"
                  value={editFormData.shelf_location}
                  onChange={(e) => setEditFormData({ ...editFormData, shelf_location: e.target.value })}
                  className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>

            {/* Kategori */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Kategori Buku</label>
              <select
                value={editFormData.category}
                onChange={(e) => setEditFormData({ ...editFormData, category: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                {CATEGORIES.filter((c) => c !== 'ALL').map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Deskripsi */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Deskripsi / Sinopsis</label>
              <textarea
                rows={3}
                value={editFormData.description}
                onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                placeholder="Tuliskan ringkasan singkat atau sinopsis buku..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <button
              type="button"
              onClick={() => setOpenEditModal(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm cursor-pointer"
            >
              Simpan Perubahan
            </button>
          </DialogActions>
        </form>
      </Dialog>

      {/* =========================================================================
          MODAL: GENERATOR BARCODE KUSTOM & PENOMORAN BERURUTAN MASSAL
          Requirement: "iya buatkan barcode kustom dan bisa menyeluruh secara urut anpa harus di input manual perbuku"
          ========================================================================= */}
      {openBatchBarcodeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#172033]/60 backdrop-blur-xs animate-in fade-in duration-150 font-sans">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border border-[#E5E7EB]">
            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b border-[#E5E7EB] flex items-center justify-between bg-gradient-to-r from-[#EDEAF5] via-[#FAF9FD] to-white">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-[#4B3B78] text-[#F2C94C] flex items-center justify-center text-xl shadow-md shadow-[#4B3B78]/20 shrink-0">
                  <svg className="w-5 h-5 text-[#F2C94C]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-[#172033] leading-tight">
                    Generator Barcode Kustom &amp; Penomoran Berurutan
                  </h3>
                  <p className="text-xs text-[#667085] mt-0.5">
                    Terapkan format barcode kustom ke seluruh koleksi buku secara berurutan tanpa input manual satu per satu.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpenBatchBarcodeModal(false)}
                className="w-8 h-8 rounded-full bg-[#F8F9FC] hover:bg-[#E5E7EB] text-[#667085] hover:text-[#172033] flex items-center justify-center text-sm font-bold transition-all cursor-pointer border border-[#E5E7EB]"
                aria-label="Tutup Modal"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
              {batchFeedback && (
                <div
                  className={`p-4 rounded-xl border text-xs font-semibold flex items-center gap-2.5 ${
                    batchFeedback.type === 'success'
                      ? 'bg-[#F7FCF9] border-[#A9D8BC] text-[#2E7D5B]'
                      : 'bg-[#FFF9F8] border-[#F1B4AC] text-[#C0392B]'
                  }`}
                >
                  <span className="text-base">{batchFeedback.type === 'success' ? '✓' : '⚠️'}</span>
                  <span>{batchFeedback.message}</span>
                </div>
              )}

              {/* Grid 2 Columns: Config Controls & Live Preview */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Left Column: Config Controls (5 cols) */}
                <div className="lg:col-span-5 bg-[#F8F9FC] p-5 rounded-2xl border border-[#E5E7EB] space-y-4">
                  <h4 className="text-xs font-bold text-[#172033] uppercase tracking-wider flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#4B3B78]"></span>
                    <span>Pengaturan Format Barcode</span>
                  </h4>

                  {/* 1. Prefix Barcode */}
                  <div>
                    <label className="block text-xs font-bold text-[#344054] mb-1">
                      Awalan (Prefix) Barcode
                    </label>
                    <input
                      type="text"
                      value={barcodeConfig.prefix}
                      onChange={(e) =>
                        setBarcodeConfig({ ...barcodeConfig, prefix: e.target.value.toUpperCase() })
                      }
                      placeholder="Contoh: PERPUS-, SMKN1-, LIB-BK-"
                      className="w-full px-3 py-2 text-xs font-mono font-bold uppercase rounded-xl border border-[#E5E7EB] bg-white text-[#172033] focus:outline-none focus:ring-2 focus:ring-[#4B3B78] focus:border-[#4B3B78]"
                    />
                    <p className="text-[10px] text-[#667085] mt-1">
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
                      className="w-4 h-4 text-[#4B3B78] rounded border-[#E5E7EB] focus:ring-[#4B3B78] cursor-pointer accent-[#4B3B78]"
                    />
                    <label htmlFor="includeYearCheck" className="text-xs font-bold text-[#344054] cursor-pointer">
                      Sertakan Tahun Berjalan ({new Date().getFullYear()}-)
                    </label>
                  </div>

                  {/* 3. Nomor Urut Mulai & Digit Padding */}
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-xs font-bold text-[#344054] mb-1">
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
                        className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-[#E5E7EB] bg-white text-[#172033] focus:outline-none focus:ring-2 focus:ring-[#4B3B78] focus:border-[#4B3B78]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#344054] mb-1">
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
                        className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-[#E5E7EB] bg-white text-[#172033] focus:outline-none focus:ring-2 focus:ring-[#4B3B78] focus:border-[#4B3B78]"
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
                    <label className="block text-xs font-bold text-[#344054] mb-1.5">
                      Gaya Penomoran Eksemplar
                    </label>
                    <div className="space-y-2">
                      <label
                        onClick={() => setBarcodeConfig({ ...barcodeConfig, copyStyle: 'SUFFIX' })}
                        className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                          barcodeConfig.copyStyle === 'SUFFIX'
                            ? 'bg-[#EDEAF5] border-[#B9B0D2] text-[#172033] font-bold shadow-xs'
                            : 'bg-white border-[#E5E7EB] text-[#667085] hover:bg-[#F8F9FC]'
                        }`}
                      >
                        <input
                          type="radio"
                          name="copyStyleRadio"
                          checked={barcodeConfig.copyStyle === 'SUFFIX'}
                          onChange={() => {}}
                          className="mt-0.5 text-[#4B3B78] focus:ring-[#4B3B78] accent-[#4B3B78]"
                        />
                        <div>
                          <p className="font-bold">Per Judul + Suffix Eksemplar (-C01)</p>
                          <p className="text-[10px] font-mono text-[#667085] mt-0.5">
                            {barcodeConfig.prefix}{barcodeConfig.includeYear ? `${new Date().getFullYear()}-` : ''}0001-C01, ...-C02
                          </p>
                        </div>
                      </label>

                      <label
                        onClick={() => setBarcodeConfig({ ...barcodeConfig, copyStyle: 'CONTINUOUS' })}
                        className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                          barcodeConfig.copyStyle === 'CONTINUOUS'
                            ? 'bg-[#EDEAF5] border-[#B9B0D2] text-[#172033] font-bold shadow-xs'
                            : 'bg-white border-[#E5E7EB] text-[#667085] hover:bg-[#F8F9FC]'
                        }`}
                      >
                        <input
                          type="radio"
                          name="copyStyleRadio"
                          checked={barcodeConfig.copyStyle === 'CONTINUOUS'}
                          onChange={() => {}}
                          className="mt-0.5 text-[#4B3B78] focus:ring-[#4B3B78] accent-[#4B3B78]"
                        />
                        <div>
                          <p className="font-bold">Nomor Seri Fisik Berkelanjutan</p>
                          <p className="text-[10px] font-mono text-[#667085] mt-0.5">
                            {barcodeConfig.prefix}{barcodeConfig.includeYear ? `${new Date().getFullYear()}-` : ''}00001, ...00002
                          </p>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Summary Box */}
                  <div className="bg-[#FAF9FD] border border-[#B9B0D2]/70 rounded-xl p-3 text-[11px] text-[#30264F] leading-relaxed font-medium">
                    💡 <strong>Otomatis &amp; Rapi:</strong> Seluruh buku fisik di perpustakaan akan diurutkan dan diberikan stiker barcode baru secara sistematis. Scanner di Layanan Mandiri akan langsung membaca kode baru ini.
                  </div>
                </div>

                {/* Right Column: Interactive Live Preview Table (7 cols) */}
                <div className="lg:col-span-7 space-y-3">
                  {(() => {
                    const { previewList, totalCount } = computeSequentialBarcodes(books, barcodeConfig);
                    return (
                      <>
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-[#172033] uppercase tracking-wider flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-[#4F8FBB]"></span>
                            <span>Pratinjau Hasil Penomoran ({totalCount} Eksemplar)</span>
                          </h4>
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#EDEAF5] border border-[#B9B0D2] text-[#4B3B78]">
                            {books.length} Judul Buku Terpilih
                          </span>
                        </div>

                        <div className="border border-[#E5E7EB] rounded-2xl overflow-hidden bg-white shadow-xs">
                          <div className="max-h-96 overflow-y-auto">
                            <table className="w-full text-left text-xs">
                              <thead className="bg-[#F8F9FC] text-[#667085] font-semibold uppercase tracking-wider text-[10px] border-b border-[#E5E7EB] sticky top-0 z-10 backdrop-blur-sm">
                                <tr>
                                  <th className="px-3 py-2.5">Buku &amp; Eksemplar</th>
                                  <th className="px-3 py-2.5">Barcode Lama</th>
                                  <th className="px-3 py-2.5">Barcode Baru (Otomatis)</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-[#E5E7EB]">
                                {previewList.map((b) =>
                                  b.items.map((item) => (
                                    <tr key={`${b.bookId}-${item.copy_number}`} className="hover:bg-[#FAF9FD] transition-colors">
                                      <td className="px-3 py-2">
                                        <span className="font-bold text-[#172033] block truncate max-w-[200px]" title={b.title}>
                                          {b.title}
                                        </span>
                                        <span className="text-[10px] text-[#667085]">
                                          Eksemplar #{item.copy_number} {b.callNumber ? `• ${b.callNumber}` : ''}
                                        </span>
                                      </td>
                                      <td className="px-3 py-2 font-mono text-[11px] text-[#98A2B3] line-through">
                                        {item.old_barcode || '-'}
                                      </td>
                                      <td className="px-3 py-2">
                                        <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-md bg-[#EDEAF5] border border-[#B9B0D2] text-[#4B3B78]">
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
            <div className="p-4 sm:p-5 border-t border-[#E5E7EB] bg-[#F8F9FC] flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setOpenBatchBarcodeModal(false)}
                className="px-4 py-2.5 rounded-xl border border-[#E5E7EB] hover:bg-white hover:border-[#B9B0D2] text-[#344054] text-xs font-semibold transition-all cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleApplyBatchBarcodes}
                disabled={isApplyingBatch}
                className="px-5 py-2.5 rounded-xl bg-[#4B3B78] hover:bg-[#3D2E66] text-white text-xs font-bold shadow-md shadow-[#4B3B78]/25 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                {isApplyingBatch ? (
                  <>
                    <CircularProgress size={14} color="inherit" />
                    <span>Menerapkan Penomoran...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 text-[#F2C94C]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <span>Terapkan Penomoran ke Seluruh Buku</span>
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
