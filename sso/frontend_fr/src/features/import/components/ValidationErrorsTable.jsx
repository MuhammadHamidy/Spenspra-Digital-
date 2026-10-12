'use client';

import React from 'react';

export default function ValidationErrorsTable({ errorMsg, validationErrors = [] }) {
  if (!errorMsg && validationErrors.length === 0) return null;

  return (
    <div className="bg-rose-50 border border-rose-200/90 rounded-2xl p-5 shadow-xs space-y-3 animate-in fade-in duration-300">
      <div className="flex items-center gap-2">
        <svg className="w-5 h-5 text-rose-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <h4 className="text-sm font-bold text-rose-900">
          {errorMsg || 'Terjadi kesalahan saat memvalidasi berkas Excel'}
        </h4>
      </div>

      {validationErrors.length > 0 && (
        <div className="overflow-x-auto max-h-60 rounded-xl border border-rose-200 bg-white">
          <table className="min-w-full text-xs text-left">
            <thead className="bg-rose-100/60 text-rose-900 font-bold uppercase text-[10px] tracking-wider sticky top-0">
              <tr>
                <th className="py-2 px-3 w-16 text-center">Baris</th>
                <th className="py-2 px-3 w-28">Kolom</th>
                <th className="py-2 px-3">Keterangan Error</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rose-100 text-rose-700">
              {validationErrors.map((err, idx) => (
                <tr key={idx} className="hover:bg-rose-50/50">
                  <td className="py-2 px-3 text-center font-mono font-bold">{err.row || '-'}</td>
                  <td className="py-2 px-3 font-semibold">{err.column || '-'}</td>
                  <td className="py-2 px-3">{err.error || err.message || JSON.stringify(err)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
