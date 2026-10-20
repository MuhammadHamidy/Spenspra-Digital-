'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Modal from '@/components/Modal';
import { accountApiAdapter } from '@/lib/features/auth/infrastructure/accountApiAdapter';
import { classApiAdapter } from '@/lib/features/classes/infrastructure/classApiAdapter';
import Pagination from '@/components/Pagination';

export default function MasterTeachersPage() {
  const [teachers, setTeachers] = useState([]);
  const [availableClasses, setAvailableClasses] = useState([]);
  const [search, setSearch] = useState('');
  const [filterWalas, setFilterWalas] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modal Penetapan Walas State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState(null);
  const [formNip, setFormNip] = useState('');
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formWalas, setFormWalas] = useState('');
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSyncingSSO, setIsSyncingSSO] = useState(false);

  // Modal Atur Sandi Guru oleh Admin State
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passwordTeacher, setPasswordTeacher] = useState(null);
  const [adminCustomPassword, setAdminCustomPassword] = useState('');
  const [showPasswordEye, setShowPasswordEye] = useState(false);
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);
  const [passwordNotice, setPasswordNotice] = useState(null);

  const [isCustomWalas, setIsCustomWalas] = useState(false);
  const [customWalasInput, setCustomWalasInput] = useState('');

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [teacherList, rombelList] = await Promise.all([
        accountApiAdapter.getTeachers(),
        classApiAdapter.getMasterRombel(),
      ]);
      setTeachers(Array.isArray(teacherList) ? teacherList : []);
      if (Array.isArray(rombelList) && rombelList.length > 0) {
        setAvailableClasses(rombelList);
      }
    } catch (err) {
      console.warn('Gagal memuat data guru:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSyncFromSSO = async () => {
    setIsSyncingSSO(true);
    try {
      const res = await accountApiAdapter.syncFromSSO();
      alert(res?.message || 'Data guru & siswa berhasil disinkronkan langsung dari Master Data SSO!');
      await loadData();
    } catch (err) {
      alert(err.message || 'Gagal menyinkronkan data dari SSO.');
    } finally {
      setIsSyncingSSO(false);
    }
  };

  const openEditModal = (teacher) => {
    setEditingTeacher(teacher);
    setFormNip(teacher.nim_nip || teacher.nip || '');
    setFormName(teacher.full_name || teacher.name || '');
    setFormEmail(teacher.email || '');
    setFormWalas(teacher.class_name || '');
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!editingTeacher) return;

    setIsSubmitting(true);
    setFormError('');

    try {
      const fallbackUser = editingTeacher.username || 'guru';
      const payload = {
        nim_nip: formNip.trim(),
        full_name: formName.trim(),
        email: formEmail.trim() || `${formNip.trim() || fallbackUser}@smpn1prambon.sch.id`,
        class_name: formWalas.trim(),
        role_id: 'role-guru',
      };

      await accountApiAdapter.update(editingTeacher.id, payload);
      await loadData();
      setIsModalOpen(false);
    } catch (error) {
      setFormError(error.message || 'Gagal menyimpan penetapan wali kelas.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openPasswordModal = (teacher) => {
    setPasswordTeacher(teacher);
    setAdminCustomPassword(teacher.nim_nip || teacher.nip || teacher.username || 'Spenspra2026');
    setShowPasswordEye(false);
    setPasswordNotice(null);
    setIsPasswordModalOpen(true);
  };

  const handleSaveTeacherPassword = async (e) => {
    e.preventDefault();
    if (!passwordTeacher) return;
    if (!adminCustomPassword || adminCustomPassword.length < 6) {
      setPasswordNotice({ type: 'error', text: 'Kata sandi minimal 6 karakter.' });
      return;
    }

    setIsSubmittingPassword(true);
    setPasswordNotice(null);

    try {
      await accountApiAdapter.resetPassword(passwordTeacher.id, {
        newPassword: adminCustomPassword,
        sendEmail: false,
      });

      setPasswordNotice({
        type: 'success',
        text: `Kata sandi untuk ${passwordTeacher.full_name || passwordTeacher.name} berhasil ditentukan dan disimpan.`,
      });

      setTimeout(() => {
        setIsPasswordModalOpen(false);
        setPasswordNotice(null);
      }, 1500);
    } catch (err) {
      setPasswordNotice({
        type: 'error',
        text: err.message || 'Gagal menyimpan kata sandi guru.',
      });
    } finally {
      setIsSubmittingPassword(false);
    }
  };

  // Filter Data
  const filtered = teachers.filter((t) => {
    const name = (t.full_name || t.name || '').toLowerCase();
    const nip = (t.nim_nip || t.nip || '').toLowerCase();
    const mapel = (t.course_names || []).join(', ').toLowerCase();
    const walas = (t.class_name || '').toLowerCase();

    const matchesSearch =
      !search ||
      name.includes(search.toLowerCase()) ||
      nip.includes(search.toLowerCase()) ||
      mapel.includes(search.toLowerCase()) ||
      walas.includes(search.toLowerCase());

    const matchesWalas =
      filterWalas === 'ALL'
        ? true
        : filterWalas === 'WALAS'
        ? Boolean(t.class_name)
        : !t.class_name;

    return matchesSearch && matchesWalas;
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterWalas]);

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="border-b border-slate-200 pb-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[11px] font-bold">
              MODUL E-RAPOR
            </span>
            <span className="text-slate-400">•</span>
            <span className="text-xs text-slate-500 font-medium">Pengelolaan Guru & Walas</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight mt-1">
            Data Guru & Penetapan Wali Kelas
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Akun guru disinkronkan langsung dari Master Data SSO. Admin e-Rapor bertugas mengatur penugasan wali kelas.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleSyncFromSSO}
            disabled={isSyncingSSO}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer"
            title="Tarik & sinkronkan data guru & siswa langsung dari Master Data SSO"
          >
            <svg className={`w-4 h-4 ${isSyncingSSO ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>{isSyncingSSO ? 'Menyinkronkan...' : 'Sinkronkan Data dari SSO'}</span>
          </button>
        </div>
      </div>

      {/* Bar Filter & Pencarian */}
      <div className="bg-white border border-slate-200/90 p-4 rounded-xl flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setFilterWalas('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              filterWalas === 'ALL'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Semua Guru ({teachers.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterWalas('WALAS')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              filterWalas === 'WALAS'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Hanya Wali Kelas ({teachers.filter((t) => Boolean(t.class_name)).length})
          </button>
          <button
            type="button"
            onClick={() => setFilterWalas('NON_WALAS')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              filterWalas === 'NON_WALAS'
                ? 'bg-slate-800 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Bukan Wali Kelas ({teachers.filter((t) => !t.class_name).length})
          </button>
        </div>

        <div className="w-full sm:w-80">
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              type="text"
              placeholder="Cari NIP, nama guru, atau walas..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
            />
          </div>
        </div>
      </div>

      {/* Tabel Data Guru */}
      <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-700">
              <tr>
                <th className="py-3 px-4 font-semibold w-12 text-center">No</th>
                <th className="py-3 px-4 font-semibold">NIP / Akun</th>
                <th className="py-3 px-4 font-semibold">Nama Lengkap Guru</th>
                <th className="py-3 px-4 font-semibold">Penetapan Wali Kelas</th>
                <th className="py-3 px-4 font-semibold">
                  Mata Pelajaran yang Diampu
                  <span className="block text-[10px] font-normal text-slate-400">Ringkasan dari Pengampu Mapel</span>
                </th>
                <th className="py-3 px-4 font-semibold">Rombel Ajar</th>
                <th className="py-3 px-4 text-right font-semibold">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-500">
                    <div className="inline-flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                      <span>Memuat data guru...</span>
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-500">
                    Tidak ditemukan data guru yang sesuai.
                  </td>
                </tr>
              ) : (
                paginated.map((teacher, idx) => {
                  const isWalas = Boolean(teacher.class_name);
                  const courseNames = teacher.course_names || [];
                  const itemNo = (currentPage - 1) * pageSize + idx + 1;

                  return (
                    <tr key={teacher.id || idx} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 text-center font-medium text-slate-400">{itemNo}</td>
                      <td className="py-3 px-4 tabular-nums font-mono text-slate-600 font-medium">
                        {teacher.nim_nip || teacher.nip || '-'}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{teacher.full_name || teacher.name}</div>
                        {teacher.email && (
                          <div className="text-[11px] text-slate-400">{teacher.email}</div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {isWalas ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-bold text-[11px]">
                            <svg className="w-3.5 h-3.5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                            Wali Kelas {teacher.class_name.replace(/^Kelas\s*/i, '')}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs italic">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {courseNames.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {courseNames.map((cName, cIdx) => (
                              <span
                                key={cIdx}
                                className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-semibold"
                              >
                                {cName}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs italic">Belum ditentukan</span>
                        )}
                      </td>
                      <td className="py-3 px-4 tabular-nums text-slate-600 font-medium">
                        {(teacher.class_codes || []).length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {teacher.class_codes.map((cc, ccIdx) => (
                              <span key={ccIdx} className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-bold">
                                {cc}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs italic">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openPasswordModal(teacher)}
                            className="px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-[#193D9B] border border-blue-200 font-bold text-xs cursor-pointer transition-all flex items-center gap-1.5 shadow-2xs"
                            title="Tentukan kata sandi akun guru ini langsung oleh admin"
                          >
                            <svg className="w-3.5 h-3.5 text-[#193D9B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                            </svg>
                            <span>Atur Sandi</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditModal(teacher)}
                            className="px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-bold text-xs cursor-pointer transition-all flex items-center gap-1.5 shadow-2xs"
                            title="Tentukan penugasan wali kelas untuk guru ini"
                          >
                            <svg className="w-3.5 h-3.5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                            <span>Atur Walas</span>
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

        {/* Paginasi Guru */}
        <Pagination
          currentPage={currentPage}
          totalItems={filtered.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setCurrentPage(1);
          }}
          pageSizeOptions={[10, 20, 50]}
          itemLabel="guru"
        />
      </div>

      {/* Modal Penetapan Wali Kelas */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Penetapan Wali Kelas (Walas)"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
              {formError}
            </div>
          )}

          {/* Kartu Profil Guru (Master Data dari SSO) */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-sm shrink-0">
              {(formName || 'G').charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-bold text-slate-900 truncate">{formName}</h4>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 shrink-0">
                  SSO Akun
                </span>
              </div>
              <p className="text-[11px] font-mono text-slate-500 mt-0.5">NIP: {formNip || '-'}</p>
              {formEmail && (
                <p className="text-[11px] text-slate-400 truncate mt-0.5">{formEmail}</p>
              )}
            </div>
          </div>

          {/* Penetapan Wali Kelas */}
          <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200/90">
            <label className="block text-xs font-bold text-amber-900 mb-1 flex items-center gap-1.5">
              <svg className="w-4 h-4 text-amber-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span>Penetapan Wali Kelas</span>
            </label>
            <p className="text-[11px] text-amber-800/80 mb-2">
              Tentukan kelas binaan jika guru ini ditugaskan sebagai wali kelas untuk lembar rekap rapor dan cetak PDF.
            </p>
            {!isCustomWalas ? (
              <div className="space-y-1.5">
                <select
                  value={formWalas}
                  onChange={(e) => {
                    if (e.target.value === '__CUSTOM__') {
                      setIsCustomWalas(true);
                      setCustomWalasInput('');
                    } else {
                      setFormWalas(e.target.value);
                    }
                  }}
                  className="w-full px-3 py-2 bg-white border border-amber-300 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-600"
                >
                  <option value="">- Bukan Wali Kelas -</option>
                  {formWalas && !availableClasses.includes(formWalas) && (
                    <option value={formWalas}>Wali Kelas {formWalas}</option>
                  )}
                  {availableClasses.map((cls) => (
                    <option key={cls} value={cls}>
                      Wali Kelas {cls}
                    </option>
                  ))}
                  <option value="__CUSTOM__">➕ Tentukan Rombel Baru / Manual...</option>
                </select>
                <div className="flex items-center justify-between text-[11px] text-amber-800/80">
                  <span>Daftar kelas tersinkron dari Master SSO & Siswa.</span>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCustomWalas(true);
                      setCustomWalasInput('');
                    }}
                    className="text-amber-900 underline font-semibold cursor-pointer"
                  >
                    + Ketik Manual
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Ketik rombel walas (cth: 7C atau VII-A)"
                    value={customWalasInput}
                    onChange={(e) => {
                      setCustomWalasInput(e.target.value);
                      setFormWalas(e.target.value.trim());
                    }}
                    className="flex-1 px-3 py-2 bg-white border border-amber-400 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setIsCustomWalas(false);
                      setCustomWalasInput('');
                      setFormWalas('');
                    }}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold rounded-lg cursor-pointer"
                  >
                    Pilih dari Daftar
                  </button>
                </div>
                <p className="text-[11px] text-amber-800/80">
                  Ketik kode rombel sesuai kelas yang ada di SSO atau sekolah.
                </p>
              </div>
            )}
          </div>

          {/* Info Penugasan Mata Pelajaran */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex items-start gap-2.5">
              <span className="text-base">📚</span>
              <div>
                <h5 className="text-xs font-bold text-slate-800">Penugasan Mata Pelajaran & Jadwal</h5>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                  Penugasan guru ke mata pelajaran dan rombel spesifik diatur secara terpusat melalui menu <strong>Pengampu Mata Pelajaran per Kelas</strong>.
                </p>
              </div>
            </div>
          </div>

          {/* Aksi Modal */}
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer transition-all"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? 'Menyimpan...' : 'Simpan Penetapan Walas'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Atur Kata Sandi Guru oleh Admin */}
      <Modal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        title="Atur Kata Sandi Akun Guru"
      >
        <form onSubmit={handleSaveTeacherPassword} className="space-y-4">
          {passwordNotice && (
            <div
              className={`p-3 rounded-lg text-xs font-semibold border ${
                passwordNotice.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              {passwordNotice.text}
            </div>
          )}

          {/* Kartu Profil Guru */}
          {passwordTeacher && (
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#193D9B] text-white font-bold flex items-center justify-center text-sm shrink-0">
                {(passwordTeacher.full_name || passwordTeacher.name || 'G').charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1 text-xs">
                <h4 className="font-bold text-slate-900 truncate">
                  {passwordTeacher.full_name || passwordTeacher.name}
                </h4>
                <p className="font-mono text-slate-500 text-[11px] mt-0.5">
                  NIP: {passwordTeacher.nim_nip || passwordTeacher.nip || '-'}
                </p>
                {passwordTeacher.email && (
                  <p className="text-slate-400 text-[11px] truncate mt-0.5">
                    {passwordTeacher.email}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Input Password Ditentukan Admin */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Kata Sandi Baru (Ditentukan Langsung oleh Admin)
            </label>
            <div className="relative">
              <input
                type={showPasswordEye ? 'text' : 'password'}
                required
                value={adminCustomPassword}
                onChange={(e) => setAdminCustomPassword(e.target.value)}
                placeholder="Masukkan kata sandi untuk guru ini"
                className="w-full rounded-lg border border-slate-300 bg-white pl-3 pr-10 py-2 font-mono text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#193D9B]/15 focus:border-[#193D9B] transition"
              />
              <button
                type="button"
                onClick={() => setShowPasswordEye((prev) => !prev)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                aria-label={showPasswordEye ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                title={showPasswordEye ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
              >
                {showPasswordEye ? (
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
            <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
              💡 Kata sandi tidak digenerate secara acak. Admin bebas menentukan kata sandi (misalnya sesuai NIP atau format baku instansi) agar mudah diingat oleh guru.
            </p>
          </div>

          {/* Tombol Aksi */}
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsPasswordModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer transition-all"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmittingPassword}
              className="px-4 py-2 rounded-xl bg-[#193D9B] hover:bg-[#153280] text-white text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50"
            >
              {isSubmittingPassword ? 'Menyimpan...' : 'Simpan Kata Sandi'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
