'use client';

import React from 'react';

export default function BookDetailModal({ book, onClose }) {
  if (!book) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl p-6 sm:p-10 max-h-[90vh] overflow-y-auto border border-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 font-sans">Detail Buku</h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Berikut informasi lengkap dari buku yang Anda pilih
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center cursor-pointer transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          {/* Left Column: Book Cover */}
          <div className="md:col-span-4 flex justify-center">
            <div className="w-full max-w-xs aspect-[3/4] rounded-2xl overflow-hidden shadow-lg bg-slate-100 border border-slate-200/60">
              {book.cover_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={book.cover_url}
                  alt={book.judul}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-purple-50 text-[#4B3B78] font-bold p-4 text-center">
                  {book.judul}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Book Details */}
          <div className="md:col-span-8 flex flex-col justify-between">
            <div>
              {/* Bookmark status indicator */}
              <div className="flex items-center gap-1.5 text-xs text-amber-600 font-medium mb-1">
                <svg className="w-4 h-4 fill-amber-500 text-amber-500" viewBox="0 0 24 24">
                  <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
                <span>Tersimpan di Katalog</span>
              </div>

              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 uppercase font-sans tracking-tight">
                {book.judul}
              </h1>
              <p className="text-sm font-semibold italic text-slate-600 mt-0.5 mb-4 uppercase">
                {book.penulis}
              </p>

              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-6">
                {book.deskripsi ||
                  'Dalam kehidupan berbangsa dan bernegara selalu saja ditemukan tarik ulur antara kekuasaan, hukum, dan demokrasi yang bersumber pada keserakahan terhadap kekuasaan.'}
              </p>

              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 pb-1 border-b border-slate-100">
                Informasi Detail
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-400">Judul Seri</span>
                  <span className="text-slate-700 font-medium">-</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-400">Kategori</span>
                  <span className="text-slate-700 font-medium">{book.kategori || 'Umum'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-400">Jenis</span>
                  <span className="text-slate-700 font-medium">{book.jenis || 'NON-FIKSI'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-400">Barcode</span>
                  <span className="text-slate-700 font-mono font-medium">{book.barcode || 'LIB-BK-001'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-400">Bahasa</span>
                  <span className="text-slate-700 font-medium">Indonesia</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-400">Status Stok</span>
                  <span
                    className={`font-bold ${
                      book.tersedia ? 'text-[#2E7D5B]' : 'text-[#C53030]'
                    }`}
                  >
                    {book.tersedia ? `Tersedia (${book.stok} eksemplar)` : 'Tidak Tersedia'}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-6 mt-6 border-t border-slate-100 flex items-center justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition-all cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
