'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/features/auth/presentation/useAuth';
import { tokenStorage } from '@/lib/common/tokenStorage';
import { accountApiAdapter } from '@/lib/features/auth/infrastructure/accountApiAdapter';
import Button from '@/components/Button';
import Card from '@/components/Card';

function ProfileContent() {
  const searchParams = useSearchParams();
  const initialTabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(
    initialTabParam === 'password' ? 'password' : 'profile'
  );

  const { user } = useAuth();
  const [profile, setProfile] = useState({
    id: '',
    fullName: '',
    nip: '',
    username: '',
    email: '',
    phone: '',
    photoUrl: '',
    courseNames: [],
    classCodes: [],
    roleName: '',
  });

  const [form, setForm] = useState({
    username: '',
    fullName: '',
    phone: '',
    photoUrl: '',
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);

  useEffect(() => {
    if (initialTabParam === 'password') {
      setActiveTab('password');
    } else if (initialTabParam === 'profile') {
      setActiveTab('profile');
    }
  }, [initialTabParam]);

  useEffect(() => {
    const currentUser = tokenStorage.getUser() || user;
    if (!currentUser) return;

    const courseList = currentUser.course_names || currentUser.courseNames || [];
    const classList = currentUser.class_codes || currentUser.classCodes || [];

    setProfile({
      id: currentUser.id || '',
      fullName: currentUser.fullName || currentUser.full_name || '',
      nip: currentUser.nimNip || currentUser.nim_nip || currentUser.nip || '-',
      username: currentUser.username || '',
      email: currentUser.email || '',
      phone: currentUser.phone || '',
      photoUrl: currentUser.photoUrl || currentUser.photo_url || '',
      courseNames: courseList,
      classCodes: classList,
      roleName: currentUser.roleName || currentUser.role_name || 'Guru',
    });

    setForm({
      username: currentUser.username || '',
      fullName: currentUser.fullName || currentUser.full_name || '',
      email: currentUser.email || '',
      phone: currentUser.phone || '',
      photoUrl: currentUser.photoUrl || currentUser.photo_url || '',
      oldPassword: '',
      newPassword: '',
      confirmPassword: '',
    });
  }, [user]);

  const handleSubmitProfile = async (e) => {
    e.preventDefault();
    setStatusMessage(null);

    if (!form.fullName.trim()) {
      setStatusMessage({ type: 'error', text: 'Nama lengkap wajib diisi.' });
      return;
    }
    if (!form.username.trim()) {
      setStatusMessage({ type: 'error', text: 'Username wajib diisi.' });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        username: form.username.trim(),
        full_name: form.fullName.trim(),
        email: form.email ? form.email.trim() : '',
        phone: form.phone.trim(),
        photo_url: form.photoUrl,
      };

      await accountApiAdapter.updateProfile(profile.id, payload);

      const currentUser = tokenStorage.getUser() || {};
      const newUserData = {
        ...currentUser,
        username: payload.username,
        fullName: payload.full_name,
        full_name: payload.full_name,
        email: payload.email,
        phone: payload.phone,
        photoUrl: payload.photo_url,
      };
      tokenStorage.setUser(newUserData);

      setProfile((prev) => ({
        ...prev,
        username: payload.username,
        fullName: payload.full_name,
        email: payload.email,
        phone: payload.phone,
      }));

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('user-profile-updated', { detail: newUserData }));
      }

      setStatusMessage({
        type: 'success',
        text: 'Informasi profil akun dan kontak berhasil diperbarui & disinkronkan ke Superadmin.',
      });
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Gagal menyimpan perubahan profil.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitPassword = async (e) => {
    e.preventDefault();
    setStatusMessage(null);

    if (!form.newPassword) {
      setStatusMessage({ type: 'error', text: 'Kata sandi baru wajib diisi.' });
      return;
    }
    if (form.newPassword.length < 6) {
      setStatusMessage({ type: 'error', text: 'Password baru minimal harus 6 karakter.' });
      return;
    }
    if (form.newPassword !== form.confirmPassword) {
      setStatusMessage({ type: 'error', text: 'Konfirmasi password baru tidak cocok.' });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        username: form.username,
        full_name: form.fullName,
        phone: form.phone,
        old_password: form.oldPassword,
        new_password: form.newPassword,
      };

      await accountApiAdapter.updateProfile(profile.id, payload);

      setForm((prev) => ({
        ...prev,
        oldPassword: '',
        newPassword: '',
        confirmPassword: '',
      }));

      setStatusMessage({
        type: 'success',
        text: 'Kata sandi akun Anda berhasil diperbarui dengan aman.',
      });
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Gagal mengubah kata sandi.',
      });
    } finally {
      setSaving(false);
    }
  };

  const initials = (profile.fullName || profile.username || 'GR')
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || '')
    .join('') || 'GR';

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-6 bg-[#F8FAFC] text-[#0F172A]">
      {/* Header */}
      <div className="border-b border-[#E2E8F0] pb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#0F172A]">
            Profil Akun & Pengaturan Akses
          </h1>
          <p className="text-xs text-[#64748B] mt-0.5">
            Kelola data diri, kontak, dan keamanan kata sandi akun SMPN 1 Prambon.
          </p>
        </div>
      </div>

      {/* Alert Banner */}
      {statusMessage && (
        <div
          className={`p-3.5 rounded-xl text-xs font-semibold border flex items-center gap-2 ${
            statusMessage.type === 'success'
              ? 'bg-[#ECFDF5] border-[#A7F3D0] text-[#047857]'
              : 'bg-[#FFF1F2] border-[#FECDD3] text-[#BE123C]'
          }`}
        >
          <span>{statusMessage.type === 'success' ? '✓' : '⚠️'}</span>
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Identitas */}
        <div className="space-y-4">
          <Card className="text-center p-5 space-y-3 shadow-xs border border-slate-200">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#193D9B] to-[#1E4DBD] text-white font-bold text-xl flex items-center justify-center mx-auto shadow-sm">
              {initials}
            </div>

            <div>
              <h2 className="text-sm font-bold text-[#0F172A]">
                {profile.fullName || 'Nama Pengguna'}
              </h2>
              <p className="text-xs text-[#64748B] mt-0.5 font-mono">
                NIP: {profile.nip}
              </p>
              <span className="inline-block mt-1.5 px-2.5 py-0.5 rounded-md bg-[#EEF2FF] border border-[#C7D2FE] text-[11px] font-bold text-[#193D9B]">
                {profile.roleName || 'Guru'}
              </span>
            </div>

            <div className="pt-3 border-t border-[#E2E8F0] text-left space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-[#64748B]">Username:</span>
                <span className="font-semibold text-[#0F172A] font-mono">@{profile.username}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#64748B]">No. Telepon:</span>
                <span className="font-semibold text-[#0F172A] font-mono">{profile.phone || '-'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#64748B]">Email:</span>
                <span className="font-semibold text-[#0F172A] truncate max-w-[150px]">{profile.email || '-'}</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column: Tabbed Form */}
        <div className="md:col-span-2">
          <Card className="p-0 overflow-hidden shadow-xs border border-slate-200">
            {/* Tab Bar */}
            <div className="flex border-b border-slate-200 bg-slate-50/80 px-4 pt-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('profile');
                  setStatusMessage(null);
                }}
                className={`pb-3 px-3 text-xs font-bold border-b-2 transition cursor-pointer flex items-center gap-2 ${
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
                className={`pb-3 px-3 text-xs font-bold border-b-2 transition cursor-pointer flex items-center gap-2 ${
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

            <div className="p-5">
              {activeTab === 'profile' && (
                <form onSubmit={handleSubmitProfile} className="space-y-4 text-xs">
                  <div>
                    <h3 className="text-sm font-bold text-[#0F172A]">
                      Perbarui Data Pribadi
                    </h3>
                    <p className="text-xs text-[#64748B] mt-0.5">
                      Ubah nama lengkap, username, dan kontak nomor telepon akun Anda.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-bold text-[#0F172A] mb-1">
                        Nama Lengkap <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={form.fullName}
                        onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                        className="w-full bg-white border border-[#CBD5E1] rounded-xl px-3.5 py-2 text-xs text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#193D9B]/20 focus:border-[#193D9B] transition"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#0F172A] mb-1">
                        Username Akun <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={form.username}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            username: e.target.value.toLowerCase().replace(/\s+/g, '_'),
                          })
                        }
                        className="w-full bg-white border border-[#CBD5E1] rounded-xl px-3.5 py-2 text-xs text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#193D9B]/20 focus:border-[#193D9B] transition font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-bold text-[#0F172A] mb-1">
                        Alamat Email Guru
                      </label>
                      <input
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        placeholder="nama.guru@smpn1prambon.sch.id"
                        className="w-full bg-white border border-[#CBD5E1] rounded-xl px-3.5 py-2 text-xs text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#193D9B]/20 focus:border-[#193D9B] transition"
                      />
                      <p className="text-[10px] text-slate-400 mt-1">Tersinkronisasi ke Superadmin SSO.</p>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#0F172A] mb-1">
                        Nomor WhatsApp / HP
                      </label>
                      <input
                        type="tel"
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        placeholder="08123456789"
                        className="w-full bg-white border border-[#CBD5E1] rounded-xl px-3.5 py-2 text-xs text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#193D9B]/20 focus:border-[#193D9B] font-mono transition"
                      />
                      <p className="text-[10px] text-slate-400 mt-1">Tersinkronisasi ke Superadmin SSO.</p>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={saving}
                      className="px-5 py-2.5 rounded-xl bg-[#193D9B] hover:bg-[#153280] disabled:opacity-50 text-white font-bold text-xs shadow-xs transition cursor-pointer flex items-center gap-2"
                    >
                      {saving ? 'Menyimpan...' : 'Simpan Pembaruan Profil'}
                    </button>
                  </div>
                </form>
              )}

              {activeTab === 'password' && (
                <form onSubmit={handleSubmitPassword} className="space-y-4 text-xs">
                  <div>
                    <h3 className="text-sm font-bold text-[#0F172A]">
                      Perbarui Kata Sandi
                    </h3>
                    <p className="text-xs text-[#64748B] mt-0.5">
                      Ganti kata sandi akun Anda secara berkala untuk menjaga keamanan.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Kata Sandi Lama (Opsional / Saat Ini)
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={form.oldPassword}
                        onChange={(e) => setForm({ ...form, oldPassword: e.target.value })}
                        placeholder="Masukkan kata sandi saat ini jika ada"
                        className="w-full bg-white border border-[#CBD5E1] rounded-xl pl-3.5 pr-10 py-2 text-xs text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#193D9B]/20 focus:border-[#193D9B] transition"
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

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Kata Sandi Baru <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required
                          value={form.newPassword}
                          onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
                          placeholder="Minimal 6 karakter"
                          className="w-full bg-white border border-[#CBD5E1] rounded-xl pl-3.5 pr-10 py-2 text-xs text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#193D9B]/20 focus:border-[#193D9B] transition"
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
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Konfirmasi Kata Sandi Baru <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required
                          value={form.confirmPassword}
                          onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                          placeholder="Ketik ulang kata sandi baru"
                          className="w-full bg-white border border-[#CBD5E1] rounded-xl pl-3.5 pr-10 py-2 text-xs text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#193D9B]/20 focus:border-[#193D9B] transition"
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
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="showPass"
                      checked={showPassword}
                      onChange={(e) => setShowPassword(e.target.checked)}
                      className="rounded border-[#CBD5E1] text-[#193D9B] focus:ring-[#193D9B] cursor-pointer"
                    />
                    <label htmlFor="showPass" className="text-xs text-slate-600 cursor-pointer select-none">
                      Tampilkan karakter kata sandi
                    </label>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={saving}
                      className="px-5 py-2.5 rounded-xl bg-[#193D9B] hover:bg-[#153280] disabled:opacity-50 text-white font-bold text-xs shadow-xs transition cursor-pointer flex items-center gap-2"
                    >
                      {saving ? 'Menyimpan...' : 'Perbarui Kata Sandi'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<div className="p-6 text-xs text-slate-500">Memuat profil...</div>}>
      <ProfileContent />
    </Suspense>
  );
}
