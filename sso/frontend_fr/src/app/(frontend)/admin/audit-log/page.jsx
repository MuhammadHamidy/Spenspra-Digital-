'use client';

import React, { useState } from 'react';

const AUDIT_CATEGORIES = [
  { value: 'ALL', label: 'Semua Kategori' },
  { value: 'AUTH', label: 'Autentikasi & Login' },
  { value: 'IDENTITY', label: 'Perubahan Identitas' },
  { value: 'ACCESS', label: 'Akses Aplikasi' },
  { value: 'BARCODE', label: 'Penerbitan & Cetak Barcode' },
];

export default function AuditLogPage() {
  const [category, setCategory] = useState('ALL');
  const [search, setSearch] = useState('');

  // Log audit terstruktur per PRD FR-S7
  const [logs] = useState([
    {
      id: 'log-1',
      timestamp: new Date().toLocaleString('id-ID'),
      actor: 'Super Administrator',
      actorRole: 'SUPER_ADMIN',
      action: 'LOGIN_SUCCESS',
      entity: 'SESSION',
      detail: 'Berhasil login ke Portal SSO dari IP 127.0.0.1 (Web Browser).',
      category: 'AUTH',
    },
    {
      id: 'log-2',
      timestamp: new Date(Date.now() - 3600000).toLocaleString('id-ID'),
      actor: 'Super Administrator',
      actorRole: 'SUPER_ADMIN',
      action: 'UPDATE_APP_ACCESS',
      entity: 'USER_APP_ACCESS',
      detail: 'Pemberian peran GURU pada aplikasi erapor untuk Budi Santoso, S.Pd.',
      category: 'ACCESS',
    },
    {
      id: 'log-3',
      timestamp: new Date(Date.now() - 7200000).toLocaleString('id-ID'),
      actor: 'Super Administrator',
      actorRole: 'SUPER_ADMIN',
      action: 'PRINT_BARCODE',
      entity: 'SCHOOL_PEOPLE',
      detail: 'Cetak lembar kartu barcode multifungsi untuk rombel VII-A.',
      category: 'BARCODE',
    },
    {
      id: 'log-4',
      timestamp: new Date(Date.now() - 86400000).toLocaleString('id-ID'),
      actor: 'Super Administrator',
      actorRole: 'SUPER_ADMIN',
      action: 'MUTATE_STUDENT',
      entity: 'STUDENT_CLASS',
      detail: 'Penetapan keanggotaan rombel siswa Andi Saputra ke kelas VII-A.',
      category: 'IDENTITY',
    },
  ]);

  const filteredLogs = logs.filter((log) => {
    const matchCategory = category === 'ALL' || log.category === category;
    const matchSearch =
      !search.trim() ||
      log.actor.toLowerCase().includes(search.toLowerCase()) ||
      log.detail.toLowerCase().includes(search.toLowerCase()) ||
      log.action.toLowerCase().includes(search.toLowerCase());
    return matchCategory && matchSearch;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="border-b border-slate-200 pb-4">
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">
          Audit Log Sistem SSO (PRD FR-S7)
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Rekaman jejak aktivitas autentikasi, perubahan identitas civitas, akses aplikasi, dan pencetakan kartu.
        </p>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <input
            type="text"
            placeholder="Cari aktivitas, pelaku, atau detail..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:w-72 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
          >
            {AUDIT_CATEGORIES.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>

        <span className="text-xs text-slate-500">
          Menampilkan {filteredLogs.length} catatan audit
        </span>
      </div>

      {/* Tabel Audit Log */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-bold uppercase tracking-wider">
                <th className="py-3 px-4">Waktu</th>
                <th className="py-3 px-4">Pelaku (Actor)</th>
                <th className="py-3 px-4">Aksi</th>
                <th className="py-3 px-4">Entitas</th>
                <th className="py-3 px-4">Detail Perubahan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/70 transition">
                  <td className="py-3 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                    {log.timestamp}
                  </td>
                  <td className="py-3 px-4">
                    <p className="font-bold text-slate-900">{log.actor}</p>
                    <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700">
                      {log.actorRole}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="rounded-md bg-slate-100 px-2 py-1 font-mono text-[11px] font-bold text-slate-800">
                      {log.action}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-600">
                    {log.entity}
                  </td>
                  <td className="py-3 px-4 text-slate-700 max-w-md">
                    {log.detail}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
