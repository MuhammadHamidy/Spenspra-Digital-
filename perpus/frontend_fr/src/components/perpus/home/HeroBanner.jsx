'use client';

import React, { useState } from 'react';

const SLIDES = [
  {
    title: 'Buka Buku,\nBuka Duniamu.',
    subtitle: 'Temukan pengetahuan, dan inspirasi baru di setiap halaman.',
    bgImage: 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?w=1600&auto=format&fit=crop&q=80',
  },
  {
    title: 'Literasi Digital,\nKunci Masa Depan.',
    subtitle: 'Jelajahi ribuan koleksi buku fisik dan sumber rujukan akademis terbaik.',
    bgImage: 'https://images.unsplash.com/photo-1507842229450-76c11c1d0450?w=1600&auto=format&fit=crop&q=80',
  },
  {
    title: 'Ruang Nyaman,\nInspirasi Tanpa Batas.',
    subtitle: 'Suasana belajar dan riset modern ramah siswa di SMPN 1 Prambon.',
    bgImage: 'https://images.unsplash.com/photo-1568667256549-094345857637?w=1600&auto=format&fit=crop&q=80',
  },
];

export default function HeroBanner() {
  const [currentSlide, setCurrentSlide] = useState(0);

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev === 0 ? SLIDES.length - 1 : prev - 1));
  };

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev === SLIDES.length - 1 ? 0 : prev + 1));
  };

  const slide = SLIDES[currentSlide];

  return (
    <section className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
      <div className="relative h-64 sm:h-80 md:h-96 rounded-3xl overflow-hidden shadow-md">
        {/* Background Image with Dark Dim Overlay */}
        <div
          className="absolute inset-0 bg-cover bg-center transition-all duration-700 transform scale-105"
          style={{ backgroundImage: `url('${slide.bgImage}')` }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent" />

        {/* Slide Content */}
        <div className="relative h-full flex flex-col justify-center px-8 sm:px-14 max-w-2xl z-10">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-[#F2C94C] leading-tight tracking-tight whitespace-pre-line drop-shadow-sm font-sans">
            {slide.title}
          </h1>
          <p className="mt-3 text-sm sm:text-base text-slate-100 font-normal drop-shadow-xs">
            {slide.subtitle}
          </p>
        </div>

        {/* Carousel Navigation Buttons */}
        <button
          type="button"
          onClick={prevSlide}
          className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 hover:bg-white text-slate-800 flex items-center justify-center shadow-md backdrop-blur-xs transition-transform hover:scale-110 cursor-pointer z-20"
          aria-label="Slide sebelumnya"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <button
          type="button"
          onClick={nextSlide}
          className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 hover:bg-white text-slate-800 flex items-center justify-center shadow-md backdrop-blur-xs transition-transform hover:scale-110 cursor-pointer z-20"
          aria-label="Slide berikutnya"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/* Indicator Dots */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 z-20">
          {SLIDES.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setCurrentSlide(idx)}
              className={`h-2 rounded-full transition-all cursor-pointer ${
                currentSlide === idx ? 'w-6 bg-[#F2C94C]' : 'w-2 bg-white/60 hover:bg-white'
              }`}
              aria-label={`Pindah ke slide ${idx + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
