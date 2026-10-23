'use client';

import React, { useEffect } from 'react';
import { redirectToSsoLogin } from '@/lib/features/beranda/ssoHelper';

export default function LoginPage() {
  useEffect(() => {
    redirectToSsoLogin();
  }, []);

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-slate-50 text-slate-800 p-6">
      <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 p-8 shadow-sm text-center space-y-4">
        <div className="w-12 h-12 mx-auto rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700">
          <svg className="w-6 h-6 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
        </div>
        <h2 className="text-base font-bold text-slate-900">
          Mengalihkan ke Portal SSO SMPN 1 Prambon...
        </h2>
        <p className="text-xs text-slate-500 leading-relaxed">
          Autentikasi pustakawan dan staf perpustakaan sekarang terpusat melalui Single Sign-On (SSO).
        </p>
        <button
          type="button"
          onClick={() => redirectToSsoLogin()}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#193D9B] hover:bg-[#153280] text-white text-xs font-bold transition shadow-xs cursor-pointer"
        >
          <span>Klik di sini jika tidak beralih otomatis</span>
        </button>
      </div>
    </div>
  );
}
