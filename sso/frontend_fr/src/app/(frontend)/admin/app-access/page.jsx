'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { accountApiAdapter } from '@/lib/features/auth/infrastructure/accountApiAdapter';
import { schoolPeopleApi } from '@/lib/features/schoolPeopleApi';

const APPS = [
  {
    id: 'erapor',
    code: 'erapor',
    name: 'e-Rapor SMPN 1 Prambon',
    status: 'ACTIVE',
    badge: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    statusLabel: 'Rilis Saat Ini (Aktif)',
    roles: [
      { code: 'ADMIN', label: 'Admin e-Rapor' },
      { code: 'GURU', label: 'Guru (Mapel/Walas)' },
      { code: 'KEPALA_SEKOLAH', label: 'Kepala Sekolah (Pantau)' },
    ],
  },
  {
    id: 'eperpus',
    code: 'eperpus',
    name: 'Perpustakaan Digital Spenspra',
    status: 'INACTIVE',
    badge: 'bg-slate-100 text-slate-600 border-slate-200',
    statusLabel: 'Fase Berikutnya',
    roles: [
      { code: 'ADMIN', label: 'Admin Perpustakaan (Pustakawan)' },
      { code: 'GURU', label: 'Guru (Peminjaman)' },
      { code: 'SISWA', label: 'Siswa (Riwayat & Pinjam)' },
    ],
  },
  {
    id: 'presensi',
    code: 'presensi',
    name: 'Presensi QR Kelas & Guru',
    status: 'INACTIVE',
    badge: 'bg-slate-100 text-slate-600 border-slate-200',
    statusLabel: 'Fase Berikutnya',
    roles: [
      { code: 'ADMIN', label: 'Admin Presensi' },
      { code: 'GURU', label: 'Guru (Buka Sesi & Scan)' },
    ],
  },
];

export default function AppAccessMatrixPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  // Filter tab: 'GURU_TENDIK' (default) | 'SISWA' | 'SYSTEM_ADMIN' | 'ALL'
  const [activeTabFilter, setActiveTabFilter] = useState('GURU_TENDIK');
  const [accessMap, setAccessMap] = useState({});
  const [savingId, setSavingId] = useState(null);
  const [savedNotice, setSavedNotice] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  // Credential Modal State
  const [credentialModal, setCredentialModal] = useState(null);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [showPasswordInModal, setShowPasswordInModal] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const [allAccounts, allPeople] = await Promise.all([
        accountApiAdapter.getAll().catch(() => []),
        schoolPeopleApi.list().catch(() => []),
      ]);

      const accountsList = Array.isArray(allAccounts) ? allAccounts : [];
      const peopleList = Array.isArray(allPeople) ? allPeople : [];

      const unifiedMap = new Map();

      // 1. Masukkan semua civitas dari school_people
      peopleList.forEach((p) => {
        const identifier = p.nip || p.nisn || p.id;
        const matchedAcc = accountsList.find(
          (a) =>
            a.person_id === p.id ||
            a.id === p.id ||
            (identifier && (a.username === identifier || a.nim_nip === identifier || a.nisn === identifier))
        );

        const unifiedUser = {
          id: matchedAcc?.id || p.id,
          person_id: p.id,
          fullName: p.full_name || matchedAcc?.full_name || matchedAcc?.fullName,
          username: matchedAcc?.username || identifier,
          nimNip: p.nip || p.nisn || matchedAcc?.nim_nip,
          email: p.email || matchedAcc?.email || '',
          phone: p.phone || matchedAcc?.phone || '',
          role_name: matchedAcc?.role_name || matchedAcc?.roleName || p.person_type || 'GURU',
          category:
            ['GURU', 'TENAGA_KEPENDIDIKAN', 'KEPALA_SEKOLAH'].includes(p.person_type)
              ? 'GURU_TENDIK'
              : p.person_type === 'SISWA'
              ? 'SISWA'
              : 'GURU_TENDIK',
          hasAccount: !!matchedAcc,
        };

        unifiedMap.set(unifiedUser.id, unifiedUser);
      });

      // 2. Masukkan akun di accounts yang belum ada di school_people (seperti superadmin / admin teknis)
      accountsList.forEach((acc) => {
        if (!unifiedMap.has(acc.id)) {
          const role = (acc.role_name || acc.roleName || acc.role_id || '').toUpperCase();
          const isSysAdmin = role.includes('ADMIN') || role.includes('SUPER');
          const isStaff = role.includes('GURU') || role.includes('KEPALA') || role.includes('TENDIK');
          const isStudent = role.includes('SISWA');

          unifiedMap.set(acc.id, {
            id: acc.id,
            person_id: acc.person_id || null,
            fullName: acc.full_name || acc.fullName || acc.username,
            username: acc.username,
            nimNip: acc.nim_nip || acc.nisn || '-',
            email: acc.email || '',
            phone: acc.phone || '',
            role_name: acc.role_name || acc.roleName || 'PENGGUNA',
            category: isSysAdmin ? 'SYSTEM_ADMIN' : isStaff ? 'GURU_TENDIK' : isStudent ? 'SISWA' : 'SYSTEM_ADMIN',
            hasAccount: true,
          });
        }
      });

      const combinedUsers = Array.from(unifiedMap.values());
      setUsers(combinedUsers);

      const initialMap = {};
      combinedUsers.forEach((u) => {
        const role = (u.role_name || '').toUpperCase();

        // Tentukan peran dasar SSO secara presisi
        let ssoRole = 'GURU';
        if (role === 'SUPER_ADMIN' || role.includes('SUPER')) ssoRole = 'SUPER_ADMIN';
        else if (role === 'ADMIN_RAPOR') ssoRole = 'ADMIN_RAPOR';
        else if (role === 'ADMIN_PERPUS') ssoRole = 'ADMIN_PERPUS';
        else if (role === 'ADMIN_ABSENSI') ssoRole = 'ADMIN_ABSENSI';
        else if (role === 'ADMIN') ssoRole = 'ADMIN';
        else if (role.includes('KEPALA')) ssoRole = 'KEPALA_SEKOLAH';
        else if (role.includes('TENDIK') || role.includes('TENAGA_KEPENDIDIKAN') || role.includes('STAFF')) ssoRole = 'TENAGA_KEPENDIDIKAN';
        else if (role.includes('SISWA')) ssoRole = 'SISWA';
        else if (role.includes('GURU') || role.includes('WALI_KELAS')) ssoRole = 'GURU';
        else ssoRole = role || 'GURU';

        // Tentukan peran e-Rapor
        let eraporVal = 'NONE';
        if (role === 'ADMIN_RAPOR' || role === 'SUPER_ADMIN') eraporVal = 'ADMIN';
        else if (role.includes('KEPALA')) eraporVal = 'KEPALA_SEKOLAH';
        else if (role.includes('GURU') || role.includes('WALI_KELAS')) eraporVal = 'GURU';

        // Tentukan peran e-Perpus
        let eperpusVal = 'NONE';
        if (role === 'ADMIN_PERPUS' || role === 'SUPER_ADMIN') eperpusVal = 'ADMIN';
        else if (role.includes('GURU') || role.includes('WALI_KELAS')) eperpusVal = 'GURU';
        else if (role.includes('SISWA')) eperpusVal = 'SISWA';

        // Tentukan peran Presensi
        let presensiVal = 'NONE';
        if (role === 'ADMIN_ABSENSI' || role === 'SUPER_ADMIN') presensiVal = 'ADMIN';
        else if (role.includes('GURU') || role.includes('WALI_KELAS')) presensiVal = 'GURU';

        initialMap[u.id] = {
          ssoRole,
          erapor: eraporVal,
          eperpus: eperpusVal,
          presensi: presensiVal,
        };
      });
      setAccessMap(initialMap);
    } catch (err) {
      console.warn('Gagal memuat pengguna:', err);
      setErrorMessage('Gagal memuat daftar pengguna dari server backend.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleRoleChange = (userId, key, newRole) => {
    setAccessMap((prev) => {
      const current = prev[userId] || {};
      const updated = { ...current, [key]: newRole };

      // Sinkronisasi otomatis antar dropdown agar konsisten
      if (key === 'ssoRole') {
        if (newRole === 'SUPER_ADMIN') {
          updated.erapor = 'ADMIN';
          updated.eperpus = 'ADMIN';
          updated.presensi = 'ADMIN';
        } else if (newRole === 'ADMIN_RAPOR') {
          updated.erapor = 'ADMIN';
        } else if (newRole === 'ADMIN_PERPUS') {
          updated.eperpus = 'ADMIN';
        } else if (newRole === 'ADMIN_ABSENSI') {
          updated.presensi = 'ADMIN';
        } else if (newRole === 'KEPALA_SEKOLAH') {
          updated.erapor = 'KEPALA_SEKOLAH';
        } else if (newRole === 'GURU') {
          if (updated.erapor === 'ADMIN') updated.erapor = 'GURU';
          if (updated.eperpus === 'ADMIN') updated.eperpus = 'GURU';
          if (updated.presensi === 'ADMIN') updated.presensi = 'GURU';
        } else if (newRole === 'SISWA') {
          updated.erapor = 'NONE';
          updated.eperpus = 'SISWA';
          updated.presensi = 'NONE';
        }
      } else if (key === 'erapor') {
        if (newRole === 'ADMIN' && updated.ssoRole !== 'SUPER_ADMIN') {
          updated.ssoRole = 'ADMIN_RAPOR';
        } else if (newRole === 'KEPALA_SEKOLAH') {
          updated.ssoRole = 'KEPALA_SEKOLAH';
        }
      } else if (key === 'eperpus') {
        if (newRole === 'ADMIN' && updated.ssoRole !== 'SUPER_ADMIN') {
          updated.ssoRole = 'ADMIN_PERPUS';
        }
      } else if (key === 'presensi') {
        if (newRole === 'ADMIN' && updated.ssoRole !== 'SUPER_ADMIN') {
          updated.ssoRole = 'ADMIN_ABSENSI';
        }
      }

      return {
        ...prev,
        [userId]: updated,
      };
    });
  };

  // Simpan Otorisasi Riil ke Database Backend
  const handleSaveAccess = async (user) => {
    setSavingId(user.id);
    setSavedNotice(null);
    setErrorMessage(null);

    const userRoles = accessMap[user.id] || {};
    const { ssoRole, erapor, eperpus, presensi } = userRoles;

    // Logika penentuan Role Akun di backend:
    let updatedRole = ssoRole || 'GURU';
    if (ssoRole === 'SUPER_ADMIN') {
      updatedRole = 'SUPER_ADMIN';
    } else if (ssoRole === 'ADMIN_RAPOR') {
      updatedRole = 'ADMIN_RAPOR';
    } else if (ssoRole === 'ADMIN_PERPUS') {
      updatedRole = 'ADMIN_PERPUS';
    } else if (ssoRole === 'ADMIN_ABSENSI') {
      updatedRole = 'ADMIN_ABSENSI';
    } else if (ssoRole === 'ADMIN') {
      updatedRole = 'ADMIN';
    } else if (ssoRole === 'KEPALA_SEKOLAH') {
      updatedRole = 'KEPALA_SEKOLAH';
    } else if (ssoRole === 'TENAGA_KEPENDIDIKAN') {
      updatedRole = 'TENAGA_KEPENDIDIKAN';
    } else if (ssoRole === 'SISWA') {
      updatedRole = 'SISWA';
    } else {
      if (erapor === 'ADMIN') updatedRole = 'ADMIN_RAPOR';
      else if (eperpus === 'ADMIN') updatedRole = 'ADMIN_PERPUS';
      else if (presensi === 'ADMIN') updatedRole = 'ADMIN_ABSENSI';
      else if (erapor === 'KEPALA_SEKOLAH') updatedRole = 'KEPALA_SEKOLAH';
      else if (eperpus === 'SISWA') updatedRole = 'SISWA';
      else updatedRole = 'GURU';
    }

    try {
      if (user.hasAccount) {
        await accountApiAdapter.update(user.id, {
          ...user,
          role_name: updatedRole,
          role_id: updatedRole,
        });
      } else {
        await accountApiAdapter.create({
          id: user.id,
          person_id: user.person_id || user.id,
          username: user.username || user.nimNip,
          password: user.username || user.nimNip,
          full_name: user.fullName,
          email: user.email || `${user.username}@spenspra.sch.id`,
          phone: user.phone || '',
          nim_nip: user.nimNip,
          role_name: updatedRole,
          role_id: updatedRole,
        });
      }

      setSavedNotice(`Hak akses dan peran untuk ${user.fullName} berhasil disimpan sebagai ${updatedRole}.`);
      await loadUsers();
    } catch (err) {
      setErrorMessage(err.message || 'Gagal menyimpan hak akses ke database backend.');
    } finally {
      setSavingId(null);
      setTimeout(() => setSavedNotice(null), 3500);
    }
  };

  // Hapus Akun & Master Terpadu
  const handleDeleteUser = async (user) => {
    const name = user.fullName || user.username;
    if (
      !window.confirm(
        `Hapus ${name}?\nTindakan ini menghapus akun login SSO, hak akses aplikasi, serta data master civitas terkait secara permanen.`
      )
    ) {
      return;
    }

    try {
      if (user.hasAccount) {
        try {
          await accountApiAdapter.delete(user.id);
        } catch (e) {
          console.warn('Gagal hapus akun:', e.message);
        }
      }

      if (user.person_id) {
        try {
          await schoolPeopleApi.delete(user.person_id);
        } catch (e) {
          console.warn('Gagal hapus person:', e.message);
        }
      }

      setSavedNotice(`Seluruh data & akses ${name} berhasil dihapus dari sistem.`);
      setTimeout(() => setSavedNotice(null), 3000);
      loadUsers();
    } catch (err) {
      setErrorMessage(err.message || 'Gagal menghapus akun.');
    }
  };

  // Pengiriman & Pengaturan Kredensial Langsung dari Akses Aplikasi
  const handleOpenCredentialModal = (u) => {
    setShowPasswordInModal(false);
    setCredentialModal({
      id: u.id,
      person_id: u.person_id || u.id,
      fullName: u.fullName,
      username: u.username || u.nimNip,
      defaultPassword: u.username || u.nimNip || 'Spenspra2026',
      email: u.email || '',
      phone: u.phone || '',
      role_name: accessMap[u.id]?.ssoRole || u.role_name || 'GURU',
      hasAccount: u.hasAccount,
    });
  };

  const handleSavePasswordDirect = async () => {
    if (!credentialModal) return;
    if (!credentialModal.defaultPassword) {
      alert('Kata sandi tidak boleh kosong.');
      return;
    }
    setSavingPassword(true);
    try {
      if (credentialModal.hasAccount) {
        await accountApiAdapter.resetPassword(credentialModal.id, {
          newPassword: credentialModal.defaultPassword,
          sendEmail: false,
        });
      } else {
        await accountApiAdapter.create({
          id: credentialModal.id,
          person_id: credentialModal.person_id,
          username: credentialModal.username,
          password: credentialModal.defaultPassword,
          full_name: credentialModal.fullName,
          email: credentialModal.email || `${credentialModal.username}@spenspra.sch.id`,
          phone: credentialModal.phone || '',
          nim_nip: credentialModal.username,
          role_name: credentialModal.role_name || 'GURU',
          role_id: credentialModal.role_name || 'GURU',
        });
      }
      setSavedNotice(`Kata sandi akun ${credentialModal.fullName} berhasil diperbarui langsung oleh Admin.`);
      setTimeout(() => setSavedNotice(null), 3500);
      await loadUsers();
    } catch (err) {
      alert(`Gagal menyimpan kata sandi: ${err.message}`);
    } finally {
      setSavingPassword(false);
    }
  };

  const handleSendEmailDirect = async () => {
    if (!credentialModal) return;
    if (!credentialModal.email) {
      alert('Alamat email belum diisi pada data pengguna ini. Silakan isi alamat email terlebih dahulu.');
      return;
    }
    setSendingEmail(true);
    try {
      await accountApiAdapter.sendAccessEmail({
        id: credentialModal.id,
        person_id: credentialModal.person_id,
        email: credentialModal.email,
        fullName: credentialModal.fullName,
        username: credentialModal.username,
        password: credentialModal.defaultPassword,
        role_name: credentialModal.role_name,
        hasAccount: credentialModal.hasAccount,
      });
      setSavedNotice(`Kredensial berhasil dikirimkan ke email ${credentialModal.email} dan akun login aktif.`);
      setTimeout(() => setSavedNotice(null), 3500);
      setCredentialModal(null);
      await loadUsers();
    } catch (err) {
      alert(`Pengiriman via SMTP: ${err.message}\n\nAnda dapat menggunakan tombol alternatif: "Buka Email Client" atau "Kirim WhatsApp".`);
    } finally {
      setSendingEmail(false);
    }
  };

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const name = (u.fullName || u.username || '').toLowerCase();
      const nip = (u.nimNip || '').toLowerCase();
      const matchSearch = !search.trim() || name.includes(search.toLowerCase()) || nip.includes(search.toLowerCase());

      let matchTab = true;
      if (activeTabFilter === 'GURU_TENDIK') {
        matchTab = u.category === 'GURU_TENDIK';
      } else if (activeTabFilter === 'SISWA') {
        matchTab = u.category === 'SISWA';
      } else if (activeTabFilter === 'SYSTEM_ADMIN') {
        matchTab = u.category === 'SYSTEM_ADMIN';
      }

      return matchSearch && matchTab;
    });
  }, [users, search, activeTabFilter]);

  const teacherStaffCount = useMemo(() => users.filter((u) => u.category === 'GURU_TENDIK').length, [users]);
  const studentCount = useMemo(() => users.filter((u) => u.category === 'SISWA').length, [users]);
  const adminCount = useMemo(() => users.filter((u) => u.category === 'SYSTEM_ADMIN').length, [users]);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="border-b border-slate-200 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Akses Aplikasi & Matriks Peran (PRD FR-S3)
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Kelola otorisasi akses per pengguna untuk <strong>e-Rapor</strong>, <strong>e-Perpus (Pustakawan)</strong>, <strong>Presensi</strong>, serta penetapan <strong>Super Admin</strong>.
            </p>
          </div>
          <button
            onClick={loadUsers}
            disabled={loading}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
          >
            Segarkan Data
          </button>
        </div>
      </div>

      {savedNotice && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-800 flex items-center gap-2 animate-in fade-in">
          <span>✓</span>
          <span>{savedNotice}</span>
        </div>
      )}

      {errorMessage && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-800 flex items-center gap-2">
          <span>⚠️</span>
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Ringkasan Registri Aplikasi */}
      <div className="grid gap-4 sm:grid-cols-3">
        {APPS.map((app) => (
          <div key={app.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900">{app.name}</span>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold border ${app.badge}`}>
                {app.statusLabel}
              </span>
            </div>
            <p className="mt-2 text-[11px] text-slate-500">
              Peran: {app.roles.map((r) => r.label).join(', ')}
            </p>
          </div>
        ))}
      </div>

      {/* Tab Filter Kategori Pengguna */}
      <div className="flex border-b border-slate-200 gap-6 text-xs font-bold">
        {[
          { key: 'GURU_TENDIK', label: `Guru & Tenaga Kependidikan (${teacherStaffCount})` },
          { key: 'SISWA', label: `Siswa (${studentCount})` },
          { key: 'SYSTEM_ADMIN', label: `Admin Sistem & Layanan (${adminCount})` },
          { key: 'ALL', label: `Semua Pengguna (${users.length})` },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTabFilter(tab.key)}
            className={`pb-3 transition relative cursor-pointer ${
              activeTabFilter === tab.key ? 'text-blue-700' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            {tab.label}
            {activeTabFilter === tab.key && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* Tabel Matriks Akses Pengguna */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <input
              type="text"
              placeholder="Cari nama atau NIP/NISN..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full sm:w-72 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <span className="text-xs text-slate-500">
            Menampilkan {filteredUsers.length} pengguna
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-bold uppercase tracking-wider">
                <th className="py-3 px-4">Nama Pengguna & NIP/NISN</th>
                <th className="py-3 px-4">Peran Utama SSO</th>
                <th className="py-3 px-4">Otorisasi e-Rapor</th>
                <th className="py-3 px-4">Otorisasi e-Perpus</th>
                <th className="py-3 px-4">Otorisasi Presensi</th>
                <th className="py-3 px-4 text-center">Aksi & Kredensial</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-slate-400">
                    Memuat sinkronisasi data master dan akun dari database...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-slate-400">
                    Tidak ada pengguna dalam kategori ini. Tambahkan data di menu Data Master.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const userAccess = accessMap[u.id] || {
                    ssoRole: 'GURU',
                    erapor: 'NONE',
                    eperpus: 'NONE',
                    presensi: 'NONE',
                  };
                  const isSaving = savingId === u.id;

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/70 transition">
                      {/* Kolom 1: Identitas */}
                      <td className="py-3 px-4">
                        <p className="font-bold text-slate-900">{u.fullName}</p>
                        <p className="text-[11px] text-slate-500 font-mono">
                          {u.nimNip || '-'}
                        </p>
                        {u.email && (
                          <p className="text-[10px] text-slate-400">{u.email}</p>
                        )}
                      </td>

                      {/* Kolom 2: Peran Utama Akun SSO */}
                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          <select
                            value={userAccess.ssoRole || 'GURU'}
                            onChange={(e) => handleRoleChange(u.id, 'ssoRole', e.target.value)}
                            className={`rounded-lg border px-2 py-1.5 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer ${
                              userAccess.ssoRole === 'SUPER_ADMIN'
                                ? 'border-amber-300 bg-amber-50 text-amber-900'
                                : userAccess.ssoRole?.startsWith('ADMIN')
                                ? 'border-blue-300 bg-blue-50 text-blue-900'
                                : 'border-slate-200 bg-white text-slate-800'
                            }`}
                          >
                            <option value="SUPER_ADMIN">★ Super Admin</option>
                            <option value="ADMIN">Admin Sekolah</option>
                            <option value="ADMIN_RAPOR">Admin e-Rapor</option>
                            <option value="ADMIN_PERPUS">Admin Perpustakaan</option>
                            <option value="ADMIN_ABSENSI">Admin Presensi</option>
                            <option value="KEPALA_SEKOLAH">Kepala Sekolah</option>
                            <option value="GURU">Guru (Tenaga Pendidik)</option>
                            <option value="TENAGA_KEPENDIDIKAN">Tenaga Kependidikan (TU/Staf)</option>
                            <option value="SISWA">Peserta Didik (Siswa)</option>
                          </select>
                          {!u.hasAccount && (
                            <span className="inline-block rounded-sm bg-amber-50 text-amber-700 px-1.5 py-0.2 text-[10px] font-semibold border border-amber-200">
                              Belum Aktivasi
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Kolom 3: Otorisasi e-Rapor */}
                      <td className="py-3 px-4">
                        <select
                          value={userAccess.erapor || 'NONE'}
                          onChange={(e) => handleRoleChange(u.id, 'erapor', e.target.value)}
                          className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                        >
                          <option value="NONE">Tanpa Akses</option>
                          <option value="ADMIN">Admin e-Rapor</option>
                          <option value="GURU">Guru (Mapel/Walas)</option>
                          <option value="KEPALA_SEKOLAH">Kepala Sekolah (Pantau)</option>
                        </select>
                      </td>

                      {/* Kolom 4: Otorisasi e-Perpus */}
                      <td className="py-3 px-4">
                        <select
                          value={userAccess.eperpus || 'NONE'}
                          onChange={(e) => handleRoleChange(u.id, 'eperpus', e.target.value)}
                          className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                        >
                          <option value="NONE">Tanpa Akses</option>
                          <option value="ADMIN">Admin Perpustakaan (Pustakawan)</option>
                          <option value="GURU">Guru (Peminjaman)</option>
                          <option value="SISWA">Siswa (Riwayat & Pinjam)</option>
                        </select>
                      </td>

                      {/* Kolom 5: Otorisasi Presensi (Absen) */}
                      <td className="py-3 px-4">
                        <select
                          value={userAccess.presensi || 'NONE'}
                          onChange={(e) => handleRoleChange(u.id, 'presensi', e.target.value)}
                          className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                        >
                          <option value="NONE">Tanpa Akses</option>
                          <option value="ADMIN">Admin Presensi</option>
                          <option value="GURU">Guru (Buka Sesi & Scan)</option>
                        </select>
                      </td>

                      {/* Kolom 6: Aksi */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenCredentialModal(u)}
                            className="rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-1 text-[11px] font-bold hover:bg-emerald-100 transition cursor-pointer"
                            title="Kirim detail akun ke pengguna"
                          >
                            ✉️ Kirim Akun
                          </button>
                          <button
                            onClick={() => handleSaveAccess(u)}
                            disabled={isSaving}
                            className="rounded-lg bg-blue-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-blue-700 transition disabled:opacity-50 cursor-pointer shadow-2xs"
                            title="Simpan otorisasi ke database"
                          >
                            {isSaving ? 'Menyimpan...' : 'Simpan'}
                          </button>
                          <button
                            onClick={() => handleDeleteUser(u)}
                            className="rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-bold text-rose-600 hover:bg-rose-100 transition cursor-pointer"
                            title="Hapus dari data master & akun"
                          >
                            Hapus
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL PENGIRIMAN KREDENSIAL */}
      {credentialModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Kirim Akses Akun SSO</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Kirimkan detail login (Username & Password) kepada {credentialModal.fullName}.
                </p>
              </div>
              <button
                onClick={() => setCredentialModal(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50/50 p-4 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Nama Pengguna:</span>
                <span className="font-bold text-slate-900">{credentialModal.fullName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Username SSO:</span>
                <span className="font-mono font-bold text-blue-700">{credentialModal.username}</span>
              </div>
              <div className="pt-1">
                <label className="block text-slate-700 font-semibold mb-1">
                  Kata Sandi Akun (Ditentukan oleh Admin):
                </label>
                <div className="relative">
                  <input
                    type={showPasswordInModal ? 'text' : 'password'}
                    value={credentialModal.defaultPassword}
                    onChange={(e) =>
                      setCredentialModal({ ...credentialModal, defaultPassword: e.target.value })
                    }
                    placeholder="Tentukan kata sandi untuk akun ini"
                    className="w-full rounded-lg border border-slate-300 bg-white pl-3 pr-10 py-2 font-mono text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#193D9B]/15 focus:border-[#193D9B] transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswordInModal((prev) => !prev)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                    aria-label={showPasswordInModal ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                    title={showPasswordInModal ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                  >
                    {showPasswordInModal ? (
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
                <div className="flex justify-between items-center mt-1.5">
                  <p className="text-[10px] text-slate-500">
                    Kata sandi dibuat langsung oleh Admin (bukan acak).
                  </p>
                  <button
                    type="button"
                    disabled={savingPassword}
                    onClick={handleSavePasswordDirect}
                    className="px-2.5 py-1 rounded bg-[#193D9B] hover:bg-[#153280] disabled:opacity-50 text-white font-bold text-[10px] transition shadow-2xs cursor-pointer shrink-0"
                  >
                    {savingPassword ? 'Menyimpan...' : '✓ Terapkan Sandi ke Akun'}
                  </button>
                </div>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Email Tujuan:</span>
                <span className={`font-semibold ${credentialModal.email ? 'text-slate-800' : 'text-rose-600'}`}>
                  {credentialModal.email || 'Belum diisi'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">No. WhatsApp:</span>
                <span className="font-semibold text-slate-800">{credentialModal.phone || 'Belum diisi'}</span>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <p className="text-xs font-bold text-slate-700">Pilih Metode Pengiriman:</p>

              <div className="grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  disabled={sendingEmail || !credentialModal.email}
                  onClick={handleSendEmailDirect}
                  className="rounded-xl border border-blue-200 bg-blue-50/70 p-3 text-left hover:bg-blue-100/70 transition cursor-pointer disabled:opacity-50"
                >
                  <p className="text-xs font-bold text-blue-900">
                    {sendingEmail ? 'Sedang Mengirim...' : '📨 Kirim Email Otomatis'}
                  </p>
                  <p className="text-[10px] text-blue-700 mt-0.5">Kirim notifikasi via server SMTP</p>
                </button>

                <a
                  href={`mailto:${credentialModal.email}?subject=Kredensial%20Akun%20SSO%20SMPN%201%20Prambon&body=Yth.%20${encodeURIComponent(
                    credentialModal.fullName
                  )},%0A%0ABerikut%20adalah%20informasi%20akses%20akun%20SSO%20SMPN%201%20Prambon%20Anda:%0A- Username:%20${encodeURIComponent(
                    credentialModal.username
                  )}%0A- Password:%20${encodeURIComponent(
                    credentialModal.defaultPassword
                  )}%0A- Tautan:%20http://sso.localhost/login%0A%0ASilakan%20login%20dan%20segera%20ganti%20password%20Anda.`}
                  className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-left hover:bg-slate-100 transition cursor-pointer"
                >
                  <p className="text-xs font-bold text-slate-900">✉️ Buka Email Client</p>
                  <p className="text-[10px] text-slate-600 mt-0.5">Buka via Outlook / Gmail</p>
                </a>

                <a
                  href={`https://wa.me/${(credentialModal.phone || '').replace(/[^0-9]/g, '')}?text=Halo%20${encodeURIComponent(
                    credentialModal.fullName
                  )},%20berikut%20adalah%20akun%20SSO%20SMPN%201%20Prambon%20Anda:%0AUsername:%20${encodeURIComponent(
                    credentialModal.username
                  )}%0APassword:%20${encodeURIComponent(
                    credentialModal.defaultPassword
                  )}%0APortal:%20http://sso.localhost/login`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 text-left hover:bg-emerald-100/70 transition cursor-pointer"
                >
                  <p className="text-xs font-bold text-emerald-900">💬 Kirim WhatsApp</p>
                  <p className="text-[10px] text-emerald-700 mt-0.5">Kirimkan format teks via WA Web</p>
                </a>

                <button
                  type="button"
                  onClick={() => {
                    const text = `Akun SSO SMPN 1 Prambon:\nNama: ${credentialModal.fullName}\nUsername: ${credentialModal.username}\nPassword: ${credentialModal.defaultPassword}\nPortal: http://sso.localhost/login`;
                    navigator.clipboard.writeText(text);
                    setSavedNotice('Kredensial berhasil disalin ke clipboard!');
                    setTimeout(() => setSavedNotice(null), 3000);
                  }}
                  className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-left hover:bg-slate-100 transition cursor-pointer"
                >
                  <p className="text-xs font-bold text-slate-900">📋 Salin Teks</p>
                  <p className="text-[10px] text-slate-600 mt-0.5">Salin detail akun ke clipboard</p>
                </button>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setCredentialModal(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
