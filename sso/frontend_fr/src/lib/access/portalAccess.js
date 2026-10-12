export function getRole(user) {
  return String(user?.roleName || user?.role || user?.role_id || '').toUpperCase();
}

/**
 * Layanan & Navigasi berdasarkan peran sesuai PRD Ekosistem Spenspra
 * Di SSO hanya ada SUPER_ADMIN (pengelola portal) dan pengguna civitas (Guru, Siswa, Tendik, Kepsek)
 * yang memegang session SSO untuk masuk ke e-Rapor dan e-Perpus.
 */
export function getPortalServices(user) {
  const role = getRole(user);

  // 1. SUPER_ADMIN: Kelola Pengguna, Rombel, Tahun Ajaran, Akses Aplikasi, Kartu QR, Audit
  if (role === 'SUPER_ADMIN') {
    return [
      {
        id: 'master_data',
        title: 'Data Master SSO',
        description: 'Tahun Ajaran, Rombel (VII-A dsb.), Siswa, Guru, dan Staf/Tendik.',
        href: '/admin/master-data',
        tone: 'amber',
        color: 'amber',
        icon: '⚙️',
      },
      {
        id: 'app_access',
        title: 'Akses Aplikasi & Matriks Peran',
        description: 'Atur izin login dan peran pengguna ke e-Rapor, e-Perpus, dan Presensi.',
        href: '/admin/app-access',
        tone: 'indigo',
        color: 'blue',
        icon: '🔐',
      },
      {
        id: 'barcodes',
        title: 'Kartu QR / Barcode',
        description: 'Penerbitan, cetak per rombel, dan verifikasi barcode perpustakaan & presensi.',
        href: '/students',
        tone: 'blue',
        color: 'blue',
        icon: '🪪',
      },
      {
        id: 'import_data',
        title: 'Import Data Master Excel',
        description: 'Import multi-sheet Excel untuk rombel, siswa, guru, dan staf.',
        href: '/admin/import',
        tone: 'slate',
        color: 'slate',
        icon: '📥',
      },
      {
        id: 'audit_log',
        title: 'Audit Log Sistem',
        description: 'Riwayat aktivitas login, mutasi identitas, dan perubahan akses aplikasi.',
        href: '/admin/audit-log',
        tone: 'purple',
        color: 'blue',
        icon: '📋',
      },
    ];
  }

  // 2. Pengguna Civitas Biasa (Guru, Siswa, Tendik, Kepala Sekolah)
  return [
    {
      id: 'my_barcode',
      title: 'Kartu Barcode Saya',
      description: 'Barcode resmi untuk absensi kunjungan perpustakaan dan presensi.',
      href: '/students',
      tone: 'blue',
      color: 'blue',
      icon: '🪪',
    },
    {
      id: 'my_profile',
      title: 'Profil & Keamanan Akun',
      description: 'Kelola kredensial login SSO dan pembaruan kata sandi.',
      href: '/profile',
      tone: 'slate',
      color: 'slate',
      icon: '👤',
    },
  ];
}

export function getAdminLandingPath(user) {
  const role = getRole(user);
  if (role === 'SUPER_ADMIN') return '/';
  return null;
}
