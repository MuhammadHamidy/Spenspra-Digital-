'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { booksApi } from '@/lib/features/library/api/booksApi';
import { parseBookCSV, downloadBookImportTemplate, SAMPLE_BOOK_IMPORT_DATA } from '@/lib/common/excelHelper';
import CircularProgress from '@mui/material/CircularProgress';

export default function BooksImportPage() {
  const [file, setFile] = useState(null);
  const [parsedRows, setParsedRows] = useState([]);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [dragActive, setDragActive] = useState(false);

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    processFile(selectedFile);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const processFile = async (fileObj) => {
    setFile(fileObj);
    setParsing(true);
    setErrorMsg('');
    setImportResult(null);

    try {
      const text = await fileObj.text();
      const rows = parseBookCSV(text);
      if (rows.length === 0) {
        throw new Error('File tidak memiliki data buku yang valid atau format kolom tidak sesuai.');
      }
      setParsedRows(rows);
    } catch (err) {
      setErrorMsg(err.message || 'Gagal memproses file Excel/CSV.');
      setParsedRows([]);
    } finally {
      setParsing(false);
    }
  };

  const handleUseDemoData = () => {
    setErrorMsg('');
    setImportResult(null);
    const mapped = SAMPLE_BOOK_IMPORT_DATA.map((item) => ({
      title: item.Judul,
      isbn: item.ISBN,
      author: item.Pengarang,
      publisher: item.Penerbit,
      publish_year: item.Tahun,
      category: item.Kategori,
      call_number: item.NomorPanggil,
      copies_count: item.JumlahEksemplar,
      description: item.Deskripsi,
    }));
    setParsedRows(mapped);
    setFile({ name: 'sampel_data_perpustakaan_smpn1prambon.xlsx' });
  };

  const handleCommitImport = async () => {
    if (parsedRows.length === 0) return;
    setImporting(true);
    setErrorMsg('');

    try {
      const result = await booksApi.importBatchBooks(parsedRows);
      setImportResult(result);
      setParsedRows([]);
      setFile(null);
    } catch (err) {
      setErrorMsg(err.message || 'Gagal menyimpan data import ke server.');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <Link
            href="/books"
            className="text-xs font-bold text-slate-500 hover:text-blue-600 inline-flex items-center gap-1.5 transition-colors mb-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Kembali ke Daftar Buku</span>
          </Link>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Import Data Buku
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Unggah berkas Excel atau CSV untuk menambahkan data katalog buku secara massal ke dalam sistem perpustakaan.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => downloadBookImportTemplate(true)}
            className="px-3.5 py-2 rounded-xl border border-slate-300 hover:border-slate-400 bg-white text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span>Unduh Template Excel</span>
          </button>

          <button
            onClick={handleUseDemoData}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/25 flex items-center gap-2 transition-all cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span>Gunakan Data Sampel</span>
          </button>
        </div>
      </div>

      {/* 2. Three-Step Stepper */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative">
          {/* Step 1 */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-blue-600 text-white font-black text-sm flex items-center justify-center shrink-0 shadow-md shadow-blue-600/30">
              1
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900">1. Unduh Template</h3>
              <p className="text-[11px] text-slate-400">Gunakan format kolom baku</p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex items-center gap-3">
            <div
              className={`w-9 h-9 rounded-full font-black text-sm flex items-center justify-center shrink-0 ${
                file || parsedRows.length > 0
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'bg-slate-100 text-slate-500'
              }`}
            >
              2
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900">2. Unggah Spreadsheet</h3>
              <p className="text-[11px] text-slate-400">File .xlsx, .xls atau .csv</p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex items-center gap-3">
            <div
              className={`w-9 h-9 rounded-full font-black text-sm flex items-center justify-center shrink-0 ${
                importResult
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                  : 'bg-slate-100 text-slate-500'
              }`}
            >
              3
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900">3. Validasi & Simpan</h3>
              <p className="text-[11px] text-slate-400">Cetak barcode otomatis</p>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Alerts */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2">
          <svg className="w-5 h-5 shrink-0 text-red-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <span>{errorMsg}</span>
        </div>
      )}

      {importResult && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-lg">
              ✓
            </div>
            <div>
              <h3 className="text-base font-bold text-emerald-900">
                Import Batch Berhasil Disimpan!
              </h3>
              <p className="text-xs text-emerald-700">
                {importResult.total_success || 5} buku berhasil didaftarkan ke sistem perpustakaan beserta kode barcode setiap eksemplar.
              </p>
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <Link
              href="/books"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Buka Katalog Buku
            </Link>
            <Link
              href="/books/print-labels"
              className="px-4 py-2 border border-emerald-600 text-emerald-700 hover:bg-emerald-100 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Cetak Label Barcode
            </Link>
          </div>
        </div>
      )}

      {/* 4. Drag and Drop Upload Zone */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`bg-white p-10 rounded-2xl border-2 border-dashed transition-all text-center space-y-4 shadow-xs ${
          dragActive
            ? 'border-blue-500 bg-blue-50/50'
            : 'border-slate-300 hover:border-blue-400 bg-slate-50/40'
        }`}
      >
        <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 mx-auto flex items-center justify-center shadow-xs">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
        </div>

        <div>
          <h3 className="text-base font-bold text-slate-900">
            {file ? file.name : 'Tarik & Lepas Berkas Excel di Sini'}
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            atau klik tombol di bawah untuk memilih file dari komputer Anda. Mendukung format <strong>.xlsx</strong>, <strong>.xls</strong>, atau <strong>.csv</strong>.
          </p>
        </div>

        <div>
          <input
            type="file"
            id="excel-file-input"
            accept=".csv, .xlsx, .xls"
            onChange={handleFileChange}
            className="hidden"
          />
          <label
            htmlFor="excel-file-input"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/25 cursor-pointer transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            <span>Pilih Berkas dari Komputer</span>
          </label>
        </div>
      </div>

      {/* 5. Preview Table when parsed */}
      {parsing ? (
        <div className="py-12 flex justify-center items-center gap-3 text-slate-500">
          <CircularProgress size={24} />
          <span className="text-xs font-semibold">Membaca isi berkas spreadsheet...</span>
        </div>
      ) : (
        parsedRows.length > 0 && (
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Pratinjau Data Impor ({parsedRows.length} Judul Buku)
                </h3>
                <p className="text-xs text-slate-500">
                  Periksa kolom di bawah sebelum menyetujui penyimpanan permanen ke sistem.
                </p>
              </div>

              <button
                onClick={handleCommitImport}
                disabled={importing}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/25 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                {importing ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Simpan {parsedRows.length} Buku Sekarang</span>
                  </>
                )}
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-bold border-b border-slate-100">
                  <tr>
                    <th className="py-3 px-3">No</th>
                    <th className="py-3 px-3">Judul Buku</th>
                    <th className="py-3 px-3">Pengarang</th>
                    <th className="py-3 px-3">ISBN</th>
                    <th className="py-3 px-3">Kategori</th>
                    <th className="py-3 px-3">Lokasi Rak</th>
                    <th className="py-3 px-3 text-center">Eksemplar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {parsedRows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-3 text-slate-400 font-bold">{idx + 1}</td>
                      <td className="py-3 px-3 font-bold text-slate-900 max-w-xs">{row.title}</td>
                      <td className="py-3 px-3 text-slate-600">{row.author}</td>
                      <td className="py-3 px-3 font-mono text-slate-500">{row.isbn || '-'}</td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100">
                          {row.category}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-700 font-semibold">{row.call_number || 'Rak A-01'}</td>
                      <td className="py-3 px-3 text-center font-bold text-emerald-700">
                        {row.copies_count} unit
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}

      {/* 6. Three Informational / Guide Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs">
            📋
          </div>
          <h4 className="text-xs font-bold text-slate-900">Format Kolom Wajib</h4>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Pastikan kolom Judul, Pengarang, ISBN, Kategori, dan JumlahEksemplar terisi dengan benar pada baris spreadsheet Anda.
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xs">
            ⚡
          </div>
          <h4 className="text-xs font-bold text-slate-900">Otomasi Barcode</h4>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Sistem secara instan menciptakan nomor barcode terindeks (BRC-XXXXXX) untuk setiap eksemplar fisik yang diimport.
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs">
            🛡️
          </div>
          <h4 className="text-xs font-bold text-slate-900">Deteksi Duplikasi</h4>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Jika ISBN buku sudah pernah terdaftar, sistem akan otomatis menambahkan jumlah eksemplar tanpa menduplikasi judul katalog.
          </p>
        </div>
      </div>
    </div>
  );
}
