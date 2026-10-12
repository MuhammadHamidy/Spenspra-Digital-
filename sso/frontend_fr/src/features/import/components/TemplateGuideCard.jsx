'use client';

import React from 'react';

export default function TemplateGuideCard({ activeTab, onDownloadTemplate }) {
  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
      <div className="flex items-center gap-2.5">
        <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center">
          1
        </span>
        <h3 className="text-sm font-bold text-slate-900">Unduh Format Template</h3>
      </div>
      <p className="text-xs text-slate-500 leading-relaxed">
        Pastikan berkas Excel yang diunggah mengikuti struktur kolom resmi agar validasi berjalan lancar.
      </p>

      <button
        type="button"
        onClick={() => onDownloadTemplate(activeTab)}
        className="w-full py-2.5 px-3 rounded-xl bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 text-blue-700 font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <span>Download Template {activeTab === 'students' ? 'Siswa' : 'Guru'}</span>
      </button>

      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 text-[11px] text-slate-600 space-y-1">
        <p className="font-semibold text-slate-800">Petunjuk Pengisian:</p>
        {activeTab === 'students' ? (
          <ul className="list-disc list-inside space-y-0.5">
            <li>Kolom NISN wajib unik (10 digit).</li>
            <li>Nama Siswa & Rombel (misal: VII-A, 7A, atau 8B).</li>
            <li>Jenis Kelamin: L atau P.</li>
          </ul>
        ) : (
          <ul className="list-disc list-inside space-y-0.5">
            <li>Kolom NIP bersifat opsional (jika guru belum memiliki NIP, kosongkan saja).</li>
            <li>Nama Lengkap dan Gelar Pendidik.</li>
            <li>Username (opsional, jika NIP kosong maka username otomatis dibuat dari nama guru).</li>
            <li>Password (opsional, bawaan: password123).</li>
            <li>Status akun otomatis menjadi Guru Aktif di SSO & e-Rapor.</li>
          </ul>
        )}
      </div>
    </div>
  );
}
