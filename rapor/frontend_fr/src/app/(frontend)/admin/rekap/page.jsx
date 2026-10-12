'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminRekapRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/wali-kelas');
  }, [router]);

  return (
    <div className="min-h-[400px] flex items-center justify-center p-8 text-slate-500 text-sm">
      <div className="inline-flex items-center gap-2">
        <span className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <span>Mengalihkan ke Rekapitulasi Nilai & Rapor...</span>
      </div>
    </div>
  );
}
