import { httpClient } from '@/lib/common/httpClient';

export function mapToDbRoleId(role) {
  const r = String(role || '').toUpperCase();
  if (r.includes('SUPER')) return 'role-super-admin';
  if (r.includes('RAPOR')) return 'role-admin-rapor';
  if (r.includes('PERPUS')) return 'role-admin-perpus';
  if (r.includes('ABSENSI')) return 'role-admin-absensi';
  if (r.includes('WALI')) return 'role-wali-kelas';
  if (r.includes('GURU')) return 'role-guru';
  if (r.includes('SISWA')) return 'role-siswa';
  if (r.includes('KEPALA')) return 'role-kepala-sekolah';
  if (r.includes('TENDIK') || r.includes('KEPENDIDIKAN')) return 'role-admin';
  if (r.includes('ADMIN')) return 'role-admin';
  return 'role-guru';
}

export const accountApiAdapter = {
  getAll: async (role = '') => {
    try {
      const query = role ? `?role=${encodeURIComponent(role)}` : '';
      const res = await httpClient.get(`/accounts${query}`);
      return Array.isArray(res.data) ? res.data : [];
    } catch (err) {
      console.warn('Gagal memuat akun dari server:', err.message);
      return [];
    }
  },

  getTeachers: async () => {
    try {
      const res = await httpClient.get('/accounts?role=GURU');
      const accounts = Array.isArray(res.data) ? res.data : [];
      return accounts.filter((account) => {
        const r = (account.role_name || account.roleName || account.role_id || '').toUpperCase();
        return r.includes('GURU');
      });
    } catch (err) {
      console.warn('Gagal memuat akun guru dari server:', err.message);
      return [];
    }
  },

  getStudents: async () => {
    try {
      const res = await httpClient.get('/accounts?role=SISWA', { cache: 'no-store' });
      const accounts = Array.isArray(res.data) ? res.data : [];
      return accounts.filter((account) => {
        const r = (account.role_name || account.roleName || account.role_id || '').toUpperCase();
        return r.includes('SISWA');
      });
    } catch (err) {
      console.warn('Gagal memuat akun siswa dari server:', err.message);
      return [];
    }
  },

  getTendik: async () => {
    try {
      const res = await httpClient.get('/accounts?role=TENAGA_KEPENDIDIKAN');
      const accounts = Array.isArray(res.data) ? res.data : [];
      return accounts.filter((account) => {
        const r = (account.role_name || account.roleName || account.role_id || '').toUpperCase();
        return r.includes('TENAGA_KEPENDIDIKAN') || r.includes('TENDIK') || r.includes('STAFF');
      });
    } catch (err) {
      console.warn('Gagal memuat akun tenaga kependidikan dari server:', err.message);
      return [];
    }
  },

  create: async (accountData) => {
    const rawRole = accountData.role_name || accountData.roleName || accountData.role_id || accountData.roleId || 'GURU';
    const roleId = mapToDbRoleId(rawRole);
    const roleName = String(rawRole).toUpperCase();

    const payload = {
      ...accountData,
      id: accountData.id || `acc-${Date.now()}`,
      full_name: accountData.full_name || accountData.fullName,
      nim_nip: accountData.nim_nip || accountData.nip,
      class_name: accountData.class_name || accountData.className || '',
      role_id: roleId,
      role_name: roleName,
      course_ids: accountData.course_ids || accountData.selectedCourses || [],
      class_ids: accountData.class_ids || accountData.selectedClasses || [],
      course_names: accountData.course_names || [],
      class_codes: accountData.class_codes || [],
      photo_url: accountData.photo_url || accountData.photoUrl || '',
    };

    try {
      const res = await httpClient.post('/accounts', payload);
      return res.data || payload;
    } catch (error) {
      throw new Error(error?.response?.data?.message || error?.message || 'Akun tidak dapat dibuat di backend');
    }
  },

  update: async (id, accountData) => {
    const rawRole = accountData.role_name || accountData.roleName || accountData.role_id || accountData.roleId || '';
    const roleId = rawRole ? mapToDbRoleId(rawRole) : undefined;
    const roleName = rawRole ? String(rawRole).toUpperCase() : undefined;

    const payload = {
      ...accountData,
      id,
      full_name: accountData.full_name || accountData.fullName,
      nim_nip: accountData.nim_nip || accountData.nip,
      class_name: accountData.class_name || accountData.className || '',
      ...(roleId ? { role_id: roleId } : {}),
      ...(roleName ? { role_name: roleName } : {}),
      course_ids: accountData.course_ids || accountData.selectedCourses || [],
      class_ids: accountData.class_ids || accountData.selectedClasses || [],
    };

    try {
      const res = await httpClient.put(`/accounts/${id}`, payload);
      return res.data || { ...payload, id };
    } catch (error) {
      throw new Error(error?.message || 'Akun tidak dapat diperbarui di backend');
    }
  },

  delete: async (id) => {
    try {
      const res = await httpClient.delete(`/accounts/${id}`);
      return res.data;
    } catch (error) {
      throw new Error(error?.message || 'Akun tidak dapat dihapus dari backend');
    }
  },

  resetPassword: async (teacherOrPayload, { newPassword = '', sendEmail = true, email = '' } = {}) => {
    let t = {};
    if (typeof teacherOrPayload === 'object' && teacherOrPayload !== null) {
      t = { ...teacherOrPayload };
    } else if (typeof teacherOrPayload === 'string') {
      const id = teacherOrPayload;
      const allAccounts = await accountApiAdapter.getAll().catch(() => []);
      const acc = allAccounts.find((a) => a.id === id || a.person_id === id || a.username === id || a.nim_nip === id);
      const allPeople = await schoolPeopleApi.list().catch(() => []);
      const person = allPeople.find((p) => p.id === id || p.nip === id || p.nisn === id || p.email === id);

      t = {
        id,
        email: email || acc?.email || person?.email || '',
        full_name: acc?.full_name || acc?.fullName || person?.full_name || '',
        username: acc?.username || person?.nip || person?.nisn || id,
      };
    }

    const generated = newPassword || t.username || t.nim_nip || 'Spenspra2026';
    const targetEmail = t.email || email || '';

    // 1. Try Go backend if available
    try {
      const accountId = t.id || t.accountId;
      if (accountId) {
        const res = await httpClient.post(`/accounts/${accountId}/reset-password`, {
          new_password: generated,
          send_email: sendEmail,
        });
        if (res?.data) return res.data;
      }
    } catch (e) {
      // Proceed with direct Next.js mailer
    }

    // 2. If sendEmail is true, send via Next.js internal mailer
    let emailSent = false;
    if (sendEmail && targetEmail) {
      try {
        let resp = await fetch('/mail-api/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: targetEmail,
            teacherName: t.full_name || t.fullName,
            username: t.username,
            newPassword: generated,
            type: 'reset_password',
          }),
        }).catch(() => null);

        if (!resp || !resp.ok) {
          resp = await fetch('/api/email/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: targetEmail,
              teacherName: t.full_name || t.fullName,
              username: t.username,
              newPassword: generated,
              type: 'reset_password',
            }),
          }).catch(() => null);
        }

        const result = resp ? await resp.json().catch(() => ({})) : {};
        if (result.success) {
          emailSent = true;
        } else {
          throw new Error(result.error || 'Server email tidak merespon.');
        }
      } catch (errMail) {
        console.warn('Next.js reset email error:', errMail);
        throw new Error('Password berhasil direset, namun pengiriman email gagal: ' + errMail.message);
      }
    }

    return {
      new_password: generated,
      email_sent: emailSent,
      message: 'Password berhasil direset',
    };
  },

  sendAccessEmail: async (teacherOrPayload, password = '', options = {}) => {
    let t = {};
    let pwd = password;

    if (typeof teacherOrPayload === 'object' && teacherOrPayload !== null) {
      t = { ...teacherOrPayload };
      pwd = pwd || t.password || t.defaultPassword || '';
    } else if (typeof teacherOrPayload === 'string') {
      const id = teacherOrPayload;
      const allAccounts = await accountApiAdapter.getAll().catch(() => []);
      const acc = allAccounts.find((a) => a.id === id || a.person_id === id || a.username === id || a.nim_nip === id);
      const allPeople = await schoolPeopleApi.list().catch(() => []);
      const person = allPeople.find((p) => p.id === id || p.nip === id || p.nisn === id || p.email === id);

      t = {
        id,
        email: options.email || acc?.email || person?.email || '',
        full_name: acc?.full_name || acc?.fullName || person?.full_name || '',
        username: acc?.username || person?.nip || person?.nisn || id,
      };
    }

    const targetEmail = t.email || options.email || '';
    if (!targetEmail) {
      throw new Error('Alamat email belum diisi pada data pengguna ini. Silakan lengkapi email terlebih dahulu di Data Master.');
    }

    const targetName = t.full_name || t.fullName || t.name || 'Bapak/Ibu Pendidik / Staf';
    const targetUsername = t.username || t.nim_nip || t.nip || '';
    const targetPassword = pwd || targetUsername || 'Spenspra2026!';

    // 0. Sinkronisasi kredensial ke database PostgreSQL agar password yang dikirim di email valid untuk login
    try {
      const allAccounts = await accountApiAdapter.getAll().catch(() => []);
      const matched = allAccounts.find(
        (a) =>
          a.id === t.id ||
          a.person_id === t.id ||
          a.person_id === t.person_id ||
          a.username === targetUsername ||
          a.nim_nip === targetUsername
      );

      if (matched) {
        // Reset kata sandi di backend ke targetPassword
        await httpClient.post(`/accounts/${matched.id}/reset-password`, {
          new_password: targetPassword,
          send_email: false,
        });
      } else {
        // Buat akun baru di database dengan kata sandi targetPassword
        const roleName = t.role_name || t.roleName || 'GURU';
        await accountApiAdapter.create({
          id: t.id || `acc-${Date.now()}`,
          person_id: t.person_id || t.id,
          username: targetUsername,
          password: targetPassword,
          full_name: targetName,
          email: targetEmail,
          phone: t.phone || '',
          nim_nip: targetUsername,
          role_name: roleName,
          role_id: mapToDbRoleId(roleName),
        });
      }
    } catch (syncErr) {
      console.warn('[Sync Credential to DB Warning]', syncErr.message);
    }

    let lastError = null;

    // 1. Coba kirim via endpoint mailer Next.js (/mail-api/send)
    // yang langsung terhubung ke SMTP TLS Gmail (port 465) tanpa terhalang proxy Nginx /api/
    try {
      const resp = await fetch('/mail-api/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: targetEmail,
          teacherName: targetName,
          username: targetUsername,
          password: targetPassword,
          courseNames: t.course_names || t.courseNames || [],
          classCodes: t.class_codes || t.classCodes || [],
        }),
      });

      if (resp.ok) {
        const result = await resp.json().catch(() => ({}));
        if (result.success) {
          return result;
        }
        if (result.error) lastError = result.error;
      } else {
        const errJson = await resp.json().catch(() => ({}));
        if (errJson.error) lastError = errJson.error;
      }
    } catch (err) {
      console.warn('[Next.js Mailer Warning]', err.message);
      lastError = err.message;
    }

    // 2. Coba endpoint Go backend jika ada accountId
    try {
      const accountId = t.id || t.accountId;
      if (accountId) {
        const res = await httpClient.post(`/accounts/${accountId}/send-access-email`, {
          password: targetPassword,
        });
        if (res?.data || res?.success) return res.data || res;
      }
    } catch (e) {
      console.warn('[Go Backend Mailer Warning]', e.message);
      if (!lastError) lastError = e.message;
    }

    // 3. Fallback jika /api/email/send berhasil
    try {
      const resp = await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: targetEmail,
          teacherName: targetName,
          username: targetUsername,
          password: targetPassword,
          courseNames: t.course_names || t.courseNames || [],
          classCodes: t.class_codes || t.classCodes || [],
        }),
      });
      if (resp.ok) {
        const result = await resp.json().catch(() => ({}));
        if (result.success) return result;
        if (result.error) lastError = result.error;
      }
    } catch (err) {
      // ignore
    }

    throw new Error(lastError || 'Gagal mengirim email melalui server SMTP. Periksa koneksi atau gunakan tombol alternatif.');
  },

  updateProfile: async (id, profileData) => {
    const payload = {
      username: profileData.username,
      old_password: profileData.old_password || profileData.oldPassword,
      new_password: profileData.new_password || profileData.newPassword,
      full_name: profileData.full_name || profileData.fullName,
      email: profileData.email,
      phone: profileData.phone,
      photo_url: profileData.photo_url || profileData.photoUrl,
    };

    try {
      const res = await httpClient.put(`/accounts/${id}/profile`, payload);
      return res.data;
    } catch (err) {
      return { ...payload, id };
    }
  },
};
