'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/features/auth/presentation/useAuth';
import { getRole } from '@/lib/access/portalAccess';
import SuperAdminDashboard from '@/components/SuperAdminDashboard';
import CivitasDashboard from '@/components/CivitasDashboard';

export default function MainPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const role = getRole(user);
  const isSuperAdmin = role === 'SUPER_ADMIN';

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (isSuperAdmin) {
      router.replace('/superadmin');
    } else {
      router.replace('/dashboard');
    }
  }, [user, loading, isSuperAdmin, router]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-blue-600 border-t-transparent" />
          <p className="text-xs font-semibold text-slate-500">Memuat portal SMPN 1 Prambon...</p>
        </div>
      </div>
    );
  }

  if (isSuperAdmin) {
    return <SuperAdminDashboard />;
  }

  return <CivitasDashboard />;
}
