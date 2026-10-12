'use client';

import React, { useRef, useState } from 'react';
import { Barcode, generateBarcodeSVG } from '@/lib/common/barcodeGenerator';

export default function StudentBarcodeStickerModal({
  isOpen,
  onClose,
  member, // single member or null
  members = [], // array of members if batch print
  isBatch = false,
}) {
  const [copied, setCopied] = useState(false);
  const printContainerRef = useRef(null);

  if (!isOpen) return null;

  const targetMembers = isBatch ? members : member ? [member] : [];
  if (targetMembers.length === 0) return null;

  const primaryMember = targetMembers[0];
  const barcodeValue = primaryMember.barcode_token;
  if (!barcodeValue) return null;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(barcodeValue);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadSVG = () => {
    const svgString = generateBarcodeSVG(barcodeValue, {
      width: 280,
      height: 70,
      showText: true,
      fontSize: 12,
    });
    const blob = new Blob([svgString], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `barcode-kartu-${primaryMember.identity_number || primaryMember.id}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-6">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-[#0084FF] flex items-center justify-center text-xl shadow-xs">
              🏷️
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">
                {isBatch
                  ? `Cetak Stiker Barcode Kartu Pelajar (${targetMembers.length} Siswa)`
                  : 'Stiker Barcode Kartu Pelajar Siap Cetak'}
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Siap dicetak pada kertas stiker / label dan ditempelkan pada kartu pelajar fisik siswa
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Success Banner if newly added */}
          {!isBatch && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2.5 text-xs text-emerald-800 font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping flex-shrink-0" />
              <span>
                Data siswa berhasil disimpan! Barcode kartu pelajar otomatis di-generate di bawah.
              </span>
            </div>
          )}

          {/* Printable Sticker Cards Container */}
          <div id="printable-sticker-area" ref={printContainerRef} className="space-y-4">
            {targetMembers.map((m, idx) => {
              const code = m.barcode_token;
              if (!code) return null;
              const isGuru = (m.member_type || '').toUpperCase() === 'GURU';

              return (
                <div
                  key={`${code}-${idx}`}
                  className="barcode-card-item bg-white p-4 rounded-2xl border-2 border-dashed border-slate-300 shadow-sm flex flex-col items-center justify-center max-w-sm mx-auto text-center relative group hover:border-blue-500 transition-colors"
                  style={{ width: '100%', maxWidth: '340px' }}
                >
                  {/* Sticker Header */}
                  <div className="w-full flex items-center justify-between border-b border-slate-200 pb-2 mb-2">
                    <div className="text-left">
                      <p className="text-[10px] font-black text-slate-800 uppercase tracking-tight leading-tight">
                        SMPN 1 PRAMBON
                      </p>
                      <p className="text-[8px] font-bold text-blue-600 uppercase tracking-wider">
                        PERPUSTAKAAN SEKOLAH
                      </p>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                      {isGuru ? 'KARTU GURU' : 'KARTU PELAJAR'}
                    </span>
                  </div>

                  {/* Student Details */}
                  <div className="w-full text-left my-1 space-y-0.5">
                    <p className="text-xs font-black text-slate-900 leading-tight uppercase truncate">
                      {m.full_name}
                    </p>
                    <div className="flex items-center justify-between text-[10px] font-mono text-slate-600 pt-0.5">
                      <span>NISN: <strong>{m.identity_number || '-'}</strong></span>
                      <span>Kelas: <strong>{m.class_name || (isGuru ? 'Guru' : 'Siswa')}</strong></span>
                    </div>
                  </div>

                  {/* Crisp Barcode */}
                  <div className="w-full bg-white py-1.5 px-2 rounded-lg flex flex-col items-center justify-center">
                    <Barcode
                      value={code}
                      width={230}
                      height={55}
                      showText={true}
                      className="mx-auto"
                    />
                  </div>

                  {/* Footer instruction note on sticker */}
                  <div className="w-full pt-1.5 border-t border-slate-100 mt-1 flex items-center justify-between text-[8px] text-slate-400 font-medium">
                    <span>* Label Stiker Kartu Pelajar *</span>
                    <span className="font-mono">Ukuran: 70mm x 35mm</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Guidelines info */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs text-slate-600 space-y-1.5">
            <div className="font-bold text-slate-800 flex items-center gap-1.5">
              <span>💡</span>
              <span>Petunjuk Penggunaan &amp; Penempelan Stiker:</span>
            </div>
            <p>1. Klik tombol <strong>&ldquo;Cetak Stiker Barcode&rdquo;</strong> untuk mencetak langsung ke printer label thermal atau kertas stiker HVS/A4.</p>
            <p>2. Gunting atau lepas label stiker lalu tempelkan di bagian belakang atau depan <strong>Kartu Pelajar Siswa</strong>.</p>
            <p>3. Siswa dapat langsung menggunakan barcode ini saat datang ke perpustakaan untuk presensi mandiri dan peminjaman buku.</p>
          </div>
        </div>

        {/* Modal Actions Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            {!isBatch && (
              <>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="px-3 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer flex items-center gap-1.5"
                  title="Salin kode barcode ke clipboard"
                >
                  <span>{copied ? '✓ Tersalin!' : '📋 Salin Kode'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadSVG}
                  className="px-3 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer flex items-center gap-1.5"
                  title="Unduh file barcode SVG kualitas tinggi"
                >
                  <span>📥 Unduh SVG</span>
                </button>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-200/80 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Tutup
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-md shadow-blue-600/25 flex items-center gap-2 transition-all cursor-pointer active:scale-95"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              <span>{isBatch ? `Cetak ${targetMembers.length} Stiker Barcode` : 'Cetak Stiker Barcode'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Embedded Print CSS */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-sticker-area,
          #printable-sticker-area * {
            visibility: visible;
          }
          #printable-sticker-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 0;
            display: flex;
            flex-wrap: wrap;
            gap: 12px;
            justify-content: flex-start;
          }
          .barcode-card-item {
            page-break-inside: avoid;
            border: 1px solid #000 !important;
            box-shadow: none !important;
            margin: 6px !important;
            width: 70mm !important;
            max-width: 70mm !important;
            height: auto !important;
            padding: 8px !important;
          }
        }
      `}</style>
    </div>
  );
}
