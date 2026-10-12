'use client';

import { Suspense, useEffect, useState, useCallback, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { schoolPeopleApi } from '@/lib/features/schoolPeopleApi';
import { classApiAdapter } from '@/lib/features/classes/infrastructure/classApiAdapter';
import { accountApiAdapter } from '@/lib/features/auth/infrastructure/accountApiAdapter';
import Pagination from '@/components/Pagination';
import { ToastContainer, useToast } from '@/components/Toast';

function MasterDataContent() {
  const searchParams = useSearchParams();
  // Tabs: 'rombel' | 'siswa' | 'guru_staf' | 'semester' (dikontrol via Sidebar sub-menu)
  const [activeTab, setActiveTab] = useState('rombel');

  // Sinkronisasi tab dengan URL search params dari navigasi sub-menu Sidebar
  useEffect(() => {
    const tabParam = searchParams?.get('tab');
    if (tabParam) {
      const lower = tabParam.toLowerCase();
      if (['rombel', 'siswa', 'guru_staf', 'semester'].includes(lower)) {
        setActiveTab(lower);
      }
    }
  }, [searchParams]);

  // Master Data States
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [staff, setStaff] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { toasts, addToast, removeToast } = useToast();
  // Alias agar tidak perlu ubah semua call setNotice secara manual
  const setNotice = (msg, type = 'success') => { if (msg) addToast(msg, type); };

  // Search & Filter
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('ALL');
  const [rombelSearch, setRombelSearch] = useState('');
  const [gradeFilter, setGradeFilter] = useState('ALL');
  const [staffSearch, setStaffSearch] = useState('');
  const [staffTypeFilter, setStaffTypeFilter] = useState('ALL');

  // Bulk Selection States
  const [selectedStaffIds, setSelectedStaffIds] = useState([]);
  const [isDeletingBulkStaff, setIsDeletingBulkStaff] = useState(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [isDeletingBulkStudent, setIsDeletingBulkStudent] = useState(false);

  // Pagination & Filter: Siswa
  const [studentPage, setStudentPage] = useState(1);
  const [studentPageSize, setStudentPageSize] = useState(10);

  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const matchSearch =
        !search ||
        s.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        s.nisn?.includes(search);
      const matchClass = classFilter === 'ALL' || s.class_name === classFilter;
      return matchSearch && matchClass;
    });
  }, [students, search, classFilter]);

  useEffect(() => {
    setStudentPage(1);
  }, [search, classFilter]);

  const paginatedStudents = useMemo(() => {
    const start = (studentPage - 1) * studentPageSize;
    return filteredStudents.slice(start, start + studentPageSize);
  }, [filteredStudents, studentPage, studentPageSize]);

  // Pagination & Filter: Guru & Staf
  const [staffPage, setStaffPage] = useState(1);
  const [staffPageSize, setStaffPageSize] = useState(10);

  const filteredStaff = useMemo(() => {
    return staff.filter((p) => {
      const matchSearch =
        !staffSearch.trim() ||
        p.full_name?.toLowerCase().includes(staffSearch.toLowerCase()) ||
        p.nip?.includes(staffSearch) ||
        p.email?.toLowerCase().includes(staffSearch.toLowerCase());
      const matchType = staffTypeFilter === 'ALL' || p.person_type === staffTypeFilter;
      return matchSearch && matchType;
    });
  }, [staff, staffSearch, staffTypeFilter]);

  useEffect(() => {
    setStaffPage(1);
  }, [staffSearch, staffTypeFilter]);

  const paginatedStaff = useMemo(() => {
    const start = (staffPage - 1) * staffPageSize;
    return filteredStaff.slice(start, start + staffPageSize);
  }, [filteredStaff, staffPage, staffPageSize]);

  // Pagination & Filter: Rombel
  const [rombelPage, setRombelPage] = useState(1);
  const [rombelPageSize, setRombelPageSize] = useState(12);

  const filteredClasses = useMemo(() => {
    return classes.filter((cls) => {
      const matchSearch =
        !rombelSearch.trim() ||
        cls.class_code?.toLowerCase().includes(rombelSearch.toLowerCase()) ||
        cls.room?.toLowerCase().includes(rombelSearch.toLowerCase());
      const grade =
        cls.grade_level ||
        (cls.class_code?.startsWith('VII-')
          ? '7'
          : cls.class_code?.startsWith('VIII-')
          ? '8'
          : cls.class_code?.startsWith('IX-')
          ? '9'
          : '');
      const matchGrade = gradeFilter === 'ALL' || grade === gradeFilter;
      return matchSearch && matchGrade;
    });
  }, [classes, rombelSearch, gradeFilter]);

  useEffect(() => {
    setRombelPage(1);
  }, [rombelSearch, gradeFilter]);

  const paginatedClasses = useMemo(() => {
    const start = (rombelPage - 1) * rombelPageSize;
    return filteredClasses.slice(start, start + rombelPageSize);
  }, [filteredClasses, rombelPage, rombelPageSize]);

  // Modal Rombel (Add / Edit)
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [editingClassId, setEditingClassId] = useState(null);
  const [classForm, setClassForm] = useState({ class_code: '', grade_level: '7', room: '' });

  // Modal Civitas Pengguna (Add / Edit)
  const [isPersonModalOpen, setIsPersonModalOpen] = useState(false);
  const [editingPersonId, setEditingPersonId] = useState(null);
  const [personForm, setPersonForm] = useState({
    person_type: 'SISWA',
    full_name: '',
    nisn: '',
    nip: '',
    email: '',
    phone: '',
    class_name: '',
    password: '',
  });

  // Manajemen Password Guru (Lihat & Atur Password)
  const [savedPasswords, setSavedPasswords] = useState({});
  const [visiblePasswords, setVisiblePasswords] = useState({});
  const [passwordModal, setPasswordModal] = useState(null);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [showModalPassword, setShowModalPassword] = useState(true);
  const [showPersonPassword, setShowPersonPassword] = useState(false);

  // Modal Detail Lengkap Pendidik & Staf
  const [detailStaffModal, setDetailStaffModal] = useState(null);
  const [isDetailStaffModalOpen, setIsDetailStaffModalOpen] = useState(false);
  const [showDetailPassword, setShowDetailPassword] = useState(false);

  const handleOpenDetailStaff = (p) => {
    setDetailStaffModal(p);
    setShowDetailPassword(false);
    setIsDetailStaffModalOpen(true);
  };

  useEffect(() => {
    try {
      const stored = localStorage.getItem('spenspra_staff_passwords');
      if (stored) {
        setSavedPasswords(JSON.parse(stored));
      }
    } catch (e) {}
  }, []);

  // Modal Kirim Kredensial Guru
  const [credentialModal, setCredentialModal] = useState(null);
  const [sendingEmail, setSendingEmail] = useState(false);

  // Pengaturan Akademik (Tahun Ajaran & Semester)
  const [academicPeriod, setAcademicPeriod] = useState({
    year: '2025/2026',
    semester: 'GENAP',
    status: 'AKTIF',
    kkm: 75,
    startDate: '',
    endDate: '',
  });
  const [isPeriodModalOpen, setIsPeriodModalOpen] = useState(false);
  const [periodForm, setPeriodForm] = useState({
    year: '2025/2026',
    semester: 'GENAP',
    kkm: 75,
    startDate: '',
    endDate: '',
  });
  const [periodHistory, setPeriodHistory] = useState([]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [classList, peopleList, accountList] = await Promise.all([
        classApiAdapter.getAll().catch(() => []),
        schoolPeopleApi.list().catch(() => []),
        accountApiAdapter.getAll().catch(() => []),
      ]);

      setClasses(Array.isArray(classList) ? classList : []);

      setAccounts(Array.isArray(accountList) ? accountList : []);

      const sList = peopleList.filter((p) => p.person_type === 'SISWA');
      const gList = peopleList.filter((p) =>
        ['GURU', 'TENAGA_KEPENDIDIKAN', 'KEPALA_SEKOLAH'].includes(p.person_type)
      );

      setStudents(sList);
      setStaff(gList);
    } catch (err) {
      console.warn('Gagal memuat master data:', err);
      setError('Gagal memuat master data dari server.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('spenspra_academic_period');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.year && parsed?.semester) {
          setAcademicPeriod((prev) => ({ ...prev, ...parsed }));
          setPeriodForm((prev) => ({ ...prev, ...parsed }));
          setPeriodHistory((prev) =>
            prev.map((item) => ({
              ...item,
              status: item.year === parsed.year && item.semester === parsed.semester ? 'AKTIF' : 'ARSIP',
            }))
          );
        }
      }
    } catch (e) {}
  }, []);

  // ────────────────────────────────────────────────────────
  // Aksi Periode Akademik (Tahun Ajaran & Semester)
  // ────────────────────────────────────────────────────────
  const handleOpenEditPeriod = () => {
    setPeriodForm({
      year: academicPeriod.year,
      semester: academicPeriod.semester,
      kkm: academicPeriod.kkm || 75,
      startDate: academicPeriod.startDate || '2026-01-05',
      endDate: academicPeriod.endDate || '2026-06-20',
    });
    setIsPeriodModalOpen(true);
  };

  const handleSaveAcademicPeriod = (e) => {
    e.preventDefault();
    const updated = {
      ...academicPeriod,
      year: periodForm.year,
      semester: periodForm.semester,
      kkm: Number(periodForm.kkm) || 75,
      startDate: periodForm.startDate,
      endDate: periodForm.endDate,
      status: 'AKTIF',
    };
    setAcademicPeriod(updated);
    try {
      localStorage.setItem('spenspra_academic_period', JSON.stringify(updated));
      document.cookie = `spenspra_academic_year=${encodeURIComponent(updated.year)}; path=/; domain=localhost; SameSite=Lax`;
      document.cookie = `spenspra_academic_year=${encodeURIComponent(updated.year)}; path=/; domain=.localhost; SameSite=Lax`;
      document.cookie = `spenspra_academic_semester=${encodeURIComponent(updated.semester)}; path=/; domain=localhost; SameSite=Lax`;
      document.cookie = `spenspra_academic_semester=${encodeURIComponent(updated.semester)}; path=/; domain=.localhost; SameSite=Lax`;
    } catch (err) {}

    setPeriodHistory((prev) => {
      const exists = prev.find((p) => p.year === updated.year && p.semester === updated.semester);
      if (exists) {
        return prev.map((p) => ({
          ...p,
          status: p.year === updated.year && p.semester === updated.semester ? 'AKTIF' : 'ARSIP',
        }));
      }
      return [
        {
          id: `p-${Date.now()}`,
          year: updated.year,
          semester: updated.semester,
          status: 'AKTIF',
          studentsCount: students.length || 192,
          startDate: updated.startDate,
          endDate: updated.endDate,
        },
        ...prev.map((p) => ({ ...p, status: 'ARSIP' })),
      ];
    });

    setIsPeriodModalOpen(false);
    setNotice(
      `Periode akademik aktif berhasil diubah ke Tahun Ajaran ${updated.year} - Semester ${
        updated.semester === 'GENAP' ? 'Genap' : 'Ganjil'
      }. Seluruh sistem e-Rapor dan modul sekolah telah disinkronkan.`
    );

  };

  const handleQuickActivatePeriod = (p) => {
    const updated = {
      ...academicPeriod,
      year: p.year,
      semester: p.semester,
      status: 'AKTIF',
    };
    setAcademicPeriod(updated);
    setPeriodForm((prev) => ({ ...prev, year: p.year, semester: p.semester }));
    try {
      localStorage.setItem('spenspra_academic_period', JSON.stringify(updated));
      document.cookie = `spenspra_academic_year=${encodeURIComponent(updated.year)}; path=/; domain=localhost; SameSite=Lax`;
      document.cookie = `spenspra_academic_year=${encodeURIComponent(updated.year)}; path=/; domain=.localhost; SameSite=Lax`;
      document.cookie = `spenspra_academic_semester=${encodeURIComponent(updated.semester)}; path=/; domain=localhost; SameSite=Lax`;
      document.cookie = `spenspra_academic_semester=${encodeURIComponent(updated.semester)}; path=/; domain=.localhost; SameSite=Lax`;
    } catch (err) {}

    setPeriodHistory((prev) =>
      prev.map((item) => ({
        ...item,
        status: item.id === p.id ? 'AKTIF' : 'ARSIP',
      }))
    );

    setNotice(
      `Periode aktif berhasil dialihkan ke Tahun Ajaran ${p.year} - Semester ${
        p.semester === 'GENAP' ? 'Genap' : 'Ganjil'
      }.`
    );

  };

  // ────────────────────────────────────────────────────────
  // Aksi Rombel (Tambah / Edit / Hapus)
  // ────────────────────────────────────────────────────────
  const handleOpenAddClass = () => {
    setEditingClassId(null);
    setClassForm({ class_code: '', grade_level: '7', room: '' });
    setIsClassModalOpen(true);
  };

  const handleOpenEditClass = (cls) => {
    setEditingClassId(cls.id);
    setClassForm({
      class_code: cls.class_code || '',
      grade_level: cls.grade_level || cls.class_code?.split('-')[0] || '7',
      room: cls.room || '',
    });
    setIsClassModalOpen(true);
  };

  const handleSaveClass = async (e) => {
    e.preventDefault();
    if (!classForm.class_code.trim()) return;

    try {
      if (editingClassId && !editingClassId.startsWith('c-init-')) {
        await classApiAdapter.update(editingClassId, {
          class_code: classForm.class_code.trim(),
          room: classForm.room.trim() || `Ruang ${classForm.class_code}`,
          grade_level: classForm.grade_level,
        });
        setNotice(`Rombel ${classForm.class_code} berhasil diperbarui.`);
      } else {
        await classApiAdapter.create({
          class_code: classForm.class_code.trim(),
          room: classForm.room.trim() || `Ruang ${classForm.class_code}`,
          grade_level: classForm.grade_level,
        });
        setNotice(`Rombel ${classForm.class_code} berhasil ditambahkan.`);
      }

      setIsClassModalOpen(false);
      setClassForm({ class_code: '', grade_level: '7', room: '' });

      loadAll();
    } catch (err) {
      setError(err.message || 'Gagal menyimpan rombel.');
    }
  };

  const handleDeleteClass = async (cls) => {
    if (!window.confirm(`Hapus rombel ${cls.class_code}? Rombel ini akan dihapus dari data master.`)) return;

    try {
      if (cls.id && !cls.id.startsWith('c-init-')) {
        await classApiAdapter.delete(cls.id);
      }
      setClasses((prev) => prev.filter((c) => (c.id ? c.id !== cls.id : c.class_code !== cls.class_code)));
      setNotice(`Rombel ${cls.class_code} berhasil dihapus.`);

    } catch (err) {
      setError(err.message || 'Gagal menghapus rombel.');
    }
  };

  // ────────────────────────────────────────────────────────
  const getStaffUsername = useCallback((p) => {
    const matchingAcc = accounts.find(
      (a) => a.person_id === p.id || a.id === p.id || (p.nip && a.nim_nip === p.nip) || (p.nip && a.username === p.nip)
    );
    return matchingAcc?.username || p.nip || generateUsernameFromName(p.full_name);
  }, [accounts]);

  const getStaffPassword = useCallback((p) => {
    const username = getStaffUsername(p);
    if (p.id && savedPasswords[p.id]) return savedPasswords[p.id];
    if (p.nip && savedPasswords[p.nip]) return savedPasswords[p.nip];
    if (username && savedPasswords[username]) return savedPasswords[username];
    const matchingAcc = accounts.find(
      (a) => a.person_id === p.id || a.id === p.id || a.username === username || (p.nip && a.nim_nip === p.nip)
    );
    if (matchingAcc?.password) return matchingAcc.password;
    return p.nip || username || 'Spenspra2026';
  }, [savedPasswords, accounts, getStaffUsername]);

  const togglePasswordVisibility = (id) => {
    setVisiblePasswords((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleOpenPasswordModal = (p) => {
    const username = getStaffUsername(p);
    const currentPwd = getStaffPassword(p);
    const matchingAcc = accounts.find(
      (a) => a.person_id === p.id || a.id === p.id || a.username === username
    );

    setPasswordModal({
      id: p.id,
      accountId: matchingAcc?.id || p.id,
      fullName: p.full_name,
      username: username,
      password: currentPwd,
      email: p.email || matchingAcc?.email || '',
      phone: p.phone || matchingAcc?.phone || '',
    });
    setShowModalPassword(true);
    setIsPasswordModalOpen(true);
  };

  const handleSavePasswordModal = async (e) => {
    e.preventDefault();
    if (!passwordModal || !passwordModal.password.trim()) return;

    try {
      const newPassword = passwordModal.password.trim();
      try {
        await accountApiAdapter.resetPassword(passwordModal.accountId || passwordModal.id, {
          newPassword,
          sendEmail: false,
        });
      } catch (errApi) {
        console.warn('API reset password warning:', errApi);
      }

      const updated = {
        ...savedPasswords,
        [passwordModal.id]: newPassword,
        [passwordModal.username]: newPassword,
      };
      setSavedPasswords(updated);
      try {
        localStorage.setItem('spenspra_staff_passwords', JSON.stringify(updated));
      } catch (err) {}

      setAccounts((prev) =>
        prev.map((acc) =>
          acc.id === passwordModal.accountId || acc.person_id === passwordModal.id || acc.username === passwordModal.username
            ? { ...acc, password: newPassword }
            : acc
        )
      );

      setNotice(`Kata sandi akun ${passwordModal.fullName} (${passwordModal.username}) berhasil diperbarui.`);
      setIsPasswordModalOpen(false);
      setPasswordModal(null);

    } catch (err) {
      setError(err.message || 'Gagal memperbarui kata sandi akun.');
    }
  };

  // ────────────────────────────────────────────────────────
  // Aksi Civitas (Siswa / Guru / Staf)
  // ────────────────────────────────────────────────────────
  const handleOpenAddPerson = (type) => {
    setEditingPersonId(null);
    setPersonForm({
      person_type: type,
      full_name: '',
      nisn: '',
      nip: '',
      email: '',
      phone: '',
      class_name: '',
      password: '',
    });
    setIsPersonModalOpen(true);
  };

  const handleOpenEditPerson = (p) => {
    setEditingPersonId(p.id);
    const pwd = getStaffPassword(p);
    setPersonForm({
      person_type: p.person_type || 'SISWA',
      full_name: p.full_name || '',
      nisn: p.nisn || '',
      nip: p.nip || '',
      email: p.email || '',
      phone: p.phone || '',
      class_name: p.class_name || '',
      password: pwd || '',
    });
    setIsPersonModalOpen(true);
  };

const generateUsernameFromName = (name) => {
  if (!name) return 'guru_' + Math.floor(1000 + Math.random() * 9000);
  const clean = name.toLowerCase()
    .replace(/(s\.pd\.|s\.pd|m\.pd\.|m\.pd|s\.kom\.|s\.kom|s\.si\.|s\.si|m\.si\.|m\.si|drs\.|drs|dra\.|dra|gr\.|gr)/gi, '')
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
  return clean || 'guru_' + Math.floor(1000 + Math.random() * 9000);
};

  const handleSavePerson = async (e) => {
    e.preventDefault();
    if (!personForm.full_name.trim()) return;

    try {
      const isSiswa = personForm.person_type === 'SISWA';
      const cleanNip = personForm.nip?.trim() || '';
      const cleanNisn = personForm.nisn?.trim() || '';

      const identifier = isSiswa
        ? (cleanNisn || `user-${Date.now()}`)
        : (cleanNip || generateUsernameFromName(personForm.full_name));

      const defaultEmail = personForm.email?.trim() || `${identifier}@spenspra.sch.id`;
      const passToSave = personForm.password?.trim() || (isSiswa ? cleanNisn : (cleanNip || identifier));

      if (editingPersonId) {
        // Mode Edit: Update identitas di school_people
        await schoolPeopleApi.update(editingPersonId, {
          full_name: personForm.full_name.trim(),
          nisn: isSiswa ? cleanNisn : '',
          nip: isSiswa ? '' : cleanNip,
          email: defaultEmail,
          phone: personForm.phone?.trim() || '',
          class_name: personForm.class_name?.trim() || '',
          person_type: personForm.person_type,
        });

        // Sinkronkan ke akun login SSO di tabel accounts jika ada
        const matchingAcc = accounts.find(
          (a) => a.person_id === editingPersonId || a.id === editingPersonId || a.username === identifier
        );
        if (matchingAcc) {
          try {
            await accountApiAdapter.update(matchingAcc.id, {
              full_name: personForm.full_name.trim(),
              email: defaultEmail,
              phone: personForm.phone?.trim() || '',
              class_name: personForm.class_name?.trim() || '',
              password: passToSave,
            });
          } catch (accErr) {
            console.warn('Gagal update akun:', accErr);
          }
        }

        if (passToSave) {
          const updated = {
            ...savedPasswords,
            [editingPersonId]: passToSave,
            [identifier]: passToSave,
          };
          setSavedPasswords(updated);
          try {
            localStorage.setItem('spenspra_staff_passwords', JSON.stringify(updated));
          } catch (err) {}
        }

        setNotice(`Data ${personForm.full_name} berhasil diperbarui.`);
      } else {
        // Mode Tambah Baru: Buat di school_people & accounts
        const createdPerson = await schoolPeopleApi.create({
          ...personForm,
          email: defaultEmail,
        });

        try {
          await accountApiAdapter.create({
            username: identifier,
            email: defaultEmail,
            full_name: personForm.full_name.trim(),
            role_name: personForm.person_type,
            role_id: personForm.person_type,
            nim_nip: personForm.nip?.trim() || personForm.nisn?.trim(),
            nisn: personForm.nisn?.trim() || '',
            phone: personForm.phone?.trim() || '',
            class_name: personForm.class_name?.trim() || '',
            person_id: createdPerson?.id || '',
            password: passToSave,
          });
        } catch (accErr) {
          console.warn('Akun SSO mungkin sudah terbuat:', accErr?.message);
        }

        if (passToSave) {
          const updated = {
            ...savedPasswords,
            [createdPerson?.id || identifier]: passToSave,
            [identifier]: passToSave,
          };
          setSavedPasswords(updated);
          try {
            localStorage.setItem('spenspra_staff_passwords', JSON.stringify(updated));
          } catch (err) {}
        }

        setNotice(`Data ${personForm.full_name} berhasil dibuat & akun SSO aktif (User: ${identifier}).`);
      }

      setIsPersonModalOpen(false);

      loadAll();
    } catch (err) {
      setError(err.message || 'Gagal menyimpan data pengguna.');
    }
  };

  // Hapus Pengguna Terpadu (Cascading delete)
  const handleDeletePerson = async (id, name) => {
    if (
      !window.confirm(
        `Hapus ${name}?\nTindakan ini menghapus data civitas, kartu barcode, akun SSO, dan seluruh akses aplikasi secara permanen.`
      )
    )
      return;

    try {
      // 1. Hapus identitas & barcode
      await schoolPeopleApi.delete(id);

      // 2. Hapus akun SSO login terkait
      const targetPerson = [...students, ...staff].find((p) => p.id === id);
      const identifier = targetPerson?.nisn || targetPerson?.nip;

      const matchingAccounts = accounts.filter(
        (acc) =>
          acc.id === id ||
          acc.person_id === id ||
          (identifier && (acc.nim_nip === identifier || acc.username === identifier || acc.nisn === identifier))
      );

      for (const acc of matchingAccounts) {
        try {
          await accountApiAdapter.delete(acc.id);
        } catch (delErr) {
          console.warn('Gagal menghapus akun terkait:', delErr?.message);
        }
      }

      // 3. Bersihkan cache password & selection jika ada
      setSavedPasswords((prev) => {
        const next = { ...prev };
        delete next[id];
        if (identifier) delete next[identifier];
        try {
          localStorage.setItem('spenspra_staff_passwords', JSON.stringify(next));
        } catch (e) {}
        return next;
      });
      setSelectedStaffIds((prev) => prev.filter((item) => item !== id));
      setSelectedStudentIds((prev) => prev.filter((item) => item !== id));

      setNotice(`Seluruh data & akses ${name} berhasil dihapus dari sistem.`);

      loadAll();
    } catch (err) {
      setError(err.message || 'Gagal menghapus data.');
    }
  };

  // ────────────────────────────────────────────────────────
  // Aksi Seleksi & Hapus Massal Guru & Staf
  // ────────────────────────────────────────────────────────
  const handleToggleSelectStaff = (id) => {
    setSelectedStaffIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAllStaff = () => {
    const pageIds = paginatedStaff.map((p) => p.id);
    const allSelectedOnPage = pageIds.length > 0 && pageIds.every((id) => selectedStaffIds.includes(id));
    if (allSelectedOnPage) {
      setSelectedStaffIds((prev) => prev.filter((id) => !pageIds.includes(id)));
    } else {
      setSelectedStaffIds((prev) => Array.from(new Set([...prev, ...pageIds])));
    }
  };

  const handleSelectAllFilteredStaff = () => {
    setSelectedStaffIds(filteredStaff.map((p) => p.id));
  };

  const handleClearStaffSelection = () => {
    setSelectedStaffIds([]);
  };

  const handleDeleteSelectedStaff = async () => {
    if (selectedStaffIds.length === 0) return;
    const count = selectedStaffIds.length;
    if (
      !window.confirm(
        `Hapus ${count} data guru / staf terpilih?\n\nTindakan ini akan menghapus identitas civitas, kartu barcode, akun SSO, dan akses secara permanen.`
      )
    ) {
      return;
    }

    setIsDeletingBulkStaff(true);
    setNotice(`Sedang menghapus ${count} data guru & akun SSO terkait...`);

    try {
      const selectedPeople = staff.filter((p) => selectedStaffIds.includes(p.id));
      const chunkSize = 5;

      for (let i = 0; i < selectedPeople.length; i += chunkSize) {
        const chunk = selectedPeople.slice(i, i + chunkSize);
        await Promise.all(
          chunk.map(async (person) => {
            try {
              await schoolPeopleApi.delete(person.id);
            } catch (delErr) {
              console.warn('Gagal menghapus person:', person.id, delErr);
            }

            const identifier = person.nip || person.nisn;
            const matching = accounts.filter(
              (acc) =>
                acc.id === person.id ||
                acc.person_id === person.id ||
                (identifier && (acc.nim_nip === identifier || acc.username === identifier || acc.nisn === identifier))
            );

            await Promise.all(
              matching.map((acc) =>
                accountApiAdapter.delete(acc.id).catch((accErr) => {
                  console.warn('Gagal menghapus akun:', acc.id, accErr);
                })
              )
            );
          })
        );
      }

      setSavedPasswords((prev) => {
        const next = { ...prev };
        selectedPeople.forEach((p) => {
          delete next[p.id];
          if (p.nip) delete next[p.nip];
          const username = getStaffUsername(p);
          if (username) delete next[username];
        });
        try {
          localStorage.setItem('spenspra_staff_passwords', JSON.stringify(next));
        } catch (e) {}
        return next;
      });

      setSelectedStaffIds([]);
      setNotice(`Berhasil menghapus ${count} data guru & staf dari sistem.`);

      await loadAll();
    } catch (err) {
      setError(err.message || 'Gagal menghapus data guru terpilih.');
    } finally {
      setIsDeletingBulkStaff(false);
    }
  };

  const handleDeleteAllStaff = async () => {
    if (staff.length === 0) {
      alert('Tidak ada data guru atau tenaga kependidikan untuk dihapus.');
      return;
    }

    const count = staff.length;
    const confirm1 = window.confirm(
      `PERINGATAN: Apakah Anda yakin ingin menghapus SEMUA (${count}) data Guru & Tenaga Kependidikan?\n\n` +
      `Tindakan ini akan:\n` +
      `1. Menghapus seluruh data identitas GTK & barcode token.\n` +
      `2. Menghapus seluruh akun login SSO GTK terkait.\n\n` +
      `Tindakan ini permanen dan TIDAK DAPAT DIBATALKAN. Lanjutkan?`
    );
    if (!confirm1) return;

    setIsDeletingBulkStaff(true);
    setNotice(`Sedang menghapus SEMUA ${count} data guru & akun SSO... Mohon jangan tutup browser.`);

    try {
      const allStaff = [...staff];
      const chunkSize = 5;

      for (let i = 0; i < allStaff.length; i += chunkSize) {
        const chunk = allStaff.slice(i, i + chunkSize);
        await Promise.all(
          chunk.map(async (person) => {
            try {
              await schoolPeopleApi.delete(person.id);
            } catch (e) {
              console.warn('Gagal menghapus person:', person.id, e);
            }

            const identifier = person.nip || person.nisn;
            const matching = accounts.filter(
              (acc) =>
                acc.id === person.id ||
                acc.person_id === person.id ||
                (identifier && (acc.nim_nip === identifier || acc.username === identifier || acc.nisn === identifier))
            );

            await Promise.all(
              matching.map((acc) =>
                accountApiAdapter.delete(acc.id).catch((e) => {
                  console.warn('Gagal menghapus akun:', acc.id, e);
                })
              )
            );
          })
        );
      }

      setSavedPasswords({});
      try {
        localStorage.removeItem('spenspra_staff_passwords');
      } catch (e) {}

      setSelectedStaffIds([]);
      setNotice(`Seluruh data ${count} Guru & Tenaga Kependidikan berhasil dihapus.`);

      await loadAll();
    } catch (err) {
      setError(err.message || 'Gagal menghapus seluruh data guru.');
    } finally {
      setIsDeletingBulkStaff(false);
    }
  };

  // ────────────────────────────────────────────────────────
  // Aksi Seleksi & Hapus Massal Siswa
  // ────────────────────────────────────────────────────────
  const handleToggleSelectStudent = (id) => {
    setSelectedStudentIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAllStudents = () => {
    const pageIds = paginatedStudents.map((s) => s.id);
    const allSelectedOnPage = pageIds.length > 0 && pageIds.every((id) => selectedStudentIds.includes(id));
    if (allSelectedOnPage) {
      setSelectedStudentIds((prev) => prev.filter((id) => !pageIds.includes(id)));
    } else {
      setSelectedStudentIds((prev) => Array.from(new Set([...prev, ...pageIds])));
    }
  };

  const handleSelectAllFilteredStudents = () => {
    setSelectedStudentIds(filteredStudents.map((s) => s.id));
  };

  const handleClearStudentSelection = () => {
    setSelectedStudentIds([]);
  };

  const handleDeleteSelectedStudents = async () => {
    if (selectedStudentIds.length === 0) return;
    const count = selectedStudentIds.length;
    if (
      !window.confirm(
        `Hapus ${count} data siswa yang dipilih?\n\nTindakan ini menghapus data siswa, kartu barcode, dan akun SSO secara permanen.`
      )
    ) {
      return;
    }

    setIsDeletingBulkStudent(true);
    setNotice(`Sedang menghapus ${count} data siswa & akun terkait...`);

    try {
      const selectedPeople = students.filter((s) => selectedStudentIds.includes(s.id));
      const chunkSize = 5;

      for (let i = 0; i < selectedPeople.length; i += chunkSize) {
        const chunk = selectedPeople.slice(i, i + chunkSize);
        await Promise.all(
          chunk.map(async (person) => {
            try {
              await schoolPeopleApi.delete(person.id);
            } catch (e) {}

            const identifier = person.nisn || person.nip;
            const matching = accounts.filter(
              (acc) =>
                acc.id === person.id ||
                acc.person_id === person.id ||
                (identifier && (acc.nim_nip === identifier || acc.username === identifier || acc.nisn === identifier))
            );

            await Promise.all(matching.map((acc) => accountApiAdapter.delete(acc.id).catch(() => {})));
          })
        );
      }

      setSelectedStudentIds([]);
      setNotice(`Berhasil menghapus ${count} data siswa dari sistem.`);

      await loadAll();
    } catch (err) {
      setError(err.message || 'Gagal menghapus beberapa data siswa terpilih.');
    } finally {
      setIsDeletingBulkStudent(false);
    }
  };

  const handleDeleteAllStudents = async () => {
    if (students.length === 0) {
      alert('Tidak ada data siswa untuk dihapus.');
      return;
    }

    const count = students.length;
    const confirm1 = window.confirm(
      `PERINGATAN: Apakah Anda yakin ingin menghapus SEMUA (${count}) data Siswa?\n\n` +
      `Tindakan ini akan:\n` +
      `1. Menghapus seluruh data master identitas siswa & barcode token.\n` +
      `2. Menghapus seluruh akun login SSO siswa terkait.\n\n` +
      `Tindakan ini permanen dan TIDAK DAPAT DIBATALKAN. Lanjutkan?`
    );
    if (!confirm1) return;

    setIsDeletingBulkStudent(true);
    setNotice(`Sedang menghapus seluruh ${count} data siswa... Mohon jangan tutup browser.`);

    try {
      const allStudents = [...students];
      const chunkSize = 5;

      for (let i = 0; i < allStudents.length; i += chunkSize) {
        const chunk = allStudents.slice(i, i + chunkSize);
        await Promise.all(
          chunk.map(async (person) => {
            try {
              await schoolPeopleApi.delete(person.id);
            } catch (e) {}

            const identifier = person.nisn || person.nip;
            const matching = accounts.filter(
              (acc) =>
                acc.id === person.id ||
                acc.person_id === person.id ||
                (identifier && (acc.nim_nip === identifier || acc.username === identifier || acc.nisn === identifier))
            );

            await Promise.all(matching.map((acc) => accountApiAdapter.delete(acc.id).catch(() => {})));
          })
        );
      }

      setSelectedStudentIds([]);
      setNotice(`Seluruh data ${count} Siswa berhasil dihapus.`);

      await loadAll();
    } catch (err) {
      setError(err.message || 'Gagal menghapus seluruh data siswa.');
    } finally {
      setIsDeletingBulkStudent(false);
    }
  };

  // ────────────────────────────────────────────────────────
  // Pengiriman Kredensial Akun Guru
  // ────────────────────────────────────────────────────────
  const handleOpenCredentialModal = (p) => {
    const username = getStaffUsername(p);
    const pwd = getStaffPassword(p);
    const matchingAcc = accounts.find(
      (a) => a.person_id === p.id || a.id === p.id || a.username === username
    );

    setCredentialModal({
      id: p.id,
      accountId: matchingAcc?.id || p.id,
      fullName: p.full_name,
      username: username,
      defaultPassword: pwd,
      email: p.email || matchingAcc?.email || '',
      phone: p.phone || matchingAcc?.phone || '',
    });
  };

  const handleSendEmailDirect = async () => {
    if (!credentialModal) return;
    if (!credentialModal.email) {
      alert('Alamat email belum diisi pada data guru ini. Silakan klik tombol "Edit" dan isi alamat email terlebih dahulu.');
      return;
    }
    setSendingEmail(true);
    try {
      await accountApiAdapter.sendAccessEmail({
        id: credentialModal.accountId || credentialModal.id,
        email: credentialModal.email,
        fullName: credentialModal.fullName,
        username: credentialModal.username,
        password: credentialModal.defaultPassword,
      });
      setNotice(`Kredensial berhasil dikirimkan ke email ${credentialModal.email}.`);

      setCredentialModal(null);
    } catch (err) {
      alert(`Pengiriman via SMTP: ${err.message}\n\nAnda dapat menggunakan tombol alternatif di bawah: "Buka Email Client" atau "Kirim WhatsApp".`);
    } finally {
      setSendingEmail(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="border-b border-slate-200 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Data Master Terpadu SSO
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Pusat master data identitas civitas sekolah, rombongan belajar, semester, dan manajemen kredensial akun.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'rombel' && (
            <button
              onClick={handleOpenAddClass}
              className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 transition shadow-xs cursor-pointer"
            >
              + Tambah Rombel
            </button>
          )}
          {activeTab === 'siswa' && (
            <button
              onClick={() => handleOpenAddPerson('SISWA')}
              className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 transition shadow-xs cursor-pointer"
            >
              + Tambah Siswa Baru
            </button>
          )}
          {activeTab === 'guru_staf' && (
            <button
              onClick={() => handleOpenAddPerson('GURU')}
              className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 transition shadow-xs cursor-pointer"
            >
              + Tambah Guru / Staf
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-800 flex items-center gap-2">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* Floating Toast Notifications */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* Indikator Modul Sub-Menu Aktif (Navigasi via Sidebar) */}
      <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-2.5">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Sub-Menu Aktif:</span>
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200">
            {activeTab === 'rombel' && 'Rombongan Belajar (Rombel)'}
            {activeTab === 'siswa' && 'Data Siswa & Rombel'}
            {activeTab === 'guru_staf' && 'Guru & Tenaga Kependidikan'}
            {activeTab === 'semester' && 'Tahun Ajaran & Semester'}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold">
          {activeTab === 'rombel' && <span>{classes.length} Rombel Terdata</span>}
          {activeTab === 'siswa' && <span>{students.length} Siswa Terdaftar</span>}
          {activeTab === 'guru_staf' && <span>{staff.length} GTK Terdata</span>}
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────── */}
      {/* TAB 1: ROMBONGAN BELAJAR */}
      {/* ──────────────────────────────────────────────────────── */}
      {activeTab === 'rombel' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Daftar Rombel Resmi SMPN 1 Prambon</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Rombel di SSO memuat nama baku, tingkat, dan ruang. Anda dapat menambah, mengubah, dan menghapus rombel sewaktu-waktu.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-3">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Cari nama rombel (mis. VII-A)..."
                  value={rombelSearch}
                  onChange={(e) => setRombelSearch(e.target.value)}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs w-56 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <select
                  value={gradeFilter}
                  onChange={(e) => setGradeFilter(e.target.value)}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                >
                  <option value="ALL">Semua Tingkat</option>
                  <option value="7">Tingkat 7 (Kelas VII)</option>
                  <option value="8">Tingkat 8 (Kelas VIII)</option>
                  <option value="9">Tingkat 9 (Kelas IX)</option>
                </select>
              </div>
              <span className="text-xs text-slate-500">
                {filteredClasses.length} rombel ditemukan
              </span>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {paginatedClasses.length === 0 ? (
                <div className="col-span-full py-8 text-center text-slate-400 text-xs">
                  Tidak ada rombel yang sesuai dengan pencarian atau filter tingkat.
                </div>
              ) : (
                paginatedClasses.map((cls) => (
                  <div
                    key={cls.id || cls.class_code}
                    className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 hover:border-blue-300 hover:bg-blue-50/30 transition flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-base font-extrabold text-blue-900">{cls.class_code}</span>
                        <span className="rounded-md bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                          Tingkat {cls.grade_level || cls.class_code.split('-')[0]}
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-slate-600 font-medium">{cls.room || 'Ruang Kelas'}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">Status: Terdaftar di Database SSO</p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-end gap-2 text-xs">
                      <button
                        onClick={() => handleOpenEditClass(cls)}
                        className="rounded-md px-2 py-1 font-semibold text-blue-700 hover:bg-blue-100/60 transition cursor-pointer"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteClass(cls)}
                        className="rounded-md px-2 py-1 font-semibold text-rose-600 hover:bg-rose-100/60 transition cursor-pointer"
                      >
                        Hapus
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {filteredClasses.length > rombelPageSize && (
              <div className="mt-4">
                <Pagination
                  currentPage={rombelPage}
                  totalItems={filteredClasses.length}
                  pageSize={rombelPageSize}
                  onPageChange={setRombelPage}
                  onPageSizeChange={(newSize) => {
                    setRombelPageSize(newSize);
                    setRombelPage(1);
                  }}
                  pageSizeOptions={[12, 24, 48]}
                  itemLabel="rombel"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────── */}
      {/* TAB 2: DATA SISWA & KEANGGOTAAN ROMBEL */}
      {/* ──────────────────────────────────────────────────────── */}
      {activeTab === 'siswa' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Cari nama atau NISN siswa..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <select
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">Semua Rombel</option>
                {classes.map((c) => (
                  <option key={c.id || c.class_code} value={c.class_code}>
                    {c.class_code}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-500">
                {filteredStudents.length} siswa ditemukan
              </span>
              {students.length > 0 && (
                <button
                  type="button"
                  onClick={handleDeleteAllStudents}
                  disabled={isDeletingBulkStudent}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-200 bg-white hover:bg-rose-50 active:bg-rose-100 text-rose-700 text-xs font-bold transition shadow-2xs cursor-pointer disabled:opacity-50"
                  title="Hapus seluruh data siswa dari database"
                >
                  <svg className="w-3.5 h-3.5 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  <span>Hapus Semua Siswa</span>
                </button>
              )}
            </div>
          </div>

          {/* Bar Aksi Seleksi Massal Siswa */}
          {selectedStudentIds.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-rose-50/90 border border-rose-200 rounded-xl shadow-2xs animate-in fade-in">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-rose-600 text-white text-[11px] font-bold flex items-center justify-center">
                  {selectedStudentIds.length}
                </span>
                <span className="text-xs font-bold text-rose-900">
                  {selectedStudentIds.length} siswa dipilih
                </span>
                {selectedStudentIds.length < filteredStudents.length && (
                  <button
                    type="button"
                    onClick={handleSelectAllFilteredStudents}
                    className="text-xs text-rose-700 hover:text-rose-900 underline font-semibold ml-2 cursor-pointer"
                  >
                    Pilih semua {filteredStudents.length} siswa
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleClearStudentSelection}
                  className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold cursor-pointer"
                >
                  Batal Pilihan
                </button>
                <button
                  type="button"
                  onClick={handleDeleteSelectedStudents}
                  disabled={isDeletingBulkStudent}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  <span>Hapus Terpilih ({selectedStudentIds.length})</span>
                </button>
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[650px] text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-bold uppercase tracking-wider">
                  <th className="py-3 px-3 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={
                        paginatedStudents.length > 0 &&
                        paginatedStudents.every((s) => selectedStudentIds.includes(s.id))
                      }
                      onChange={handleToggleSelectAllStudents}
                      className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer"
                      title="Pilih semua di halaman ini"
                    />
                  </th>
                  <th className="py-3 px-4">Nama Lengkap</th>
                  <th className="py-3 px-4">NISN</th>
                  <th className="py-3 px-4">Rombel</th>
                  <th className="py-3 px-4">Barcode Token</th>
                  <th className="py-3 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedStudents.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      Tidak ada data siswa yang cocok dengan filter atau pencarian.
                    </td>
                  </tr>
                ) : (
                  paginatedStudents.map((s) => (
                    <tr
                      key={s.id}
                      className={
                        selectedStudentIds.includes(s.id)
                          ? 'bg-rose-50/40 hover:bg-rose-50/60 transition'
                          : 'hover:bg-slate-50/70 transition'
                      }
                    >
                      <td className="py-3.5 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={selectedStudentIds.includes(s.id)}
                          onChange={() => handleToggleSelectStudent(s.id)}
                          className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer"
                        />
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900">{s.full_name}</td>
                      <td className="py-3 px-4 font-mono text-slate-600">{s.nisn || '-'}</td>
                      <td className="py-3 px-4">
                        <span className="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-700">
                          {s.class_name || 'Belum ada rombel'}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-blue-700 font-bold">{s.barcode_token}</td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleOpenEditPerson(s)}
                            className="text-xs font-bold text-blue-600 hover:text-blue-800 cursor-pointer"
                          >
                            Edit
                          </button>
                          <span className="text-slate-300">|</span>
                          <button
                            onClick={() => handleDeletePerson(s.id, s.full_name)}
                            className="text-xs font-bold text-rose-600 hover:text-rose-800 cursor-pointer"
                          >
                            Hapus
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            </div>
          </div>

          <Pagination
            currentPage={studentPage}
            totalItems={filteredStudents.length}
            pageSize={studentPageSize}
            onPageChange={setStudentPage}
            onPageSizeChange={(newSize) => {
              setStudentPageSize(newSize);
              setStudentPage(1);
            }}
            pageSizeOptions={[10, 25, 50, 100]}
            itemLabel="siswa"
          />
        </div>
      )}

      {/* ──────────────────────────────────────────────────────── */}
      {/* TAB 3: GURU & TENAGA KEPENDIDIKAN (Dengan Email & No. HP) */}
      {/* ──────────────────────────────────────────────────────── */}
      {activeTab === 'guru_staf' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Cari nama, NIP, atau email..."
                value={staffSearch}
                onChange={(e) => setStaffSearch(e.target.value)}
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <select
                value={staffTypeFilter}
                onChange={(e) => setStaffTypeFilter(e.target.value)}
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
              >
                <option value="ALL">Semua Jenis Identitas</option>
                <option value="GURU">Guru (Tenaga Pendidik)</option>
                <option value="TENAGA_KEPENDIDIKAN">Tenaga Kependidikan (TU/Staf)</option>
                <option value="KEPALA_SEKOLAH">Kepala Sekolah</option>
              </select>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-500">
                {filteredStaff.length} orang ditemukan
              </span>
              {staff.length > 0 && (
                <button
                  type="button"
                  onClick={handleDeleteAllStaff}
                  disabled={isDeletingBulkStaff}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-200 bg-white hover:bg-rose-50 active:bg-rose-100 text-rose-700 text-xs font-bold transition shadow-2xs cursor-pointer disabled:opacity-50"
                  title="Hapus seluruh data Guru & Tenaga Kependidikan dari database"
                >
                  <svg className="w-3.5 h-3.5 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  <span>Hapus Semua Guru</span>
                </button>
              )}
            </div>
          </div>

          {/* Bar Aksi Seleksi Massal Guru & Staf */}
          {selectedStaffIds.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-rose-50/90 border border-rose-200 rounded-xl shadow-2xs animate-in fade-in">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-rose-600 text-white text-[11px] font-bold flex items-center justify-center">
                  {selectedStaffIds.length}
                </span>
                <span className="text-xs font-bold text-rose-900">
                  {selectedStaffIds.length} guru & staf dipilih
                </span>
                {selectedStaffIds.length < filteredStaff.length && (
                  <button
                    type="button"
                    onClick={handleSelectAllFilteredStaff}
                    className="text-xs text-rose-700 hover:text-rose-900 underline font-semibold ml-2 cursor-pointer"
                  >
                    Pilih semua {filteredStaff.length} orang
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleClearStaffSelection}
                  className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold cursor-pointer"
                >
                  Batal Pilihan
                </button>
                <button
                  type="button"
                  onClick={handleDeleteSelectedStaff}
                  disabled={isDeletingBulkStaff}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  <span>Hapus Terpilih ({selectedStaffIds.length})</span>
                </button>
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-left text-xs">
              <thead>
                <tr className="border-b border-[#E5E7EB] bg-[#F8F9FC] text-[#667085] font-semibold text-xs uppercase tracking-wider">
                  <th className="py-3 px-3 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={
                        paginatedStaff.length > 0 &&
                        paginatedStaff.every((p) => selectedStaffIds.includes(p.id))
                      }
                      onChange={handleToggleSelectAllStaff}
                      className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer"
                      title="Pilih semua di halaman ini"
                    />
                  </th>
                  <th className="py-3 px-4">Nama Pendidik & NIP</th>
                  <th className="py-3 px-4">Jenis Identitas</th>
                  <th className="py-3 px-4">Email & Kontak</th>
                  <th className="py-3 px-4">Barcode Token</th>
                  <th className="py-3 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {paginatedStaff.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-[#98A2B3]">
                      Tidak ada pendidik atau staf yang sesuai dengan filter atau pencarian.
                    </td>
                  </tr>
                ) : (
                  paginatedStaff.map((p) => {
                    const isSelected = selectedStaffIds.includes(p.id);
                    return (
                      <tr
                        key={p.id}
                        className={
                          isSelected
                            ? 'bg-rose-50/40 hover:bg-rose-50/60 transition'
                            : 'hover:bg-[#FAF9FD] transition'
                        }
                      >
                        <td className="py-3.5 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelectStaff(p.id)}
                            className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer"
                          />
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-[#EDEAF5] text-[#3D2E66] font-bold text-xs flex items-center justify-center shrink-0">
                              {p.full_name?.slice(0, 2).toUpperCase() || 'GT'}
                            </div>
                            <div>
                              <div className="font-bold text-[#172033] text-sm">{p.full_name}</div>
                              {p.nip ? (
                                <div className="text-[11px] font-mono text-[#667085]">NIP: {p.nip}</div>
                              ) : (
                                <div className="text-[10px] text-[#A97E0D] font-medium">Tanpa NIP (Akun Nama)</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="rounded-full bg-[#EDEAF5] px-2.5 py-0.5 text-[11px] font-semibold text-[#30264F]">
                            {p.person_type}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="text-[#172033] font-medium">{p.email || '-'}</div>
                          <div className="text-[#667085] font-mono text-[11px]">{p.phone || '-'}</div>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-[#4F8FBB] font-semibold">
                          {p.barcode_token}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <div className="inline-flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenDetailStaff(p)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#4B3B78] hover:bg-[#3D2E66] active:bg-[#30264F] text-white text-xs font-semibold transition shadow-xs cursor-pointer"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                              <span>Lihat Detail</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeletePerson(p.id, p.full_name)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white hover:bg-rose-50 active:bg-rose-100 text-rose-600 hover:text-rose-700 border border-rose-200 text-xs font-semibold transition shadow-2xs cursor-pointer"
                              title={`Hapus ${p.full_name}`}
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              <span>Hapus</span>
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

          <Pagination
            currentPage={staffPage}
            totalItems={filteredStaff.length}
            pageSize={staffPageSize}
            onPageChange={setStaffPage}
            onPageSizeChange={(newSize) => {
              setStaffPageSize(newSize);
              setStaffPage(1);
            }}
            pageSizeOptions={[10, 25, 50, 100]}
            itemLabel="pendidik & staf"
          />
        </div>
      )}

      {/* ──────────────────────────────────────────────────────── */}
      {/* TAB 4: TAHUN AJARAN & SEMESTER */}
      {/* ──────────────────────────────────────────────────────── */}
      {activeTab === 'semester' && (
        <div className="space-y-6">
          {/* Card Utama: Periode Aktif Berjalan */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-bold text-emerald-800">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Periode Akademik Aktif Berjalan
                </span>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight mt-2.5">
                  Tahun Ajaran {academicPeriod.year}
                </h2>
                <p className="text-sm font-semibold text-blue-700 mt-0.5">
                  Semester {academicPeriod.semester === 'GENAP' ? 'Genap (Semester II)' : 'Ganjil (Semester I)'}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleOpenEditPeriod}
                  className="rounded-xl bg-[#193D9B] hover:bg-[#153280] text-white px-4 py-2.5 text-xs font-bold shadow-xs hover:shadow-sm transition cursor-pointer flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  <span>Ganti Semester / Periode Aktif</span>
                </button>
              </div>
            </div>

            {/* Parameter & Ketentuan Standar */}
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <p className="text-xs font-semibold text-slate-500">Standar KKM Sekolah</p>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-2xl font-black text-slate-900">{academicPeriod.kkm}</span>
                  <span className="text-xs font-bold text-emerald-600">Skala 0 - 100</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Acuan ketuntasan minimal e-Rapor</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <p className="text-xs font-semibold text-slate-500">Rentang Waktu Semester</p>
                <div className="mt-1 text-sm font-bold text-slate-800">
                  {academicPeriod.startDate} s/d {academicPeriod.endDate}
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Kalender pendidikan resmi</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <p className="text-xs font-semibold text-slate-500">Status Integrasi Modul</p>
                <div className="mt-1 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-sm font-bold text-emerald-700">Tersinkronisasi Penuh</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">e-Rapor & Perpustakaan Digital</p>
              </div>
            </div>
          </div>

          {/* Card Referensi: Skala Predikat Kurikulum Merdeka */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900">Skala Predikat Penilaian Rapor (SMPN 1 Prambon)</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Rumusan interval predikat otomatis yang diterapkan pada nilai akhir e-Rapor:
            </p>

            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                <span className="text-xs font-bold text-emerald-700">Predikat A</span>
                <p className="text-lg font-black text-emerald-900 mt-0.5">88 – 100</p>
                <p className="text-[11px] text-emerald-600 font-semibold">Sangat Baik</p>
              </div>
              <div className="p-3 rounded-xl bg-blue-50 border border-blue-200">
                <span className="text-xs font-bold text-blue-700">Predikat B</span>
                <p className="text-lg font-black text-blue-900 mt-0.5">76 – 87</p>
                <p className="text-[11px] text-blue-600 font-semibold">Baik (Tuntas)</p>
              </div>
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
                <span className="text-xs font-bold text-amber-700">Predikat C</span>
                <p className="text-lg font-black text-amber-900 mt-0.5">65 – 75</p>
                <p className="text-[11px] text-amber-600 font-semibold">Cukup (Ambang Batas)</p>
              </div>
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200">
                <span className="text-xs font-bold text-rose-700">Predikat D</span>
                <p className="text-lg font-black text-rose-900 mt-0.5">&lt; 65</p>
                <p className="text-[11px] text-rose-600 font-semibold">Perlu Bimbingan</p>
              </div>
            </div>
          </div>

          {/* Tabel Riwayat & Arsip Periode Akademik */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Riwayat Periode Akademik</h3>
                <p className="text-xs text-slate-500 mt-0.5">Daftar semester aktif dan arsip semester sebelumnya</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    <th className="p-3.5">Tahun Ajaran</th>
                    <th className="p-3.5">Semester</th>
                    <th className="p-3.5">Rentang Tanggal</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {periodHistory.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-slate-400">
                        Belum ada riwayat periode akademik yang tersimpan.
                      </td>
                    </tr>
                  ) : (
                    periodHistory.map((item) => {
                      const isCurrent = item.status === 'AKTIF';
                      return (
                        <tr key={item.id} className={isCurrent ? 'bg-emerald-50/30' : 'hover:bg-slate-50/60'}>
                          <td className="p-3.5 font-bold text-slate-900">{item.year}</td>
                          <td className="p-3.5 font-semibold text-slate-700">
                            {item.semester === 'GENAP' ? 'Genap (Semester 2)' : 'Ganjil (Semester 1)'}
                          </td>
                          <td className="p-3.5 text-slate-600">
                            {item.startDate ? `${item.startDate} — ${item.endDate}` : '-'}
                          </td>
                          <td className="p-3.5">
                            {isCurrent ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                                Aktif Berjalan
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600">
                                Arsip / Ditutup
                              </span>
                            )}
                          </td>
                          <td className="p-3.5 text-right">
                            {isCurrent ? (
                              <span className="text-xs font-bold text-emerald-700">Sedang Digunakan</span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleQuickActivatePeriod(item)}
                                className="text-xs font-bold text-blue-600 hover:text-blue-800 cursor-pointer"
                              >
                                Jadikan Aktif
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────── */}
      {/* MODAL TAMBAH / EDIT ROMBEL */}
      {/* ──────────────────────────────────────────────────────── */}
      {isClassModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-base font-bold text-slate-900">
              {editingClassId ? 'Edit Rombongan Belajar' : 'Tambah Rombongan Belajar (Rombel)'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Format baku contoh: VII-A, VIII-B, IX-C.</p>

            <form onSubmit={handleSaveClass} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Rombel *</label>
                <input
                  type="text"
                  required
                  placeholder="cth: VII-A"
                  value={classForm.class_code}
                  onChange={(e) => setClassForm({ ...classForm, class_code: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Tingkat Kelas</label>
                <select
                  value={classForm.grade_level}
                  onChange={(e) => setClassForm({ ...classForm, grade_level: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="7">Tingkat 7 (Kelas VII)</option>
                  <option value="8">Tingkat 8 (Kelas VIII)</option>
                  <option value="9">Tingkat 9 (Kelas IX)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Ruang Kelas</label>
                <input
                  type="text"
                  placeholder="cth: Ruang 101"
                  value={classForm.room}
                  onChange={(e) => setClassForm({ ...classForm, room: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsClassModalOpen(false)}
                  className="flex-1 rounded-xl border border-slate-200 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-blue-600 py-2 text-xs font-bold text-white hover:bg-blue-700 cursor-pointer"
                >
                  Simpan Rombel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────── */}
      {/* MODAL TAMBAH / EDIT CIVITAS (SISWA / GURU / STAF) */}
      {/* ──────────────────────────────────────────────────────── */}
      {isPersonModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-base font-bold text-slate-900">
              {editingPersonId ? 'Edit Data' : 'Tambah'}{' '}
              {personForm.person_type === 'SISWA' ? 'Siswa' : 'Guru / Staf'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Akun login SSO dan barcode akan disinkronkan secara otomatis.
            </p>

            <form onSubmit={handleSavePerson} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Lengkap *</label>
                <input
                  type="text"
                  required
                  placeholder="Nama lengkap"
                  value={personForm.full_name}
                  onChange={(e) => setPersonForm({ ...personForm, full_name: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {personForm.person_type === 'SISWA' ? (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">NISN *</label>
                    <input
                      type="text"
                      required
                      placeholder="Nomor Induk Siswa Nasional"
                      value={personForm.nisn}
                      onChange={(e) => setPersonForm({ ...personForm, nisn: e.target.value })}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Rombongan Belajar</label>
                    <select
                      value={personForm.class_name}
                      onChange={(e) => setPersonForm({ ...personForm, class_name: e.target.value })}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                    >
                      <option value="">Pilih Rombel...</option>
                      {classes.map((c) => (
                        <option key={c.id || c.class_code} value={c.class_code}>
                          {c.class_code}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-slate-700">NIP (Opsional)</label>
                      <span className="text-[10px] text-slate-400">Boleh dikosongkan jika belum ada NIP</span>
                    </div>
                    <input
                      type="text"
                      placeholder="Nomor Induk Pegawai (bisa dikosongkan)"
                      value={personForm.nip}
                      onChange={(e) => setPersonForm({ ...personForm, nip: e.target.value })}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">
                      Bila NIP kosong, username akun login SSO otomatis dibuat dari nama guru ({generateUsernameFromName(personForm.full_name || 'nama_guru')}).
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Jenis Identitas</label>
                    <select
                      value={personForm.person_type}
                      onChange={(e) => setPersonForm({ ...personForm, person_type: e.target.value })}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="GURU">Guru (Tenaga Pendidik)</option>
                      <option value="TENAGA_KEPENDIDIKAN">Tenaga Kependidikan (TU/Staff)</option>
                      <option value="KEPALA_SEKOLAH">Kepala Sekolah</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Alamat Email *</label>
                    <input
                      type="email"
                      required
                      placeholder="nama@spenspra.sch.id / email guru"
                      value={personForm.email}
                      onChange={(e) => setPersonForm({ ...personForm, email: e.target.value })}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-[10px] text-slate-400 mt-0.5">Digunakan untuk mengirimkan informasi akun dan reset password.</p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Nomor WhatsApp / HP</label>
                    <input
                      type="tel"
                      placeholder="08123456789"
                      value={personForm.phone}
                      onChange={(e) => setPersonForm({ ...personForm, phone: e.target.value })}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-slate-700">Kata Sandi Akun SSO</label>
                      <span className="text-[10px] text-slate-400">Password login guru</span>
                    </div>
                    <div className="relative">
                      <input
                        type={showPersonPassword ? 'text' : 'password'}
                        placeholder={editingPersonId ? 'Biarkan atau ubah sandi' : 'Default: NIP / Username'}
                        value={personForm.password || ''}
                        onChange={(e) => setPersonForm({ ...personForm, password: e.target.value })}
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPersonPassword(!showPersonPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs cursor-pointer p-1"
                        title={showPersonPassword ? 'Sembunyikan Sandi' : 'Lihat Sandi'}
                      >
                        {showPersonPassword ? '🙈' : '👁️'}
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">
                      Admin dapat menentukan sandi langsung di sini. Jika dikosongkan, sandi default adalah NIP atau Username.
                    </p>
                  </div>
                </>
              )}

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsPersonModalOpen(false)}
                  className="flex-1 rounded-xl border border-slate-200 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-blue-600 py-2 text-xs font-bold text-white hover:bg-blue-700 cursor-pointer"
                >
                  Simpan & Sinkronkan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────── */}
      {/* MODAL PENGIRIMAN KREDENSIAL GURU */}
      {/* ──────────────────────────────────────────────────────── */}
      {credentialModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Kirim Akses Akun SSO</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Kirimkan detail login (Username & Password) kepada {credentialModal.fullName}.
                </p>
              </div>
              <button
                onClick={() => setCredentialModal(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50/50 p-4 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Nama Pengguna:</span>
                <span className="font-bold text-slate-900">{credentialModal.fullName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Username SSO:</span>
                <span className="font-mono font-bold text-blue-700">{credentialModal.username}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Password Default:</span>
                <span className="font-mono font-bold text-slate-800">{credentialModal.defaultPassword}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Email Tujuan:</span>
                <span className="font-semibold text-slate-800">{credentialModal.email || 'Belum diisi'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">No. WhatsApp:</span>
                <span className="font-semibold text-slate-800">{credentialModal.phone || 'Belum diisi'}</span>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <p className="text-xs font-bold text-slate-700">Pilih Metode Pengiriman:</p>

              <div className="grid gap-2 sm:grid-cols-2">
                {/* 1. Kirim Email Langsung via SMTP Backend */}
                <button
                  type="button"
                  disabled={sendingEmail || !credentialModal.email}
                  onClick={handleSendEmailDirect}
                  className="rounded-xl border border-blue-200 bg-blue-50/70 p-3 text-left hover:bg-blue-100/70 transition cursor-pointer disabled:opacity-50"
                >
                  <p className="text-xs font-bold text-blue-900">
                    {sendingEmail ? 'Sedang Mengirim...' : '📨 Kirim Email Otomatis'}
                  </p>
                  <p className="text-[10px] text-blue-700 mt-0.5">Kirim notifikasi akun via server email</p>
                </button>

                {/* 2. Buka Mail Client (Mailto) */}
                <a
                  href={`mailto:${credentialModal.email}?subject=Kredensial%20Akun%20SSO%20SMPN%201%20Prambon&body=Yth.%20${encodeURIComponent(
                    credentialModal.fullName
                  )},%0A%0ABerikut%20adalah%20informasi%20akses%20akun%20SSO%20SMPN%201%20Prambon%20Anda:%0A- Username:%20${encodeURIComponent(
                    credentialModal.username
                  )}%0A- Password:%20${encodeURIComponent(
                    credentialModal.defaultPassword
                  )}%0A- Tautan:%20http://sso.localhost/login%0A%0ASilakan%20login%20dan%20segera%20ganti%20password%20Anda.`}
                  className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-left hover:bg-slate-100 transition cursor-pointer"
                >
                  <p className="text-xs font-bold text-slate-900">✉️ Buka Email Client</p>
                  <p className="text-[10px] text-slate-600 mt-0.5">Buka via Outlook / Gmail langsung</p>
                </a>

                {/* 3. Kirim via WhatsApp */}
                <a
                  href={`https://wa.me/${(credentialModal.phone || '').replace(/[^0-9]/g, '')}?text=Halo%20${encodeURIComponent(
                    credentialModal.fullName
                  )},%20berikut%20adalah%20akun%20SSO%20SMPN%201%20Prambon%20Anda:%0AUsername:%20${encodeURIComponent(
                    credentialModal.username
                  )}%0APassword:%20${encodeURIComponent(
                    credentialModal.defaultPassword
                  )}%0APortal:%20http://sso.localhost/login`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 text-left hover:bg-emerald-100/70 transition cursor-pointer"
                >
                  <p className="text-xs font-bold text-emerald-900">💬 Kirim via WhatsApp</p>
                  <p className="text-[10px] text-emerald-700 mt-0.5">Kirimkan format teks via WhatsApp Web</p>
                </a>

                {/* 4. Salin Teks Kredensial */}
                <button
                  type="button"
                  onClick={() => {
                    const text = `Akun SSO SMPN 1 Prambon:\nNama: ${credentialModal.fullName}\nUsername: ${credentialModal.username}\nPassword: ${credentialModal.defaultPassword}\nPortal: http://sso.localhost/login`;
                    navigator.clipboard.writeText(text);
                    setNotice('Kredensial berhasil disalin ke clipboard!');

                  }}
                  className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-left hover:bg-slate-100 transition cursor-pointer"
                >
                  <p className="text-xs font-bold text-slate-900">📋 Salin Teks</p>
                  <p className="text-[10px] text-slate-600 mt-0.5">Salin informasi akun ke clipboard</p>
                </button>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setCredentialModal(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────── */}
      {/* MODAL UBAH PERIODE AKADEMIK (TAHUN AJARAN & SEMESTER) */}
      {/* ──────────────────────────────────────────────────────── */}
      {isPeriodModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Ubah Periode Akademik Aktif
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tentukan tahun ajaran dan semester aktif untuk e-Rapor dan sistem sekolah.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsPeriodModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveAcademicPeriod} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tahun Ajaran *
                </label>
                <select
                  value={periodForm.year}
                  onChange={(e) => setPeriodForm({ ...periodForm, year: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white cursor-pointer"
                >
                  <option value="2024/2025">2024/2025</option>
                  <option value="2025/2026">2025/2026 (Tahun Berjalan)</option>
                  <option value="2026/2027">2026/2027</option>
                  <option value="2027/2028">2027/2028</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Semester Aktif *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPeriodForm({ ...periodForm, semester: 'GANJIL' })}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition cursor-pointer ${
                      periodForm.semester === 'GANJIL'
                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Semester Ganjil (1)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPeriodForm({ ...periodForm, semester: 'GENAP' })}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition cursor-pointer ${
                      periodForm.semester === 'GENAP'
                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Semester Genap (2)
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tanggal Mulai
                  </label>
                  <input
                    type="date"
                    value={periodForm.startDate}
                    onChange={(e) => setPeriodForm({ ...periodForm, startDate: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tanggal Selesai
                  </label>
                  <input
                    type="date"
                    value={periodForm.endDate}
                    onChange={(e) => setPeriodForm({ ...periodForm, endDate: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Standar KKM Sekolah (Ketuntasan Minimal)
                </label>
                <input
                  type="number"
                  min="50"
                  max="100"
                  value={periodForm.kkm}
                  onChange={(e) => setPeriodForm({ ...periodForm, kkm: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                />
              </div>

              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-800 space-y-1">
                <p className="font-bold">⚠️ Perhatian Pengubahan Periode:</p>
                <p>Mengubah periode aktif akan memperbarui acuan nilai dan absensi pada seluruh portal aplikasi (e-Rapor & Perpustakaan).</p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsPeriodModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[#4B3B78] px-5 py-2 text-xs font-bold text-white hover:bg-[#3D2E66] shadow-xs cursor-pointer"
                >
                  Terapkan & Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────── */}
      {/* MODAL LIHAT DETAIL PENDIDIK & STAF */}
      {/* ──────────────────────────────────────────────────────── */}
      {isDetailStaffModalOpen && detailStaffModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            {/* Header Modal */}
            <div className="flex items-start justify-between border-b border-[#E5E7EB] pb-3">
              <div>
                <h3 className="text-base font-bold text-[#172033]">
                  Detail Profil & Kredensial Pendidik
                </h3>
                <p className="text-xs text-[#667085] mt-0.5">
                  Rincian identitas lengkap dan informasi akses login SSO civitas sekolah.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsDetailStaffModalOpen(false);
                  setDetailStaffModal(null);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="mt-5 space-y-4">
              {/* Card Profil Utama */}
              <div className="p-4 rounded-xl bg-[#F8F9FC] border border-[#E5E7EB] flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-full bg-[#EDEAF5] text-[#4B3B78] font-black text-base flex items-center justify-center shrink-0 border border-[#CBD5E1]">
                  {detailStaffModal.full_name?.slice(0, 2).toUpperCase() || 'GT'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-bold text-[#172033] text-base leading-snug truncate">
                      {detailStaffModal.full_name}
                    </h4>
                    <span className="rounded-full bg-[#EDEAF5] px-2.5 py-0.5 text-[11px] font-semibold text-[#30264F] border border-[#7C6FA0]/30">
                      {detailStaffModal.person_type}
                    </span>
                  </div>
                  <div className="text-xs font-mono text-[#667085] mt-0.5">
                    {detailStaffModal.nip ? `NIP: ${detailStaffModal.nip}` : 'Tanpa NIP (Pendidik Terdaftar)'}
                  </div>
                </div>
              </div>

              {/* Box Kredensial Akun SSO */}
              <div className="rounded-xl border border-[#EDEAF5] bg-gradient-to-br from-[#FAF9FD] to-white p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-2">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-[#30264F]">
                    <span>🔐</span>
                    <span>Kredensial Akun Login SSO</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const user = getStaffUsername(detailStaffModal);
                      const pass = getStaffPassword(detailStaffModal);
                      const msg = `*AKUN SSO SMPN 1 PRAMBON*\n\nNama: ${detailStaffModal.full_name}\nUsername: ${user}\nPassword: ${pass}\n\nLogin ke: http://sso.localhost`;
                      navigator.clipboard.writeText(msg);
                      setNotice('Format kredensial akun berhasil disalin ke clipboard.');

                    }}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-[#4B3B78] hover:text-[#30264F] cursor-pointer"
                  >
                    <span>📋</span>
                    <span>Salin Info Lengkap</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {/* Kolom Username */}
                  <div className="space-y-1">
                    <span className="text-[11px] font-medium text-[#667085]">Username SSO:</span>
                    <div className="flex items-center justify-between gap-1 p-2 bg-white rounded-lg border border-[#CBD5E1]">
                      <span className="font-mono font-bold text-[#172033] truncate">
                        {getStaffUsername(detailStaffModal)}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(getStaffUsername(detailStaffModal));
                          setNotice('Username disalin.');

                        }}
                        className="text-slate-400 hover:text-[#4B3B78] text-xs p-1 cursor-pointer"
                        title="Salin Username"
                      >
                        📋
                      </button>
                    </div>
                  </div>

                  {/* Kolom Password */}
                  <div className="space-y-1">
                    <span className="text-[11px] font-medium text-[#667085]">Kata Sandi SSO:</span>
                    <div className="flex items-center justify-between gap-1 p-2 bg-white rounded-lg border border-[#CBD5E1]">
                      <span className="font-mono font-bold text-[#172033] truncate">
                        {showDetailPassword ? getStaffPassword(detailStaffModal) : '••••••••••••'}
                      </span>
                      <div className="flex items-center gap-0.5">
                        <button
                          type="button"
                          onClick={() => setShowDetailPassword(!showDetailPassword)}
                          className="text-slate-400 hover:text-slate-700 text-xs p-1 cursor-pointer"
                          title={showDetailPassword ? 'Sembunyikan Sandi' : 'Lihat Sandi'}
                        >
                          {showDetailPassword ? '🙈' : '👁️'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(getStaffPassword(detailStaffModal));
                            setNotice('Kata sandi disalin.');

                          }}
                          className="text-slate-400 hover:text-[#4B3B78] text-xs p-1 cursor-pointer"
                          title="Salin Kata Sandi"
                        >
                          📋
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      const target = detailStaffModal;
                      setIsDetailStaffModalOpen(false);
                      handleOpenPasswordModal(target);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#7C6FA0] bg-white text-[#4B3B78] hover:bg-[#EDEAF5] text-xs font-bold transition shadow-2xs cursor-pointer"
                  >
                    <span>🔑</span>
                    <span>Ubah / Atur Kata Sandi</span>
                  </button>
                </div>
              </div>

              {/* Data Kontak & Barcode */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-[#F8F9FC] border border-[#E5E7EB] space-y-1">
                  <span className="text-[11px] font-semibold text-[#667085]">Email Civitas:</span>
                  <div className="font-medium text-[#172033] break-all">{detailStaffModal.email || '-'}</div>
                </div>
                <div className="p-3 rounded-xl bg-[#F8F9FC] border border-[#E5E7EB] space-y-1">
                  <span className="text-[11px] font-semibold text-[#667085]">Nomor HP / WhatsApp:</span>
                  <div className="font-mono font-medium text-[#172033]">{detailStaffModal.phone || '-'}</div>
                </div>
              </div>

              {/* Barcode Token Card */}
              <div className="p-3 rounded-xl bg-[#F8F9FC] border border-[#E5E7EB] space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[#667085]">Barcode Token Kartu Digital:</span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(detailStaffModal.barcode_token || '');
                      setNotice('Barcode token disalin.');

                    }}
                    className="text-[11px] text-[#4F8FBB] hover:underline font-semibold cursor-pointer"
                  >
                    Salin Token
                  </button>
                </div>
                <div className="font-mono text-xs text-[#4F8FBB] font-bold break-all bg-white p-2 rounded-lg border border-[#BBD6E8]">
                  {detailStaffModal.barcode_token || '-'}
                </div>
              </div>
            </div>

            {/* Footer Aksi Modal */}
            <div className="mt-6 pt-4 border-t border-[#E5E7EB] flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => {
                  const target = detailStaffModal;
                  setIsDetailStaffModalOpen(false);
                  setDetailStaffModal(null);
                  handleDeletePerson(target.id, target.full_name);
                }}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 transition cursor-pointer"
              >
                Hapus Guru
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const target = detailStaffModal;
                    setIsDetailStaffModalOpen(false);
                    setDetailStaffModal(null);
                    handleOpenEditPerson(target);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[#4B3B78] bg-[#EDEAF5] hover:bg-[#DDD8EE] transition cursor-pointer"
                >
                  ✏️ Edit Data
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsDetailStaffModalOpen(false);
                    setDetailStaffModal(null);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#4B3B78] hover:bg-[#3D2E66] transition shadow-xs cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────── */}
      {/* MODAL KHUSUS: ATUR KATA SANDI AKUN GURU */}
      {/* ──────────────────────────────────────────────────────── */}
      {isPasswordModalOpen && passwordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Kelola & Atur Kata Sandi Guru
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Admin dapat melihat dan menentukan kata sandi login akun {passwordModal.fullName}.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsPasswordModalOpen(false);
                  setPasswordModal(null);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePasswordModal} className="mt-4 space-y-4">
              <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3 space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Nama Lengkap:</span>
                  <span className="font-bold text-slate-900">{passwordModal.fullName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Username Login SSO:</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-bold text-blue-700 bg-white px-2 py-0.5 rounded border border-blue-200">
                      {passwordModal.username}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(passwordModal.username);
                        setNotice('Username disalin ke clipboard.');

                      }}
                      className="text-slate-400 hover:text-blue-600 cursor-pointer"
                      title="Salin Username"
                    >
                      📋
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Kata Sandi Akun *
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setPasswordModal({
                        ...passwordModal,
                        password: passwordModal.username || 'Spenspra2026',
                      });
                    }}
                    className="text-[11px] font-bold text-blue-600 hover:text-blue-800 cursor-pointer"
                  >
                    Set ke Username Default
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showModalPassword ? 'text' : 'password'}
                    required
                    value={passwordModal.password}
                    onChange={(e) => setPasswordModal({ ...passwordModal, password: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                    placeholder="Masukkan kata sandi baru"
                  />
                  <button
                    type="button"
                    onClick={() => setShowModalPassword(!showModalPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs cursor-pointer p-1"
                    title={showModalPassword ? 'Sembunyikan Sandi' : 'Lihat Sandi'}
                  >
                    {showModalPassword ? '🙈' : '👁️'}
                  </button>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  Klik icon mata untuk melihat kata sandi. Guru dapat langsung menggunakan sandi ini untuk login SSO dan e-Rapor.
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsPasswordModalOpen(false);
                    setPasswordModal(null);
                  }}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[#4B3B78] px-5 py-2 text-xs font-bold text-white hover:bg-[#3D2E66] shadow-xs cursor-pointer"
                >
                  Simpan Perubahan Sandi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function MasterDataPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[400px] flex items-center justify-center p-8 text-slate-500 text-sm">
          <div className="inline-flex items-center gap-2">
            <span className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span>Memuat Modul Data Master...</span>
          </div>
        </div>
      }
    >
      <MasterDataContent />
    </Suspense>
  );
}
