'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { booksApi } from '@/lib/features/library/api/booksApi';
import { Barcode } from '@/lib/common/barcodeGenerator';
import AppIcon from '@/components/AppIcon';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';

export default function BarcodeLabelPrintPage() {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBarcodes, setSelectedBarcodes] = useState([]);
  const [labelsData, setLabelsData] = useState([]);
  const [labelFormat, setLabelFormat] = useState('sheet_a4'); // sheet_a4 or thermal_50x30
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

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Screen Control Header (hidden on print) */}
      <div className="print:hidden flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#1A3D63] uppercase tracking-wider mb-1">
            <Link href="/books" className="hover:underline flex items-center gap-1">
              &larr; Kembali ke Katalog
            </Link>
          </div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">
            Pencetakan Label Barcode Buku
          </h1>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            Pilih eksemplar buku, sesuaikan tata letak cetak, dan cetak stiker barcode siap tempel pada buku fisik.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
            <button
              onClick={() => setLabelFormat('sheet_a4')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                labelFormat === 'sheet_a4' ? 'bg-white text-[#1A3D63] shadow-xs' : 'text-slate-500'
              }`}
            >
              Sheet A4 (Grid 3x10)
            </button>
            <button
              onClick={() => setLabelFormat('thermal_50x30')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                labelFormat === 'thermal_50x30' ? 'bg-white text-[#1A3D63] shadow-xs' : 'text-slate-500'
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
        <div className="print:hidden lg:col-span-1 bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4 max-h-[750px] overflow-y-auto">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Pilih Eksemplar</h3>
              <p className="text-[11px] text-slate-500">{selectedBarcodes.length} barcode dipilih</p>
            </div>
            <button
              onClick={toggleSelectAll}
              className="text-xs font-bold text-[#1A3D63] hover:underline"
            >
              {selectedBarcodes.length > 0 ? 'Batalkan' : 'Pilih Semua'}
            </button>
          </div>

          {loading ? (
            <div className="py-8 text-center text-slate-400">
              <CircularProgress size={20} />
            </div>
          ) : (
            <div className="space-y-4">
              {books.map((b) => (
                <div key={b.id} className="space-y-2">
                  <div className="text-xs font-bold text-slate-800 line-clamp-1">{b.title}</div>
                  <div className="space-y-1.5 pl-2">
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
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Print Preview Canvas */}
        <div className="lg:col-span-3 space-y-4">
          <div className="print:hidden flex items-center justify-between text-xs text-slate-500 px-2">
            <span>Pratinjau Hasil Cetak (Sesuai Ukuran Kertas Stiker Sebenarnya):</span>
            <span className="italic">Tips: Di dialog print browser, pilih "Margins: None" dan centang "Background graphics"</span>
          </div>

          {/* Printable Container */}
          <div
            id="printable-label-area"
            className={`bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs print:p-0 print:border-none print:shadow-none ${
              labelFormat === 'thermal_50x30'
                ? 'flex flex-col items-center gap-4'
                : 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 print:grid-cols-3 print:gap-2'
            }`}
          >
            {loadingLabels ? (
              <div className="col-span-full py-16 text-center text-slate-400">
                <CircularProgress size={24} />
                <p className="text-xs mt-2">Menyiapkan label barcode...</p>
              </div>
            ) : labelsData.length === 0 ? (
              <div className="col-span-full py-16 text-center text-slate-400">
                Belum ada eksemplar barcode yang dipilih untuk dicetak.
              </div>
            ) : (
              labelsData.map((label, idx) => (
                <div
                  key={idx}
                  className={`bg-white border-2 border-slate-800 rounded-lg p-2.5 flex flex-col justify-between items-center text-center select-none ${
                    labelFormat === 'thermal_50x30'
                      ? 'w-[280px] h-[160px] print:w-[50mm] print:h-[30mm] print:p-1'
                      : 'w-full h-[155px] print:h-[45mm] print:p-1.5'
                  }`}
                  style={{ pageBreakInside: 'avoid' }}
                >
                  {/* Top Library Title Header */}
                  <div className="w-full border-b border-slate-800 pb-1">
                    <div className="text-[9px] font-black uppercase tracking-wider text-slate-900 leading-none">
                      PERPUSTAKAAN DIGITAL
                    </div>
                  </div>

                  {/* Book Metadata */}
                  <div className="w-full py-0.5 space-y-0.5">
                    <div className="text-[11px] font-black text-slate-900 line-clamp-1 leading-tight">
                      {label.title}
                    </div>
                    <div className="flex items-center justify-between text-[9px] font-bold text-slate-700 px-1">
                      <span>{label.call_number || '000'}</span>
                      <span>Eks #{label.copy_number}</span>
                    </div>
                  </div>

                  {/* Barcode Graphic */}
                  <div className="w-full flex flex-col items-center justify-center my-0.5">
                    <Barcode
                      value={label.barcode}
                      width={labelFormat === 'thermal_50x30' ? 210 : 200}
                      height={44}
                      showText={false}
                    />
                    <div className="font-mono text-[9.5px] font-black text-slate-900 tracking-wider mt-0.5">
                      {label.barcode}
                    </div>
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
            display: grid !important;
            grid-template-columns: repeat(3, 1fr) !important;
            gap: 8px !important;
            width: 100% !important;
          }
        }
      `}</style>
    </div>
  );
}
