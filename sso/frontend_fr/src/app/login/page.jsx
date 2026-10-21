'use client';

import React, { useState, Suspense } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/features/auth/presentation/useAuth';
import { getDynamicAppUrl } from '@/lib/common/urlHelper';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [redirectTarget, setRedirectTarget] = useState('');

  const reason = searchParams.get('reason');
  const [showPassword, setShowPassword] = useState(false);

  // Ambil target redirect dari query string lalu bersihkan URL bar agar tetap bersih (/login)
  React.useEffect(() => {
    const raw = searchParams.get('redirect_uri') || searchParams.get('app');
    if (raw) {
      if (raw.toLowerCase() === 'erapor' || raw.toLowerCase() === 'rapor') {
        setRedirectTarget(getDynamicAppUrl(process.env.NEXT_PUBLIC_RAPOR_URL, 'rapor'));
      } else if (raw.toLowerCase() === 'perpus' || raw.toLowerCase() === 'perpusdig') {
        setRedirectTarget(getDynamicAppUrl(process.env.NEXT_PUBLIC_PERPUS_URL, 'perpus'));
      } else {
        setRedirectTarget(raw);
      }
      // Bersihkan query string dari address bar sehingga hanya tampil /login
      if (typeof window !== 'undefined' && window.history?.replaceState) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, [searchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await login(username, password);

      const user = res?.user || {};
      const roleName = (user.roleName || user.role || user.role_name || '').toUpperCase();

      // Super Admin adalah pengelola portal SSO: selalu masuk ke panel /superadmin,
      // abaikan redirect_uri dari aplikasi satelit (e-Rapor / Perpus).
      if (roleName === 'SUPER_ADMIN' || roleName === 'SUPER-ADMIN') {
        window.location.href = '/superadmin';
        return;
      }

      // Siswa selalu masuk ke portal /dashboard (Layanan Siswa Terpadu) untuk memilih menu
      // (Spenspra Belajar, e-Rapor, atau e-Perpustakaan). Abaikan redirect_uri otomatis dari satelit.
      if (roleName === 'SISWA' || roleName === 'ROLE-SISWA' || roleName === 'MAHASISWA') {
        window.location.href = '/dashboard';
        return;
      }

      // Validasi ketat redirect_uri jika ada
      const targetUrl = redirectTarget || searchParams.get('redirect_uri');
      if (targetUrl) {
        try {
          const parsed = new URL(targetUrl, window.location.origin);
          const isAllowedHost =
            parsed.hostname === 'localhost' ||
            parsed.hostname.endsWith('.localhost') ||
            parsed.hostname === '127.0.0.1' ||
            parsed.hostname === 'spenspra.com' ||
            parsed.hostname.endsWith('.spenspra.com') ||
            parsed.hostname === 'spenspra.sch.id' ||
            parsed.hostname.endsWith('.spenspra.sch.id');

          if (isAllowedHost && (parsed.protocol === 'http:' || parsed.protocol === 'https:')) {
            window.location.href = parsed.toString();
            return;
          }
        } catch (e) {
          console.warn('Format redirect URL tidak valid:', e);
        }
      }

      // Default redirect berdasarkan role user

      if (roleName === 'ADMIN_RAPOR' || roleName === 'ADMIN-RAPOR') {
        const raporBaseUrl = getDynamicAppUrl(process.env.NEXT_PUBLIC_RAPOR_URL, 'rapor');
        const userPayload = {
          id: user?.id || user?.person_id || 'user-admin-rapor',
          username: user?.username || '',
          fullName: user?.fullName || user?.full_name || 'Administrator e-Rapor',
          roleName: 'ADMIN_RAPOR',
          nimNip: user?.nimNip || user?.nip || user?.nisn || 'ADMIN-RAPOR-001',
        };
        const encodedUser = typeof window !== 'undefined' ? btoa(unescape(encodeURIComponent(JSON.stringify(userPayload)))) : '';
        const token = res.token || '';
        window.location.href = `${raporBaseUrl}/sso/callback?access_token=${encodeURIComponent(token)}&institution_id=smpn1prambon&sub=${encodeURIComponent(user?.id || '')}&user=${encodedUser}&redirect=${encodeURIComponent('/admin/teachers')}`;
        return;
      }

      if (roleName === 'ADMIN_PERPUS' || roleName === 'ADMIN-PERPUS' || roleName === 'PUSTAKAWAN') {
        const perpusBaseUrl = getDynamicAppUrl(process.env.NEXT_PUBLIC_PERPUS_URL, 'perpus');
        window.location.href = `${perpusBaseUrl}/pustakawan`;
        return;
      }

      // Pengguna Guru, Tenaga Kependidikan, dan Kepala Sekolah diarahkan ke /dashboard
      window.location.href = '/dashboard';
    } catch (err) {
      setError(err.message || 'Login gagal. Periksa kembali username/NIP dan kata sandi Anda.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-[420px] bg-white rounded-2xl shadow-xl border border-slate-200 p-8 sm:p-9">
      {/* Header Identitas & Logo Sekolah (Vertikal Terpusat Tanpa Deskripsi Panjang) */}
      <div className="flex flex-col items-center text-center mb-6">
        <div className="w-16 h-16 bg-white rounded-2xl p-2 shadow-2xs border border-slate-200 flex items-center justify-center mb-3">
          <Image
            src="/image/logo-prambon.png"
            alt="Logo SMPN 1 Prambon"
            width={48}
            height={48}
            className="object-contain"
            priority
          />
        </div>
        <h1 className="text-lg font-bold tracking-tight text-slate-900 leading-tight">
          SMPN 1 PRAMBON
        </h1>
        <p className="text-xs text-slate-500 font-medium mt-0.5">
          Portal Masuk Single Sign-On (SSO)
        </p>
      </div>

      {reason === 'inactivity' && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 flex items-center gap-2.5">
          <svg className="w-4 h-4 text-amber-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>Sesi berakhir otomatis karena tidak ada aktivitas selama 15 menit. Silakan masuk kembali.</span>
        </div>
      )}

      {reason === 'expired' && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 flex items-center gap-2.5">
          <svg className="w-4 h-4 text-amber-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>Sesi Anda telah kedaluwarsa. Silakan masuk kembali.</span>
        </div>
      )}

      {reason === 'unauthorized_app' && (
        <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 flex items-center gap-2.5">
          <svg className="w-4 h-4 text-rose-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
          <span>Akun Anda tidak memiliki hak akses ke aplikasi yang dituju. Silakan masuk menggunakan akun yang sesuai.</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Username / NIP / NISN
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            autoComplete="username"
            placeholder="Masukkan Username, NIP, atau NISN"
            className="w-full rounded-md border border-slate-300 bg-white px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#4B3B78]/20 focus:border-[#4B3B78] transition"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Kata Sandi (Password)
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              placeholder="Masukkan kata sandi akun"
              className="w-full rounded-md border border-slate-300 bg-white pl-3.5 pr-10 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#4B3B78]/20 focus:border-[#4B3B78] transition"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
              aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
              title={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
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

        {error && (
          <div className="rounded-md border border-[#F1B4AC] bg-[#FFF9F8] p-3 text-xs text-[#C0392B] flex items-start gap-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-[#4B3B78] py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-[#3D2E66] active:bg-[#30264F] transition disabled:opacity-60 cursor-pointer"
        >
          {loading ? 'Memverifikasi Sesi SSO...' : 'Masuk ke Akun'}
        </button>
      </form>

      <p className="mt-6 text-center text-[11px] text-slate-400">
        Lupa kata sandi atau kendala akun? Hubungi Super Admin / Tim TI Sekolah.
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-6 font-sans">
      <Suspense fallback={<div className="text-xs text-slate-500 font-semibold">Memuat halaman login SSO...</div>}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
