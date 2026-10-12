'use client';

import React from 'react';

export default function Pagination({
  currentPage = 1,
  totalItems = 0,
  pageSize = 12,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [12, 24, 48, 96],
  itemLabel = 'kartu',
}) {
  if (totalItems === 0) return null;

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  // Generate array nomor halaman dengan window yang rapi dan konsisten
  const pages = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);

    let start = Math.max(2, currentPage - 1);
    let end = Math.min(totalPages - 1, currentPage + 1);

    if (currentPage <= 3) {
      end = Math.min(totalPages - 1, 4);
    } else if (currentPage >= totalPages - 2) {
      start = Math.max(2, totalPages - 3);
    }

    if (start > 2) {
      pages.push('...');
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (end < totalPages - 1) {
      pages.push('...');
    }

    pages.push(totalPages);
  }

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs text-slate-600 print:hidden select-none shadow-2xs">
      <div className="flex flex-wrap items-center gap-2.5">
        <span>
          Menampilkan <strong className="font-bold text-slate-900">{startItem}–{endItem}</strong> dari <strong className="font-bold text-slate-900">{totalItems}</strong> {itemLabel}
        </span>
        {onPageSizeChange && (
          <div className="flex items-center gap-1.5 ml-1">
            <span className="text-slate-400">Tampilkan:</span>
            <select
              value={pageSize}
              aria-label="Pilih jumlah baris per halaman"
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500 cursor-pointer"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt} per halaman
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="flex items-center gap-1 flex-wrap justify-center">
        {/* Tombol Pertama */}
        <button
          type="button"
          onClick={() => onPageChange(1)}
          disabled={currentPage <= 1}
          title="Halaman Pertama"
          className="px-2 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
        >
          «
        </button>

        {/* Tombol Sebelumnya */}
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage <= 1}
          className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
        >
          Sebelumnya
        </button>

        {pages.map((p, idx) =>
          p === '...' ? (
            <span key={`dots-${idx}`} className="px-2 py-1 text-slate-400 font-bold">
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => onPageChange(p)}
              className={`min-w-8 h-8 rounded-lg text-xs font-bold transition cursor-pointer ${
                currentPage === p
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'border border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              {p}
            </button>
          )
        )}

        {/* Tombol Berikutnya */}
        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage >= totalPages}
          className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
        >
          Berikutnya
        </button>

        {/* Tombol Terakhir */}
        <button
          type="button"
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage >= totalPages}
          title="Halaman Terakhir"
          className="px-2 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
        >
          »
        </button>
      </div>
    </div>
  );
}
