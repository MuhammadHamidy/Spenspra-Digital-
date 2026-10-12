'use client';

import { useEffect, useState } from 'react';

const VARIANTS = {
  success: {
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    text: 'text-emerald-800',
    icon: (
      <svg className="w-4 h-4 text-emerald-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
      </svg>
    ),
  },
  error: {
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    text: 'text-rose-800',
    icon: (
      <svg className="w-4 h-4 text-rose-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
      </svg>
    ),
  },
  warning: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-800',
    icon: (
      <svg className="w-4 h-4 text-amber-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
  },
  info: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-800',
    icon: (
      <svg className="w-4 h-4 text-blue-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
};

/**
 * Toast — komponen notifikasi floating yang muncul di pojok kanan bawah.
 *
 * @param {string}   message   — Pesan yang ditampilkan
 * @param {'success'|'error'|'warning'|'info'} type — Jenis notifikasi
 * @param {function} onDismiss — Callback saat toast ditutup
 * @param {number}   duration  — Durasi auto-dismiss (ms). 0 = tidak auto-dismiss
 */
export default function Toast({ message, type = 'success', onDismiss, duration = 4000 }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Trigger masuk dengan delay kecil agar transisi CSS jalan
    const enterTimer = setTimeout(() => setVisible(true), 10);

    let exitTimer;
    if (duration > 0) {
      exitTimer = setTimeout(() => {
        setVisible(false);
        setTimeout(() => onDismiss?.(), 300); // tunggu animasi keluar
      }, duration);
    }

    return () => {
      clearTimeout(enterTimer);
      clearTimeout(exitTimer);
    };
  }, [duration, onDismiss]);

  const variant = VARIANTS[type] || VARIANTS.success;

  return (
    <div
      role="alert"
      aria-live="polite"
      style={{
        transform: visible ? 'translateY(0) scale(1)' : 'translateY(16px) scale(0.97)',
        opacity: visible ? 1 : 0,
        transition: 'transform 0.25s cubic-bezier(0.34,1.56,0.64,1), opacity 0.25s ease',
      }}
      className={`
        flex items-start gap-3 rounded-xl border px-4 py-3 shadow-lg shadow-black/5 text-xs font-medium max-w-sm w-full pointer-events-auto
        ${variant.bg} ${variant.border} ${variant.text}
      `}
    >
      {variant.icon}
      <span className="flex-1 leading-relaxed">{message}</span>
      <button
        type="button"
        onClick={() => {
          setVisible(false);
          setTimeout(() => onDismiss?.(), 300);
        }}
        className="opacity-50 hover:opacity-100 transition cursor-pointer shrink-0 -mt-0.5"
        aria-label="Tutup notifikasi"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

/**
 * ToastContainer — wrapper portal yang menampilkan toast di pojok kanan bawah layar.
 * Letakkan sekali di layout atau halaman utama.
 *
 * @param {Array} toasts   — Array of { id, message, type, duration }
 * @param {fn}    onRemove — Callback (id) saat toast perlu dihapus
 */
export function ToastContainer({ toasts = [], onRemove }) {
  if (!toasts.length) return null;
  return (
    <div
      aria-label="Notifikasi"
      className="fixed bottom-5 right-5 z-[9999] flex flex-col-reverse gap-2.5 pointer-events-none"
      style={{ maxWidth: 'calc(100vw - 40px)' }}
    >
      {toasts.map((t) => (
        <Toast
          key={t.id}
          message={t.message}
          type={t.type || 'success'}
          duration={t.duration ?? 4000}
          onDismiss={() => onRemove?.(t.id)}
        />
      ))}
    </div>
  );
}

/**
 * useToast — hook sederhana untuk mengelola antrian toast.
 *
 * Penggunaan:
 *   const { toasts, addToast, removeToast } = useToast();
 *   addToast('Data berhasil disimpan!', 'success');
 *   <ToastContainer toasts={toasts} onRemove={removeToast} />
 */
export function useToast() {
  const [toasts, setToasts] = useState([]);

  const addToast = (message, type = 'success', duration = 4000) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => [...prev, { id, message, type, duration }]);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return { toasts, addToast, removeToast };
}
