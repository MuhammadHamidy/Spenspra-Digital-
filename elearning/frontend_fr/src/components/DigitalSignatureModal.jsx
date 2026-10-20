'use client';

import React, { useRef, useState, useEffect } from 'react';
import Modal from '@/components/Modal';

export default function DigitalSignatureModal({
  isOpen,
  onClose,
  onSaveSignature,
  initialSignature = '',
  className = '',
  principalName = '',
  principalNip = '',
}) {
  const [activeTab, setActiveTab] = useState('CANVAS'); // 'CANVAS' | 'UPLOAD'
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [uploadedImage, setUploadedImage] = useState(initialSignature || '');
  const [notes, setNotes] = useState('Rapor telah diverifikasi dan disahkan secara resmi oleh Kepala Sekolah.');
  const [inputPrincipalName, setInputPrincipalName] = useState(principalName || '');
  const [inputPrincipalNip, setInputPrincipalNip] = useState(principalNip || '');

  const isAllClasses = className === 'ALL';

  // Sinkronisasi data saat modal dibuka
  useEffect(() => {
    if (isOpen) {
      setInputPrincipalName(principalName || '');
      setInputPrincipalNip(principalNip || '');
      if (initialSignature) {
        setUploadedImage(initialSignature);
      }
    }
  }, [isOpen, principalName, principalNip, initialSignature]);

  // Canvas drawing setup
  useEffect(() => {
    if (isOpen && activeTab === 'CANVAS' && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      // Set line style
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    }
  }, [isOpen, activeTab]);

  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches?.[0]?.clientX) - rect.left;
    const y = (e.clientY || e.touches?.[0]?.clientY) - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setHasDrawn(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches?.[0]?.clientX) - rect.left;
    const y = (e.clientY || e.touches?.[0]?.clientY) - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
    e.preventDefault();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Mohon pilih file gambar (PNG / JPG).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setUploadedImage(event.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleConfirmSubmit = () => {
    if (!inputPrincipalName.trim()) {
      alert('Mohon masukkan Nama Kepala Sekolah penandatangan pengesahan.');
      return;
    }

    let finalSignatureData = '';
    let sigType = activeTab;

    if (activeTab === 'CANVAS') {
      const canvas = canvasRef.current;
      if (!canvas || !hasDrawn) {
        alert('Silakan bubuhkan tanda tangan langsung pada area kanvas terlebih dahulu.');
        return;
      }
      finalSignatureData = canvas.toDataURL('image/png');
    } else {
      if (!uploadedImage) {
        alert('Silakan unggah berkas gambar tanda tangan / stempel terlebih dahulu.');
        return;
      }
      finalSignatureData = uploadedImage;
    }

    onSaveSignature({
      signatureData: finalSignatureData,
      signatureType: sigType,
      notes,
      principalName: inputPrincipalName.trim(),
      principalNip: inputPrincipalNip.trim(),
    });
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        isAllClasses
          ? 'Pengesahan Sekaligus untuk Seluruh Rombel (7A - 9B)'
          : `Pengesahan & Tanda Tangan Rapor ${className ? `Kelas ${className}` : ''}`
      }
    >
      <div className="space-y-4 text-xs">
        {/* Banner Penjelasan Otoritas */}
        {isAllClasses && (
          <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl flex items-center gap-2.5 text-amber-900">
            <span className="text-lg">⚡</span>
            <div>
              <p className="font-bold text-xs">Pengesahan Massal Rapor Aktif</p>
              <p className="text-[11px] text-amber-800">
                Tanda tangan digital, Nama, dan NIP Kepala Sekolah di bawah ini akan langsung disematkan secara resmi ke <strong>seluruh rombel (Kelas 7A, 7B, 8A, 8B, 9A, 9B)</strong>.
              </p>
            </div>
          </div>
        )}

        {/* Form Identitas Kepala Sekolah (Dapat Diinput & Diedit) */}
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
          <div className="flex items-center gap-2 pb-1 border-b border-slate-200">
            <span className="w-2 h-2 rounded-full bg-[#193D9B]" />
            <span className="font-bold text-slate-800 uppercase tracking-wider text-[10px]">
              Identitas Kepala Sekolah Penandatangan
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Nama Lengkap Kepala Sekolah <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={inputPrincipalName}
                onChange={(e) => setInputPrincipalName(e.target.value)}
                placeholder="Masukkan nama kepala sekolah beserta gelar"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#193D9B]/20 focus:border-[#193D9B]"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                NIP Kepala Sekolah
              </label>
              <input
                type="text"
                value={inputPrincipalNip}
                onChange={(e) => setInputPrincipalNip(e.target.value)}
                placeholder="NIP (18 digit angka)"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#193D9B]/20 focus:border-[#193D9B]"
              />
            </div>
          </div>
        </div>

        {/* Tab Pemilihan Metode Tanda Tangan */}
        <div className="flex border-b border-slate-200">
          <button
            type="button"
            onClick={() => setActiveTab('CANVAS')}
            className={`py-2 px-4 text-xs font-bold border-b-2 cursor-pointer transition-colors ${
              activeTab === 'CANVAS'
                ? 'border-[#193D9B] text-[#193D9B]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            ✍️ Tanda Tangan Langsung di Layar
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('UPLOAD')}
            className={`py-2 px-4 text-xs font-bold border-b-2 cursor-pointer transition-colors ${
              activeTab === 'UPLOAD'
                ? 'border-[#193D9B] text-[#193D9B]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            📁 Unggah Gambar Tanda Tangan / Stempel
          </button>
        </div>

        {/* Mode 1: Canvas Drawing */}
        {activeTab === 'CANVAS' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] text-slate-500">
              <span>Gunakan mouse, trackpad, stylus, atau sentuhan jari pada kotak di bawah ini:</span>
              <button
                type="button"
                onClick={clearCanvas}
                className="text-rose-600 hover:text-rose-700 font-semibold cursor-pointer underline"
              >
                Hapus / Ulangi
              </button>
            </div>
            <div className="border-2 border-dashed border-slate-300 rounded-xl overflow-hidden bg-slate-50 relative flex items-center justify-center">
              <canvas
                ref={canvasRef}
                width={480}
                height={160}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                className="w-full h-40 bg-white cursor-crosshair touch-none"
              />
              {!hasDrawn && (
                <div className="absolute pointer-events-none text-slate-400 text-xs flex items-center gap-1.5 select-none">
                  <span>Tanda tangan di sini</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Mode 2: Upload File Image */}
        {activeTab === 'UPLOAD' && (
          <div className="space-y-3">
            <label className="block font-semibold text-slate-700">
              Pilih Berkas Gambar Tanda Tangan (PNG Transparan / JPG):
            </label>
            <input
              type="file"
              accept="image/png, image/jpeg, image/webp"
              onChange={handleFileUpload}
              className="block w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
            />
            {uploadedImage ? (
              <div className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-center h-32">
                <img
                  src={uploadedImage}
                  alt="Pratinjau Tanda Tangan"
                  className="max-h-28 max-w-full object-contain"
                />
              </div>
            ) : (
              <div className="p-6 border border-dashed border-slate-200 rounded-xl text-center text-slate-400 text-xs">
                Belum ada gambar yang diunggah
              </div>
            )}
          </div>
        )}

        {/* Catatan / Keterangan Pengesahan */}
        <div>
          <label className="block font-semibold text-slate-700 mb-1">
            Catatan Pengesahan Rapor:
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 outline-none focus:border-[#193D9B] focus:ring-1 focus:ring-[#193D9B]"
          />
        </div>

        {/* Modal Actions */}
        <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50 cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleConfirmSubmit}
            className="px-5 py-2.5 rounded-lg bg-[#15803D] hover:bg-[#166534] text-white font-bold transition shadow-xs cursor-pointer flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
            <span>
              {isAllClasses ? 'Sahkan Semua Rapor (7A - 9B) Sekarang' : 'Sahkan Rapor Sekarang'}
            </span>
          </button>
        </div>
      </div>
    </Modal>
  );
}
