'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { tokenStorage } from '@/lib/common/tokenStorage';

function SSOCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState('');

  useEffect(() => {
    const accessToken = searchParams.get('access_token');
    const institutionId = searchParams.get('institution_id');
    const encodedUser = searchParams.get('user');

    if (!accessToken || !institutionId) {
      setError('Callback SSO tidak lengkap. Token dan institution_id wajib dikirim.');
      return;
    }

    let user = { id: searchParams.get('sub') || '', roleName: 'GURU' };
    if (encodedUser) {
      try {
        const decoded = decodeURIComponent(escape(atob(encodedUser)));
        user = { ...user, ...JSON.parse(decoded) };
      } catch {
        try {
          user = { ...user, ...JSON.parse(atob(encodedUser)) };
        } catch {
          setError('Data pengguna dari SSO tidak valid.');
          return;
        }
      }
    }

    tokenStorage.setToken(accessToken);
    tokenStorage.setInstitutionId(institutionId);
    tokenStorage.setUser(user);

    const redirectPath = searchParams.get('redirect');
    router.replace(redirectPath || '/');
  }, [router, searchParams]);

  if (error) {
    return (
      <div className="min-h-[calc(100vh-12rem)] flex flex-col items-center justify-center text-center px-4">
        <div className="max-w-md w-full bg-white p-6 rounded-2xl border border-red-200 shadow-sm text-center">
          <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-sm font-bold text-slate-800 mb-1">Gagal Menyelesaikan Autentikasi</h3>
          <p className="text-xs text-red-600 mb-4">{error}</p>
          <a
            href={
              typeof window !== 'undefined' && window.location.hostname.includes('spenspra.com')
                ? 'https://sso.spenspra.com/login'
                : typeof window !== 'undefined' && window.location.hostname.includes('spenspra.sch.id')
                ? 'https://sso.spenspra.sch.id/login'
                : (process.env.NEXT_PUBLIC_SSO_LOGIN_URL || 'http://sso.localhost/login')
            }
            className="inline-flex items-center justify-center px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition"
          >
            Kembali ke Login SSO
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-12rem)] flex flex-col items-center justify-center text-center px-4">
      <div className="flex flex-col items-center gap-3">
        <div className="w-9 h-9 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <div className="space-y-1">
          <p className="text-sm font-semibold text-slate-800">Menyelesaikan autentikasi SSO...</p>
          <p className="text-xs text-slate-400">Mohon tunggu sebentar, Anda sedang dialihkan.</p>
        </div>
      </div>
    </div>
  );
}

export default function SSOCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[calc(100vh-12rem)] flex flex-col items-center justify-center text-center px-4">
          <div className="flex flex-col items-center gap-3">
            <div className="w-9 h-9 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-slate-800">Menyelesaikan autentikasi SSO...</p>
              <p className="text-xs text-slate-400">Mohon tunggu sebentar, Anda sedang dialihkan.</p>
            </div>
          </div>
        </div>
      }
    >
      <SSOCallbackContent />
    </Suspense>
  );
}
