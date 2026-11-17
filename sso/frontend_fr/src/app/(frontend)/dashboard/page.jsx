'use client';

import React, { useEffect } from 'react';
import { useAuth } from '@/lib/features/auth/presentation/useAuth';
import { getRole } from '@/lib/access/portalAccess';
import { tokenStorage } from '@/lib/common/tokenStorage';
import { getDynamicAppUrl } from '@/lib/common/urlHelper';

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const role = getRole(user);
  const isSuperAdmin = role === 'SUPER_ADMIN';

  useEffect(() => {
    if (loading) return;

    if (!user) {
      window.location.replace('/login');
      return;
    }

    if (isSuperAdmin) {
      window.location.replace('/superadmin');
      return;
    }

    const token = tokenStorage.getToken() || 'sso-session-token';
    const isEducator = ['GURU', 'WALI_KELAS', 'PENDIDIK', 'KEPALA_SEKOLAH', 'TENDIK'].includes(role);
    const isSiswa = role.includes('SISWA');
    const belajarRole = isSiswa ? 'SISWA' : 'GURU';

    const userPayload = {
      id: user?.id || user?.person_id || 'user-1',
      username: user?.username || '',
      fullName: user?.fullName || user?.full_name || '',
      roleName: belajarRole,
      peran: belajarRole,
      nimNip: user?.nimNip || user?.nip || user?.nisn || '',
      className: user?.className || user?.kelas || '',
      courseNames: user?.courseNames || user?.course_names || user?.courses || [],
      courseIds: user?.courseIds || user?.course_ids || [],
      classCodes: user?.classCodes || user?.class_codes || user?.classes || [],
      classIds: user?.classIds || user?.class_ids || [],
    };
    const encodedUser = typeof window !== 'undefined' ? btoa(unescape(encodeURIComponent(JSON.stringify(userPayload)))) : '';
    const belajarBaseUrl = getDynamicAppUrl(process.env.NEXT_PUBLIC_ELEARNING_URL || process.env.NEXT_PUBLIC_BELAJAR_URL, 'belajar');
    window.location.replace(`${belajarBaseUrl}/sso/callback?access_token=${encodeURIComponent(token)}&institution_id=smpn1prambon&sub=${encodeURIComponent(user?.id || '')}&user=${encodedUser}`);
  }, [user, loading, isSuperAdmin, role]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-3 border-[#193D9B] border-t-transparent" />
        <p className="text-xs font-semibold text-slate-500">Mengarahkan langsung ke Spenspra Belajar...</p>
      </div>
    </div>
  );
}
