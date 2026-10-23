'use client';

import React from 'react';

/**
 * StatusBadge — Sesuai token standar DESIGN fix.md
 * - Radius: 999px (FULL)
 * - Typography: Small (12px / 600)
 * - Warna: {warna}-100 background, {warna}-800 teks
 */
const STATUS_MAP = {
  // Status Presensi Siswa
  HADIR: {
    bg: 'var(--color-success-50, #F7FCF9)',
    color: 'var(--color-success-800, #1C5038)',
    border: 'var(--color-success-300, #A9D8BC)',
    label: 'Hadir',
  },
  TERLAMBAT: {
    bg: 'var(--color-accent-100, #FFF6D6)',
    color: 'var(--color-accent-800, #A97E0D)',
    border: 'var(--color-accent-300, #F9DD82)',
    label: 'Terlambat',
  },
  IZIN: {
    bg: 'var(--color-secondary-100, #E4F1F8)',
    color: 'var(--color-secondary-800, #2E607C)',
    border: 'var(--color-secondary-300, #A8CBDD)',
    label: 'Izin',
  },
  SAKIT: {
    bg: 'var(--color-secondary-100, #E4F1F8)',
    color: 'var(--color-secondary-700, #397394)',
    border: 'var(--color-secondary-300, #A8CBDD)',
    label: 'Sakit',
  },
  ALPHA: {
    bg: 'var(--color-danger-50, #FFF9F8)',
    color: 'var(--color-danger-800, #7D261E)',
    border: 'var(--color-danger-300, #F1B4AC)',
    label: 'Alpha',
  },
  ALPA: {
    bg: 'var(--color-danger-50, #FFF9F8)',
    color: 'var(--color-danger-800, #7D261E)',
    border: 'var(--color-danger-300, #F1B4AC)',
    label: 'Alpha',
  },

  // Status Peminjaman Buku Perpustakaan
  DIPINJAM: {
    bg: 'var(--color-secondary-100, #E4F1F8)',
    color: 'var(--color-secondary-800, #2E607C)',
    border: 'var(--color-secondary-300, #A8CBDD)',
    label: 'Dipinjam',
  },
  KEMBALI: {
    bg: 'var(--color-success-50, #F7FCF9)',
    color: 'var(--color-success-800, #1C5038)',
    border: 'var(--color-success-300, #A9D8BC)',
    label: 'Dikembalikan',
  },
  TERLAMBAT_KEMBALI: {
    bg: 'var(--color-danger-50, #FFF9F8)',
    color: 'var(--color-danger-800, #7D261E)',
    border: 'var(--color-danger-300, #F1B4AC)',
    label: 'Terlambat (Denda)',
  },
  HILANG: {
    bg: 'var(--color-danger-50, #FFF9F8)',
    color: 'var(--color-danger-800, #7D261E)',
    border: 'var(--color-danger-300, #F1B4AC)',
    label: 'Buku Hilang',
  },
  TERSEDIA: {
    bg: 'var(--color-success-50, #F7FCF9)',
    color: 'var(--color-success-800, #1C5038)',
    border: 'var(--color-success-300, #A9D8BC)',
    label: 'Tersedia',
  },

  // Status Sesi Ujian / Presensi
  OPEN: {
    bg: 'var(--color-success-50, #F7FCF9)',
    color: 'var(--color-success-800, #1C5038)',
    border: 'var(--color-success-300, #A9D8BC)',
    label: 'Sesi Aktif',
  },
  CLOSED: {
    bg: 'var(--color-neutral-100, #F8F9FC)',
    color: 'var(--color-neutral-700, #667085)',
    border: 'var(--color-neutral-300, #E5E7EB)',
    label: 'Sesi Ditutup',
  },
  UPCOMING: {
    bg: 'var(--color-secondary-100, #E4F1F8)',
    color: 'var(--color-secondary-800, #2E607C)',
    border: 'var(--color-secondary-300, #A8CBDD)',
    label: 'Akan Datang',
  },
};

export default function StatusBadge({ status, label, className = '' }) {
  const normStatus = String(status || '').toUpperCase().replace(/[\s-]/g, '_');
  const config = STATUS_MAP[normStatus] || {
    bg: 'var(--color-neutral-100, #F8F9FC)',
    color: 'var(--color-neutral-700, #667085)',
    border: 'var(--color-neutral-300, #E5E7EB)',
    label: status || '-',
  };

  return (
    <span
      style={{
        backgroundColor: config.bg,
        color: config.color,
        borderColor: config.border,
      }}
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full border text-xs font-semibold select-none ${className}`}
    >
      {label || config.label}
    </span>
  );
}
