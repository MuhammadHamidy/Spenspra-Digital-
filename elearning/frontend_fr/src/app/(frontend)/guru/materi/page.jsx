'use client';

import React, { useState, useEffect } from 'react';
import Card from '@/components/Card';
import Button from '@/components/Button';
import Input from '@/components/Input';
import Modal from '@/components/Modal';
import ConfirmModal from '@/components/ConfirmModal';
import AppIcon from '@/components/AppIcon';
import { elearningApi } from '@/lib/elearningApi';
import { tokenStorage } from '@/lib/common/tokenStorage';

export default function TeacherMaterialsManagementPage() {
  const [user, setUser] = useState(null);
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [subjects, setSubjects] = useState([]);
  const [classes, setClasses] = useState([]);

  // Form State
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('Matematika');
  const [subjectCode, setSubjectCode] = useState('MAT');
  const [className, setClassName] = useState('7A');
  const [type, setType] = useState('PDF');
  const [description, setDescription] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Ya, Hapus',
    cancelText: 'Batal',
    isDanger: true,
    onConfirm: null,
  });

  useEffect(() => {
    setUser(tokenStorage.getUser());
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const currentUser = tokenStorage.getUser();
      const [matData, teacherScope] = await Promise.all([
        elearningApi.getMaterials(),
        elearningApi.getTeacherScope(currentUser),
      ]);
      setMaterials(matData || []);
      const validSubjects = teacherScope?.subjects || [];
      const validClasses = teacherScope?.classes || [];
      setSubjects(validSubjects);
      setClasses(validClasses);
      if (validSubjects.length > 0) {
        setSubject(validSubjects[0].name);
        setSubjectCode(validSubjects[0].code);
      }
      if (validClasses.length > 0) {
        setClassName(validClasses[0].name);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadMaterials = async () => {
    try {
      const data = await elearningApi.getMaterials();
      setMaterials(data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const handleOpenCreateModal = () => {
    const defaultSubj = subjects[0] || { name: 'Informatika', code: 'INF' };
    setTitle('');
    setSubject(defaultSubj.name);
    setSubjectCode(defaultSubj.code);
    setClassName(classes[0]?.name || '9A');
    setType('PDF');
    setDescription('');
    setFileUrl('');
    setIsModalOpen(true);
  };

  const handleSaveMaterial = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('Judul materi wajib diisi!');
      return;
    }

    setIsSubmitting(true);
    try {
      await elearningApi.createMaterial({
        title,
        subject,
        subjectCode,
        className,
        teacherName: user?.fullName || user?.full_name || 'Bapak/Ibu Guru',
        type,
        description,
        fileUrl: fileUrl || (type === 'VIDEO' ? 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' : '/docs/modul-pembelajaran.pdf'),
        fileName: type === 'VIDEO' ? null : `${title.replace(/\s+/g, '_')}.pdf`,
      });
      setIsModalOpen(false);
      loadMaterials();
    } catch (err) {
      alert('Gagal menyimpan materi: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (id, title) => {
    setConfirmModal({
      isOpen: true,
      title: 'Hapus Materi Pembelajaran',
      message: `Apakah Anda yakin ingin menghapus materi: "${title}"?\nSiswa tidak akan dapat mengakses materi ini lagi.`,
      confirmText: 'Ya, Hapus Materi',
      cancelText: 'Batal',
      isDanger: true,
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        try {
          await elearningApi.deleteMaterial(id);
          loadMaterials();
        } catch (err) {
          console.error('Gagal menghapus materi:', err);
        }
      },
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 tracking-tight">
            Kelola Materi Pembelajaran Kelas
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 mt-0.5">
            Publikasikan bahan ajar modul PDF, tautan video, atau materi presentasi untuk dipelajari siswa.
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          onClick={handleOpenCreateModal}
          className="w-full sm:w-auto justify-center shadow-sm flex items-center gap-1.5 whitespace-nowrap shrink-0"
        >
          <AppIcon name="circle-add" color="white" size={16} />
          <span>Tambah Materi Baru</span>
        </Button>
      </div>

      {/* MOBILE VIEW (< md): Responsive Cards */}
      <div className="md:hidden space-y-3">
        {loading ? (
          <Card className="p-8 text-center text-xs text-neutral-400 border border-neutral-200 bg-white">
            Memuat daftar materi...
          </Card>
        ) : materials.length === 0 ? (
          <Card className="p-8 text-center text-xs text-neutral-400 border border-neutral-200 bg-white">
            Belum ada materi pembelajaran yang diunggah.
          </Card>
        ) : (
          materials.map((m) => (
            <Card key={m.id} noPadding className="p-4 border border-neutral-200 bg-white space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-neutral-100 text-neutral-700">
                      {m.type}
                    </span>
                    <span className="text-xs font-bold text-primary-600">{m.subject}</span>
                    <span className="text-neutral-300">•</span>
                    <span className="text-xs text-neutral-600 font-medium">Kelas {m.className}</span>
                  </div>
                  <p className="font-bold text-sm text-neutral-900 break-words pt-1">{m.title}</p>
                  {m.description && (
                    <p className="text-xs text-neutral-500 line-clamp-2">{m.description}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-neutral-100 text-xs">
                <span className="text-neutral-400">
                  {new Date(m.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
                <button
                  type="button"
                  onClick={() => handleDelete(m.id, m.title)}
                  className="px-2.5 py-1.5 rounded-lg border border-rose-200 bg-rose-50/70 text-rose-700 hover:bg-rose-100 transition-colors font-bold text-xs cursor-pointer flex items-center gap-1 whitespace-nowrap"
                >
                  <AppIcon name="delete" color="red" size={13} />
                  <span>Hapus</span>
                </button>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* DESKTOP VIEW (>= md): Materials Table */}
      <Card noPadding className="hidden md:block overflow-hidden border border-neutral-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-neutral-50 text-neutral-500 font-bold border-b border-neutral-200 uppercase text-[10px] tracking-wider">
                <th className="py-3 px-4">Judul Materi</th>
                <th className="py-3 px-4 whitespace-nowrap">Mata Pelajaran</th>
                <th className="py-3 px-4 whitespace-nowrap">Rombel</th>
                <th className="py-3 px-4 whitespace-nowrap">Tipe Berkas</th>
                <th className="py-3 px-4 whitespace-nowrap">Tanggal Unggah</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-neutral-400">
                    Memuat daftar materi...
                  </td>
                </tr>
              ) : materials.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-neutral-400">
                    Belum ada materi pembelajaran yang diunggah.
                  </td>
                </tr>
              ) : (
                materials.map((m) => (
                  <tr key={m.id} className="hover:bg-neutral-50/80 transition-colors">
                    <td className="py-3 px-4 font-semibold text-neutral-900">
                      <div className="space-y-0.5">
                        <p className="truncate max-w-[260px]">{m.title}</p>
                        <p className="text-[11px] text-neutral-400 truncate max-w-[260px]">{m.description}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-primary-600 font-bold whitespace-nowrap">{m.subject}</td>
                    <td className="py-3 px-4 font-medium text-neutral-600 whitespace-nowrap">Kelas {m.className}</td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded-[999px] text-[10px] font-bold bg-neutral-100 text-neutral-700">
                        {m.type}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-neutral-500 whitespace-nowrap">
                      {new Date(m.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handleDelete(m.id, m.title)}
                        className="px-2.5 py-1.5 rounded-lg border border-rose-200 bg-rose-50/60 text-rose-700 hover:bg-rose-100 transition-colors font-bold text-xs cursor-pointer inline-flex items-center gap-1 whitespace-nowrap"
                      >
                        <AppIcon name="delete" color="red" size={13} />
                        <span>Hapus</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Create Material Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => !isSubmitting && setIsModalOpen(false)}
        title="Tambah Materi Pembelajaran"
        size="lg"
      >
        <form onSubmit={handleSaveMaterial} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-neutral-800">Judul Materi</label>
            <Input
              type="text"
              placeholder="Contoh: Bab 2 - Sistem Peredaran Darah Manusia"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-neutral-800">Mata Pelajaran</label>
              <select
                value={subject}
                onChange={(e) => {
                  setSubject(e.target.value);
                  const matched = subjects.find((s) => s.name === e.target.value);
                  setSubjectCode(matched?.code || 'MAPEL');
                }}
                className="w-full text-xs p-2.5 rounded-[8px] border border-neutral-300 bg-white"
              >
                {subjects.map((s) => (
                  <option key={s.id || s.code} value={s.name}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-neutral-800">Rombongan Belajar (Kelas)</label>
              <select
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                className="w-full text-xs p-2.5 rounded-[8px] border border-neutral-300 bg-white"
              >
                <option value="Semua">Semua Kelas</option>
                {classes.map((cls) => (
                  <option key={cls.id || cls.name} value={cls.name}>
                    Kelas {cls.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-neutral-800">Tipe Berkas / Format</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full text-xs p-2.5 rounded-[8px] border border-neutral-300 bg-white"
              >
                <option value="PDF">Dokumen Modul (PDF)</option>
                <option value="VIDEO">Video Pembelajaran (YouTube/Link)</option>
                <option value="SLIDE">Slide Presentasi (PPTX)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-neutral-800">Tautan Berkas / Video</label>
              <Input
                type="text"
                placeholder="https://... atau /docs/modul.pdf"
                value={fileUrl}
                onChange={(e) => setFileUrl(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-neutral-800">Deskripsi & Instruksi Siswa</label>
            <textarea
              rows={3}
              placeholder="Jelaskan ringkasan materi atau arahan belajar siswa..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full text-xs p-2.5 rounded-[8px] border border-neutral-300 focus:outline-hidden focus:border-primary-500"
            />
          </div>

          <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2 pt-3 border-t border-neutral-100">
            <Button
              type="button"
              variant="outline"
              size="md"
              className="w-full sm:w-auto min-h-[42px]"
              disabled={isSubmitting}
              onClick={() => setIsModalOpen(false)}
            >
              Batal
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              className="w-full sm:w-auto min-h-[42px] font-bold"
              loading={isSubmitting}
            >
              Simpan & Terbitkan
            </Button>
          </div>
        </form>
      </Modal>

      {/* Confirmation Modal */}
      <ConfirmModal
        {...confirmModal}
        onCancel={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
