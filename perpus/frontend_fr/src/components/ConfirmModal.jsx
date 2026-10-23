'use client';

import React from 'react';

/**
 * ConfirmModal — Modal konfirmasi terpadu sesuai standar DESIGN fix.md.
 * Menggantikan browser native alert() dan confirm().
 * 
 * Props:
 * - isOpen: boolean
 * - title: string
 * - message: string | ReactNode
 * - confirmText: string (default: "Ya, Lanjutkan")
 * - cancelText: string (default: "Batal")
 * - type: 'danger' | 'logout' | 'warning' | 'info'
 * - isDanger: boolean (default: true)
 * - isLoading: boolean
 * - onConfirm: () => void
 * - onCancel: () => void
 */
export default function ConfirmModal({
  isOpen,
  title = 'Konfirmasi Tindakan',
  message,
  confirmText = 'Ya, Lanjutkan',
  cancelText = 'Batal',
  type,
  isDanger = true,
  isLoading = false,
  onConfirm,
  onCancel,
}) {
  if (!isOpen) return null;

  const isLogout = type === 'logout' || 
    title.toLowerCase().includes('keluar') || 
    title.toLowerCase().includes('logout') ||
    confirmText.toLowerCase().includes('keluar');

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden scale-100 animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                isLogout
                  ? 'bg-rose-50 text-rose-600 border border-rose-200 shadow-xs'
                  : isDanger
                  ? 'bg-rose-50 text-rose-600 border border-rose-200 shadow-xs'
                  : 'bg-amber-50 text-amber-600 border border-amber-200 shadow-xs'
              }`}
            >
              {isLogout ? (
                /* Icon Keluar / Logout Resmi (Pintu & Panah Keluar) */
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
              ) : isDanger ? (
                /* Icon Hapus / Bahaya */
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              ) : (
                /* Icon Peringatan */
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">{title}</h3>
              <div className="mt-1.5 text-xs sm:text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                {message}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-slate-50 px-6 py-3.5 flex items-center justify-end gap-2.5 border-t border-slate-200">
          <button
            type="button"
            disabled={isLoading}
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 active:bg-slate-200 transition shadow-xs cursor-pointer disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            type="button"
            disabled={isLoading}
            onClick={onConfirm}
            className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold text-white transition shadow-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50 ${
              isLogout
                ? 'bg-rose-600 hover:bg-rose-700 active:bg-rose-800'
                : isDanger
                ? 'bg-rose-600 hover:bg-rose-700 active:bg-rose-800'
                : 'bg-[#193D9B] hover:bg-[#153280] active:bg-blue-900'
            }`}
          >
            {isLoading ? (
              <svg className="animate-spin -ml-1 mr-1.5 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            ) : isLogout ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            ) : null}
            <span>{confirmText}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
