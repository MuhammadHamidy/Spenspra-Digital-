'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/features/auth/presentation/useAuth';
import { tokenStorage } from '@/lib/common/tokenStorage';
import { accountApiAdapter } from '@/lib/features/auth/infrastructure/accountApiAdapter';
import { Card, Button, StyledTextField } from '@/components/mui';
import AppIcon from '@/components/AppIcon';
import Avatar from '@mui/material/Avatar';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import SaveIcon from '@mui/icons-material/Save';

export default function ProfilePage() {
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
      roleName: currentUser.roleName || currentUser.role_name || 'GURU',
    });

    setForm({
      username: currentUser.username || '',
      fullName: currentUser.fullName || currentUser.full_name || '',
      phone: currentUser.phone || '',
      photoUrl: currentUser.photoUrl || currentUser.photo_url || '',
      oldPassword: '',
      newPassword: '',
      confirmPassword: '',
    });

    const fetchLatestProfile = async () => {
      try {
        const teachers = await accountApiAdapter.getTeachers();
        const found = teachers.find(
          (t) => t.id === currentUser.id || t.username === currentUser.username || t.email === currentUser.email
        );
        if (found) {
          const freshCourses = found.course_names || [];
          const freshClasses = found.class_codes || [];

          setProfile((prev) => ({
            ...prev,
            fullName: found.full_name || prev.fullName,
            nip: found.nim_nip || prev.nip,
            email: found.email || prev.email,
            phone: found.phone || prev.phone,
            photoUrl: found.photo_url || prev.photoUrl,
            courseNames: freshCourses,
            classCodes: freshClasses,
          }));

          const updatedUser = {
            ...currentUser,
            ...found,
            fullName: found.full_name,
            nimNip: found.nim_nip,
            courseNames: freshCourses,
            course_names: freshCourses,
            classCodes: freshClasses,
            class_codes: freshClasses,
          };
          tokenStorage.setUser(updatedUser);
        }
      } catch (err) {
        console.warn('Silent refresh teacher profile error:', err);
      }
    };

    fetchLatestProfile();
  }, [user]);

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setForm((prev) => ({ ...prev, photoUrl: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatusMessage(null);

    if (form.newPassword) {
      if (form.newPassword.length < 6) {
        setStatusMessage({ type: 'error', text: 'Password baru minimal harus 6 karakter.' });
        return;
      }
      if (form.newPassword !== form.confirmPassword) {
        setStatusMessage({ type: 'error', text: 'Konfirmasi password baru tidak cocok.' });
        return;
      }
    }

    setSaving(true);
    try {
      const payload = {
        username: form.username,
        full_name: form.fullName,
        phone: form.phone,
        photo_url: form.photoUrl,
        old_password: form.oldPassword,
        new_password: form.newPassword,
      };

      await accountApiAdapter.updateProfile(profile.id, payload);

      const currentUser = tokenStorage.getUser() || {};
      const newUserData = {
        ...currentUser,
        username: form.username,
        fullName: form.fullName,
        full_name: form.fullName,
        phone: form.phone,
        photoUrl: form.photoUrl,
        photo_url: form.photoUrl,
      };
      tokenStorage.setUser(newUserData);

      setProfile((prev) => ({
        ...prev,
        username: form.username,
        fullName: form.fullName,
        phone: form.phone,
        photoUrl: form.photoUrl,
      }));

      setForm((prev) => ({
        ...prev,
        oldPassword: '',
        newPassword: '',
        confirmPassword: '',
      }));

      setStatusMessage({
        type: 'success',
        text: 'Profil dan kredensial akun berhasil diperbarui! Privasi data Anda telah tersimpan.',
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

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Typography variant="h5" sx={{ fontWeight: 900, color: '#0A1931', display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <AppIcon name="user" color="blue" size={24} />
            Profil Saya & Privasi Akun
          </Typography>
          <Typography variant="body2" sx={{ color: '#4A7FA7', mt: 0.5, fontWeight: 500 }}>
            Informasi identitas guru, penugasan mata pelajaran, daftar kelas, serta pengaturan kredensial login
          </Typography>
        </div>
      </div>

      {/* Alert Banner */}
      {statusMessage && (
        <Alert
          severity={statusMessage.type === 'success' ? 'success' : 'error'}
          sx={{ borderRadius: '14px', fontWeight: 600 }}
        >
          {statusMessage.text}
        </Alert>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Profile Card & Assignments */}
        <div className="space-y-6">
          <Card className="text-center p-6 bg-white border border-[#B3CFE5] rounded-3xl shadow-sm">
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
              <Avatar
                src={form.photoUrl || profile.photoUrl}
                alt={profile.fullName}
                sx={{
                  width: 96,
                  height: 96,
                  bgcolor: '#1A3D63',
                  fontSize: '2rem',
                  fontWeight: 900,
                  border: '3px solid #B3CFE5',
                  boxShadow: '0 4px 14px rgba(26,61,99,0.15)',
                }}
              >
                {profile.fullName?.charAt(0) || 'G'}
              </Avatar>
            </Box>

            <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0A1931', lineHeight: 1.2 }}>
              {profile.fullName || 'Nama Guru'}
            </Typography>
            <Typography variant="caption" sx={{ color: '#4A7FA7', fontWeight: 600, display: 'block', mt: 0.5 }}>
              NIP: {profile.nip}
            </Typography>
            <Box sx={{ mt: 1.5 }}>
              <Chip
                label={`${profile.roleName} SMPN 1 PRAMBON`}
                size="small"
                sx={{ bgcolor: '#1A3D63', color: '#FFFFFF', fontWeight: 800, fontSize: '0.65rem' }}
              />
            </Box>

            <div className="mt-4 pt-4 border-t border-[#B3CFE5]/60 text-left space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-[#4A7FA7] font-semibold">Email:</span>
                <span className="font-bold text-[#0A1931] truncate max-w-[170px]">{profile.email || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#4A7FA7] font-semibold">No. HP/WA:</span>
                <span className="font-bold text-[#0A1931]">{profile.phone || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#4A7FA7] font-semibold">Username:</span>
                <span className="font-black text-[#1A3D63]">@{profile.username}</span>
              </div>
            </div>
          </Card>

          {/* Teacher Assignments Info Card */}
          <Card className="p-5 bg-white border border-[#B3CFE5] rounded-3xl shadow-sm space-y-4">
            <div>
              <Typography variant="caption" sx={{ fontWeight: 800, color: '#0A1931', textTransform: 'uppercase', display: 'block', mb: 1 }}>
                📖 Mata Pelajaran yang Diampu
              </Typography>
              <div className="flex flex-wrap gap-1.5">
                {profile.courseNames && profile.courseNames.length > 0 ? (
                  profile.courseNames.map((name, i) => (
                    <Chip
                      key={i}
                      label={name}
                      size="small"
                      sx={{ bgcolor: '#1A3D63', color: '#FFFFFF', fontWeight: 700, fontSize: '0.6875rem' }}
                    />
                  ))
                ) : (
                  <Typography variant="caption" sx={{ color: '#4A7FA7', fontStyle: 'italic' }}>
                    Belum ada penugasan mata pelajaran
                  </Typography>
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-[#B3CFE5]/60">
              <Typography variant="caption" sx={{ fontWeight: 800, color: '#0A1931', textTransform: 'uppercase', display: 'block', mb: 1 }}>
                🏫 Kelas yang Diampu
              </Typography>
              <div className="flex flex-wrap gap-1.5">
                {profile.classCodes && profile.classCodes.length > 0 ? (
                  profile.classCodes.map((code, i) => (
                    <Chip
                      key={i}
                      label={`Kelas ${code}`}
                      size="small"
                      sx={{ bgcolor: '#059669', color: '#FFFFFF', fontWeight: 700, fontSize: '0.6875rem' }}
                    />
                  ))
                ) : (
                  <Typography variant="caption" sx={{ color: '#4A7FA7', fontStyle: 'italic' }}>
                    Semua Kelas / Belum diatur
                  </Typography>
                )}
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column: Edit Profile & Password Settings */}
        <div className="md:col-span-2 space-y-6">
          <Card className="p-6 bg-white border border-[#B3CFE5] rounded-3xl shadow-sm">
            <Typography variant="h6" sx={{ fontWeight: 800, color: '#0A1931', mb: 0.5 }}>
              ⚙️ Pengaturan Data Profil & Privasi Akun
            </Typography>
            <Typography variant="caption" sx={{ color: '#4A7FA7', display: 'block', mb: 3 }}>
              Anda dapat mengubah username dan kata sandi kapan saja agar kredensial login tetap aman.
            </Typography>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Typography variant="caption" sx={{ display: 'block', fontWeight: 800, color: '#4A7FA7', mb: 1 }}>
                  Perbarui Foto Profil
                </Typography>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="w-full text-xs text-[#4A7FA7] file:mr-3 file:py-2 file:px-3.5 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[#1A3D63] file:text-white cursor-pointer"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Typography variant="caption" sx={{ display: 'block', fontWeight: 800, color: '#4A7FA7', mb: 1 }}>
                    Nama Lengkap Guru
                  </Typography>
                  <StyledTextField
                    fullWidth
                    size="small"
                    required
                    value={form.fullName}
                    onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  />
                </div>
                <div>
                  <Typography variant="caption" sx={{ display: 'block', fontWeight: 800, color: '#4A7FA7', mb: 1 }}>
                    Nomor HP / WhatsApp
                  </Typography>
                  <StyledTextField
                    fullWidth
                    size="small"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="08123456789"
                  />
                </div>
              </div>

              <div>
                <Typography variant="caption" sx={{ display: 'block', fontWeight: 800, color: '#4A7FA7', mb: 1 }}>
                  Username Login
                </Typography>
                <StyledTextField
                  fullWidth
                  size="small"
                  required
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                />
              </div>

              <Box sx={{ pt: 2, borderTop: '1px solid #B3CFE5' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0A1931', mb: 0.5 }}>
                  🔒 Ganti Password Akun
                </Typography>
                <Typography variant="caption" sx={{ color: '#4A7FA7', display: 'block', mb: 2 }}>
                  Kosongkan bagian password ini jika Anda tidak ingin mengubah password akun Anda saat ini.
                </Typography>

                <div className="space-y-3">
                  <div>
                    <Typography variant="caption" sx={{ display: 'block', fontWeight: 800, color: '#4A7FA7', mb: 0.5 }}>
                      Password Lama (Wajib jika ganti password)
                    </Typography>
                    <StyledTextField
                      fullWidth
                      size="small"
                      type={showPassword ? 'text' : 'password'}
                      value={form.oldPassword}
                      onChange={(e) => setForm({ ...form, oldPassword: e.target.value })}
                      placeholder="Masukkan password saat ini"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Typography variant="caption" sx={{ display: 'block', fontWeight: 800, color: '#4A7FA7', mb: 0.5 }}>
                        Password Baru
                      </Typography>
                      <StyledTextField
                        fullWidth
                        size="small"
                        type={showPassword ? 'text' : 'password'}
                        value={form.newPassword}
                        onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
                        placeholder="Minimal 6 karakter"
                      />
                    </div>
                    <div>
                      <Typography variant="caption" sx={{ display: 'block', fontWeight: 800, color: '#4A7FA7', mb: 0.5 }}>
                        Ulangi Password Baru
                      </Typography>
                      <StyledTextField
                        fullWidth
                        size="small"
                        type={showPassword ? 'text' : 'password'}
                        value={form.confirmPassword}
                        onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                        placeholder="Konfirmasi password baru"
                        slotProps={{
                          input: {
                            endAdornment: (
                              <InputAdornment position="end">
                                <IconButton
                                  size="small"
                                  onClick={() => setShowPassword(!showPassword)}
                                  edge="end"
                                >
                                  {showPassword ? <VisibilityOff sx={{ fontSize: 18 }} /> : <Visibility sx={{ fontSize: 18 }} />}
                                </IconButton>
                              </InputAdornment>
                            ),
                          },
                        }}
                      />
                    </div>
                  </div>
                </div>
              </Box>

              <div className="pt-3">
                <Button
                  type="submit"
                  loading={saving}
                  variant="primary"
                  size="md"
                  startIcon={<SaveIcon sx={{ fontSize: 18 }} />}
                  className="shadow-md"
                >
                  Simpan Perubahan Profil
                </Button>
              </div>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
