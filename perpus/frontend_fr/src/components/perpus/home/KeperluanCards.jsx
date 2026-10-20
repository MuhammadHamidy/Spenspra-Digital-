'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { redirectToSsoLogin } from '@/lib/features/beranda/ssoHelper';
import { berandaApi } from '@/lib/features/beranda/berandaApi';

export default function KeperluanCards({ user, onOpenGuestModal, onVisitRecorded }) {
  const router = useRouter();
  const [loadingAction, setLoadingAction] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  const handleCardClick = async (actionKey) => {
    if (actionKey === 'tamu') {
      onOpenGuestModal();
      return;
    }

    // Jika belum login, jalankan alur SSO redirect
    if (!user) {
      redirectToSsoLogin(actionKey);
      return;
    }

    // Jika sudah login
    if (actionKey === 'meminjam') {
      router.push('/pinjam');
      return;
    }

    if (actionKey === 'pembelajaran') {
      router.push('/pembelajaran');
      return;
    }

    if (actionKey === 'membaca') {
      try {
        setLoadingAction('membaca');
        await berandaApi.catatKunjungan({ keperluan: 'MEMBACA' });
        setToastMessage('Presensi membaca Anda berhasil dicatat hari ini!');
        if (onVisitRecorded) onVisitRecorded();
        setTimeout(() => setToastMessage(null), 4000);
      } catch (err) {
        setToastMessage(err.message || 'Gagal mencatat presensi membaca');
        setTimeout(() => setToastMessage(null), 4000);
      } finally {
        setLoadingAction(null);
      }
    }
  };

  const CARDS = [
    {
      key: 'meminjam',
      title: 'Meminjam',
      desc: 'Peminjaman buku fisik perpustakaan mandiri',
      iconBg: 'bg-purple-100 text-[#4B3B78]',
      borderHover: 'hover:border-[#4B3B78]',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      ),
    },
    {
      key: 'membaca',
      title: 'Membaca',
      desc: 'Presensi aktivitas membaca di ruang baca',
      iconBg: 'bg-blue-100 text-[#4F8FBB]',
      borderHover: 'hover:border-[#4F8FBB]',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      ),
    },
    {
      key: 'pembelajaran',
      title: 'Pembelajaran',
      desc: 'Kegiatan tugas kelompok & jam mata pelajaran',
      iconBg: 'bg-amber-100 text-[#D8A91F]',
      borderHover: 'hover:border-[#D8A91F]',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
    },
    {
      key: 'tamu',
      title: 'Tamu',
      desc: 'Buku tamu untuk pengunjung luar sekolah',
      iconBg: 'bg-emerald-100 text-[#2E7D5B]',
      borderHover: 'hover:border-[#2E7D5B]',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
        </svg>
      ),
    },
  ];

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight font-sans">
          Keperluan Kunjungan
        </h2>
        <span className="text-xs text-slate-400">Pilih salah satu untuk memulai</span>
      </div>

      {toastMessage && (
        <div className="mb-4 p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm rounded-2xl flex items-center gap-2 animate-in fade-in">
          <svg className="w-4 h-4 text-emerald-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
          </svg>
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
        {CARDS.map((card) => (
          <button
            key={card.key}
            type="button"
            onClick={() => handleCardClick(card.key)}
            disabled={loadingAction === card.key}
            className={`p-5 bg-white rounded-3xl border border-slate-100 shadow-xs ${card.borderHover} hover:shadow-md transition-all text-left flex flex-col justify-between group cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#4B3B78]/30`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`w-12 h-12 rounded-2xl ${card.iconBg} flex items-center justify-center transition-transform group-hover:scale-110 shadow-xs`}>
                {card.icon}
              </div>
              <svg className="w-5 h-5 text-slate-300 group-hover:text-slate-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800 group-hover:text-[#4B3B78] transition-colors font-sans">
                {card.title}
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                {card.desc}
              </p>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
