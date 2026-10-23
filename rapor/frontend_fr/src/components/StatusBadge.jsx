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

  // Status Sinkronisasi & Penilaian e-Rapor
  LENGKAP: {
    bg: 'var(--color-success-50, #F7FCF9)',
    color: 'var(--color-success-800, #1C5038)',
    border: 'var(--color-success-300, #A9D8BC)',
    label: 'Lengkap',
  },
  COMPLETE: {
    bg: 'var(--color-success-50, #F7FCF9)',
    color: 'var(--color-success-800, #1C5038)',
    border: 'var(--color-success-300, #A9D8BC)',
    label: 'Lengkap',
  },
  BELUM_LENGKAP: {
    bg: 'var(--color-accent-100, #FFF6D6)',
    color: 'var(--color-accent-800, #A97E0D)',
    border: 'var(--color-accent-300, #F9DD82)',
    label: 'Belum Lengkap',
  },
  INCOMPLETE: {
    bg: 'var(--color-accent-100, #FFF6D6)',
    color: 'var(--color-accent-800, #A97E0D)',
    border: 'var(--color-accent-300, #F9DD82)',
    label: 'Belum Lengkap',
  },
  TUNTAS: {
    bg: 'var(--color-secondary-100, #E4F1F8)',
    color: 'var(--color-secondary-800, #2E607C)',
    border: 'var(--color-secondary-300, #A8CBDD)',
    label: 'Tuntas KKM',
  },
  PASSED: {
    bg: 'var(--color-secondary-100, #E4F1F8)',
    color: 'var(--color-secondary-800, #2E607C)',
    border: 'var(--color-secondary-300, #A8CBDD)',
    label: 'Tuntas KKM',
  },
  REMEDIAL: {
    bg: 'var(--color-danger-50, #FFF9F8)',
    color: 'var(--color-danger-800, #7D261E)',
    border: 'var(--color-danger-300, #F1B4AC)',
    label: 'Remedial',
  },
  APPROVED: {
    bg: 'var(--color-success-50, #F7FCF9)',
    color: 'var(--color-success-800, #1C5038)',
    border: 'var(--color-success-300, #A9D8BC)',
    label: 'Disahkan',
  },
  DISAHKAN: {
    bg: 'var(--color-success-50, #F7FCF9)',
    color: 'var(--color-success-800, #1C5038)',
    border: 'var(--color-success-300, #A9D8BC)',
    label: 'Disahkan',
  },
  PENDING: {
    bg: 'var(--color-accent-100, #FFF6D6)',
    color: 'var(--color-accent-800, #A97E0D)',
    border: 'var(--color-accent-300, #F9DD82)',
    label: 'Menunggu Pengesahan',
  },
  MENUNGGU: {
    bg: 'var(--color-accent-100, #FFF6D6)',
    color: 'var(--color-accent-800, #A97E0D)',
    border: 'var(--color-accent-300, #F9DD82)',
    label: 'Menunggu Pengesahan',
  },
  SUBMITTED: {
    bg: 'var(--color-secondary-100, #E4F1F8)',
    color: 'var(--color-secondary-800, #2E607C)',
    border: 'var(--color-secondary-300, #A8CBDD)',
    label: 'Diajukan',
  },
  DRAFT: {
    bg: 'var(--color-neutral-100, #F8F9FC)',
    color: 'var(--color-neutral-700, #667085)',
    border: 'var(--color-neutral-300, #E5E7EB)',
    label: 'Draf',
  },

  // Status LMS: Materi & Tugas
  DITUGASKAN: {
    bg: 'var(--color-secondary-100, #E4F1F8)',
    color: 'var(--color-secondary-800, #2E607C)',
    border: 'var(--color-secondary-300, #A8CBDD)',
    label: 'Ditugaskan',
  },
  DIKUMPULKAN: {
    bg: 'var(--color-success-50, #F7FCF9)',
    color: 'var(--color-success-800, #1C5038)',
    border: 'var(--color-success-300, #A9D8BC)',
    label: 'Sudah Dikumpulkan',
  },
  DINILAI: {
    bg: 'var(--color-primary-100, #EDEAF5)',
    color: 'var(--color-primary-800, #30264F)',
    border: 'var(--color-primary-300, #B9B0D2)',
    label: 'Sudah Dinilai',
  },

  // Status e-Ujian CBT
  BELUM_MULAI: {
    bg: 'var(--color-neutral-100, #F8F9FC)',
    color: 'var(--color-neutral-700, #667085)',
    border: 'var(--color-neutral-300, #E5E7EB)',
    label: 'Belum Mulai',
  },
  SEDANG_MENGERJAKAN: {
    bg: 'var(--color-secondary-100, #E4F1F8)',
    color: 'var(--color-secondary-800, #2E607C)',
    border: 'var(--color-secondary-300, #A8CBDD)',
    label: 'Mengerjakan',
  },
  RAGU_RAGU: {
    bg: 'var(--color-accent-100, #FFF6D6)',
    color: 'var(--color-accent-800, #A97E0D)',
    border: 'var(--color-accent-300, #F9DD82)',
    label: 'Ragu-Ragu',
  },
  SELESAI_UJIAN: {
    bg: 'var(--color-success-50, #F7FCF9)',
    color: 'var(--color-success-800, #1C5038)',
    border: 'var(--color-success-300, #A9D8BC)',
    label: 'Selesai',
  },
  TERKUNCI: {
    bg: 'var(--color-danger-50, #FFF9F8)',
    color: 'var(--color-danger-800, #7D261E)',
    border: 'var(--color-danger-300, #F1B4AC)',
    label: 'Terkunci (Melanggar)',
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
