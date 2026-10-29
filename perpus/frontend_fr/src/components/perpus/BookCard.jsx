'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';

/**
 * Reusable BookCard component matching Figma design (Frame.png, Frame-1.png, Menu Bookmark.png)
 * - Cover image (aspect 3/4)
 * - Title with ellipsis
 * - Author
 * - Bookmark icon button (yellow filled when active, outline when inactive)
 * - Status Badge: "Tersedia" (dark green #1E7E55) / "Tidak Tersedia" (red #C53030)
 */
export default function BookCard({
  book,
  isBookmarked = false,
  onToggleBookmark,
  onClick,
}) {
  if (!book) return null;

  const id = book.id || book.book_id || '';
  const title = book.judul || book.title || book.book_title || 'Judul Buku';
  const author = book.penulis || book.author || book.book_author || 'Penulis';
  const coverUrl = book.cover_url || book.cover_image || book.cover || '';
  
  // Tersedia jika stok > 0 atau field tersedia/is_available adalah true
  const isAvailable =
    book.tersedia !== undefined
      ? Boolean(book.tersedia)
      : book.is_available !== undefined
      ? Boolean(book.is_available)
      : book.stok !== undefined
      ? Number(book.stok) > 0
      : true;

  const handleCardClick = (e) => {
    if (onClick) {
      onClick(book);
    }
  };

  const handleBookmarkClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (onToggleBookmark) {
      onToggleBookmark(e, book);
    }
  };

  return (
    <div
      onClick={handleCardClick}
      className="bg-white rounded-2xl border border-slate-100 p-3.5 shadow-xs hover:shadow-md hover:border-slate-200 transition-all duration-200 flex flex-col justify-between group cursor-pointer"
    >
      {/* 1. Cover Buku */}
      <Link href={`/bibliografi/${id}`} className="block relative w-full aspect-[3/4] rounded-xl overflow-hidden bg-slate-100 mb-3 shadow-xs">
        {coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coverUrl}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 text-slate-400 p-3 text-center">
            <svg className="w-8 h-8 text-slate-300 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <span className="text-[11px] font-medium line-clamp-2">{title}</span>
          </div>
        )}
      </Link>

      {/* 2. Informasi Judul, Penulis & Tombol Bookmark */}
      <div className="flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-start justify-between gap-1.5 mb-0.5">
            <Link
              href={`/bibliografi/${id}`}
              className="text-xs sm:text-sm font-bold text-slate-900 line-clamp-1 leading-snug group-hover:text-blue-600 transition-colors font-sans"
              title={title}
            >
              {title}
            </Link>
            <button
              type="button"
              onClick={handleBookmarkClick}
              className="p-1 -mr-1 text-slate-400 hover:text-amber-500 transition-colors flex-shrink-0 cursor-pointer focus:outline-none"
              title={isBookmarked ? 'Hapus bookmark' : 'Simpan bookmark'}
              aria-label={isBookmarked ? 'Hapus bookmark' : 'Simpan bookmark'}
            >
              <svg
                className={`w-4 h-4 transition-colors ${
                  isBookmarked ? 'text-amber-500 fill-amber-500' : 'text-slate-700 hover:text-amber-500'
                }`}
                fill={isBookmarked ? 'currentColor' : 'none'}
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                />
              </svg>
            </button>
          </div>
          <p className="text-[11px] text-slate-500 truncate mb-2.5">{author}</p>
        </div>

        {/* 3. Badge Status Ketersediaan */}
        <div>
          {isAvailable ? (
            <span className="inline-block px-3 py-0.5 rounded-full text-[10px] font-semibold tracking-wide bg-[#1E7E55] text-white">
              Tersedia
            </span>
          ) : (
            <span className="inline-block px-3 py-0.5 rounded-full text-[10px] font-semibold tracking-wide bg-[#C53030] text-white">
              Tidak Tersedia
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
