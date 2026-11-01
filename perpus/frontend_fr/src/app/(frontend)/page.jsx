'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Navbar from '@/components/perpus/home/Navbar';
import HeroBanner from '@/components/perpus/home/HeroBanner';
import RingkasanPribadi from '@/components/perpus/home/RingkasanPribadi';
import DaftarBukuGrid from '@/components/perpus/home/DaftarBukuGrid';
import PerpusFooterMain from '@/components/perpus/home/PerpusFooterMain';
import { berandaApi } from '@/lib/features/beranda/berandaApi';
import { tokenStorage } from '@/lib/common/tokenStorage';

export default function RootPerpusPage() {
  const [user, setUser] = useState(null);

  const fetchSession = useCallback(async () => {
    let resolvedUser = null;
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

    const token = tokenStorage.getToken();
    if (!token) {
      return resolvedUser;
    }

    try {
      const session = await berandaApi.getSession();
      if (session) {
        setUser(session);
        return session;
      }
    } catch (e) {
      // Fallback sesi lokal tetap digunakan
    }

    return resolvedUser;
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function init() {
      const token = tokenStorage.getToken();
      if (!token) {
        return;
      }

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

      await fetchSession();
    }

    init();
    return () => {
      isMounted = false;
    };
  }, [fetchSession]);

  return (
    <div className="min-h-screen bg-white flex flex-col justify-between font-sans selection:bg-[#1E2538] selection:text-white">
      <div>
        <Navbar user={user} />
        <HeroBanner />
        <RingkasanPribadi user={user} />
        <DaftarBukuGrid />
      </div>
      <PerpusFooterMain />
    </div>
  );
}

