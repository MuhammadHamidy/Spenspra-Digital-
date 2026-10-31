'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function KioskRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/layanan-mandiri');
  }, [router]);
  return null;
}


