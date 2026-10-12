'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Modal from '@/components/Modal';
import { classApiAdapter } from '@/lib/features/classes/infrastructure/classApiAdapter';
import { courseApiAdapter } from '@/lib/features/courses/infrastructure/courseApiAdapter';
import { accountApiAdapter } from '@/lib/features/auth/infrastructure/accountApiAdapter';
import Pagination from '@/components/Pagination';

const KELAS_OPTIONS = ['7A', '7B', '7C', '8A', '8B', '8C', '9A', '9B', '9C'];

export default function SubjectAssignmentPage() {
  const [classes, setClasses] = useState([]);
  const [courses, setCourses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [selectedClassFilter, setSelectedClassFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [isSyncingSSO, setIsSyncYingSSO] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formClassCode, setFormClassCode] = useState('7A');
  const [formCourseId, setFormCourseId] = useState('');
  const [formTeacherId, setFormTeacherId] = useState('');
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [classList, courseList, teacherList] = await Promise.all([
        classApiAdapter.getAll(),
        courseApiAdapter.getAll(),
        accountApiAdapter.getTeachers(),
      ]);
      setClasses(Array.isArray(classList) ? classList : []);
      setCourses(Array.isArray(courseList) ? courseList : []);
      setTeachers(Array.isArray(teacherList) ? teacherList : []);
    } catch (err) {
      console.warn('Gagal memuat data pengampu:', err);
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
      alert(res?.message || 'Data master guru & siswa berhasil disinkronkan langsung dari SSO!');
      await loadData();
    } catch (err) {
      alert(err.message || 'Gagal menyinkronkan data dari SSO.');
    } finally {
      setIsSyncingSSO(false);
    }
  };

  const openCreateModal = () => {
    setEditingItem(null);
    setFormClassCode(selectedClassFilter !== 'ALL' ? selectedClassFilter : '7A');
    setFormCourseId(courses[0]?.id || '');
    setFormTeacherId(teachers[0]?.id || '');
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setFormClassCode(item.class_code || '7A');
    setFormCourseId(item.course_id || '');
    setFormTeacherId(item.teacher_id || item.dosen_id || '');
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formClassCode || !formCourseId || !formTeacherId) {
      setFormError('Rombel kelas, mata pelajaran, dan guru pengampu wajib dipilih.');
      return;
    }

    setIsSubmitting(true);
    setFormError('');

    try {
      const payload = {
        class_code: formClassCode.trim(),
        course_id: formCourseId,
        teacher_id: formTeacherId,
        academic_year: '2025/2026',
      };

      if (editingItem) {
        await classApiAdapter.update(editingItem.id, payload);
      } else {
        await classApiAdapter.create(payload);
      }

      await loadData();
      setIsModalOpen(false);
    } catch (err) {
      setFormError(err.message || 'Gagal menyimpan penugasan guru pengampu.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (item) => {
    const courseName = item.course_name || item.course_code || 'Mapel';
    const teacherName = item.teacher_name || 'Guru';
    if (!window.confirm(`Hapus penugasan pengampu ${courseName} di Kelas ${item.class_code} (${teacherName})?`)) {
      return;
    }

    try {
      await classApiAdapter.delete(item.id);
      await loadData();
    } catch (err) {
      alert(`Gagal menghapus penugasan: ${err.message}`);
    }
  };

  // Distinct classes available
  const availableClasses = useMemo(() => {
    const list = [...new Set(classes.map((c) => c.class_code).filter(Boolean))];
    return list.sort();
  }, [classes]);

  // Filtered List
  const filteredClasses = useMemo(() => {
    return classes.filter((item) => {
      const matchesClass = selectedClassFilter === 'ALL' || item.class_code === selectedClassFilter;
      const term = search.toLowerCase();
      const matchesSearch =
        !search ||
        (item.class_code || '').toLowerCase().includes(term) ||
        (item.course_name || '').toLowerCase().includes(term) ||
        (item.course_code || '').toLowerCase().includes(term) ||
        (item.teacher_name || '').toLowerCase().includes(term);

      return matchesClass && matchesSearch;
    });
  }, [classes, selectedClassFilter, search]);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedClassFilter, search]);

  const paginatedClasses = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredClasses.slice(start, start + pageSize);
  }, [filteredClasses, currentPage, pageSize]);

  // Unique teachers currently assigned
  const assignedTeachersCount = useMemo(() => {
    return new Set(classes.map((c) => c.teacher_id || c.dosen_id).filter(Boolean)).size;
  }, [classes]);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="border-b border-slate-200 pb-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Kelola Pengampu Mata Pelajaran per Kelas
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Penetapan guru pengampu untuk setiap rombel kelas. Satu guru dapat mengampu lebih dari satu mata pelajaran di rombel yang sama maupun rombel berbeda.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleSyncFromSSO}
            disabled={isSyncingSSO}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer"
            title="Tarik seluruh data guru pengampu dari Master Data SSO"
          >
            <svg className={`w-4 h-4 ${isSyncingSSO ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>{isSyncingSSO ? 'Menyinkronkan...' : 'Sinkronkan Data dari SSO'}</span>
          </button>

          <button
            type="button"
            onClick={openCreateModal}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            <span>Tetapkan Pengampu Mapel</span>
          </button>
        </div>
      </div>

      {/* Metric Cards Ringkasan */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="text-xs font-semibold text-slate-500">Total Penugasan Mapel</div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-900">{classes.length}</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">Seluruh rombel yang telah memiliki pengampu</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="text-xs font-semibold text-slate-500">Rombel Aktif</div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-900">{availableClasses.length || 0}</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">Rombongan belajar terdaftar di sistem</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="text-xs font-semibold text-slate-500">Guru Pengampu Bertugas</div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-900">{assignedTeachersCount}</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">Guru yang mendapat plotting mapel</p>
        </div>
      </div>

      {/* Filter Rombel & Search Bar */}
      <div className="bg-white border border-slate-200/90 p-4 rounded-xl flex flex-wrap items-center justify-between gap-3 shadow-xs">
        {/* Pills Filter Rombel */}
        <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto">
          <button
            type="button"
            onClick={() => setSelectedClassFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              selectedClassFilter === 'ALL'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Semua Rombel ({classes.length})
          </button>
          {(availableClasses.length > 0 ? availableClasses : KELAS_OPTIONS).map((cls) => {
            const count = classes.filter((c) => c.class_code === cls).length;
            return (
              <button
                key={cls}
                type="button"
                onClick={() => setSelectedClassFilter(cls)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  selectedClassFilter === cls
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span>Kelas {cls}</span>
                {count > 0 && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                      selectedClassFilter === cls ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Input Pencarian */}
        <div className="w-full sm:w-72">
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              type="text"
              placeholder="Cari mapel atau guru..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
            />
          </div>
        </div>
      </div>

      {/* Tabel Pengampu Mata Pelajaran */}
      <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-700">
              <tr>
                <th className="py-3 px-4 font-semibold w-12 text-center">No</th>
                <th className="py-3 px-4 font-semibold">Rombel / Kelas</th>
                <th className="py-3 px-4 font-semibold">Kode Mapel</th>
                <th className="py-3 px-4 font-semibold">Mata Pelajaran</th>
                <th className="py-3 px-4 font-semibold">Guru Pengampu</th>
                <th className="py-3 px-4 font-semibold">Status e-Rapor</th>
                <th className="py-3 px-4 text-right font-semibold">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-500">
                    <div className="inline-flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                      <span>Memuat data pengampu mata pelajaran...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredClasses.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-500">
                    Belum ada pengampu mata pelajaran yang sesuai filter.
                  </td>
                </tr>
              ) : (
                paginatedClasses.map((item, idx) => {
                  const itemNo = (currentPage - 1) * pageSize + idx + 1;
                  return (
                    <tr key={item.id || idx} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 text-center font-medium text-slate-400">{itemNo}</td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 font-bold border border-indigo-200 text-xs">
                          Kelas {item.class_code}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-600">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 text-[11px]">
                          {item.course_code || '-'}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {item.course_name || '-'}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{item.teacher_name || 'Belum ditentukan'}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-semibold">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Aktif di Rapor
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditModal(item)}
                            className="px-2.5 py-1 rounded-md bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 font-semibold text-xs cursor-pointer transition-colors"
                          >
                            Ubah Pengampu
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(item)}
                            className="px-2.5 py-1 rounded-md bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-semibold text-xs cursor-pointer transition-colors"
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

        {/* Paginasi Jadwal Pengampu */}
        <Pagination
          currentPage={currentPage}
          totalItems={filteredClasses.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setCurrentPage(1);
          }}
          pageSizeOptions={[10, 20, 50]}
          itemLabel="penugasan"
        />
      </div>

      {/* Modal Tetapkan / Ubah Pengampu Mapel */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? 'Ubah Guru Pengampu Mata Pelajaran' : 'Tetapkan Guru Pengampu Mata Pelajaran'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
              {formError}
            </div>
          )}

          {/* Rombel / Kelas */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Rombongan Belajar (Kelas) <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={formClassCode}
              onChange={(e) => setFormClassCode(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
            >
              {KELAS_OPTIONS.map((cls) => (
                <option key={cls} value={cls}>
                  Kelas {cls}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-400 mt-1">
              Pilih kelas siswa tempat mata pelajaran ini diajarkan.
            </p>
          </div>

          {/* Mata Pelajaran */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Mata Pelajaran <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={formCourseId}
              onChange={(e) => setFormCourseId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
            >
              <option value="">-- Pilih Mata Pelajaran --</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  [{course.code}] {course.name}
                </option>
              ))}
            </select>
          </div>

          {/* Guru Pengampu */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Guru Pengampu <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={formTeacherId}
              onChange={(e) => setFormTeacherId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
            >
              <option value="">-- Pilih Guru Pengampu --</option>
              {teachers.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.full_name || teacher.name} {teacher.nim_nip ? `(NIP: ${teacher.nim_nip})` : ''}
                </option>
              ))}
            </select>
            <div className="text-xs text-slate-600 mt-2 bg-slate-50 border border-slate-200 p-2.5 rounded-lg flex items-start gap-2">
              <svg className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="leading-relaxed">
                <strong>Aturan Penugasan:</strong> Seorang guru dapat mengampu lebih dari satu mata pelajaran di rombel ini atau rombel lain. Siswa di rombel ini akan otomatis terhubung ke akun guru saat penginputan nilai USTS & PAS.
              </p>
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
              {isSubmitting ? 'Menyimpan...' : editingItem ? 'Simpan Perubahan' : 'Tetapkan Pengampu'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
