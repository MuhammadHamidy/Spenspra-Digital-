'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/lib/features/auth/presentation/useAuth';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const errParam = params.get('error');
      if (errParam === 'backend_offline') {
        setError('Server backend Go API tidak aktif / offline. Silakan nyalakan server backend di port 8080.');
      } else if (errParam === 'session_invalid') {
        setError('Sesi autentikasi telah berakhir. Silakan masuk kembali.');
      }
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
      router.push('/pustakawan');
    } catch (err) {
      setError(err.message || 'Login gagal. Periksa kembali NIP/Username dan Kata Sandi Anda.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-slate-50 text-slate-800">
      {/* Left Visual Column (50% on desktop) */}
      <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-12 overflow-hidden bg-slate-950">
        {/* Background photo & overlay */}
        <div
          className="absolute inset-0 bg-cover bg-center opacity-40 scale-105 transition-transform duration-10000 hover:scale-100"
          style={{
            backgroundImage: "url('/images/library_hall.jpg')",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/75 to-slate-900/40" />

        {/* Top brand */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl overflow-hidden flex items-center justify-center bg-white shadow-lg p-0.5 flex-shrink-0">
            <Image
              src="/image/logo_prambon.png"
              alt="Logo SMPN 1 Prambon"
              width={42}
              height={42}
              className="w-full h-full object-contain"
              priority
            />
          </div>
          <div>
            <h2 className="text-white font-extrabold text-lg tracking-tight">
              Perpustakaan SMPN 1 Prambon
            </h2>
            <p className="text-xs text-slate-400 font-medium">
              Sistem Pengelolaan Perpustakaan Sekolah
            </p>
          </div>
        </div>

        {/* Center Hero statement */}
        <div className="relative z-10 space-y-4 max-w-lg mb-12">
          <h1 className="text-3xl xl:text-4xl font-extrabold text-white leading-tight tracking-tight">
            Sistem Informasi Perpustakaan SMPN 1 Prambon
          </h1>

          <p className="text-slate-300 text-sm xl:text-base leading-relaxed">
            Portal administrasi pustakawan untuk pengelolaan katalog buku, sirkulasi peminjaman, pencatatan presensi, dan data literasi siswa.
          </p>
        </div>

        {/* Clean bottom */}
        <div className="relative z-10 text-xs text-slate-500">
          SMPN 1 Prambon &bull; Sidoarjo, Jawa Timur
        </div>
      </div>

      {/* Right Form Column (50% on desktop) */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 md:p-16 bg-white">
        <div className="w-full max-w-md space-y-8">
          {/* Header */}
          <div className="space-y-3">
            <div className="w-14 h-14 rounded-2xl overflow-hidden flex items-center justify-center bg-white border border-slate-200 shadow-xs p-1">
              <Image
                src="/image/logo_prambon.png"
                alt="Logo SMPN 1 Prambon"
                width={50}
                height={50}
                className="w-full h-full object-contain"
                priority
              />
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Masuk Pustakawan
            </h2>
            <p className="text-sm text-slate-500 font-medium">
              Silakan masukkan NIP atau Username untuk masuk ke panel administrasi.
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2">
              <svg className="w-4 h-4 shrink-0 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                NIP / Username Pustakawan
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Masukkan NIP atau username"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                Kata Sandi
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-11 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showPassword ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-4 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-md shadow-blue-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Masuk ke Sistem</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </>
              )}
            </button>
          </form>

          {/* Return to Kiosk link */}
          <div className="pt-4 border-t border-slate-100 flex flex-col items-center gap-3">
            <Link
              href="/"
              className="text-xs font-bold text-slate-500 hover:text-blue-600 flex items-center gap-1.5 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span>Kembali ke Layanan Mandiri</span>
            </Link>
            <p className="text-[11px] text-slate-400">
              &copy; 2026 Perpustakaan SMPN 1 Prambon. Hak Cipta Dilindungi.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
