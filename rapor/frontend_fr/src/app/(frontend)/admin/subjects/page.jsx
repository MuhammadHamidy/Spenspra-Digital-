'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Modal from '@/components/Modal';
import ConfirmModal from '@/components/ConfirmModal';
import { courseApiAdapter } from '@/lib/features/courses/infrastructure/courseApiAdapter';
import {
  getRawOrderedSubjects,
  getOrderedRaporSubjects,
  saveOrderedRaporSubjects,
  resetOrderedRaporSubjects,
} from '@/lib/raporSubjectConfig';

const EMPTY_COURSE = {
  id: '',
  code: '',
  name: '',
  sks: 2,
  description: '',
  isMulok: false,
};

export default function SubjectsManagementPage() {
  const [courses, setCourses] = useState([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [hasUnsavedOrder, setHasUnsavedOrder] = useState(false);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState(null); // { title, message, onConfirm, type }

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [formCode, setFormCode] = useState('');
  const [formName, setFormName] = useState('');
  const [formSks, setFormSks] = useState(2);
  const [formDescription, setFormDescription] = useState('');
  const [formIsMulok, setFormIsMulok] = useState(false);
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadCourses = async () => {
    setIsLoading(true);
    try {
      const list = await courseApiAdapter.getAll();
      const dbList = Array.isArray(list) ? list : [];

      // Dapatkan susunan urutan tersimpan (atau bawaan standar)
      const rawOrdered = getRawOrderedSubjects();
      const sorted = [];
      const usedCodes = new Set();

      rawOrdered.forEach((item) => {
        const itemCode = (item.code || '').toUpperCase();
        const matchingDb = dbList.find(
          (c) => (c.code || '').toUpperCase() === itemCode
        );

        if (matchingDb) {
          sorted.push({
            ...matchingDb,
            isMulok: Boolean(item.isMulok),
          });
          usedCodes.add(itemCode);
        } else {
          // Tetap sertakan jika ada di konfigurasi urutan rapor resmi
          sorted.push({
            id: `crs-${itemCode.toLowerCase()}`,
            code: itemCode,
            name: item.name,
            sks: item.sks || 2,
            description: item.description || '',
            isMulok: Boolean(item.isMulok),
          });
          usedCodes.add(itemCode);
        }
      });

      // Tambahkan mapel DB baru yang belum terdaftar di urutan sebelumnya
      dbList.forEach((c) => {
        const cCode = (c.code || '').toUpperCase();
        if (!usedCodes.has(cCode)) {
          sorted.push({
            ...c,
            isMulok: false,
          });
        }
      });

      setCourses(sorted);
      setHasUnsavedOrder(false);
    } catch (err) {
      setError(err?.message || 'Gagal memuat daftar mata pelajaran.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCourses();
  }, []);

  const filteredCourses = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return courses;
    return courses.filter(
      (c) =>
        (c.code || '').toLowerCase().includes(q) ||
        (c.name || '').toLowerCase().includes(q) ||
        (c.description || '').toLowerCase().includes(q)
    );
  }, [courses, search]);

  // Kalkulasi pratinjau lembar cetak rapor berdasarkan urutan aktif
  const printPreviewRows = useMemo(() => {
    return getOrderedRaporSubjects(courses);
  }, [courses]);

  // Operasi Geser Urutan (Naik / Turun)
  const moveCourseUp = (index) => {
    if (index <= 0) return;
    setCourses((prev) => {
      const next = [...prev];
      const temp = next[index];
      next[index] = next[index - 1];
      next[index - 1] = temp;
      setHasUnsavedOrder(true);
      return next;
    });
  };

  const moveCourseDown = (index) => {
    setCourses((prev) => {
      if (index >= prev.length - 1) return prev;
      const next = [...prev];
      const temp = next[index];
      next[index] = next[index + 1];
      next[index + 1] = temp;
      setHasUnsavedOrder(true);
      return next;
    });
  };

  const handleOrderChangeInput = (currentIndex, targetNumber) => {
    const targetIdx = Number(targetNumber) - 1;
    if (isNaN(targetIdx) || targetIdx < 0 || targetIdx >= courses.length) return;
    if (currentIndex === targetIdx) return;

    setCourses((prev) => {
      const next = [...prev];
      const [movedItem] = next.splice(currentIndex, 1);
      next.splice(targetIdx, 0, movedItem);
      setHasUnsavedOrder(true);
      return next;
    });
  };

  const toggleCourseMulok = (index) => {
    setCourses((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], isMulok: !next[index].isMulok };
      setHasUnsavedOrder(true);
      return next;
    });
  };

  const handleSaveOrder = () => {
    const success = saveOrderedRaporSubjects(courses);
    if (success) {
      setHasUnsavedOrder(false);
      setSuccessMsg(
        'Urutan mata pelajaran berhasil disimpan! Urutan ini otomatis diterapkan pada seluruh cetak rapor siswa (PDF).'
      );
      setTimeout(() => setSuccessMsg(''), 5000);
    } else {
      setError('Gagal menyimpan urutan mata pelajaran.');
    }
  };

  const handleResetOrder = () => {
    setConfirmConfig({
      title: 'Reset Susunan Mata Pelajaran?',
      message: 'Kembalikan tata urutan mata pelajaran ke susunan resmi bawaan SMP Negeri 1 Prambon?',
      confirmText: 'Ya, Reset',
      type: 'warning',
      onConfirm: () => {
        resetOrderedRaporSubjects();
        loadCourses();
        setHasUnsavedOrder(false);
        setSuccessMsg('Urutan mata pelajaran telah direset ke format resmi awal.');
        setTimeout(() => setSuccessMsg(''), 4500);
        setConfirmConfig(null);
      },
    });
  };

  const openCreateModal = () => {
    setEditingCourse(null);
    setFormCode('');
    setFormName('');
    setFormSks(2);
    setFormDescription('Mata Pelajaran Kurikulum SMP Negeri 1 Prambon');
    setFormIsMulok(false);
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (course) => {
    setEditingCourse(course);
    setFormCode(course.code || '');
    setFormName(course.name || '');
    setFormSks(course.sks || 2);
    setFormDescription(course.description || '');
    setFormIsMulok(Boolean(course.isMulok));
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formCode.trim() || !formName.trim()) {
      setFormError('Kode Mapel dan Nama Mata Pelajaran wajib diisi.');
      return;
    }

    setIsSubmitting(true);
    setFormError('');

    try {
      const payload = {
        code: formCode.trim().toUpperCase(),
        name: formName.trim(),
        sks: Number(formSks) || 2,
        description: formDescription.trim(),
      };

      if (editingCourse) {
        await courseApiAdapter.update(editingCourse.id, payload);
        // Perbarui state lokal dengan status mulok
        setCourses((prev) =>
          prev.map((c) =>
            c.id === editingCourse.id || c.code === editingCourse.code
              ? { ...c, ...payload, isMulok: formIsMulok }
              : c
          )
        );
        setSuccessMsg(`Mata pelajaran "${payload.name}" berhasil diperbarui.`);
      } else {
        const createdId = `crs-${payload.code.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
        await courseApiAdapter.create({
          ...payload,
          id: createdId,
        });
        setCourses((prev) => [
          ...prev,
          { ...payload, id: createdId, isMulok: formIsMulok },
        ]);
        setSuccessMsg(`Mata pelajaran "${payload.name}" berhasil ditambahkan ke rapor.`);
      }

      setHasUnsavedOrder(true);
      setIsModalOpen(false);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setFormError(err?.message || 'Gagal menyimpan mata pelajaran.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (course) => {
    setConfirmConfig({
      title: 'Hapus Mata Pelajaran?',
      message: `Hapus mata pelajaran "${course.name}" (${course.code}) dari e-Rapor? Penugasan jadwal terkait mungkin akan terpengaruh.`,
      confirmText: 'Ya, Hapus',
      type: 'danger',
      onConfirm: async () => {
        try {
          if (course.id) {
            await courseApiAdapter.delete(course.id);
          }
          setCourses((prev) => prev.filter((c) => c.code !== course.code));
          setHasUnsavedOrder(true);
          setSuccessMsg(`Mata pelajaran "${course.name}" berhasil dihapus.`);
          setTimeout(() => setSuccessMsg(''), 4000);
        } catch (err) {
          setError(`Gagal menghapus mata pelajaran: ${err.message}`);
        } finally {
          setConfirmConfig(null);
        }
      },
    });
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Kelola & Urutan Mata Pelajaran e-Rapor</span>
            <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-200">
              Format Cetak Resmi
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Atur urutan cetak mata pelajaran kurikulum dan muatan lokal. Urutan di bawah ini akan otomatis muncul saat rapor siswa dicetak.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#193D9B] hover:bg-[#153280] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            <span>Tambah Mapel Baru</span>
          </button>
        </div>
      </div>

      {/* Pesan Sukses / Error */}
      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2 animate-in fade-in">
          <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
          </svg>
          <span>{successMsg}</span>
        </div>
      )}
      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-2 animate-in fade-in">
          <svg className="w-4 h-4 text-rose-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {/* Toolbar Aksi Urutan Rapor */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm shrink-0">
            ⇅
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-slate-900">
                Pengaturan Susunan Urutan Cetak Rapor
              </h3>
              {hasUnsavedOrder && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 animate-pulse">
                  Urutan Belum Disimpan
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Gunakan tombol naik (▲) atau turun (▼) pada tabel untuk memindahkan posisi mapel pada lembar cetak rapor.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowPrintPreview(!showPrintPreview)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition cursor-pointer"
          >
            <span>{showPrintPreview ? 'Tutup Pratinjau' : '👁️ Pratinjau Urutan Cetak'}</span>
          </button>

          <button
            type="button"
            onClick={handleResetOrder}
            className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-rose-50 text-rose-600 hover:text-rose-700 text-xs font-semibold transition cursor-pointer"
            title="Kembalikan urutan ke format standar bawaan"
          >
            <span>↺ Reset Urutan</span>
          </button>

          <button
            type="button"
            onClick={handleSaveOrder}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold shadow-xs transition cursor-pointer ${
              hasUnsavedOrder
                ? 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white ring-2 ring-emerald-400/50'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
            </svg>
            <span>Simpan Urutan Rapor</span>
          </button>
        </div>
      </div>

      {/* Pratinjau Lembar Cetak Rapor (Expandable) */}
      {showPrintPreview && (
        <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50/70 to-slate-50 border border-indigo-200 shadow-xs space-y-3 animate-in fade-in">
          <div className="flex items-center justify-between border-b border-indigo-200/80 pb-2">
            <div className="flex items-center gap-2">
              <span className="text-base">📄</span>
              <h4 className="text-xs font-bold text-indigo-950">
                Pratinjau Urutan Cetak pada Tabel Nilai Rapor Siswa
              </h4>
            </div>
            <span className="text-[11px] text-indigo-700 font-semibold">
              Total {printPreviewRows.length} Baris Cetak
            </span>
          </div>

          <div className="bg-white rounded-xl border border-indigo-100 overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-indigo-50/50 border-b border-indigo-100 text-indigo-900 font-bold">
                <tr>
                  <th className="py-2 px-3 w-12 text-center">No</th>
                  <th className="py-2 px-3 w-24">Kode</th>
                  <th className="py-2 px-3">Mata Pelajaran di Lembar Rapor</th>
                  <th className="py-2 px-3 w-32 text-center">Kategori</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-indigo-50">
                {printPreviewRows.map((item, idx) => (
                  <tr
                    key={item.code || idx}
                    className={
                      item.isMulokHeader
                        ? 'bg-amber-50/60 font-bold text-amber-900'
                        : item.isMulokItem
                        ? 'bg-indigo-50/20'
                        : 'hover:bg-slate-50'
                    }
                  >
                    <td className="py-1.5 px-3 text-center font-bold text-slate-700">
                      {item.no || (item.sub ? `(${item.sub})` : '')}
                    </td>
                    <td className="py-1.5 px-3 font-mono font-semibold text-indigo-700">
                      {item.code}
                    </td>
                    <td className={`py-1.5 px-3 ${item.isMulokItem ? 'pl-6 text-slate-700' : 'text-slate-900 font-semibold'}`}>
                      {item.name}
                    </td>
                    <td className="py-1.5 px-3 text-center">
                      {item.isMulokHeader ? (
                        <span className="text-[10px] font-bold text-amber-700 uppercase">Header Mulok</span>
                      ) : item.isMulokItem ? (
                        <span className="text-[10px] font-semibold text-purple-700">Muatan Lokal</span>
                      ) : (
                        <span className="text-[10px] font-semibold text-blue-700">Mapel Utama</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Bar Pencarian & Filter */}
      <div className="bg-white border border-slate-200 p-3.5 rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-700">Total Mata Pelajaran:</span>
          <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold text-xs border border-slate-200">
            {courses.length} Mapel
          </span>
          <span className="text-xs text-slate-400">|</span>
          <span className="text-xs text-slate-500">
            {courses.filter((c) => !c.isMulok).length} Mapel Utama • {courses.filter((c) => c.isMulok).length} Muatan Lokal
          </span>
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
              placeholder="Cari kode atau nama mata pelajaran..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#193D9B]/15 focus:border-[#193D9B] transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Tabel Mata Pelajaran dengan Pengaturan Urutan */}
      <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-700">
              <tr>
                <th className="py-3 px-3 font-semibold w-28 text-center">Urutan Rapor</th>
                <th className="py-3 px-3 font-semibold w-20">Kode</th>
                <th className="py-3 px-4 font-semibold">Nama Mata Pelajaran</th>
                <th className="py-3 px-3 font-semibold w-36 text-center">Kategori Rapor</th>
                <th className="py-3 px-3 font-semibold w-24 text-center">Jam / SKS</th>
                <th className="py-3 px-4 font-semibold">Keterangan</th>
                <th className="py-3 px-3 font-semibold w-28 text-center">Status</th>
                <th className="py-3 px-3 text-right font-semibold w-32">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-500">
                    <div className="inline-flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                      <span>Memuat mata pelajaran...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredCourses.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-500">
                    <div className="max-w-xs mx-auto">
                      <p className="font-semibold text-slate-700">Tidak ada mata pelajaran ditemukan</p>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Coba kata kunci lain atau tambahkan mata pelajaran baru.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredCourses.map((course, idx) => {
                  const originalIndex = courses.findIndex((c) => c.code === course.code);
                  const isFirst = originalIndex === 0;
                  const isLast = originalIndex === courses.length - 1;

                  return (
                    <tr
                      key={course.id || course.code || idx}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        course.isMulok ? 'bg-purple-50/20' : ''
                      }`}
                    >
                      {/* Kolom Pengatur Urutan Rapor */}
                      <td className="py-2.5 px-3 text-center">
                        <div className="inline-flex items-center gap-1 bg-slate-100/90 rounded-lg p-0.5 border border-slate-200">
                          <button
                            type="button"
                            disabled={isFirst}
                            onClick={() => moveCourseUp(originalIndex)}
                            className="w-6 h-6 rounded flex items-center justify-center text-slate-700 hover:bg-white hover:text-indigo-700 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer font-bold text-xs transition"
                            title="Geser Naik (Mata pelajaran tampil lebih atas)"
                          >
                            ▲
                          </button>
                          <span className="w-6 text-center font-bold text-xs text-slate-800">
                            {originalIndex + 1}
                          </span>
                          <button
                            type="button"
                            disabled={isLast}
                            onClick={() => moveCourseDown(originalIndex)}
                            className="w-6 h-6 rounded flex items-center justify-center text-slate-700 hover:bg-white hover:text-indigo-700 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer font-bold text-xs transition"
                            title="Geser Turun (Mata pelajaran tampil lebih bawah)"
                          >
                            ▼
                          </button>
                        </div>
                      </td>

                      <td className="py-2.5 px-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded font-mono font-bold text-xs bg-indigo-50 text-indigo-700 border border-indigo-200/80">
                          {course.code}
                        </span>
                      </td>

                      <td className="py-2.5 px-4">
                        <span className="font-bold text-slate-900 block text-xs">{course.name}</span>
                        {course.id && (
                          <span className="text-[10px] text-slate-400 font-mono">ID: {course.id}</span>
                        )}
                      </td>

                      {/* Kategori Rapor (Mapel Utama vs Muatan Lokal) */}
                      <td className="py-2.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => toggleCourseMulok(originalIndex)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border transition cursor-pointer ${
                            course.isMulok
                              ? 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100'
                              : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                          }`}
                          title="Klik untuk mengubah kategori antara Mapel Utama dan Muatan Lokal"
                        >
                          <span>{course.isMulok ? '🎨 Muatan Lokal' : '📘 Mapel Utama'}</span>
                        </button>
                      </td>

                      <td className="py-2.5 px-3 text-center tabular-nums font-semibold text-slate-700">
                        {course.sks || 2} Jam
                      </td>

                      <td className="py-2.5 px-4 text-slate-600 text-[11px]">
                        {course.description || (
                          <span className="text-slate-400 italic">Mata Pelajaran Kurikulum SMPN 1 Prambon</span>
                        )}
                      </td>

                      <td className="py-2.5 px-3 text-center">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Aktif Rapor
                        </span>
                      </td>

                      <td className="py-2.5 px-3 text-right">
                        <div className="flex justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => openEditModal(course)}
                            className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs cursor-pointer transition"
                            title="Ubah nama atau kode mata pelajaran"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(course)}
                            className="px-2 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-semibold text-xs cursor-pointer transition"
                            title="Hapus mata pelajaran dari rapor"
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

      {/* Modal Tambah / Edit Mata Pelajaran */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCourse ? `Edit Mata Pelajaran: ${editingCourse.name}` : 'Tambah Mata Pelajaran Baru'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Kode Mapel <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formCode}
                onChange={(e) => setFormCode(e.target.value)}
                placeholder="Misal: BJ, BTQ, INF"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 uppercase"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nama Mata Pelajaran <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Misal: Bahasa Jawa, Baca Tulis Al-Qur'an (BTQ)"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Alokasi Jam Belajar / Minggu
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={formSks}
                onChange={(e) => setFormSks(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#193D9B]/15 focus:border-[#193D9B]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Keterangan / Kategori
              </label>
              <input
                type="text"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Misal: Muatan Lokal Daerah, Wajib Kurikulum Merdeka"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#193D9B]/15 focus:border-[#193D9B]"
              />
            </div>
          </div>

          {/* Opsi Kategori Muatan Lokal */}
          <div className="p-3 rounded-xl bg-purple-50/70 border border-purple-200 flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-bold text-purple-900">Kelompokkan sebagai Muatan Lokal (Mulok)</div>
              <div className="text-[11px] text-purple-700 mt-0.5">
                Jika diaktifkan, mata pelajaran ini otomatis tercetak pada sub-bagian Muatan Lokal (a, b, c...) di lembar rapor.
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formIsMulok}
                onChange={(e) => setFormIsMulok(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
            </label>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-start gap-2">
            <svg className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="leading-relaxed">
              Mata pelajaran yang disimpan akan langsung tersedia di menu <strong>Pengampu Mata Pelajaran per Kelas</strong> dan format cetak lembar rapor.
            </span>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium cursor-pointer transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl bg-[#193D9B] hover:bg-[#153280] text-white text-xs font-semibold transition-colors shadow-xs cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? 'Menyimpan...' : editingCourse ? 'Simpan Perubahan' : 'Tambahkan Mapel'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Konfirmasi Kustom */}
      <ConfirmModal
        isOpen={Boolean(confirmConfig)}
        title={confirmConfig?.title || 'Konfirmasi'}
        message={confirmConfig?.message || ''}
        confirmText={confirmConfig?.confirmText || 'Konfirmasi'}
        cancelText="Batal"
        type={confirmConfig?.type || 'danger'}
        onConfirm={confirmConfig?.onConfirm || (() => {})}
        onCancel={() => setConfirmConfig(null)}
      />
    </div>
  );
}
