'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Navbar from '@/components/perpus/home/Navbar';
import HeroBanner from '@/components/perpus/home/HeroBanner';
import KeperluanCards from '@/components/perpus/home/KeperluanCards';
import RingkasanPribadi from '@/components/perpus/home/RingkasanPribadi';
import DaftarBukuGrid from '@/components/perpus/home/DaftarBukuGrid';
import PerpusFooterMain from '@/components/perpus/home/PerpusFooterMain';
import GuestVisitModal from '@/components/perpus/home/GuestVisitModal';
import BookDetailModal from '@/components/perpus/home/BookDetailModal';
import { berandaApi } from '@/lib/features/beranda/berandaApi';
import { tokenStorage } from '@/lib/common/tokenStorage';

export default function BerandaPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [user, setUser] = useState(null);
  const [selectedBook, setSelectedBook] = useState(null);
  const [isGuestModalOpen, setIsGuestModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // Ambil profil sesi pengguna dari tokenStorage lokal secara instan, lalu sinkronkan dengan backend
  const fetchSession = useCallback(async () => {
    let resolvedUser = null;

    // 1. Baca sesi lokal / cookie SSO secara instan tanpa menunggu network
    const localUser = tokenStorage.getUser();
    if (localUser) {
      resolvedUser = {
        id: localUser.id || 'siswa-1',
        nama: localUser.nama || localUser.fullName || localUser.full_name || localUser.username || 'Siswa Spenspra',
        peran: localUser.peran || localUser.roleName || 'SISWA',
        kelas_atau_jabatan: localUser.kelas_atau_jabatan || localUser.className || localUser.kelas || 'Peserta Didik',
        foto: localUser.photoUrl || localUser.foto || null,
      };
      setUser(resolvedUser);
    }

    // 2. Sinkronkan dengan backend /api/session jika tersedia
    try {
      const session = await berandaApi.getSession();
      if (session) {
        setUser(session);
        return session;
      }
    } catch (e) {
      // Backend offline atau fallback sesi lokal tetap digunakan
    }

    return resolvedUser;
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function init() {
      // Set user lokal seawal mungkin saat render pertama
      const local = tokenStorage.getUser();
      if (local && isMounted) {
        setUser({
          id: local.id || 'siswa-1',
          nama: local.nama || local.fullName || local.full_name || local.username || 'Siswa Spenspra',
          peran: local.peran || local.roleName || 'SISWA',
          kelas_atau_jabatan: local.kelas_atau_jabatan || local.className || local.kelas || 'Peserta Didik',
          foto: local.photoUrl || local.foto || null,
        });
      }

      const activeUser = await fetchSession();
      if (!isMounted) return;

      // Handle aksi otomatis setelah kembali dari redirect SSO (?action=...)
      const action = searchParams.get('action');
      if (action && activeUser) {
        if (action === 'meminjam') {
          router.replace('/pinjam');
        } else if (action === 'pembelajaran') {
          router.replace('/pembelajaran');
        } else if (action === 'membaca') {
          try {
            await berandaApi.catatKunjungan({ keperluan: 'MEMBACA' });
            setToastMessage('Selamat datang kembali! Presensi membaca Anda telah dicatat.');
            setTimeout(() => setToastMessage(null), 4000);
          } catch (err) {
            // ignore
          }
          // Bersihkan parameter query dari URL
          router.replace('/');
        }
      }
    }

    init();
    return () => {
      isMounted = false;
    };
  }, [fetchSession, searchParams, router]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col justify-between font-sans selection:bg-[#4B3B78] selection:text-white">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-24 right-6 z-50 p-4 bg-emerald-600 text-white text-xs sm:text-sm font-semibold rounded-2xl shadow-xl animate-in fade-in slide-in-from-top-4 flex items-center gap-2">
          <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
          </svg>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Layout */}
      <div>
        {/* Top Navbar */}
        <Navbar user={user} />

        {/* Hero Banner Carousel */}
        <HeroBanner />

        {/* 4 Keperluan Kunjungan */}
        <KeperluanCards
          user={user}
          onOpenGuestModal={() => setIsGuestModalOpen(true)}
          onVisitRecorded={() => showToast('Presensi kunjungan berhasil dicatat!')}
        />

        {/* Ringkasan Pribadi (Siswa / Guru Login) */}
        <RingkasanPribadi user={user} />

        {/* Daftar Buku Bacaan (Katalog 10 Buku) */}
        <DaftarBukuGrid onSelectBook={(buku) => setSelectedBook(buku)} />
      </div>

      {/* Footer Utama */}
      <PerpusFooterMain />

      {/* Modal Buku Tamu */}
      <GuestVisitModal
        isOpen={isGuestModalOpen}
        onClose={() => setIsGuestModalOpen(false)}
        onSuccess={(msg) => showToast(msg)}
      />

      {/* Modal Detail Buku */}
      <BookDetailModal
        book={selectedBook}
        onClose={() => setSelectedBook(null)}
      />
    </div>
  );
}
