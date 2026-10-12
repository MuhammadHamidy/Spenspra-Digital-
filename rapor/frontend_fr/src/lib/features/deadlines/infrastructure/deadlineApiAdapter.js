const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';

const DEFAULT_DEADLINES = [
  {
    id: 'dl-pts-1',
    type: 'PTS',
    title: 'Penilaian Tengah Semester (PTS) Ganjil',
    deadline_at: '2026-10-20T23:59:00.000Z',
    is_open: true,
    announcement: 'Batas akhir penginputan nilai PTS oleh guru mata pelajaran di SMPN 1 Prambon. Mohon selesaikan sebelum tenggat waktu.',
    academic_year: '2026/2027',
    semester: '1',
  },
  {
    id: 'dl-uas-1',
    type: 'UAS',
    title: 'Penilaian Akhir Semester (PAS/SAS) Ganjil',
    deadline_at: '2026-11-15T23:59:00.000Z',
    is_open: true,
    announcement: 'Batas akhir penginputan nilai akhir semester untuk penerbitan dan cetak buku rapor.',
    academic_year: '2026/2027',
    semester: '1',
  },
];

const STORAGE_KEY = 'spenspra_rapor_deadlines';

function getLocalDeadlines() {
  if (typeof window === 'undefined') return DEFAULT_DEADLINES;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return DEFAULT_DEADLINES;
}

function saveLocalDeadlines(list) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {}
}

export const deadlineApiAdapter = {
  getDeadlines: async () => {
    try {
      const res = await fetch(`${BASE_URL}/grades/deadlines`, {
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          saveLocalDeadlines(json.data);
          return json.data;
        }
      }
    } catch (e) {
      console.warn('Backend deadlines offline, menggunakan local cache:', e.message);
    }
    return getLocalDeadlines();
  },

  saveDeadline: async (deadlineData) => {
    // 1. Simpan ke local cache terlebih dahulu
    const current = getLocalDeadlines();
    const idx = current.findIndex((d) => d.id === deadlineData.id || d.type === deadlineData.type);
    let updatedList;
    if (idx >= 0) {
      updatedList = current.map((d, i) => (i === idx ? { ...d, ...deadlineData } : d));
    } else {
      updatedList = [...current, { ...deadlineData, id: deadlineData.id || `dl-${Date.now()}` }];
    }
    saveLocalDeadlines(updatedList);

    // 2. Simpan ke backend
    try {
      const res = await fetch(`${BASE_URL}/grades/deadlines`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(deadlineData),
      });
      if (res.ok) {
        const json = await res.json();
        return json.data || deadlineData;
      }
    } catch (e) {
      console.warn('Gagal sync deadline ke backend:', e.message);
    }

    return deadlineData;
  },

  deleteDeadline: async (id) => {
    // 1. Simpan ke local cache
    const current = getLocalDeadlines();
    const updatedList = current.filter((d) => d.id !== id && d.type !== id);
    saveLocalDeadlines(updatedList);

    // 2. Sync ke backend
    try {
      await fetch(`${BASE_URL}/grades/deadlines/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (e) {
      console.warn('Gagal sync hapus deadline ke backend:', e.message);
    }

    return updatedList;
  },
};
