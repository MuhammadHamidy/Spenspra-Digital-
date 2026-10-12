'use client';

import React from 'react';

const STATUS_MAP = {
  // Status Presensi Siswa (Sinkron dengan Palet Lambang Prambon)
  HADIR: {
    bg: 'var(--status-hadir-bg, #F0FDF4)',
    color: 'var(--status-hadir-fg, #15803D)',
    border: 'var(--status-hadir-border, #BBF7D0)',
    label: 'Hadir',
  },
  TERLAMBAT: {
    bg: 'var(--status-terlambat-bg, #FEFCE8)',
    color: 'var(--status-terlambat-fg, #A16207)',
    border: 'var(--status-terlambat-border, #FEF08A)',
    label: 'Terlambat',
  },
  IZIN: {
    bg: 'var(--status-izin-bg, #EFF4FE)',
    color: 'var(--status-izin-fg, #193D9B)',
    border: 'var(--status-izin-border, #BFD3FB)',
    label: 'Izin',
  },
  SAKIT: {
    bg: 'var(--status-sakit-bg, #F0F9FF)',
    color: 'var(--status-sakit-fg, #0369A1)',
    border: 'var(--status-sakit-border, #BAE6FD)',
    label: 'Sakit',
  },
  ALPHA: {
    bg: 'var(--status-alpha-bg, #FEF2F2)',
    color: 'var(--status-alpha-fg, #DC2626)',
    border: 'var(--status-alpha-border, #FECACA)',
    label: 'Alpha',
  },
  ALPA: {
    bg: 'var(--status-alpha-bg, #FEF2F2)',
    color: 'var(--status-alpha-fg, #DC2626)',
    border: 'var(--status-alpha-border, #FECACA)',
    label: 'Alpha',
  },

  // Status Sinkronisasi & Penilaian e-Rapor (Dinamis dari Backend)
  LENGKAP: {
    bg: '#DCFCE7',
    color: '#15803D',
    border: '#86EFAC',
    label: 'Lengkap',
  },
  COMPLETE: {
    bg: '#DCFCE7',
    color: '#15803D',
    border: '#86EFAC',
    label: 'Lengkap',
  },
  BELUM_LENGKAP: {
    bg: '#FEF9C3',
    color: '#CA8A04',
    border: '#FDE047',
    label: 'Belum Lengkap',
  },
  INCOMPLETE: {
    bg: '#FEF9C3',
    color: '#CA8A04',
    border: '#FDE047',
    label: 'Belum Lengkap',
  },
  TUNTAS: {
    bg: '#EFF4FE',
    color: '#1E4DBD',
    border: '#BFDBFE',
    label: 'Tuntas KKM',
  },
  PASSED: {
    bg: '#EFF4FE',
    color: '#1E4DBD',
    border: '#BFDBFE',
    label: 'Tuntas KKM',
  },
  REMEDIAL: {
    bg: '#FEE2E2',
    color: '#DC2626',
    border: '#FECACA',
    label: 'Remedial',
  },
  APPROVED: {
    bg: '#DCFCE7',
    color: '#15803D',
    border: '#86EFAC',
    label: 'Disahkan',
  },
  DISAHKAN: {
    bg: '#DCFCE7',
    color: '#15803D',
    border: '#86EFAC',
    label: 'Disahkan',
  },
  PENDING: {
    bg: '#FEF9C3',
    color: '#CA8A04',
    border: '#FDE047',
    label: 'Menunggu Pengesahan',
  },
  MENUNGGU: {
    bg: '#FEF9C3',
    color: '#CA8A04',
    border: '#FDE047',
    label: 'Menunggu Pengesahan',
  },
  SUBMITTED: {
    bg: '#EFF4FE',
    color: '#1E4DBD',
    border: '#BFDBFE',
    label: 'Diajukan',
  },
  DRAFT: {
    bg: '#F1F5F9',
    color: '#475569',
    border: '#CBD5E1',
    label: 'Draf',
  },

  // Status Sesi Ujian / Presensi
  OPEN: {
    bg: '#ECFDF5',
    color: '#047857',
    border: '#A7F3D0',
    label: 'Sesi Terbuka',
  },
  CLOSED: {
    bg: '#F1F5F9',
    color: '#64748B',
    border: '#CBD5E1',
    label: 'Sesi Ditutup',
  },
  UPCOMING: {
    bg: '#F8FAFC',
    color: '#64748B',
    border: '#CBD5E1',
    label: 'Akan Datang',
  },
};

export default function StatusBadge({ status, label, className = '' }) {
  const normStatus = String(status || '').toUpperCase().replace(/[\s-]/g, '_');
  const config = STATUS_MAP[normStatus] || {
    bg: '#F1F5F9',
    color: '#64748B',
    border: '#CBD5E1',
    label: status || '-',
  };

  return (
    <span
      style={{
        backgroundColor: config.bg,
        color: config.color,
        borderColor: config.border,
      }}
      className={`inline-flex items-center px-2 py-0.5 rounded-[6px] border text-xs font-semibold select-none ${className}`}
    >
      {label || config.label}
    </span>
  );
}
