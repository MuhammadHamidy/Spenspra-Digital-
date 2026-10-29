'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function PinjamRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/peminjaman');
  }, [router]);

  return (
    <div className="min-h-screen bg-white flex items-center justify-center font-sans text-slate-600 text-sm">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-4 border-[#1E2538] border-t-transparent rounded-full animate-spin" />
        <p>Mengalihkan ke Riwayat Peminjaman Buku...</p>
      </div>
    </div>
  );
}
