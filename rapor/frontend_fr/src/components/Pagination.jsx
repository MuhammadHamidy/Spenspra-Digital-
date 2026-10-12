'use client';

import React from 'react';

export default function Pagination({
  currentPage = 1,
  totalItems = 0,
  pageSize = 10,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50],
  itemLabel = 'data',
}) {
  if (totalItems === 0) return null;

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  // Generate array nomor halaman dengan ellipsis
  const pages = [];
  for (let i = 1; i <= totalPages; i++) {
    if (
      i === 1 ||
      i === totalPages ||
      (i >= currentPage - 1 && i <= currentPage + 1)
    ) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== '...') {
      pages.push('...');
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-white border-t border-slate-200 text-xs text-slate-600 print:hidden select-none">
      <div className="flex items-center gap-3">
        <span>
          Menampilkan <strong className="font-semibold text-slate-900">{startItem}–{endItem}</strong> dari <strong className="font-semibold text-slate-900">{totalItems}</strong> {itemLabel}
        </span>
        {onPageSizeChange && (
          <div className="flex items-center gap-1.5 ml-2">
            <span className="text-slate-400">Tampilkan:</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-800 outline-none focus:border-blue-500 cursor-pointer"
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

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage <= 1}
          className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-medium hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
        >
          Sebelumnya
        </button>

        {pages.map((p, idx) =>
          p === '...' ? (
            <span key={`dots-${idx}`} className="px-2 py-1 text-slate-400">
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => onPageChange(p)}
              className={`min-w-8 h-8 rounded-lg text-xs font-semibold transition cursor-pointer ${
                currentPage === p
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'border border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              {p}
            </button>
          )
        )}

        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage >= totalPages}
          className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-medium hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
        >
          Berikutnya
        </button>
      </div>
    </div>
  );
}
