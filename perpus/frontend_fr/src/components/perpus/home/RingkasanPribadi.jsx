'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { berandaApi } from '@/lib/features/beranda/berandaApi';
import { tokenStorage } from '@/lib/common/tokenStorage';
import { redirectToSsoLogin } from '@/lib/features/beranda/ssoHelper';
import { literacyAssignmentApi } from '@/lib/features/library/api/literacyAssignmentApi';

export default function RingkasanPribadi({ user }) {
  const [data, setData] = useState(null);
  const [activeTasks, setActiveTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user) return;
    const token = tokenStorage.getToken();
    if (!token) return;

    let isMounted = true;

    async function loadData() {
      try {
        setLoading(true);
        setError(null);
        const res = await berandaApi.getBeranda();
        if (isMounted) setData(res || { pinjaman_aktif: [], aktivitas_baca_terakhir: null });
      } catch (err) {
        // Fallback anggun: Jangan tampilkan pesan error teknis 'Unauthorized' yang merusak UI siswa
        console.warn('Kendala memuat /beranda backend:', err?.message);
        if (isMounted) {
          setData({ pinjaman_aktif: [], aktivitas_baca_terakhir: null });
          if (!err?.message?.toLowerCase().includes('unauthorized')) {
            setError(err.message);
          }
        }
      } finally {
        if (isMounted) setLoading(false);
      }

      // Ambil tugas literasi yang relevan untuk kelas siswa dari SSO
      try {
        const allTasks = literacyAssignmentApi.getAssignments();
        const relevant = allTasks.filter((t) =>
          literacyAssignmentApi.isTaskTargetingStudent(t, user?.kelas_atau_jabatan)
        );
        if (isMounted) setActiveTasks(relevant);
      } catch (e) {}
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, [user]);

  if (!user) {
    return (
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10">
        <div className="bg-gradient-to-r from-purple-50 via-slate-50 to-blue-50 border border-slate-200/60 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xs">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white border border-purple-200 text-[#4B3B78] flex items-center justify-center flex-shrink-0 shadow-xs">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-800 font-sans">
                Akses Layanan Mandiri Penuh dengan Akun Spenspra
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Masuk melalui SSO sekolah untuk memantau status peminjaman, bookmark buku, dan riwayat bacaan Anda.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => redirectToSsoLogin()}
            className="px-6 py-3 bg-[#4B3B78] hover:bg-[#3D2E66] text-white text-xs sm:text-sm font-semibold rounded-2xl shadow-xs hover:shadow-md transition-all flex-shrink-0 cursor-pointer"
          >
            Masuk dengan Akun Sekolah
          </button>
        </div>
      </section>
    );
  }

  const pinjamanList = data?.pinjaman_aktif || [];
  const aktivitasBaca = data?.aktivitas_baca_terakhir;

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight font-sans">
            Ringkasan Literasi Anda
          </h2>
          <p className="text-xs text-slate-500">Selamat datang kembali, {user.nama} ({user.kelas_atau_jabatan || user.peran})</p>
        </div>
        <Link href="/pinjam" className="text-xs text-[#4B3B78] font-bold hover:underline">
          Lihat Riwayat Peminjaman &rarr;
        </Link>
      </div>

      {loading ? (
        <div className="p-8 text-center text-xs text-slate-400 bg-white rounded-3xl border border-slate-100">
          Memuat ringkasan literasi pribadi Anda...
        </div>
      ) : error ? (
        <div className="p-4 bg-red-50 text-red-600 text-xs rounded-2xl border border-red-100">
          {error}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Kartu Pinjaman Aktif */}
          <div className="p-6 bg-white rounded-3xl border border-slate-100 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pinjaman Aktif</span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-[#4B3B78]">
                  {pinjamanList.length} Buku
                </span>
              </div>

              {pinjamanList.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400">
                  Tidak ada buku yang sedang dipinjam saat ini.
                </div>
              ) : (
                <div className="space-y-3">
                  {pinjamanList.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/70 border border-slate-100">
                      <div className="min-w-0 pr-3">
                        <p className="text-xs sm:text-sm font-bold text-slate-800 truncate">{item.judul_buku}</p>
                        <p className="text-[11px] text-slate-500 truncate">{item.penulis}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span className="text-[10px] text-slate-400 block">Tenggat Kembali</span>
                        <span className="text-xs font-bold text-[#F2C94C] bg-amber-50 px-2 py-0.5 rounded-md inline-block">
                          {new Date(item.tenggat_kembali).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Kartu Aktivitas Baca Terakhir */}
          <div className="p-6 bg-white rounded-3xl border border-slate-100 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Aktivitas Membaca Terakhir</span>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              </div>

              {aktivitasBaca ? (
                <div className="flex items-center gap-4 p-3 rounded-2xl bg-emerald-50/40 border border-emerald-100">
                  <div className="w-12 h-16 bg-slate-200 rounded-lg overflow-hidden flex-shrink-0 relative">
                    {aktivitasBaca.cover_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={aktivitasBaca.cover_url} alt={aktivitasBaca.judul_buku} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[10px] text-slate-400">Buku</div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm font-bold text-slate-800 truncate">{aktivitasBaca.judul_buku}</p>
                    <p className="text-[11px] text-slate-500">{aktivitasBaca.penulis}</p>
                    <span className="mt-1 inline-block text-[10px] text-emerald-700 bg-emerald-100/60 font-semibold px-2 py-0.5 rounded-md">
                      Selesai Dibaca & Dikembalikan
                    </span>
                  </div>
                </div>
              ) : (
                <div className="py-6 text-center text-xs text-slate-400">
                  Belum ada riwayat buku yang selesai dibaca.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Banner Notifikasi Tugas Kegiatan Literasi untuk Kelas Siswa */}
      {activeTasks.length > 0 && (
        <div className="mt-6 p-6 sm:p-7 bg-gradient-to-r from-[#1E2538] via-[#2A344E] to-[#4B3B78] rounded-3xl text-white shadow-md flex flex-col md:flex-row items-center justify-between gap-5 relative overflow-hidden">
          <div className="flex items-center gap-4 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-purple-200 flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-purple-500/40 text-purple-100 border border-purple-400/30">
                  Kegiatan Literasi Aktif
                </span>
                <span className="text-xs text-purple-200">
                  Untuk {user?.kelas_atau_jabatan || 'Siswa Spenspra'}
                </span>
              </div>
              <h4 className="text-sm sm:text-base font-bold text-white mt-1">
                {activeTasks[0].title}
              </h4>
              <p className="text-xs text-slate-300 mt-0.5 max-w-xl line-clamp-1">
                {activeTasks[0].description}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto justify-end relative z-10 flex-shrink-0">
            <Link
              href="/tugas-literasi"
              className="w-full md:w-auto px-5 py-2.5 bg-white hover:bg-slate-100 text-[#1E2538] text-xs font-bold rounded-xl shadow-xs transition-all text-center flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Kerjakan Tugas Literasi</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/>
              </svg>
            </Link>
          </div>
        </div>
      )}
    </section>
  );
}
