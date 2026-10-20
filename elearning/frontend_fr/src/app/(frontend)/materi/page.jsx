'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Card from '@/components/Card';
import Button from '@/components/Button';
import Input from '@/components/Input';
import Modal from '@/components/Modal';
import { elearningApi } from '@/lib/elearningApi';
import { tokenStorage } from '@/lib/common/tokenStorage';

export default function MaterialsPage() {
  const [user, setUser] = useState(null);
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('ALL');
  const [activeVideoModal, setActiveVideoModal] = useState(null);

  useEffect(() => {
    setUser(tokenStorage.getUser());
    loadMaterials();
  }, []);

  const loadMaterials = async () => {
    setLoading(true);
    try {
      const data = await elearningApi.getMaterials();
      setMaterials(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const subjects = useMemo(() => {
    const set = new Set();
    materials.forEach((m) => {
      if (m.subject) set.add(m.subject);
    });
    return Array.from(set);
  }, [materials]);

  const filteredMaterials = useMemo(() => {
    return materials.filter((m) => {
      const matchSubject = selectedSubject === 'ALL' || m.subject === selectedSubject;
      const matchQuery =
        m.title.toLowerCase().includes(search.toLowerCase()) ||
        (m.description && m.description.toLowerCase().includes(search.toLowerCase())) ||
        (m.teacherName && m.teacherName.toLowerCase().includes(search.toLowerCase()));
      return matchSubject && matchQuery;
    });
  }, [materials, selectedSubject, search]);

  const getTypeBadge = (type) => {
    switch (type) {
      case 'VIDEO':
        return <span className="px-2 py-0.5 rounded-[999px] bg-danger-100 text-danger-700 text-[10px] font-bold">Video Pembelajaran</span>;
      case 'SLIDE':
        return <span className="px-2 py-0.5 rounded-[999px] bg-accent-100 text-amber-800 text-[10px] font-bold">Slide PPT</span>;
      case 'PDF':
      default:
        return <span className="px-2 py-0.5 rounded-[999px] bg-secondary-100 text-secondary-700 text-[10px] font-bold">Dokumen Modul</span>;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 tracking-tight">
            Materi Pembelajaran Digital
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 mt-0.5">
            Unduh buku modul, pelajari slide presentasi, dan simak video edukasi resmi guru SMPN 1 Prambon.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <Card noPadding className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white">
        {/* Subject Chips */}
        <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          <button
            type="button"
            onClick={() => setSelectedSubject('ALL')}
            className={`px-3 py-1.5 rounded-[999px] text-xs font-semibold transition-all cursor-pointer ${
              selectedSubject === 'ALL'
                ? 'bg-primary-500 text-white shadow-2xs'
                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
            }`}
          >
            Semua Mapel ({materials.length})
          </button>
          {subjects.map((subj) => (
            <button
              key={subj}
              type="button"
              onClick={() => setSelectedSubject(subj)}
              className={`px-3 py-1.5 rounded-[999px] text-xs font-semibold transition-all cursor-pointer ${
                selectedSubject === subj
                  ? 'bg-primary-500 text-white shadow-2xs'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              {subj}
            </button>
          ))}
        </div>

        {/* Search input */}
        <div className="w-full md:w-72 shrink-0">
          <Input
            type="search"
            placeholder="Cari materi, judul, topik..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="text-xs"
          />
        </div>
      </Card>

      {/* Materials Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-44 bg-neutral-100 rounded-[12px] animate-pulse" />
          ))}
        </div>
      ) : filteredMaterials.length === 0 ? (
        <Card noPadding className="p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-neutral-100 text-neutral-400 mx-auto flex items-center justify-center mb-3">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-sm font-bold text-neutral-700">Tidak ada materi ditemukan</p>
          <p className="text-xs text-neutral-500 mt-1">
            Coba sesuaikan kata kunci pencarian atau pilih filter mata pelajaran yang lain.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMaterials.map((item) => (
            <Card
              key={item.id}
              noPadding
              className="p-5 flex flex-col justify-between hover:border-primary-300 hover:shadow-md transition-all group"
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-primary-500">{item.subject}</span>
                  {getTypeBadge(item.type)}
                </div>

                <h3 className="text-sm font-bold text-neutral-900 group-hover:text-primary-600 transition-colors line-clamp-2">
                  {item.title}
                </h3>

                <p className="text-xs text-neutral-500 line-clamp-3 leading-relaxed">
                  {item.description}
                </p>

                <div className="pt-2 border-t border-neutral-100 flex items-center justify-between text-[11px] text-neutral-400">
                  <span className="truncate max-w-[150px]">
                    Oleh: {item.teacherName || 'Guru Pengampu'}
                  </span>
                  <span>{new Date(item.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span>
                </div>
              </div>

              <div className="pt-4 mt-2">
                {item.type === 'VIDEO' ? (
                  <Button
                    variant="danger"
                    size="sm"
                    className="w-full"
                    onClick={() => setActiveVideoModal(item)}
                  >
                    <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Tonton Video
                  </Button>
                ) : (
                  <a
                    href={item.fileUrl || '#'}
                    target="_blank"
                    rel="noreferrer"
                    className="block"
                  >
                    <Button variant="outline" size="sm" className="w-full">
                      <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Unduh Berkas {item.fileName ? `(${item.fileSize || 'PDF'})` : ''}
                    </Button>
                  </a>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Video Modal */}
      <Modal
        isOpen={Boolean(activeVideoModal)}
        onClose={() => setActiveVideoModal(null)}
        title={activeVideoModal?.title || 'Video Pembelajaran'}
        subtitle={activeVideoModal ? `${activeVideoModal.subject} - ${activeVideoModal.teacherName}` : ''}
        size="lg"
      >
        <div className="space-y-4">
          <div className="aspect-video w-full rounded-[8px] overflow-hidden bg-neutral-900 shadow-sm">
            {activeVideoModal?.videoUrl ? (
              <iframe
                src={activeVideoModal.videoUrl}
                title={activeVideoModal.title}
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white text-xs">
                Video player placeholder
              </div>
            )}
          </div>
          <p className="text-xs text-neutral-600 leading-relaxed">
            {activeVideoModal?.description}
          </p>
        </div>
      </Modal>
    </div>
  );
}
