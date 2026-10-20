'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Card from '@/components/Card';
import Button from '@/components/Button';
import StatusBadge from '@/components/StatusBadge';
import Modal from '@/components/Modal';
import Input from '@/components/Input';
import { elearningApi } from '@/lib/elearningApi';
import { tokenStorage } from '@/lib/common/tokenStorage';

export default function StudentAssignmentsPage() {
  const [user, setUser] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ALL'); // 'ALL' | 'ACTIVE' | 'SUBMITTED'
  const [selectedAssignment, setSelectedAssignment] = useState(null);

  // Submission Form State
  const [submissionNotes, setSubmissionNotes] = useState('');
  const [submissionFile, setSubmissionFile] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    const currentUser = tokenStorage.getUser();
    setUser(currentUser);
    loadAssignments();
  }, []);

  const loadAssignments = async () => {
    setLoading(true);
    try {
      const data = await elearningApi.getAssignments();
      setAssignments(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filteredAssignments = useMemo(() => {
    return assignments.filter((item) => {
      if (activeTab === 'ACTIVE') return item.status === 'ACTIVE';
      if (activeTab === 'SUBMITTED') return item.status === 'COMPLETED' || item.submittedCount > 0;
      return true;
    });
  }, [assignments, activeTab]);

  const handleOpenSubmitModal = (item) => {
    setSelectedAssignment(item);
    setSubmissionNotes('');
    setSubmissionFile('');
    setSuccessMessage('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!submissionNotes.trim() && !submissionFile.trim()) {
      alert('Harap isi catatan pengerjaan atau cantumkan tautan/nama berkas tugas!');
      return;
    }

    setIsSubmitting(true);
    try {
      await elearningApi.submitAssignment(selectedAssignment.id, {
        studentId: user?.id || 'std-demo',
        studentName: user?.fullName || user?.full_name || 'Siswa Spenspra',
        notes: submissionNotes,
        fileUrl: submissionFile,
      });
      setSuccessMessage('Tugas berhasil dikumpulkan ke guru pengampu!');
      setTimeout(() => {
        setSelectedAssignment(null);
        loadAssignments();
      }, 1500);
    } catch (err) {
      alert('Gagal mengumpulkan tugas: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 tracking-tight">
            Tugas Mandiri & Penugasan
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 mt-0.5">
            Periksa tenggat waktu tugas kelas, unduh lembar kerja, dan kumpulkan hasil pengerjaan tepat waktu.
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-neutral-200 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('ALL')}
          className={`px-3 py-1.5 rounded-[8px] text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'ALL'
              ? 'bg-primary-500 text-white shadow-2xs'
              : 'text-neutral-600 hover:bg-neutral-100'
          }`}
        >
          Semua Tugas ({assignments.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('ACTIVE')}
          className={`px-3 py-1.5 rounded-[8px] text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'ACTIVE'
              ? 'bg-primary-500 text-white shadow-2xs'
              : 'text-neutral-600 hover:bg-neutral-100'
          }`}
        >
          Perlu Dikerjakan
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('SUBMITTED')}
          className={`px-3 py-1.5 rounded-[8px] text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'SUBMITTED'
              ? 'bg-primary-500 text-white shadow-2xs'
              : 'text-neutral-600 hover:bg-neutral-100'
          }`}
        >
          Sudah Dikumpulkan
        </button>
      </div>

      {/* Assignment List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 bg-neutral-100 rounded-[12px] animate-pulse" />
          ))}
        </div>
      ) : filteredAssignments.length === 0 ? (
        <Card noPadding className="p-12 text-center">
          <p className="text-sm font-bold text-neutral-700">Tidak ada tugas pada kategori ini</p>
          <p className="text-xs text-neutral-500 mt-1">Semua tugas telah diselesaikan atau belum ada tugas baru dari guru.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredAssignments.map((item) => {
            const isDueSoon = new Date(item.dueDate) - new Date() < 1000 * 60 * 60 * 48; // Kurang dari 2 hari
            const isCompleted = item.status === 'COMPLETED';

            return (
              <Card
                key={item.id}
                noPadding
                className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-primary-300 transition-colors"
              >
                <div className="space-y-2 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2 py-0.5 rounded-[999px] bg-secondary-100 text-secondary-700 text-[10px] font-bold">
                      {item.subject} ({item.subjectCode})
                    </span>
                    <span className="px-2 py-0.5 rounded-[999px] bg-neutral-100 text-neutral-600 text-[10px] font-semibold">
                      Kelas {item.className}
                    </span>
                    <StatusBadge
                      status={isCompleted ? 'COMPLETED' : 'ACTIVE'}
                      label={isCompleted ? 'Selesai' : 'Aktif'}
                    />
                  </div>

                  <h3 className="text-sm sm:text-base font-bold text-neutral-900 truncate">
                    {item.title}
                  </h3>

                  <p className="text-xs text-neutral-500 line-clamp-2 leading-relaxed">
                    {item.description}
                  </p>

                  <div className="flex flex-wrap items-center gap-4 text-[11px] text-neutral-500 pt-1">
                    <span className="flex items-center gap-1 font-medium text-neutral-600">
                      Oleh: {item.teacherName}
                    </span>
                    <span className={`flex items-center gap-1 ${isDueSoon && !isCompleted ? 'text-danger-600 font-bold' : ''}`}>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Tenggat: {new Date(item.dueDate).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} WIB
                    </span>
                    <span>Nilai Maks: {item.maxScore} Poin</span>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  {item.attachmentUrl && (
                    <a href={item.attachmentUrl} target="_blank" rel="noreferrer">
                      <Button variant="outline" size="sm">
                        <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Lembar Kerja
                      </Button>
                    </a>
                  )}

                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleOpenSubmitModal(item)}
                  >
                    <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l4-4m0 0l4 4m-4-4v12" />
                    </svg>
                    Kumpulkan Tugas
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Submission Modal */}
      <Modal
        isOpen={Boolean(selectedAssignment)}
        onClose={() => !isSubmitting && setSelectedAssignment(null)}
        title="Pengumpulan Lembar Tugas"
        subtitle={selectedAssignment ? `${selectedAssignment.title} (${selectedAssignment.subject})` : ''}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {successMessage && (
            <div className="p-3 rounded-[8px] bg-success-50 border border-success-200 text-success-700 text-xs font-semibold flex items-center gap-2">
              <svg className="w-4 h-4 text-success-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
              <span>{successMessage}</span>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-bold text-neutral-800">
              Catatan / Jawaban Teks Singkat
            </label>
            <textarea
              rows={4}
              placeholder="Tuliskan jawaban atau catatan untuk guru mengenai pengerjaan tugas Anda di sini..."
              value={submissionNotes}
              onChange={(e) => setSubmissionNotes(e.target.value)}
              className="w-full text-xs p-3 rounded-[6px] border border-neutral-300 focus:outline-hidden focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-neutral-800">
              Lampiran Tautan / Berkas Drive (Opsional)
            </label>
            <Input
              type="text"
              placeholder="Contoh: https://drive.google.com/... atau Nama_File.pdf"
              value={submissionFile}
              onChange={(e) => setSubmissionFile(e.target.value)}
              className="text-xs"
            />
            <p className="text-[11px] text-neutral-400">
              Anda dapat mengunggah dokumen PDF, foto catatan, atau menyertakan tautan Google Drive / Canva.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100">
            <Button
              type="button"
              variant="outline"
              size="md"
              disabled={isSubmitting}
              onClick={() => setSelectedAssignment(null)}
            >
              Batal
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={isSubmitting}
            >
              Kirim Jawaban
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
