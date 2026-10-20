'use client';

import React, { useState } from 'react';
import { berandaApi } from '@/lib/features/beranda/berandaApi';

export default function GuestVisitModal({ isOpen, onClose, onSuccess }) {
  const [namaTamu, setNamaTamu] = useState('');
  const [asalTamu, setAsalTamu] = useState('');
  const [keperluan, setKeperluan] = useState('Kunjungan Dinas / Umum');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!namaTamu.trim() || !asalTamu.trim()) {
      setErrorMsg('Nama dan asal instansi wajib diisi');
      return;
    }

    try {
      setLoading(true);
      setErrorMsg(null);
      await berandaApi.catatKunjungan({
        keperluan: 'TAMU',
        nama_tamu: namaTamu.trim(),
        asal_tamu: asalTamu.trim(),
      });
      setNamaTamu('');
      setAsalTamu('');
      onSuccess?.('Buku tamu berhasil diisi. Selamat datang di Perpustakaan SMPN 1 Prambon!');
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Gagal menyimpan data tamu');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 sm:p-8 border border-slate-100">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-[#2E7D5B] flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800 font-sans">Buku Tamu Kunjungan</h3>
              <p className="text-xs text-slate-500">Pengunjung Luar Sekolah</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center cursor-pointer transition-colors"
          >
            ✕
          </button>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Nama Lengkap</label>
            <input
              type="text"
              required
              value={namaTamu}
              onChange={(e) => setNamaTamu(e.target.value)}
              placeholder="Contoh: Bpk. Suryanto, M.Pd"
              className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#4B3B78]/40 focus:border-[#4B3B78]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Asal Instansi / Lembaga</label>
            <input
              type="text"
              required
              value={asalTamu}
              onChange={(e) => setAsalTamu(e.target.value)}
              placeholder="Contoh: Dinas Pendidikan / Universitas / Umum"
              className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#4B3B78]/40 focus:border-[#4B3B78]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Tujuan / Keperluan</label>
            <select
              value={keperluan}
              onChange={(e) => setKeperluan(e.target.value)}
              className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#4B3B78]/40 focus:border-[#4B3B78]"
            >
              <option value="Kunjungan Dinas / Umum">Kunjungan Dinas / Studi Banding</option>
              <option value="Riset / Penelitian">Riset / Penelitian</option>
              <option value="Donasi / Kerjasama Buku">Donasi / Kerjasama Literasi</option>
              <option value="Lainnya">Lainnya</option>
            </select>
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-[#4B3B78] hover:bg-[#3D2E66] text-white text-xs font-semibold rounded-xl shadow-xs hover:shadow-md transition-all cursor-pointer disabled:opacity-50"
            >
              {loading ? 'Menyimpan...' : 'Kirim Presensi Tamu'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
