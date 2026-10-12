'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { membersApi } from '@/lib/features/library/api/membersApi';
import { faceApiAdapter } from '@/lib/features/faces/infrastructure/faceApiAdapter';
import { Barcode } from '@/lib/common/barcodeGenerator';
import {
  parseMemberCSV,
  downloadMemberImportTemplate,
  downloadStudentDapodikTemplate,
  SAMPLE_MEMBER_IMPORT_DATA,
} from '@/lib/common/excelHelper';
import CircularProgress from '@mui/material/CircularProgress';
import StudentBarcodeStickerModal from '@/components/StudentBarcodeStickerModal';

export function getMemberRole(m) {
  if (!m) return 'SISWA';
  // Prioritas pertama: field member_type atau role dari database / import
  if (m.member_type) {
    const mt = String(m.member_type).toUpperCase();
    if (mt === 'GURU' || mt.includes('GURU') || mt.includes('TEACHER') || mt.includes('DOSEN') || mt.includes('STAFF')) return 'GURU';
    if (mt === 'SISWA' || mt.includes('SISWA') || mt.includes('STUDENT')) return 'SISWA';
  }
  if (m.role) {
    const r = String(m.role).toUpperCase();
    if (r === 'GURU' || r.includes('GURU') || r.includes('TEACHER') || r.includes('DOSEN') || r.includes('STAFF')) return 'GURU';
    if (r === 'SISWA' || r.includes('SISWA') || r.includes('STUDENT')) return 'SISWA';
  }
  // Fallback: hanya berdasarkan identity_number (NIP) dan nama gelar — BUKAN max_borrow_limit
  const idNum = String(m.identity_number || '').toUpperCase();
  const name = String(m.full_name || '').toUpperCase();
  if (
    idNum.startsWith('NIP') ||
    name.includes(' S.PD') ||
    name.includes(' M.PD') ||
    name.includes('DRA. ') ||
    name.includes('DRS. ')
  ) {
    return 'GURU';
  }
  return 'SISWA';
}

export default function MembersAndEnrollmentPage() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL'); // 'ALL' | 'SISWA' | 'GURU'
  const [biometricFilter, setBiometricFilter] = useState('ALL'); // 'ALL' | 'ENROLLED' | 'NOT_ENROLLED'
  const [selectedMember, setSelectedMember] = useState(null);

  // Barcode Sticker Modal State (Siap di tempel di kartu pelajar)
  const [openBarcodeStickerModal, setOpenBarcodeStickerModal] = useState(false);
  const [barcodeStickerMember, setBarcodeStickerMember] = useState(null);
  const [isBatchSticker, setIsBatchSticker] = useState(false);

  // Multi-select state for bulk delete
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [isSyncingSSO, setIsSyncingSSO] = useState(false);

  // Detail modal state
  const [openDetailModal, setOpenDetailModal] = useState(false);
  const [detailMember, setDetailMember] = useState(null);
  const [detailEditMode, setDetailEditMode] = useState(false);
  const [detailEditForm, setDetailEditForm] = useState({});

  // Photo Upload & Camera Modal State
  const [openUploadModal, setOpenUploadModal] = useState(false);
  const [memberPhotoInputMode, setMemberPhotoInputMode] = useState('upload'); // 'upload' | 'camera'
  const [showAddMemberCam, setShowAddMemberCam] = useState(false);
  const [uploadedImage, setUploadedImage] = useState(null);
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [enrollStatus, setEnrollStatus] = useState(null); // 'success' | 'error' | null
  const [enrollMessage, setEnrollMessage] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);
  const modalFileInputRef = useRef(null);

  // Add Single Member Modal
  const [openAddModal, setOpenAddModal] = useState(false);
  const [newMemberForm, setNewMemberForm] = useState({
    full_name: '',
    member_type: 'SISWA', // 'SISWA' | 'GURU'
    identity_number: '',
    class_name: 'VII-A',
    email: '',
    phone: '',
    max_borrow_limit: 3,
    photo_url: null,
  });

  // Digital Card Modal
  const [openCardModal, setOpenCardModal] = useState(false);

  // Batch Import (Excel/CSV) Modal
  const [openImportModal, setOpenImportModal] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importRows, setImportRows] = useState([]);
  const [isParsingImport, setIsParsingImport] = useState(false);
  const [isCommittingImport, setIsCommittingImport] = useState(false);
  const [importError, setImportError] = useState('');
  const [importDragActive, setImportDragActive] = useState(false);
  const importFileInputRef = useRef(null);

  useEffect(() => {
    loadMembers();
  }, []);

  const loadMembers = async () => {
    setLoading(true);
    try {
      // 1. Bersihkan cache dummy lama jika ada di browser
      if (typeof window !== 'undefined') {
        try {
          const raw = localStorage.getItem('lib_members_data');
          if (raw && (raw.includes('Ahmad Subarjo') || raw.includes('usr-001'))) {
            localStorage.removeItem('lib_members_data');
          }
        } catch (e) {}
      }

      // 2. Ambil data asli dari backend (yang disinkronkan langsung dari Master SSO)
      const data = await membersApi.getMembers();
      let list = Array.isArray(data) ? data : data?.data || [];

      // Gabungkan foto yang diunggah lokal jika ada
      let savedPhotos = {};
      if (typeof window !== 'undefined') {
        try {
          savedPhotos = JSON.parse(localStorage.getItem('lib_member_photos') || '{}');
        } catch (e) {}
      }

      list = list.map((m) => {
        const role = getMemberRole(m);
        const className = m.class_name || (m.address && !m.address.startsWith('Jl.') ? m.address : (role === 'GURU' ? 'Guru Pengajar' : 'VII-A'));
        const photoUrl = savedPhotos[m.id] || m.photo_url || null;
        return {
          ...m,
          member_type: role,
          class_name: className,
          photo_url: photoUrl,
          is_enrolled: Boolean(photoUrl || m.face_vector),
        };
      });

      setMembers(list);
      setSelectedMember(list[0] || null);
    } catch (err) {
      console.error('Failed to load members from backend:', err);
      setMembers([]);
      setSelectedMember(null);
    } finally {
      setLoading(false);
    }
  };

  // Upload image handler
  const handleFileSelect = (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Hanya format file gambar (.jpg, .jpeg, .png, .webp) yang didukung.');
      return;
    }

    setUploadedFileName(file.name);
    setEnrollStatus(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      setUploadedImage(e.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  // Sync all members from SSO Master Data
  const handleSyncFromSSO = async () => {
    setIsSyncingSSO(true);
    try {
      const res = await membersApi.syncFromSSO();
      alert(res?.message || 'Data anggota berhasil disinkronkan langsung dari Master Data SSO!');
      await loadMembers();
    } catch (err) {
      alert(err.message || 'Gagal menyinkronkan data anggota dari SSO.');
    } finally {
      setIsSyncingSSO(false);
    }
  };

  // Open dedicated photo upload modal for a member
  const handleOpenUploadModal = (member) => {
    setSelectedMember(member);
    setUploadedImage(member.photo_url || null);
    setUploadedFileName(member.photo_url ? 'foto_terdaftar.jpg' : '');
    setEnrollStatus(null);
    setEnrollMessage('');
    setOpenUploadModal(true);
  };

  // Open digital card modal for a member
  const handleOpenCardModal = (member) => {
    setSelectedMember(member);
    setOpenCardModal(true);
  };

  // Commit Face Enrollment
  const handleSaveFaceEnrollment = async () => {
    if (!selectedMember) {
      alert('Pilih siswa atau guru terlebih dahulu.');
      return;
    }
    if (!uploadedImage) {
      alert('Silakan pilih atau unggah berkas foto wajah terlebih dahulu.');
      return;
    }

    setIsProcessing(true);
    setEnrollStatus(null);

    try {
      // 1. Extract 128-D vector embedding
      let faceEmbedding = [];
      try {
        const ext = await faceApiAdapter.extractEmbedding(uploadedImage);
        if (ext && ext.embedding) faceEmbedding = ext.embedding;
      } catch (err) {
        console.warn('Face embedding extraction notice:', err);
      }

      // 2. Register to backend API
      try {
        await faceApiAdapter.registerFace({
          user_id: selectedMember.id,
          full_name: selectedMember.full_name,
          nim: selectedMember.identity_number,
          photo_url: uploadedImage,
          face_vector: faceEmbedding,
        });
      } catch (err) {
        console.warn('Backend face register notice (persisted locally):', err);
      }

      // 3. Update state & localStorage
      const updatedList = members.map((m) =>
        m.id === selectedMember.id
          ? { ...m, is_enrolled: true, photo_url: uploadedImage }
          : m
      );

      setMembers(updatedList);
      if (typeof window !== 'undefined') {
        try {
          const savedPhotos = JSON.parse(localStorage.getItem('lib_member_photos') || '{}');
          savedPhotos[selectedMember.id] = uploadedImage;
          localStorage.setItem('lib_member_photos', JSON.stringify(savedPhotos));
        } catch (e) {}
      }

      setSelectedMember((prev) => ({
        ...prev,
        is_enrolled: true,
        photo_url: uploadedImage,
      }));

      setEnrollStatus('success');
      setEnrollMessage(
        `Foto wajah untuk ${selectedMember.full_name} (${selectedMember.member_type}) berhasil didaftarkan sebagai biometrik!`
      );
    } catch (err) {
      setEnrollStatus('error');
      setEnrollMessage(err.message || 'Gagal mendaftarkan biometrik wajah.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Create single member
  const handleCreateNewMember = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        full_name: newMemberForm.full_name,
        identity_number: newMemberForm.identity_number,
        email: newMemberForm.email || `${newMemberForm.identity_number}@sekolah.id`,
        phone: newMemberForm.phone || '-',
        address: newMemberForm.class_name || '-',
        max_borrow_limit: parseInt(newMemberForm.max_borrow_limit, 10) || (newMemberForm.member_type === 'GURU' ? 5 : 3),
      };

      let created;
      try {
        const res = await membersApi.createMember(payload);
        created = res?.data || res;
      } catch (backendErr) {
        console.warn('Backend createMember fallback to local:', backendErr);
        created = {
          id: `usr-${Date.now()}`,
          ...payload,
          member_type: newMemberForm.member_type,
          class_name: newMemberForm.class_name,
        };
      }

      const memberWithExtras = {
        ...created,
        member_code: created?.member_code || (payload.identity_number ? `MBR-${payload.identity_number}` : `MBR-2026-${Date.now().toString().slice(-4)}`),
        member_type: newMemberForm.member_type,
        class_name: newMemberForm.class_name,
        is_enrolled: true,
        photo_url: newMemberForm.photo_url || null,
      };

      const updatedList = [memberWithExtras, ...members];
      setMembers(updatedList);
      if (typeof window !== 'undefined') {
        localStorage.setItem('lib_members_data', JSON.stringify(updatedList));
      }

      setSelectedMember(memberWithExtras);
      setOpenAddModal(false);
      setNewMemberForm({
        full_name: '',
        member_type: 'SISWA',
        identity_number: '',
        class_name: 'VII-A',
        email: '',
        phone: '',
        max_borrow_limit: 3,
        photo_url: null,
      });

      // Otomatis generate & tampilkan stiker barcode kartu pelajar yang siap ditempel
      setBarcodeStickerMember(memberWithExtras);
      setIsBatchSticker(false);
      setOpenBarcodeStickerModal(true);
    } catch (err) {
      alert(err.message || 'Gagal mendaftarkan anggota baru.');
    }
  };

  // Delete single Member
  const handleDeleteMember = async (memberId, memberName) => {
    if (!confirm(`Hapus anggota "${memberName}" dari data perpustakaan?`)) return;
    try {
      await membersApi.deleteMember(memberId);
    } catch (err) {
      console.warn('Backend deleteMember fallback to local:', err);
    }
    const updated = members.filter((m) => m.id !== memberId);
    setMembers(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('lib_members_data', JSON.stringify(updated));
    }
    if (selectedMember?.id === memberId) setSelectedMember(updated[0] || null);
    setSelectedIds((prev) => { const s = new Set(prev); s.delete(memberId); return s; });
    if (detailMember?.id === memberId) setOpenDetailModal(false);
  };

  // Bulk delete selected members
  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Hapus ${selectedIds.size} anggota yang dipilih dari data perpustakaan?`)) return;
    const idsToDelete = Array.from(selectedIds);
    for (const id of idsToDelete) {
      try { await membersApi.deleteMember(id); } catch (e) { console.warn('bulk delete fallback:', e); }
    }
    const updated = members.filter((m) => !selectedIds.has(m.id));
    setMembers(updated);
    setSelectedIds(new Set());
    if (typeof window !== 'undefined') {
      localStorage.setItem('lib_members_data', JSON.stringify(updated));
    }
  };

  // Toggle single row selection
  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id); else s.add(id);
      return s;
    });
  };

  // Toggle select all (from filtered list)
  const toggleSelectAll = () => {
    if (selectedIds.size === filteredMembers.length && filteredMembers.every((m) => selectedIds.has(m.id))) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredMembers.map((m) => m.id)));
    }
  };

  // Open detail modal
  const handleOpenDetailModal = (member) => {
    setDetailMember(member);
    setDetailEditForm({
      full_name: member.full_name || '',
      identity_number: member.identity_number || '',
      class_name: member.class_name || '',
      email: member.email || '',
      phone: member.phone || '',
      member_type: member.member_type || 'SISWA',
      max_borrow_limit: member.max_borrow_limit || 3,
    });
    setDetailEditMode(false);
    setOpenDetailModal(true);
  };

  // Save edit from detail modal
  const handleSaveDetailEdit = async () => {
    if (!detailMember) return;
    const updated = members.map((m) =>
      m.id === detailMember.id
        ? { ...m, ...detailEditForm }
        : m
    );
    setMembers(updated);
    const updatedMember = { ...detailMember, ...detailEditForm };
    setDetailMember(updatedMember);
    if (typeof window !== 'undefined') {
      localStorage.setItem('lib_members_data', JSON.stringify(updated));
    }
    try { await membersApi.updateMember?.(detailMember.id, detailEditForm); } catch (e) {}
    setDetailEditMode(false);
  };

  // -------------------------------------------------------------
  // BATCH IMPORT HANDLERS (EXCEL / CSV)
  // -------------------------------------------------------------
  const processImportFile = async (fileObj) => {
    setImportFile(fileObj);
    setIsParsingImport(true);
    setImportError('');

    try {
      const text = await fileObj.text();
      const parsed = parseMemberCSV(text);
      if (parsed.length === 0) {
        throw new Error('File tidak memiliki data siswa/guru yang valid atau format kolom tidak sesuai.');
      }
      setImportRows(parsed);
    } catch (err) {
      setImportError(err.message || 'Gagal memproses file CSV/Excel.');
      setImportRows([]);
    } finally {
      setIsParsingImport(false);
    }
  };

  const handleUseDemoImportData = () => {
    setImportError('');
    const mapped = SAMPLE_MEMBER_IMPORT_DATA.map((item, idx) => ({
      id: `usr-sample-${Date.now()}-${idx}`,
      full_name: item.NamaLengkap,
      member_type: item.TipeAnggota,
      identity_number: item.NomorIdentitas,
      class_name: item.KelasAtauJabatan,
      email: item.Email,
      phone: item.NomorHP,
      max_borrow_limit: item.BatasPinjam,
      is_enrolled: false,
      photo_url: null,
    }));
    setImportRows(mapped);
    setImportFile({ name: 'sampel_data_siswa_guru.xlsx' });
  };

  const handleCommitImport = async () => {
    if (importRows.length === 0) return;
    setIsCommittingImport(true);
    try {
      const localInserted = [];
      for (const row of importRows) {
        try {
          const res = await membersApi.createMember({
            full_name: row.full_name,
            member_type: row.member_type, // ← kirim peran ke backend
            identity_number: row.identity_number,
            email: row.email || `${row.identity_number}@sekolah.id`,
            phone: row.phone || '-',
            address: row.class_name || '-',
            max_borrow_limit: parseInt(row.max_borrow_limit, 10) || (row.member_type === 'GURU' ? 5 : 3),
          });
          const created = res?.data || res;
          localInserted.push({
            ...row,
            id: created?.id || row.id,
            member_code: created?.member_code || row.member_code,
          });
        } catch (e) {
          console.warn('Importing row to backend fallback:', row.full_name, e);
          // Simpan lokal jika backend gagal
          localInserted.push(row);
        }
      }
      // Gabungkan hasil import langsung ke state (tanpa reload yang membuang member_type)
      setMembers((prev) => {
        const existingIds = new Set(prev.map((m) => m.id));
        const newOnes = localInserted.filter((r) => !existingIds.has(r.id));
        return [...newOnes, ...prev];
      });
      alert(`Berhasil mengimpor ${importRows.length} data siswa & guru ke sistem perpustakaan!`);
      setOpenImportModal(false);
      setImportRows([]);
      setImportFile(null);
    } catch (err) {
      setImportError(err.message || 'Gagal menyimpan data impor.');
    } finally {
      setIsCommittingImport(false);
    }
  };

  // Filtered members by role, biometric status, and search
  const filteredMembers = members.filter((m) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !search ||
      m.full_name?.toLowerCase().includes(q) ||
      m.identity_number?.toLowerCase().includes(q) ||
      m.class_name?.toLowerCase().includes(q) ||
      m.email?.toLowerCase().includes(q) ||
      m.phone?.toLowerCase().includes(q);

    const role = getMemberRole(m);
    const matchesRole = roleFilter === 'ALL' || role === roleFilter;

    const matchesBiometric =
      biometricFilter === 'ALL' ||
      (biometricFilter === 'ENROLLED' && m.is_enrolled) ||
      (biometricFilter === 'NOT_ENROLLED' && !m.is_enrolled);

    return matchesSearch && matchesRole && matchesBiometric;
  });

  const totalMembers = members.length;
  const totalSiswa = members.filter((m) => getMemberRole(m) === 'SISWA').length;
  const totalGuru = members.filter((m) => getMemberRole(m) === 'GURU').length;
  const totalEnrolled = members.filter((m) => m.is_enrolled).length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* 1. Page Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <img src="/icon/student-profile/blue-20.svg" alt="Anggota" width={22} height={22} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                Data Siswa & Guru (Anggota Perpustakaan)
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Kelola data seluruh siswa & guru SMPN 1 Prambon, status biometrik wajah, cetak kartu anggota digital, dan impor massal.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          {/* Sync from SSO Button */}
          <button
            onClick={handleSyncFromSSO}
            disabled={isSyncingSSO}
            className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-md shadow-emerald-600/20"
            title="Tarik dan perbarui data seluruh siswa & guru langsung dari Master Data SSO"
          >
            {isSyncingSSO ? (
              <CircularProgress size={14} color="inherit" />
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            )}
            <span>{isSyncingSSO ? 'Menyinkronkan...' : 'Sinkronkan dari SSO'}</span>
          </button>

          {/* Download Template Button */}
          <button
            onClick={() => downloadMemberImportTemplate(true)}
            className="px-3.5 py-2.5 bg-white hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold border border-slate-300 flex items-center gap-2 transition-all cursor-pointer shadow-2xs"
            title="Unduh berkas template Excel/CSV data siswa & guru sesuai format tabel sistem"
          >
            <img src="/icon/download/black-16.svg" alt="" width={16} height={16} />
            <span>Unduh Template</span>
          </button>

          {/* Import Button */}
          <button
            onClick={() => {
              setOpenImportModal(true);
              setImportError('');
              setImportRows([]);
              setImportFile(null);
            }}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold border border-slate-300 flex items-center gap-2 transition-all cursor-pointer shadow-2xs"
          >
            <img src="/icon/upload/black-16.svg" alt="" width={16} height={16} />
            <span>Import Data (Excel/CSV)</span>
          </button>

          {/* Add Single Member Button */}
          <button
            onClick={() => setOpenAddModal(true)}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/25 flex items-center gap-2 transition-all cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
            </svg>
            <span>Tambah Anggota</span>
          </button>
        </div>
      </div>

      {/* 2. Top Summary Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center">
            <img src="/icon/student-profile/grey-20.svg" alt="" width={22} height={22} />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total Anggota</span>
            <h4 className="text-xl font-black text-slate-900">{totalMembers} <span className="text-xs font-normal text-slate-500">Orang</span></h4>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center">
            <img src="/icon/student-profile/blue-20.svg" alt="" width={22} height={22} />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Siswa Terdaftar</span>
            <h4 className="text-xl font-black text-blue-600">{totalSiswa} <span className="text-xs font-normal text-slate-500">Siswa</span></h4>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-purple-50 flex items-center justify-center">
            <img src="/icon/admin/blue-20.svg" alt="" width={22} height={22} />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Guru & Staf</span>
            <h4 className="text-xl font-black text-purple-600">{totalGuru} <span className="text-xs font-normal text-slate-500">Guru</span></h4>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 flex items-center justify-center">
            <img src="/icon/presence/black-20.svg" alt="" width={22} height={22} className="opacity-75" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Biometrik Wajah</span>
            <h4 className="text-xl font-black text-emerald-600">{totalEnrolled} <span className="text-xs font-normal text-slate-500">Terdaftar</span></h4>
          </div>
        </div>
      </div>

      {/* 3. Filter & Search Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        {/* Search input */}
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            placeholder="Cari nama anggota, NISN, NIP, kelas, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all placeholder:text-slate-400"
          />
          <svg className="w-4 h-4 text-slate-400 absolute left-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-600 font-bold"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filter Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Role Filter Tabs */}
          <div className="flex p-1 bg-slate-100 rounded-xl text-xs font-bold border border-slate-200/80 shrink-0">
            {[
              { id: 'ALL', label: 'Semua Peran' },
              { id: 'SISWA', label: 'Siswa', icon: '/icon/student-profile/blue-16.svg', iconInactive: '/icon/student-profile/grey-16.svg' },
              { id: 'GURU', label: 'Guru', icon: '/icon/admin/blue-16.svg', iconInactive: '/icon/admin/grey-16.svg' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setRoleFilter(tab.id)}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  roleFilter === tab.id
                    ? 'bg-white text-blue-600 shadow-xs font-extrabold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.icon && (
                  <img
                    src={roleFilter === tab.id ? tab.icon : tab.iconInactive}
                    alt=""
                    width={14}
                    height={14}
                  />
                )}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Biometric Status Filter */}
          <select
            value={biometricFilter}
            onChange={(e) => setBiometricFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
          >
            <option value="ALL">Semua Status Wajah</option>
            <option value="ENROLLED">Wajah Terdaftar</option>
            <option value="NOT_ENROLLED">Belum Ada Foto</option>
          </select>
        </div>
      </div>

      {/* 4. Full-Width Data Table (Easy to Read & Organized) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Table Subheader / Counter + Bulk Actions */}
        <div className="px-6 py-3.5 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between text-xs text-slate-500 flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <span className="font-semibold">
              Menampilkan <span className="font-bold text-slate-900">{filteredMembers.length}</span> dari {members.length} anggota terdaftar
            </span>
            {selectedIds.size > 0 && (
              <span className="px-2.5 py-1 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg font-bold">
                {selectedIds.size} dipilih
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {selectedIds.size > 0 && (
              <button
                onClick={handleBulkDelete}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-sm"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Hapus {selectedIds.size} Terpilih
              </button>
            )}
            {(search || roleFilter !== 'ALL' || biometricFilter !== 'ALL') && (
              <button
                onClick={() => { setSearch(''); setRoleFilter('ALL'); setBiometricFilter('ALL'); }}
                className="text-blue-600 hover:underline font-bold text-xs cursor-pointer"
              >
                Reset Semua Filter
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="p-16 text-center space-y-3">
            <CircularProgress size={32} />
            <p className="text-xs font-bold text-slate-500">Memuat data siswa & guru...</p>
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h4 className="text-sm font-bold text-slate-800">Tidak ada anggota yang cocok</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Coba sesuaikan kata kunci pencarian atau filter tipe anggota dan status biometrik di atas.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100/70 border-b border-slate-200/80 text-[11px] font-extrabold uppercase tracking-wider text-slate-600">
                  {/* Checkbox select-all */}
                  <th className="py-3.5 pl-4 pr-2 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={filteredMembers.length > 0 && filteredMembers.every((m) => selectedIds.has(m.id))}
                      onChange={toggleSelectAll}
                      className="w-3.5 h-3.5 rounded accent-blue-600 cursor-pointer"
                      title="Pilih semua"
                    />
                  </th>
                  <th className="py-3.5 px-2 w-10 text-center">No</th>
                  <th className="py-3.5 px-3 w-16 text-center">Foto</th>
                  <th className="py-3.5 px-4 min-w-[200px]">Nama Lengkap & Kode</th>
                  <th className="py-3.5 px-4 min-w-[110px]">Peran</th>
                  <th className="py-3.5 px-4 min-w-[140px]">NISN / NIP</th>
                  <th className="py-3.5 px-4 min-w-[130px]">Kelas / Jabatan</th>
                  <th className="py-3.5 px-4 min-w-[180px]">Kontak</th>
                  <th className="py-3.5 px-4 min-w-[110px] text-center">Batas Pinjam</th>
                  <th className="py-3.5 px-4 min-w-[150px] text-center">Status Biometrik</th>
                  <th className="py-3.5 pl-4 pr-6 min-w-[160px] text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredMembers.map((member, index) => {
                  const role = getMemberRole(member);
                  const isGuru = role === 'GURU';
                  const isChecked = selectedIds.has(member.id);

                  return (
                    <tr
                      key={member.id}
                      className={`hover:bg-blue-50/30 transition-colors group ${isChecked ? 'bg-blue-50/40' : ''}`}
                    >
                      {/* 0. Checkbox */}
                      <td className="py-3.5 pl-4 pr-2 text-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelect(member.id)}
                          className="w-3.5 h-3.5 rounded accent-blue-600 cursor-pointer"
                        />
                      </td>

                      {/* 1. Row Number */}
                      <td className="py-3.5 px-2 text-center text-slate-400 font-mono text-[11px]">
                        {index + 1}
                      </td>

                      {/* 2. Photo / Avatar (Clickable to Upload/Change) */}
                      <td className="py-3.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleOpenUploadModal(member)}
                          className="relative group/avatar inline-block cursor-pointer focus:outline-none"
                          title="Klik untuk unggah atau ubah foto wajah"
                        >
                          <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-100 border border-slate-200 mx-auto flex items-center justify-center transition-all group-hover/avatar:ring-2 group-hover/avatar:ring-blue-500 shadow-2xs">
                            {member.photo_url ? (
                              <img
                                src={member.photo_url}
                                alt={member.full_name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="font-black text-xs text-slate-500">
                                {(member.full_name || 'U')[0]}
                              </span>
                            )}
                          </div>
                          {/* Hover Overlay Indicator */}
                          <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover/avatar:opacity-100 transition-opacity flex items-center justify-center text-white">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                          </div>
                        </button>
                      </td>

                      {/* 3. Full Name & Member Code */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                          {member.full_name}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                          ID: {member.member_code || member.id}
                        </div>
                      </td>

                      {/* 4. Role Badge */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wide ${
                            isGuru
                              ? 'bg-purple-50 text-purple-700 border border-purple-200'
                              : 'bg-blue-50 text-blue-700 border border-blue-200'
                          }`}
                        >
                          <img
                            src={isGuru ? '/icon/admin/blue-12.svg' : '/icon/student-profile/blue-12.svg'}
                            alt=""
                            width={12}
                            height={12}
                          />
                          <span>{isGuru ? 'GURU' : 'SISWA'}</span>
                        </span>
                      </td>

                      {/* 5. Identity Number (NISN / NIP) */}
                      <td className="py-3.5 px-4 font-mono font-medium text-slate-700 text-xs">
                        <span className="bg-slate-100 px-2 py-1 rounded-md border border-slate-200/80">
                          {member.identity_number || '-'}
                        </span>
                      </td>

                      {/* 6. Class / Position */}
                      <td className="py-3.5 px-4 text-slate-800 font-semibold">
                        {member.class_name || '-'}
                      </td>

                      {/* 7. Contact (Email & Phone) */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5 text-[11px]">
                          {member.email ? (
                            <div className="text-slate-600 flex items-center gap-1.5 truncate max-w-[170px]" title={member.email}>
                              <svg className="w-3 h-3 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                              </svg>
                              <span>{member.email}</span>
                            </div>
                          ) : null}
                          {member.phone ? (
                            <div className="text-slate-500 flex items-center gap-1.5 font-mono">
                              <svg className="w-3 h-3 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                              </svg>
                              <span>{member.phone}</span>
                            </div>
                          ) : null}
                          {!member.email && !member.phone && (
                            <span className="text-slate-400 italic text-[11px]">-</span>
                          )}
                        </div>
                      </td>

                      {/* 8. Borrow Limit */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-block px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold text-[11px]">
                          {member.max_borrow_limit || (isGuru ? 5 : 3)} Buku
                        </span>
                      </td>

                      {/* 9. Biometric Status Badge */}
                      <td className="py-3.5 px-4 text-center">
                        {member.is_enrolled ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            <span>Terdaftar</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            <span>Belum Ada Foto</span>
                          </span>
                        )}
                      </td>

                      {/* 10. Actions */}
                      <td className="py-3.5 pl-4 pr-6 text-center">
                        <div className="inline-flex items-center gap-1.5">
                          {/* Unggah Foto Wajah */}
                          <button
                            type="button"
                            onClick={() => handleOpenUploadModal(member)}
                            className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
                            title="Unggah foto wajah biometrik"
                          >
                            <img src="/icon/presence/blue-12.svg" alt="" width={12} height={12} />
                            <span>Foto</span>
                          </button>

                          {/* Lihat Detail */}
                          <button
                            type="button"
                            onClick={() => handleOpenDetailModal(member)}
                            className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
                            title="Lihat detail, kartu, edit, atau hapus anggota"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            <span>Detail</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* =========================================================================
          MODAL 1: UNGGAH FOTO WAJAH BIOMETRIK ANGGOTA (GAMBAR SAJA, NO WEBCAM)
          ========================================================================= */}
      {openUploadModal && selectedMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <img src="/icon/presence/blue-20.svg" alt="" width={18} height={18} />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 leading-tight">
                    Unggah Foto Wajah Biometrik
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Untuk pemindaian wajah otomatis di Layanan Mandiri Perpustakaan
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpenUploadModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Member Info Card Banner */}
            <div className="bg-slate-50 px-6 py-3.5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden flex items-center justify-center font-bold text-slate-600 text-xs">
                  {selectedMember.photo_url ? (
                    <img src={selectedMember.photo_url} alt={selectedMember.full_name} className="w-full h-full object-cover" />
                  ) : (
                    (selectedMember.full_name || 'U')[0]
                  )}
                </div>
                <div>
                  <h4 className="font-bold text-xs text-slate-900">{selectedMember.full_name}</h4>
                  <p className="text-[11px] text-slate-500 font-mono">
                    {selectedMember.identity_number} &bull; {selectedMember.class_name}
                  </p>
                </div>
              </div>
              <span
                className={`px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase ${
                  selectedMember.member_type === 'GURU'
                    ? 'bg-purple-100 text-purple-700'
                    : 'bg-blue-100 text-blue-700'
                }`}
              >
                {selectedMember.member_type}
              </span>
            </div>

            {/* Modal Body: Upload Area & Camera */}
            <div className="p-6 space-y-4">
              {/* Mode Selector Tabs (Unggah Berkas vs Ambil Kamera) */}
              {!uploadedImage && (
                <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
                  <button
                    type="button"
                    onClick={() => setMemberPhotoInputMode('upload')}
                    className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      memberPhotoInputMode === 'upload'
                        ? 'bg-white text-slate-800 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span>Unggah Berkas</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMemberPhotoInputMode('camera')}
                    className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      memberPhotoInputMode === 'camera'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span>Ambil dari Kamera</span>
                  </button>
                </div>
              )}

              {uploadedImage ? (
                // Image Preview
                <div className="space-y-3">
                  <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-slate-950 flex items-center justify-center border border-slate-800 shadow-inner">
                    <img
                      src={uploadedImage}
                      alt="Face Preview"
                      className="w-full h-full object-cover"
                    />

                    {/* Face Frame Box Overlay */}
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                      <div className="w-48 h-60 border-2 border-dashed border-emerald-400/80 rounded-3xl flex items-center justify-center shadow-[0_0_20px_rgba(52,211,153,0.3)]">
                        <span className="w-6 h-6 border border-emerald-400/50 rounded-full flex items-center justify-center">
                          <span className="w-2 h-2 bg-emerald-400 rounded-full animate-ping" />
                        </span>
                      </div>
                    </div>

                    <div className="absolute bottom-3 left-3 bg-slate-900/80 backdrop-blur-xs text-white text-[10px] font-mono px-2.5 py-1 rounded-lg border border-slate-700">
                      {uploadedFileName || 'foto_anggota.jpg'}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setUploadedImage(null);
                        setUploadedFileName('');
                        setEnrollStatus(null);
                      }}
                      className="absolute top-3 right-3 px-3 py-1.5 bg-black/60 hover:bg-black/80 text-white rounded-xl text-xs font-bold backdrop-blur-sm transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      <span>Ganti / Foto Ulang</span>
                    </button>
                  </div>
                </div>
              ) : memberPhotoInputMode === 'camera' ? (
                // Camera Capture Mode
                <FaceCameraCapture
                  onCapture={(base64) => {
                    setUploadedImage(base64);
                    setUploadedFileName(`kamera_${Date.now()}.jpg`);
                  }}
                  autoStart={true}
                  showConfirmStep={true}
                />
              ) : (
                // Drag & Drop Upload Zone
                <div
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`aspect-[4/3] rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center p-6 text-center space-y-3 cursor-pointer ${
                    dragActive
                      ? 'border-blue-500 bg-blue-50/50'
                      : 'border-slate-300 hover:border-blue-400 bg-slate-50/50'
                  }`}
                >
                  <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-xs">
                    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">
                      Klik atau Tarik Berkas Foto ke Sini
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-1 max-w-xs mx-auto">
                      Format file: <strong>.JPG, .JPEG, .PNG, atau .WEBP</strong> (Maks. 5MB).
                    </p>
                  </div>
                  <span className="px-3.5 py-1.5 bg-blue-600 text-white rounded-xl text-xs font-bold shadow-sm hover:bg-blue-700 transition-colors">
                    Pilih Berkas Foto
                  </span>
                </div>
              )}

              {/* Hidden File Input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png, image/jpeg, image/jpg, image/webp"
                onChange={(e) => handleFileSelect(e.target.files?.[0])}
                className="hidden"
              />

              {/* Status Feedback */}
              {enrollStatus && (
                <div
                  className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                    enrollStatus === 'success'
                      ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                      : 'bg-red-50 border border-red-200 text-red-800'
                  }`}
                >
                  <span>{enrollStatus === 'success' ? '✓' : '⚠️'}</span>
                  <span>{enrollMessage}</span>
                </div>
              )}

              {/* Guidelines */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 text-[11px] text-slate-500 space-y-1">
                <div className="font-bold text-slate-700 flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v-1h4v1a2 2 0 11-4 0zM12 14H8a4 4 0 01-.8-7.92 4.002 4.002 0 017.6 0A4 4 0 0112 14z" />
                  </svg>
                  <span>Tips Foto Wajah:</span>
                </div>
                <p>• Wajah menghadap lurus ke depan dengan pencahayaan terang merata.</p>
                <p>• Tanpa masker, kacamata hitam, atau penutup wajah agar biometrik akurat.</p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpenUploadModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={handleSaveFaceEnrollment}
                disabled={isProcessing || !uploadedImage}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/25 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <CircularProgress size={14} color="inherit" />
                    <span>Mendaftarkan Biometrik...</span>
                  </>
                ) : (
                  <>
                    <span>Simpan & Daftarkan Wajah</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 2: KARTU ANGGOTA DIGITAL BER-BARCODE
          ========================================================================= */}
      {openCardModal && selectedMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full border border-slate-200 p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150 flex flex-col items-center">
            <div className="w-full flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900">
                Kartu Anggota Digital
              </h3>
              <button
                type="button"
                onClick={() => setOpenCardModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Card Graphic */}
            <div className="w-full bg-gradient-to-br from-slate-900 to-blue-950 text-white p-5 rounded-2xl shadow-xl space-y-4 border border-slate-800">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div>
                  <h3 className="text-xs font-black tracking-wider text-blue-400 uppercase">
                    Perpustakaan SMPN 1 Prambon
                  </h3>
                  <p className="text-[10px] text-slate-300">Perpustakaan Digital Sekolah</p>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white/20">
                  {selectedMember.member_type}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-xl overflow-hidden bg-slate-800 border border-white/20 flex items-center justify-center shrink-0">
                  {selectedMember.photo_url ? (
                    <img src={selectedMember.photo_url} alt={selectedMember.full_name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-base font-black text-white">{(selectedMember.full_name || 'U')[0]}</span>
                  )}
                </div>
                <div>
                  <h4 className="font-bold text-sm text-white leading-tight">{selectedMember.full_name}</h4>
                  <p className="text-xs text-slate-300 font-mono mt-0.5">{selectedMember.identity_number}</p>
                  <p className="text-[11px] text-blue-300">{selectedMember.class_name}</p>
                </div>
              </div>

              {/* Barcode on Card */}
              <div className="bg-white p-2 rounded-xl flex flex-col items-center justify-center text-center">
                <Barcode value={selectedMember.identity_number || selectedMember.id} height={36} width={1.2} fontSize={10} />
              </div>
            </div>

            <div className="w-full flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setOpenCardModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Tutup
              </button>
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Cetak Kartu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 3: TAMBAH ANGGOTA BARU (SISWA / GURU)
          ========================================================================= */}

      {/* =========================================================================
          MODAL 5: DETAIL ANGGOTA (INFO LENGKAP + KARTU + EDIT + HAPUS)
          ========================================================================= */}
      {openDetailModal && detailMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  getMemberRole(detailMember) === 'GURU' ? 'bg-purple-50' : 'bg-blue-50'
                }`}>
                  <img
                    src={getMemberRole(detailMember) === 'GURU' ? '/icon/admin/blue-20.svg' : '/icon/student-profile/blue-20.svg'}
                    alt="" width={18} height={18}
                  />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 leading-tight">Detail Anggota Perpustakaan</h3>
                  <p className="text-[11px] text-slate-400">Informasi lengkap, kartu digital, serta aksi edit dan hapus.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { setOpenDetailModal(false); setDetailEditMode(false); }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="overflow-y-auto flex-1">
              <div className="p-6 space-y-5">
                {/* Profile Header */}
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => { setSelectedMember(detailMember); setOpenDetailModal(false); handleOpenUploadModal(detailMember); }}
                    className="relative group/av w-20 h-20 rounded-2xl overflow-hidden bg-slate-100 border-2 border-slate-200 flex items-center justify-center flex-shrink-0 cursor-pointer"
                    title="Klik untuk ubah foto wajah"
                  >
                    {detailMember.photo_url ? (
                      <img src={detailMember.photo_url} alt={detailMember.full_name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-2xl font-black text-slate-400">{(detailMember.full_name || 'U')[0]}</span>
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/av:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-bold">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                  </button>
                  <div className="flex-1 min-w-0">
                    {detailEditMode ? (
                      <input
                        type="text"
                        value={detailEditForm.full_name}
                        onChange={(e) => setDetailEditForm((f) => ({ ...f, full_name: e.target.value }))}
                        className="w-full text-lg font-black text-slate-900 border-b-2 border-blue-400 bg-transparent focus:outline-none pb-0.5"
                      />
                    ) : (
                      <h2 className="text-lg font-black text-slate-900 leading-tight truncate">{detailMember.full_name}</h2>
                    )}
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase ${
                        getMemberRole(detailMember) === 'GURU'
                          ? 'bg-purple-50 text-purple-700 border border-purple-200'
                          : 'bg-blue-50 text-blue-700 border border-blue-200'
                      }`}>
                        {getMemberRole(detailMember)}
                      </span>
                      <span className="text-[11px] text-slate-400 font-mono">{detailMember.member_code || detailMember.id}</span>
                      {detailMember.is_enrolled ? (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />Biometrik Terdaftar
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />Belum Ada Foto
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Info Fields Grid */}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: getMemberRole(detailMember) === 'GURU' ? 'NIP / NUPTK' : 'NISN / No. Induk', field: 'identity_number', type: 'text' },
                    { label: getMemberRole(detailMember) === 'GURU' ? 'Mata Pelajaran / Jabatan' : 'Kelas / Rombel', field: 'class_name', type: 'text' },
                    { label: 'Email', field: 'email', type: 'email' },
                    { label: 'No. HP / WhatsApp', field: 'phone', type: 'text' },
                    { label: 'Batas Pinjam (Buku)', field: 'max_borrow_limit', type: 'number' },
                  ].map(({ label, field, type }) => (
                    <div key={field} className={field === 'email' || field === 'identity_number' ? 'col-span-2' : ''}>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{label}</label>
                      {detailEditMode ? (
                        <input
                          type={type}
                          value={detailEditForm[field] ?? ''}
                          onChange={(e) => setDetailEditForm((f) => ({ ...f, [field]: e.target.value }))}
                          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 bg-slate-50"
                        />
                      ) : (
                        <p className="text-sm font-semibold text-slate-800 px-3 py-2 bg-slate-50 rounded-xl border border-slate-100">
                          {detailMember[field] || <span className="text-slate-300 italic text-xs">Tidak diisi</span>}
                        </p>
                      )}
                    </div>
                  ))}
                </div>

                {/* Kartu Anggota Digital Mini */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-bold text-slate-700">Kartu Anggota Digital</h4>
                    <button
                      type="button"
                      onClick={() => { setSelectedMember(detailMember); setOpenDetailModal(false); handleOpenCardModal(detailMember); }}
                      className="text-xs text-blue-600 hover:underline font-semibold cursor-pointer"
                    >
                      Cetak Kartu →
                    </button>
                  </div>
                  <div className="w-full bg-gradient-to-br from-slate-900 to-blue-950 text-white p-4 rounded-2xl shadow-md border border-slate-800">
                    <div className="flex items-center justify-between border-b border-white/10 pb-2.5 mb-3">
                      <div>
                        <p className="text-[10px] font-black tracking-wider text-blue-400 uppercase">Perpustakaan SMPN 1 Prambon</p>
                        <p className="text-[9px] text-slate-400">Kartu Anggota Digital</p>
                      </div>
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-white/20">{getMemberRole(detailMember)}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl overflow-hidden bg-slate-800 border border-white/20 flex items-center justify-center shrink-0">
                        {detailMember.photo_url ? (
                          <img src={detailMember.photo_url} alt={detailMember.full_name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-base font-black text-white">{(detailMember.full_name || 'U')[0]}</span>
                        )}
                      </div>
                      <div>
                        <h4 className="font-bold text-xs text-white leading-tight">{detailMember.full_name}</h4>
                        <p className="text-[10px] text-slate-300 font-mono mt-0.5">{detailMember.identity_number}</p>
                        <p className="text-[10px] text-blue-300">{detailMember.class_name}</p>
                      </div>
                    </div>
                    <div className="bg-white mt-3 p-1.5 rounded-xl flex items-center justify-center">
                      <Barcode value={detailMember.identity_number || detailMember.id} height={28} width={1} fontSize={9} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
              {/* Hapus */}
              <button
                type="button"
                onClick={() => handleDeleteMember(detailMember.id, detailMember.full_name)}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Hapus Anggota
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => { setOpenDetailModal(false); setDetailEditMode(false); }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Tutup
                </button>
                {detailEditMode ? (
                  <button
                    type="button"
                    onClick={handleSaveDetailEdit}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    Simpan Perubahan
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setDetailEditMode(true)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit Data
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {openAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <form onSubmit={handleCreateNewMember}>
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-base font-extrabold text-slate-900">
                  Pendaftaran Anggota Perpustakaan
                </h3>
                <button
                  type="button"
                  onClick={() => setOpenAddModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tipe Anggota *</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setNewMemberForm({ ...newMemberForm, member_type: 'SISWA', max_borrow_limit: 3 })}
                      className={`py-2 px-3 rounded-xl text-xs font-bold border text-center cursor-pointer transition-colors ${
                        newMemberForm.member_type === 'SISWA'
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-slate-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      Siswa
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewMemberForm({ ...newMemberForm, member_type: 'GURU', max_borrow_limit: 5 })}
                      className={`py-2 px-3 rounded-xl text-xs font-bold border text-center cursor-pointer transition-colors ${
                        newMemberForm.member_type === 'GURU'
                          ? 'bg-purple-600 text-white border-purple-600'
                          : 'bg-slate-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      Guru / Tenaga Pendidik
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nama Lengkap *</label>
                  <input
                    type="text"
                    required
                    value={newMemberForm.full_name}
                    onChange={(e) => setNewMemberForm({ ...newMemberForm, full_name: e.target.value })}
                    placeholder="Contoh: Muhammad Farhan / Dra. Hj. Ratna, M.Pd"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {newMemberForm.member_type === 'GURU' ? 'NIP / NUPTK *' : 'NISN / Nomor Induk *'}
                    </label>
                    <input
                      type="text"
                      required
                      value={newMemberForm.identity_number}
                      onChange={(e) => setNewMemberForm({ ...newMemberForm, identity_number: e.target.value })}
                      placeholder={newMemberForm.member_type === 'GURU' ? 'NIP. 198...' : '202300...'}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {newMemberForm.member_type === 'GURU' ? 'Mata Pelajaran / Posisi' : 'Kelas / Rombel'}
                    </label>
                    <input
                      type="text"
                      value={newMemberForm.class_name}
                      onChange={(e) => setNewMemberForm({ ...newMemberForm, class_name: e.target.value })}
                      placeholder={newMemberForm.member_type === 'GURU' ? 'Guru Matematika' : 'X-IPA-1'}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={newMemberForm.email}
                      onChange={(e) => setNewMemberForm({ ...newMemberForm, email: e.target.value })}
                      placeholder="anggota@sekolah.sch.id"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">No. WhatsApp / HP</label>
                    <input
                      type="text"
                      value={newMemberForm.phone}
                      onChange={(e) => setNewMemberForm({ ...newMemberForm, phone: e.target.value })}
                      placeholder="0812..."
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                </div>

                {/* Direct Image Upload Inside Modal */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Foto Wajah Anggota (Opsional)
                  </label>
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-xl border border-slate-200 bg-slate-50 overflow-hidden flex items-center justify-center shrink-0">
                      {newMemberForm.photo_url ? (
                        <img src={newMemberForm.photo_url} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <img src="/icon/student-profile/grey-20.svg" alt="" width={24} height={24} />
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => modalFileInputRef.current?.click()}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                        >
                          {newMemberForm.photo_url ? 'Ganti File' : 'Unggah File'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowAddMemberCam(true)}
                          className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1.5"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <span>Ambil Kamera</span>
                        </button>
                      </div>
                      <p className="text-[10px] text-slate-400">
                        Bisa juga diunggah atau difoto nanti melalui tabel data anggota.
                      </p>
                    </div>
                    <input
                      ref={modalFileInputRef}
                      type="file"
                      accept="image/png, image/jpeg, image/jpg, image/webp"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (ev) => {
                            setNewMemberForm((prev) => ({ ...prev, photo_url: ev.target.result }));
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setOpenAddModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm cursor-pointer"
                >
                  Simpan Anggota
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* POPUP KAMERA UNTUK FORM TAMBAH ANGGOTA */}
      {showAddMemberCam && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-extrabold text-slate-900">Ambil Foto Wajah Anggota</h3>
              <button
                type="button"
                onClick={() => setShowAddMemberCam(false)}
                className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>
            <FaceCameraCapture
              onCapture={(b64) => {
                setNewMemberForm((prev) => ({ ...prev, photo_url: b64 }));
                setShowAddMemberCam(false);
              }}
              onCancel={() => setShowAddMemberCam(false)}
              autoStart={true}
              showConfirmStep={true}
            />
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 4: IMPORT BATCH DATA SISWA & GURU (EXCEL / CSV)
          ========================================================================= */}
      {openImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <img src="/icon/upload/black-16.svg" alt="" width={16} height={16} />
                </div>
                <h3 className="text-base font-black text-slate-900">
                  Import Data Siswa & Guru (Excel / CSV)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setOpenImportModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto">
              {/* Template download & Sample Data */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Format Spreadsheet yang Didukung</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Mendukung <strong>Format Data Siswa (4 Kolom: NISN, NAMA SISWA, JK, KELAS)</strong> tanpa perlu email/no. HP, maupun format lengkap sistem.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => downloadStudentDapodikTemplate(true)}
                    className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
                    title="Unduh format tabel siswa sekolah (NISN, Nama, JK, Kelas)"
                  >
                    <img src="/icon/download/black-16.svg" alt="" width={14} height={14} />
                    <span>Template Siswa (NISN)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => downloadMemberImportTemplate(true)}
                    className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
                  >
                    <img src="/icon/download/black-16.svg" alt="" width={14} height={14} />
                    <span>Template Lengkap</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleUseDemoImportData}
                    className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <span>Data Sampel</span>
                  </button>
                </div>
              </div>

              {/* Drag & Drop File Zone */}
              <div
                onDragEnter={(e) => { e.preventDefault(); setImportDragActive(true); }}
                onDragLeave={(e) => { e.preventDefault(); setImportDragActive(false); }}
                onDragOver={(e) => { e.preventDefault(); setImportDragActive(true); }}
                onDrop={(e) => {
                  e.preventDefault();
                  setImportDragActive(false);
                  if (e.dataTransfer.files?.[0]) processImportFile(e.dataTransfer.files[0]);
                }}
                onClick={() => importFileInputRef.current?.click()}
                className={`p-6 rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center text-center space-y-2 cursor-pointer ${
                  importDragActive
                    ? 'border-blue-500 bg-blue-50/50'
                    : 'border-slate-300 hover:border-blue-400 bg-slate-50/50'
                }`}
              >
                <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800">
                    {importFile ? `Berkas terpilih: ${importFile.name}` : 'Tarik & lepas file Excel/CSV ke sini, atau klik untuk memilih file'}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Mendukung format .CSV atau .TXT berpemisah koma/titik-koma</p>
                </div>
                <input
                  ref={importFileInputRef}
                  type="file"
                  accept=".csv, .txt, .xlsx, .xls"
                  onChange={(e) => {
                    if (e.target.files?.[0]) processImportFile(e.target.files[0]);
                  }}
                  className="hidden"
                />
              </div>

              {/* Error Message if any */}
              {importError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-semibold flex items-center gap-2">
                  <svg className="w-4 h-4 shrink-0 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span>{importError}</span>
                </div>
              )}

              {/* Parsed Rows Preview Table */}
              {importRows.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-900">
                      Pratinjau Data Impor ({importRows.length} Anggota Terdeteksi):
                    </h4>
                    <button
                      type="button"
                      onClick={() => { setImportRows([]); setImportFile(null); }}
                      className="text-xs text-red-600 hover:underline font-semibold cursor-pointer"
                    >
                      Bersihkan
                    </button>
                  </div>

                  <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-xl overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                        <tr>
                          <th className="p-2.5 pl-3">No</th>
                          <th className="p-2.5">Nama Lengkap</th>
                          <th className="p-2.5">Tipe</th>
                          <th className="p-2.5">No. Identitas</th>
                          <th className="p-2.5">Kelas / Jabatan</th>
                          <th className="p-2.5">Email</th>
                          <th className="p-2.5 pr-3">No. HP</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {importRows.map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="p-2.5 pl-3 text-slate-400 font-mono">{idx + 1}</td>
                            <td className="p-2.5 font-bold text-slate-800">{row.full_name}</td>
                            <td className="p-2.5">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                                  row.member_type === 'GURU'
                                    ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                    : 'bg-blue-50 text-blue-700 border border-blue-200'
                                }`}
                              >
                                {row.member_type}
                              </span>
                            </td>
                            <td className="p-2.5 font-mono text-slate-600">{row.identity_number}</td>
                            <td className="p-2.5 text-slate-700">{row.class_name}</td>
                            <td className="p-2.5 text-slate-500">{row.email || '-'}</td>
                            <td className="p-2.5 pr-3 text-slate-500">{row.phone || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpenImportModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleCommitImport}
                disabled={importRows.length === 0 || isCommittingImport}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50 flex items-center gap-2"
              >
                {isCommittingImport ? (
                  <>
                    <CircularProgress size={14} color="inherit" />
                    <span>Menyimpan ke Sistem...</span>
                  </>
                ) : (
                  <>
                    <span>Simpan & Import ({importRows.length}) Anggota</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
