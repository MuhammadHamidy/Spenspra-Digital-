'use client';

import React, { useState, useEffect } from 'react';
import { tokenStorage } from '@/lib/common/tokenStorage';
import { accountApiAdapter } from '@/lib/features/auth/infrastructure/accountApiAdapter';

export default function ProfileModal({
  isOpen,
  onClose,
  initialTab = 'profile', // 'profile' | 'password'
}) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [user, setUser] = useState(null);

  // Profile fields
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [nip, setNip] = useState('');
  const [roleName, setRoleName] = useState('');

  // Password fields
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // State status
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setStatusMessage(null);
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');

      const currentUser = tokenStorage.getUser();
      if (currentUser) {
        setUser(currentUser);
        setFullName(currentUser.fullName || currentUser.full_name || '');
        setUsername(currentUser.username || '');
        setPhone(currentUser.phone || '');
        setEmail(currentUser.email || '');
        setNip(currentUser.nimNip || currentUser.nim_nip || currentUser.nip || '-');
        setRoleName(currentUser.roleName || currentUser.role_name || 'Guru');
      }
    }
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  const initials = (fullName || username || 'GR')
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || '')
    .join('') || 'GR';

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setStatusMessage(null);

    if (!fullName.trim()) {
      setStatusMessage({ type: 'error', text: 'Nama lengkap wajib diisi.' });
      return;
    }
    if (!username.trim()) {
      setStatusMessage({ type: 'error', text: 'Username wajib diisi.' });
      return;
    }

    setLoading(true);
    try {
      const payload = {
        username: username.trim(),
        full_name: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
      };

      const userId = user?.id || '';
      await accountApiAdapter.updateProfile(userId, payload);

      // Update local storage
      const current = tokenStorage.getUser() || {};
      const updatedUser = {
        ...current,
        username: payload.username,
        fullName: payload.full_name,
        full_name: payload.full_name,
        email: payload.email,
        phone: payload.phone,
      };
      tokenStorage.setUser(updatedUser);
      setUser(updatedUser);

      // Dispatch event agar Navbar & komponen lain langsung sinkron
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('user-profile-updated', { detail: updatedUser }));
      }

      setStatusMessage({
        type: 'success',
        text: 'Profil dan kontak berhasil diperbarui & disinkronkan ke Superadmin.',
      });
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Gagal memperbarui profil.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setStatusMessage(null);

    if (!newPassword) {
      setStatusMessage({ type: 'error', text: 'Kata sandi baru wajib diisi.' });
      return;
    }
    if (newPassword.length < 6) {
      setStatusMessage({ type: 'error', text: 'Kata sandi baru minimal 6 karakter.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setStatusMessage({ type: 'error', text: 'Konfirmasi kata sandi baru tidak cocok.' });
      return;
    }

    setLoading(true);
    try {
      const payload = {
        username: username.trim(),
        full_name: fullName.trim(),
        phone: phone.trim(),
        old_password: oldPassword,
        new_password: newPassword,
      };

      const userId = user?.id || '';
      await accountApiAdapter.updateProfile(userId, payload);

      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');

      setStatusMessage({
        type: 'success',
        text: 'Kata sandi berhasil diperbarui dengan aman.',
      });
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Gagal mengubah kata sandi.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden transform transition-all flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#193D9B] to-[#1E4DBD] text-white font-bold text-sm flex items-center justify-center shadow-sm uppercase">
              {initials}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">
                Pengaturan Akun & Keamanan
              </h3>
              <p className="text-xs text-slate-500">
                Kelola informasi profil dan kata sandi Anda
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tab Navigasi */}
        <div className="flex border-b border-slate-200 bg-slate-50/70 px-6 pt-2 gap-2">
          <button
            type="button"
            onClick={() => {
              setActiveTab('profile');
              setStatusMessage(null);
            }}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'profile'
                ? 'border-[#193D9B] text-[#193D9B]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Update Profile
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('password');
              setStatusMessage(null);
            }}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'password'
                ? 'border-[#193D9B] text-[#193D9B]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Ubah Password
          </button>
        </div>

        {/* Body Form */}
        <div className="p-6 overflow-y-auto space-y-4">
          {statusMessage && (
            <div
              className={`p-3 rounded-xl text-xs font-medium border flex items-start gap-2 ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              <span>{statusMessage.type === 'success' ? '✓' : '⚠️'}</span>
              <p className="flex-1">{statusMessage.text}</p>
            </div>
          )}

          {activeTab === 'profile' && (
            <form onSubmit={handleUpdateProfile} className="space-y-4 text-xs">
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 space-y-2">
                <div className="flex justify-between items-center text-slate-500">
                  <span>Peran Pengguna:</span>
                  <span className="font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                    {roleName}
                  </span>
                </div>
                <div className="flex justify-between items-center text-slate-500">
                  <span>NIP / Identitas:</span>
                  <span className="font-mono font-medium text-slate-700">{nip}</span>
                </div>
                {email && (
                  <div className="flex justify-between items-center text-slate-500">
                    <span>Email Terdaftar:</span>
                    <span className="font-medium text-slate-700">{email}</span>
                  </div>
                )}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Nama Lengkap <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Masukkan nama lengkap beserta gelar"
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#193D9B]/20 focus:border-[#193D9B] transition"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Username Akun <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Username untuk login"
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#193D9B]/20 focus:border-[#193D9B] transition"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Alamat Email Guru
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nama.guru@smpn1prambon.sch.id"
                    className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#193D9B]/20 focus:border-[#193D9B] transition"
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5">Tersinkronisasi ke Superadmin SSO.</p>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Nomor WhatsApp / HP
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="08123456789"
                    className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#193D9B]/20 focus:border-[#193D9B] transition font-mono"
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5">Tersinkronisasi ke Superadmin SSO.</p>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-600 hover:bg-slate-50 font-semibold cursor-pointer transition text-xs"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 rounded-xl bg-[#193D9B] hover:bg-[#153280] disabled:opacity-50 text-white font-semibold cursor-pointer shadow-sm transition text-xs flex items-center gap-1.5"
                >
                  {loading ? 'Menyimpan...' : 'Simpan Profil'}
                </button>
              </div>
            </form>
          )}

          {activeTab === 'password' && (
            <form onSubmit={handleUpdatePassword} className="space-y-4 text-xs">
              <div className="bg-amber-50 border border-amber-200/80 rounded-xl p-3 text-amber-800 text-[11px] leading-relaxed">
                💡 <strong>Catatan Keamanan:</strong> Kata sandi baru minimal memiliki 6 karakter. Pastikan Anda mengingat kata sandi baru untuk login kembali.
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Kata Sandi Lama (Opsional / Saat Ini)
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    placeholder="Masukkan kata sandi saat ini jika ada"
                    className="w-full bg-white border border-slate-300 rounded-xl pl-3.5 pr-10 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#193D9B]/20 focus:border-[#193D9B] transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                    aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
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

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Kata Sandi Baru <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimal 6 karakter"
                    className="w-full bg-white border border-slate-300 rounded-xl pl-3.5 pr-10 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#193D9B]/20 focus:border-[#193D9B] transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                    aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
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

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Konfirmasi Kata Sandi Baru <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Ketik ulang kata sandi baru"
                    className="w-full bg-white border border-slate-300 rounded-xl pl-3.5 pr-10 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#193D9B]/20 focus:border-[#193D9B] transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                    aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
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

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-600 hover:bg-slate-50 font-semibold cursor-pointer transition text-xs"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 rounded-xl bg-[#193D9B] hover:bg-[#153280] disabled:opacity-50 text-white font-semibold cursor-pointer shadow-sm transition text-xs flex items-center gap-1.5"
                >
                  {loading ? 'Menyimpan...' : 'Perbarui Kata Sandi'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
