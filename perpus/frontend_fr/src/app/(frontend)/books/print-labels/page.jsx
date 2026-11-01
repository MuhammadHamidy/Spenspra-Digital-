'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { booksApi } from '@/lib/features/library/api/booksApi';
import { Barcode } from '@/lib/common/barcodeGenerator';
import { QRCodeSVG } from '@/lib/common/qrCodeGenerator';
import AppIcon from '@/components/AppIcon';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';

export default function BarcodeLabelPrintPage() {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBarcodes, setSelectedBarcodes] = useState([]);
  const [labelsData, setLabelsData] = useState([]);
  const [labelFormat, setLabelFormat] = useState('sheet_a4'); // 'sheet_a4' or 'thermal_50x30'
  const [codeType, setCodeType] = useState('qr_code'); // 'qr_code' (default for kiosk camera) or 'barcode'
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingLabels, setLoadingLabels] = useState(false);

  useEffect(() => {
    loadBooksWithItems();
  }, []);

  const loadBooksWithItems = async () => {
    setLoading(true);
    try {
      const data = await booksApi.getBooks();
      // Load details with items for each book
      const detailed = await Promise.all(
        data.map(async (b) => {
          try {
            return await booksApi.getBook(b.id);
          } catch {
            return b;
          }
        })
      );
      setBooks(detailed);

      // Default select all barcodes from all items
      const allBarcodes = [];
      detailed.forEach((b) => {
        if (b.items) {
          b.items.forEach((it) => allBarcodes.push(it.barcode));
        }
      });
      setSelectedBarcodes(allBarcodes);
      fetchLabelsPreview(allBarcodes);
    } catch (err) {
      console.error('Failed to load books:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchLabelsPreview = async (barcodes) => {
    if (!barcodes || barcodes.length === 0) {
      setLabelsData([]);
      return;
    }
    setLoadingLabels(true);
    try {
      const labels = await booksApi.getLabelsForPrinting(barcodes);
      setLabelsData(labels);
    } catch (err) {
      console.error('Failed to fetch labels preview:', err);
    } finally {
      setLoadingLabels(false);
    }
  };

  const toggleBarcodeSelection = (barcode) => {
    let updated;
    if (selectedBarcodes.includes(barcode)) {
      updated = selectedBarcodes.filter((b) => b !== barcode);
    } else {
      updated = [...selectedBarcodes, barcode];
    }
    setSelectedBarcodes(updated);
    fetchLabelsPreview(updated);
  };

  const toggleSelectAll = () => {
    if (selectedBarcodes.length > 0) {
      setSelectedBarcodes([]);
      setLabelsData([]);
    } else {
      const all = [];
      books.forEach((b) => {
        if (b.items) {
          b.items.forEach((it) => all.push(it.barcode));
        }
      });
      setSelectedBarcodes(all);
      fetchLabelsPreview(all);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const filteredBooks = books.filter((b) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const matchTitle = b.title?.toLowerCase().includes(q);
    const matchAuthor = b.author?.toLowerCase().includes(q);
    const matchBarcode = b.items?.some((it) => it.barcode?.toLowerCase().includes(q));
    return matchTitle || matchAuthor || matchBarcode;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Screen Control Header (hidden on print) */}
      <div className="print:hidden flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#1A3D63] uppercase tracking-wider mb-1">
            <Link href="/books" className="hover:underline flex items-center gap-1">
              &larr; Kembali ke Katalog
            </Link>
          </div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            Pencetakan Label Buku Perpustakaan
            <span className="bg-emerald-50 text-emerald-700 text-xs px-2.5 py-0.5 rounded-full font-bold border border-emerald-200">
              Mendukung QR Code Mandiri
            </span>
          </h1>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            Format label dengan QR Code otomatis terbaca cepat oleh scanner peminjaman di Layanan Mandiri.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Code Type Switcher */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
            <button
              onClick={() => setCodeType('qr_code')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
                codeType === 'qr_code'
                  ? 'bg-white text-emerald-700 shadow-xs border border-emerald-200/50'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <AppIcon name="qr_code" size={14} />
              <span>QR Code (Layanan Mandiri)</span>
            </button>
            <button
              onClick={() => setCodeType('barcode')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
                codeType === 'barcode'
                  ? 'bg-white text-[#1A3D63] shadow-xs border border-slate-200'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <AppIcon name="barcode" size={14} />
              <span>Barcode 1D (Code 128)</span>
            </button>
          </div>

          {/* Paper Format Switcher */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
            <button
              onClick={() => setLabelFormat('sheet_a4')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                labelFormat === 'sheet_a4' ? 'bg-white text-[#1A3D63] shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Sheet A4 (Grid 3x10)
            </button>
            <button
              onClick={() => setLabelFormat('thermal_50x30')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                labelFormat === 'thermal_50x30' ? 'bg-white text-[#1A3D63] shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Thermal Roll (50x30mm)
            </button>
          </div>

          <Button
            variant="contained"
            onClick={handlePrint}
            disabled={labelsData.length === 0}
            sx={{
              bgcolor: '#1A3D63',
              borderRadius: '12px',
              px: 3,
              py: 1,
              fontWeight: 700,
              textTransform: 'none',
              '&:hover': { bgcolor: '#0A1931' },
            }}
            startIcon={<AppIcon name="print" color="white" size={18} />}
          >
            Cetak ({labelsData.length} Label)
          </Button>
        </div>
      </div>

      {/* Main Split Layout: Selection (Screen Only) vs Print Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Column: Book Selection Checklist (hidden on print) */}
        <div className="print:hidden lg:col-span-1 bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4 max-h-[780px] flex flex-col">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Pilih Eksemplar</h3>
              <p className="text-[11px] text-slate-500">{selectedBarcodes.length} barcode dipilih</p>
            </div>
            <button
              onClick={toggleSelectAll}
              className="text-xs font-bold text-[#1A3D63] hover:underline"
            >
              {selectedBarcodes.length > 0 ? 'Batalkan Semua' : 'Pilih Semua'}
            </button>
          </div>

          {/* Search Box */}
          <div>
            <input
              type="text"
              placeholder="Cari judul, penulis, barcode..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-[#1A3D63]"
            />
          </div>

          {/* Checklist Area */}
          <div className="space-y-4 overflow-y-auto flex-1 pr-1">
            {loading ? (
              <div className="py-8 text-center text-slate-400">
                <CircularProgress size={20} />
              </div>
            ) : filteredBooks.length === 0 ? (
              <div className="text-xs text-slate-400 text-center py-6">
                Tidak ada buku yang sesuai pencarian.
              </div>
            ) : (
              filteredBooks.map((b) => (
                <div key={b.id} className="space-y-1.5 border-b border-slate-50 pb-2">
                  <div className="text-xs font-bold text-slate-800 line-clamp-1">{b.title}</div>
                  <div className="text-[10px] text-slate-400">{b.author || 'Tanpa Penulis'}</div>
                  <div className="space-y-1 pl-2 pt-1">
                    {b.items && b.items.length > 0 ? (
                      b.items.map((it) => (
                        <label
                          key={it.barcode}
                          className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer hover:text-slate-900"
                        >
                          <input
                            type="checkbox"
                            checked={selectedBarcodes.includes(it.barcode)}
                            onChange={() => toggleBarcodeSelection(it.barcode)}
                            className="rounded text-[#1A3D63] focus:ring-0"
                          />
                          <span className="font-mono text-[11px]">Eks #{it.copy_number} ({it.barcode})</span>
                        </label>
                      ))
                    ) : (
                      <span className="text-[10px] text-slate-400 italic">Tidak ada eksemplar</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Print Preview Canvas */}
        <div className="lg:col-span-3 space-y-4">
          <div className="print:hidden flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-slate-500 px-2">
            <span className="font-medium text-slate-700">
              Pratinjau Hasil Cetak ({labelsData.length} label • Format {codeType === 'qr_code' ? 'QR Code' : 'Barcode 1D'}):
            </span>
            <span className="italic text-[11px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded border border-amber-200">
              Tips: Pada dialog print browser, pilih Margins: None & centang Background Graphics.
            </span>
          </div>

          {/* Printable Container */}
          <div
            id="printable-label-area"
            className={`bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs print:p-0 print:border-none print:shadow-none ${
              labelFormat === 'thermal_50x30'
                ? 'flex flex-col items-center gap-4 print:gap-0'
                : 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 print:grid-cols-3 print:gap-2'
            }`}
          >
            {loadingLabels ? (
              <div className="col-span-full py-16 text-center text-slate-400">
                <CircularProgress size={24} />
                <p className="text-xs mt-2">Menyiapkan pratinjau label...</p>
              </div>
            ) : labelsData.length === 0 ? (
              <div className="col-span-full py-16 text-center text-slate-400">
                Belum ada eksemplar yang dipilih untuk dicetak.
              </div>
            ) : (
              labelsData.map((label, idx) => (
                <div
                  key={idx}
                  className={`label-card bg-white border border-slate-900 text-slate-900 rounded-md select-none overflow-hidden flex flex-col justify-between ${
                    labelFormat === 'thermal_50x30'
                      ? 'w-[300px] h-[180px] p-2.5 print:w-[50mm] print:h-[30mm] print:p-1'
                      : 'w-full h-[165px] p-2.5 print:h-[34mm] print:p-1.5'
                  }`}
                  style={{ pageBreakInside: 'avoid' }}
                >
                  {/* Top Library Title Header */}
                  <div className="w-full border-b border-slate-900 pb-1 flex items-center justify-between">
                    <span className="text-[8px] print:text-[7px] font-black uppercase tracking-wider text-slate-900 truncate">
                      PERPUSTAKAAN SMPN 1 PRAMBON
                    </span>
                    <span className="text-[7.5px] print:text-[6.5px] font-mono font-bold text-slate-600 shrink-0">
                      Eks #{label.copy_number}
                    </span>
                  </div>

                  {/* Body Content: Dependent on Code Type */}
                  {codeType === 'qr_code' ? (
                    /* QR CODE SIDE-BY-SIDE LAYOUT */
                    <div className="flex-1 flex items-center justify-between gap-2 py-1 min-h-0">
                      {/* Left: Book Meta & Call Number */}
                      <div className="flex-1 min-w-0 flex flex-col justify-between h-full pr-1">
                        <div>
                          <div className="text-[11px] print:text-[9.5px] font-extrabold text-slate-900 leading-tight line-clamp-2">
                            {label.title}
                          </div>
                          {label.author && (
                            <div className="text-[8.5px] print:text-[7.5px] text-slate-600 truncate mt-0.5 font-medium">
                              {label.author}
                            </div>
                          )}
                        </div>

                        <div className="mt-1 space-y-1">
                          <div className="inline-block bg-slate-100 print:bg-white border border-slate-900/60 rounded px-1.5 py-0.5 font-mono text-[9.5px] print:text-[8px] font-black text-slate-900">
                            {label.call_number || '000'}
                          </div>
                          <div className="font-mono text-[8px] print:text-[7px] font-bold text-slate-700 tracking-tight truncate">
                            {label.barcode}
                          </div>
                        </div>
                      </div>

                      {/* Right: Crisp Vector QR Code */}
                      <div className="shrink-0 flex flex-col items-center justify-center pl-2 border-l border-dashed border-slate-300 print:border-slate-800">
                        <QRCodeSVG
                          value={label.barcode}
                          size={labelFormat === 'thermal_50x30' ? 62 : 68}
                        />
                        <span className="text-[6.5px] print:text-[5.5px] font-mono font-bold text-slate-700 uppercase tracking-tight mt-0.5">
                          PINJAM MANDIRI
                        </span>
                      </div>
                    </div>
                  ) : (
                    /* 1D LINEAR BARCODE LAYOUT */
                    <div className="flex-1 flex flex-col justify-between py-1 min-h-0 text-center">
                      <div>
                        <div className="text-[11px] print:text-[9.5px] font-extrabold text-slate-900 leading-tight line-clamp-1">
                          {label.title}
                        </div>
                        <div className="flex items-center justify-between text-[8.5px] print:text-[7.5px] font-bold text-slate-700 px-1 mt-0.5">
                          <span className="font-mono">{label.call_number || '000'}</span>
                          <span>{label.author ? label.author.slice(0, 20) : ''}</span>
                        </div>
                      </div>

                      <div className="flex flex-col items-center justify-center my-0.5">
                        <Barcode
                          value={label.barcode}
                          width={labelFormat === 'thermal_50x30' ? 220 : 210}
                          height={labelFormat === 'thermal_50x30' ? 36 : 42}
                          showText={false}
                        />
                        <div className="font-mono text-[9px] print:text-[7.5px] font-black text-slate-900 tracking-wider mt-0.5">
                          {label.barcode}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Micro Footer Notice */}
                  <div className="w-full border-t border-slate-300 print:border-slate-400 pt-0.5 flex items-center justify-between text-[6.5px] print:text-[5.5px] text-slate-500">
                    <span>Milik Perpustakaan SMPN 1 Prambon</span>
                    <span>Layanan Mandiri</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Print-specific Styles */}
      <style jsx global>{`
        @media print {
          @page {
            ${
              labelFormat === 'thermal_50x30'
                ? 'size: 50mm 30mm; margin: 0;'
                : 'size: A4 portrait; margin: 8mm 6mm;'
            }
          }
          body {
            background: #ffffff !important;
            color: #000000 !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          nav, aside, header, footer, .print\\:hidden {
            display: none !important;
          }
          #printable-label-area {
            ${
              labelFormat === 'thermal_50x30'
                ? `
                  display: block !important;
                  width: 50mm !important;
                  margin: 0 auto !important;
                  padding: 0 !important;
                `
                : `
                  display: grid !important;
                  grid-template-columns: repeat(3, 1fr) !important;
                  gap: 3mm !important;
                  width: 100% !important;
                  padding: 0 !important;
                `
            }
          }
          .label-card {
            ${
              labelFormat === 'thermal_50x30'
                ? `
                  width: 50mm !important;
                  height: 30mm !important;
                  page-break-after: always !important;
                  break-after: page !important;
                  border: 1px solid #000000 !important;
                  box-sizing: border-box !important;
                  margin: 0 !important;
                `
                : `
                  width: 100% !important;
                  height: 34mm !important;
                  page-break-inside: avoid !important;
                  break-inside: avoid !important;
                  border: 1px solid #000000 !important;
                  box-sizing: border-box !important;
                `
            }
          }
        }
      `}</style>
    </div>
  );
}
