'use client';

import React, { useEffect, useRef } from 'react';

/**
 * Modal — Sesuai standar DESIGN fix.md
 * - Radius: 16px (XL)
 * - Background: neutral-50 (#FFFFFF)
 * - Shadow: LG
 * - Overlay: neutral-1000 opacity 50%
 * - Judul: Header 2 atau Header 3
 * - Responsive: Full screen on mobile, bounded on desktop
 */
export default function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth,
  size = 'md',
  footerActions,
  noPadding = false,
}) {
  const modalRef = useRef(null);

  // Keyboard trap & background scroll lock
  useEffect(() => {
    if (!isOpen) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose?.();
        return;
      }

      if (e.key === 'Tab' && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            lastElement.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === lastElement) {
            firstElement.focus();
            e.preventDefault();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Resolve responsive width by size
  let resolvedWidth = maxWidth;
  if (!resolvedWidth) {
    switch (size) {
      case 'sm':
        resolvedWidth = 'max-w-sm';
        break;
      case 'lg':
        resolvedWidth = 'max-w-2xl';
        break;
      case 'xl':
        resolvedWidth = 'max-w-4xl';
        break;
      case '2xl':
        resolvedWidth = 'max-w-5xl';
        break;
      case 'full':
        resolvedWidth = 'max-w-full m-2 sm:m-4';
        break;
      case 'md':
      default:
        resolvedWidth = 'max-w-lg';
        break;
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 md:p-6 bg-neutral-1000/50 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onClick={(e) => e.stopPropagation()}
        className={`w-full ${resolvedWidth} max-h-[92dvh] sm:max-h-[88vh] flex flex-col bg-white border border-neutral-300 rounded-[16px] shadow-[var(--shadow-lg,0_12px_24px_rgba(23,32,51,0.12))] overflow-hidden my-auto transition-all`}
      >
        {/* Header */}
        {(title || onClose) && (
          <div className="flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4 border-b border-neutral-300 shrink-0 bg-white">
            <div className="min-w-0 pr-2">
              {title && (
                <h3
                  id="modal-title"
                  className="text-base sm:text-lg font-bold text-neutral-1000 truncate leading-snug"
                >
                  {title}
                </h3>
              )}
              {subtitle && (
                <p className="text-xs text-neutral-700 truncate mt-0.5 font-normal">
                  {subtitle}
                </p>
              )}
            </div>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Tutup"
                className="w-8 h-8 shrink-0 flex items-center justify-center rounded-[8px] text-neutral-500 hover:text-neutral-1000 hover:bg-neutral-100 transition-colors cursor-pointer text-lg font-semibold"
              >
                ✕
              </button>
            )}
          </div>
        )}

        {/* Body */}
        <div
          className={`flex-1 overflow-y-auto overscroll-contain min-h-0 text-neutral-800 ${
            noPadding ? '' : 'p-3.5 sm:p-6'
          }`}
        >
          {children}
        </div>

        {/* Footer Actions */}
        {footerActions && (
          <div className="px-4 py-3 sm:px-6 sm:py-3.5 bg-neutral-100 border-t border-neutral-300 flex flex-col-reverse sm:flex-row items-center justify-end gap-2 shrink-0">
            {footerActions}
          </div>
        )}
      </div>
    </div>
  );
}
