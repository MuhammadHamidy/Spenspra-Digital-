'use client';

import React, { useEffect, useMemo, useState } from 'react';
import AppIcon from '@/components/AppIcon';

export const QUESTION_TYPE_META = {
  MCQ: { label: 'Pilihan Ganda', badge: 'bg-primary-100 text-primary-800 border-primary-200', dot: 'bg-primary-500' },
  COMPLEX_MCQ: { label: 'PG Kompleks', badge: 'bg-blue-100 text-blue-800 border-blue-200', dot: 'bg-blue-500' },
  TRUE_FALSE: { label: 'Benar / Salah', badge: 'bg-emerald-100 text-emerald-800 border-emerald-200', dot: 'bg-emerald-500' },
  MATCHING: { label: 'Menjodohkan', badge: 'bg-violet-100 text-violet-800 border-violet-200', dot: 'bg-violet-500' },
  ESSAY: { label: 'Esai', badge: 'bg-amber-100 text-amber-800 border-amber-200', dot: 'bg-amber-500' },
};

export const getTypeMeta = (type) => QUESTION_TYPE_META[type] || QUESTION_TYPE_META.MCQ;

export const getCorrectKeys = (q) => {
  if (!q) return [];
  if (q.type === 'COMPLEX_MCQ') {
    if (Array.isArray(q.correctOptions) && q.correctOptions.length > 0) return q.correctOptions;
    return String(q.correctOption || '').split(',').map((s) => s.trim().toUpperCase()).filter(Boolean);
  }
  if (q.type === 'MCQ' || !q.type) return q.correctOption ? [String(q.correctOption).toUpperCase()] : [];
  return [];
};

export const isTrueAnswer = (q) => q?.trueFalseAnswer === true || q?.correctOption === 'TRUE' || q?.correctOption === 'BENAR';

/**
 * Deteksi masalah umum pada butir soal agar guru bisa memeriksa sebelum ujian dimulai.
 */
export const getQuestionIssues = (q) => {
  const issues = [];
  if (!q) return issues;
  const text = String(q.questionText || '').trim();
  if (!text && !q.imageUrl) issues.push('Teks pertanyaan kosong');
  const isChoice = q.type === 'MCQ' || q.type === 'COMPLEX_MCQ' || !q.type;
  if (isChoice) {
    const options = (q.options || []).filter((o) => String(o.text || '').trim() || o.imageUrl);
    if (options.length < 2) issues.push('Opsi jawaban kurang dari 2');
    const keys = getCorrectKeys(q);
    if (keys.length === 0) issues.push('Kunci jawaban belum diatur');
    else if (keys.some((k) => !options.some((o) => o.key === k))) issues.push('Kunci menunjuk opsi yang kosong');
    if (/[?.:!…]\s*A[.)]\s+\S/.test(text)) {
      issues.push('Opsi A tampaknya menyatu dengan teks soal');
    }
    if (options.some((o) => /\bSoal\s+\d+\b/i.test(String(o.text || '')))) {
      issues.push('Ada opsi yang memuat teks soal berikutnya');
    }
    if (q.keyDetected === false) issues.push('Kunci tidak ditemukan di file (default A)');
  }
  if (q.type === 'MATCHING') {
    const pairs = Array.isArray(q.matchingPairs) ? q.matchingPairs.filter((p) => p.left && p.right) : [];
    if (pairs.length < 2) issues.push('Pasangan menjodohkan kurang dari 2');
  }
  return issues;
};

/**
 * Tampilan satu butir soal persis seperti yang dilihat siswa di halaman ujian.
 */
export function StudentQuestionView({ question: q, number, showKey = false }) {
  const [selected, setSelected] = useState(null);
  const [selectedMulti, setSelectedMulti] = useState([]);
  const [matching, setMatching] = useState({});

  useEffect(() => {
    setSelected(null);
    setSelectedMulti([]);
    setMatching({});
  }, [q?.id]);

  const correctKeys = getCorrectKeys(q);
  const rightOptions = useMemo(() => {
    if (q?.type !== 'MATCHING' || !Array.isArray(q.matchingPairs)) return [];
    const items = q.matchingPairs.map((p) => p.right).filter(Boolean);
    return [...items].sort((a, b) => a.localeCompare(b));
  }, [q]);

  if (!q) return null;

  return (
    <div className="space-y-4">
      {q.stimulusText && (
        <div className="p-4 sm:p-5 rounded-xl bg-amber-50/70 border border-amber-200 text-amber-950 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-900 border-b border-amber-200 pb-2">
            <AppIcon name="file" color="yellow" size={15} />
            <span>Wacana / Stimulus Kasus</span>
          </div>
          <div className="text-xs sm:text-sm whitespace-pre-wrap leading-relaxed">{q.stimulusText}</div>
        </div>
      )}

      {q.imageUrl && (
        <div className="p-3 sm:p-4 rounded-xl bg-neutral-50 border border-neutral-200 flex flex-col items-center">
          <img src={q.imageUrl} alt={`Gambar Soal No. ${number}`} className="max-h-72 w-auto max-w-full rounded-lg object-contain bg-white shadow-xs p-1.5" />
          <span className="text-[11px] text-neutral-400 mt-1 italic">Gambar Pendukung Soal No. {number}</span>
        </div>
      )}

      <div className="text-sm sm:text-base text-neutral-900 leading-relaxed whitespace-pre-wrap font-medium">
        {q.questionText}
      </div>

      {(q.type === 'MCQ' || !q.type) && (
        <div className="space-y-2.5">
          {(q.options || []).map((opt) => {
            const isSelected = selected === opt.key;
            const isKey = showKey && correctKeys.includes(opt.key);
            return (
              <div
                key={opt.key}
                onClick={() => setSelected(opt.key)}
                className={`flex items-center gap-3 p-3 sm:p-3.5 rounded-full border-2 transition-all cursor-pointer ${
                  isKey
                    ? 'bg-emerald-50 border-emerald-500'
                    : isSelected
                    ? 'bg-primary-50 border-primary-500 shadow-xs'
                    : 'bg-white border-neutral-200 hover:border-primary-300 hover:bg-neutral-50/50'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                    isKey ? 'bg-emerald-600 text-white' : isSelected ? 'bg-primary-500 text-white' : 'bg-neutral-100 text-neutral-700'
                  }`}
                >
                  {opt.key}
                </div>
                <div className="flex-1 min-w-0">
                  {opt.text && <span className="text-xs sm:text-sm text-neutral-800 leading-normal block">{opt.text}</span>}
                  {(opt.imageUrl || opt.image_url) && (
                    <img
                      src={opt.imageUrl || opt.image_url}
                      alt={`Opsi ${opt.key}`}
                      className="mt-1.5 max-h-36 max-w-full rounded border border-neutral-200 bg-white p-1 object-contain"
                    />
                  )}
                </div>
                {isKey && (
                  <span className="text-[10px] font-bold text-emerald-700 shrink-0 pr-2">
                    {q.keySource === 'WARNA_MERAH' ? '✓ KUNCI (Teks Merah)' : '✓ KUNCI'}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {q.type === 'COMPLEX_MCQ' && (
        <div className="space-y-2.5">
          <p className="text-[11px] text-primary-800 bg-primary-50 border border-primary-200 rounded-lg px-3 py-2">
            <strong>Pilihan Ganda Kompleks:</strong> centang semua jawaban yang benar.
          </p>
          {(q.options || []).map((opt) => {
            const isSelected = selectedMulti.includes(opt.key);
            const isKey = showKey && correctKeys.includes(opt.key);
            return (
              <div
                key={opt.key}
                onClick={() =>
                  setSelectedMulti((cur) => (cur.includes(opt.key) ? cur.filter((k) => k !== opt.key) : [...cur, opt.key]))
                }
                className={`flex items-center gap-3 p-3 sm:p-3.5 rounded-2xl border-2 transition-all cursor-pointer ${
                  isKey
                    ? 'bg-emerald-50 border-emerald-500'
                    : isSelected
                    ? 'bg-primary-50 border-primary-500'
                    : 'bg-white border-neutral-200 hover:border-primary-300'
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black shrink-0 border ${
                    isSelected || isKey ? 'bg-primary-600 border-primary-600 text-white' : 'bg-white border-neutral-300 text-transparent'
                  }`}
                >
                  ✓
                </div>
                <span className="w-6 h-6 rounded-md bg-neutral-100 text-neutral-700 font-bold text-xs flex items-center justify-center shrink-0">
                  {opt.key}
                </span>
                <div className="flex-1 min-w-0">
                  {opt.text && <span className="text-xs sm:text-sm text-neutral-800 leading-normal block">{opt.text}</span>}
                  {(opt.imageUrl || opt.image_url) && (
                    <img
                      src={opt.imageUrl || opt.image_url}
                      alt={`Opsi ${opt.key}`}
                      className="mt-1.5 max-h-36 max-w-full rounded border border-neutral-200 bg-white p-1 object-contain"
                    />
                  )}
                </div>
                {isKey && (
                  <span className="text-[10px] font-bold text-emerald-700 shrink-0">
                    {q.keySource === 'WARNA_MERAH' ? '✓ KUNCI (Teks Merah)' : '✓ KUNCI'}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {q.type === 'TRUE_FALSE' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { val: 'TRUE', label: 'BENAR (TRUE)', on: 'bg-emerald-600 border-emerald-700 text-white', off: 'hover:border-emerald-400', icon: '✓' },
            { val: 'FALSE', label: 'SALAH (FALSE)', on: 'bg-rose-600 border-rose-700 text-white', off: 'hover:border-rose-400', icon: '✕' },
          ].map((b) => {
            const isKey = showKey && (b.val === 'TRUE') === isTrueAnswer(q);
            const active = selected === b.val || isKey;
            return (
              <button
                key={b.val}
                type="button"
                onClick={() => setSelected(b.val)}
                className={`p-4 rounded-2xl border-2 flex items-center justify-center gap-3 font-bold text-sm transition-all ${
                  active ? b.on : `bg-white border-neutral-200 text-neutral-800 ${b.off}`
                }`}
              >
                <span className="text-base">{b.icon}</span>
                <span>{b.label}</span>
                {isKey && <span className="text-[10px] bg-white/25 px-1.5 py-0.5 rounded">KUNCI</span>}
              </button>
            );
          })}
        </div>
      )}

      {q.type === 'MATCHING' && (
        <div className="space-y-2.5">
          {(q.matchingPairs || []).map((pair, idx) => (
            <div key={pair.id || idx} className="p-3 rounded-xl border border-neutral-200 bg-neutral-50/70 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                <span className="w-7 h-7 rounded-lg bg-neutral-800 text-white font-bold text-xs flex items-center justify-center shrink-0">{idx + 1}</span>
                <p className="text-xs sm:text-sm font-semibold text-neutral-900">{pair.left}</p>
              </div>
              <div className="sm:w-1/2 shrink-0">
                {showKey ? (
                  <div className="w-full text-xs sm:text-sm p-2.5 rounded-lg border border-emerald-400 bg-emerald-50 text-emerald-900 font-semibold">
                    {pair.right}
                  </div>
                ) : (
                  <select
                    value={matching[idx] || ''}
                    onChange={(e) => setMatching((m) => ({ ...m, [idx]: e.target.value }))}
                    className="w-full text-xs sm:text-sm p-2.5 rounded-lg border border-neutral-300 bg-white"
                  >
                    <option value="">-- Pilih Pasangan Jawaban --</option>
                    {rightOptions.map((r, i) => (
                      <option key={i} value={r}>{r}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {q.type === 'ESSAY' && (
        <div className="space-y-2">
          <label className="text-xs font-bold text-neutral-800">Lembar Jawaban Uraian / Esai:</label>
          <textarea rows={5} placeholder="Siswa menuliskan jawaban di sini..." className="w-full text-xs sm:text-sm p-3 rounded-xl border border-neutral-300" />
          {showKey && q.essayRubric && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900 whitespace-pre-wrap">
              <strong>Rubrik / Kunci:</strong> {q.essayRubric}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Modal simulasi layar ujian siswa (navigasi nomor, sebelumnya/berikutnya, opsi tampilkan kunci).
 */
export function StudentPreviewModal({ isOpen, onClose, questions = [], initialIndex = 0, examTitle = '', subtitle = '', footer = null }) {
  const [index, setIndex] = useState(initialIndex);
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    if (isOpen) setIndex(Math.min(Math.max(initialIndex, 0), Math.max(questions.length - 1, 0)));
  }, [isOpen, initialIndex, questions.length]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose?.();
      }
      if (e.key === 'ArrowRight') setIndex((i) => Math.min(i + 1, questions.length - 1));
      if (e.key === 'ArrowLeft') setIndex((i) => Math.max(i - 1, 0));
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [isOpen, onClose, questions.length]);

  if (!isOpen) return null;
  const q = questions[index];
  const meta = getTypeMeta(q?.type);
  const issues = getQuestionIssues(q);

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/70 p-2 sm:p-4">
      <div className="w-full max-w-6xl h-[94vh] rounded-2xl bg-neutral-100 shadow-2xl border border-neutral-200 overflow-hidden flex flex-col">
        <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3 bg-white border-b border-neutral-200">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-primary-600">Preview Tampilan Siswa</p>
            <h2 className="font-bold text-sm sm:text-base text-neutral-900 truncate">{examTitle || 'Ujian'}</h2>
            {subtitle && <p className="text-[11px] text-neutral-500 truncate">{subtitle}</p>}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <label className="flex items-center gap-2 text-xs font-bold text-neutral-700 cursor-pointer select-none rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2">
              <input type="checkbox" checked={showKey} onChange={(e) => setShowKey(e.target.checked)} className="rounded" />
              Tampilkan Kunci
            </label>
            <button type="button" onClick={onClose} className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs font-bold text-neutral-700 hover:bg-neutral-50">
              Tutup
            </button>
          </div>
        </div>

        {questions.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-sm text-neutral-500">Belum ada soal untuk dipreview.</div>
        ) : (
          <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-3 sm:gap-4 p-3 sm:p-4">
            <div className="min-h-0 overflow-y-auto rounded-2xl bg-white border border-neutral-200 p-4 sm:p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-neutral-100">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full bg-primary-500 text-white text-xs font-bold">Soal No. {index + 1}</span>
                  <span className={`px-2 py-0.5 rounded border text-[10px] font-bold ${meta.badge}`}>{meta.label}</span>
                  <span className="px-2 py-0.5 rounded border border-neutral-200 bg-neutral-50 text-[10px] font-bold text-neutral-600">{q?.points || 10} Poin</span>
                </div>
                <span className="text-[11px] text-neutral-400">dari {questions.length} soal</span>
              </div>

              {issues.length > 0 && (
                <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-[11px] text-amber-900">
                  <strong>Perlu dicek (tidak terlihat oleh siswa):</strong>
                  <ul className="list-disc pl-5 mt-1">
                    {issues.map((i) => <li key={i}>{i}</li>)}
                  </ul>
                </div>
              )}

              <StudentQuestionView question={q} number={index + 1} showKey={showKey} />

              <div className="pt-4 border-t border-neutral-200 flex items-center justify-between gap-3">
                <button
                  type="button"
                  disabled={index === 0}
                  onClick={() => setIndex((i) => Math.max(i - 1, 0))}
                  className="rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-xs font-bold text-neutral-700 disabled:opacity-40"
                >
                  ← Sebelumnya
                </button>
                <button
                  type="button"
                  disabled={index >= questions.length - 1}
                  onClick={() => setIndex((i) => Math.min(i + 1, questions.length - 1))}
                  className="rounded-xl bg-primary-500 px-4 py-2.5 text-xs font-bold text-white hover:bg-primary-700 disabled:opacity-40"
                >
                  Berikutnya →
                </button>
              </div>
            </div>

            <div className="min-h-0 overflow-y-auto rounded-2xl bg-white border border-neutral-200 p-4 space-y-3">
              <p className="text-xs font-bold text-neutral-800">Navigasi Soal</p>
              <div className="grid grid-cols-6 lg:grid-cols-5 gap-1.5">
                {questions.map((item, i) => {
                  const hasIssue = getQuestionIssues(item).length > 0;
                  return (
                    <button
                      key={item.id || i}
                      type="button"
                      onClick={() => setIndex(i)}
                      className={`relative h-9 rounded-lg text-xs font-bold border transition ${
                        i === index ? 'bg-primary-500 text-white border-primary-600' : 'bg-white text-neutral-700 border-neutral-200 hover:border-primary-300'
                      }`}
                    >
                      {i + 1}
                      {hasIssue && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-500 border border-white" />}
                    </button>
                  );
                })}
              </div>
              <div className="text-[10px] text-neutral-500 space-y-1 pt-2 border-t border-neutral-100">
                <p className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Perlu dicek</p>
                <p>Gunakan tombol panah ← → pada keyboard untuk berpindah soal.</p>
              </div>
              {footer}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default StudentPreviewModal;
