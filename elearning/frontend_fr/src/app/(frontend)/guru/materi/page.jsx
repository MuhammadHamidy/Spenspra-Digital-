'use client';

import React, { useState, useEffect } from 'react';
import Card from '@/components/Card';
import Button from '@/components/Button';
import Input from '@/components/Input';
import Modal from '@/components/Modal';
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

  useEffect(() => {
    setUser(tokenStorage.getUser());
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [matData, subjData, clsData] = await Promise.all([
        elearningApi.getMaterials(),
        elearningApi.getSubjects(),
        elearningApi.getClasses(),
      ]);
      setMaterials(matData || []);
      setSubjects(subjData || []);
      setClasses(clsData || []);
      if (subjData && subjData.length > 0) {
        setSubject(subjData[0].name);
        setSubjectCode(subjData[0].code);
      }
      if (clsData && clsData.length > 0) {
        setClassName(clsData[0].name);
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
    const defaultSubj = subjects[0] || { name: 'Matematika', code: 'MAT' };
    setTitle('');
    setSubject(defaultSubj.name);
    setSubjectCode(defaultSubj.code);
    setClassName('7A');
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

  const handleDelete = async (id, title) => {
    if (!confirm(`Hapus materi: "${title}"?`)) return;
    try {
      await elearningApi.deleteMaterial(id);
      loadMaterials();
    } catch (err) {
      alert('Gagal menghapus: ' + err.message);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
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
          className="shadow-sm"
        >
          + Tambah Materi Baru
        </Button>
      </div>

      {/* Materials Table */}
      <Card noPadding className="overflow-hidden border border-neutral-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-neutral-50 text-neutral-500 font-bold border-b border-neutral-200 uppercase text-[10px] tracking-wider">
                <th className="py-3 px-4">Judul Materi</th>
                <th className="py-3 px-4">Mata Pelajaran</th>
                <th className="py-3 px-4">Rombel</th>
                <th className="py-3 px-4">Tipe Berkas</th>
                <th className="py-3 px-4">Tanggal Unggah</th>
                <th className="py-3 px-4 text-right">Aksi</th>
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
                    <td className="py-3 px-4 text-primary-600 font-bold">{m.subject}</td>
                    <td className="py-3 px-4 font-medium text-neutral-600">Kelas {m.className}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-[999px] text-[10px] font-bold bg-neutral-100 text-neutral-700">
                        {m.type}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-neutral-500">
                      {new Date(m.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleDelete(m.id, m.title)}
                        className="px-2 py-1 rounded-[6px] text-danger-600 hover:bg-danger-50 transition-colors font-medium text-xs cursor-pointer"
                      >
                        Hapus
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
    </div>
  );
}
