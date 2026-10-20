'use client';

import React, { useEffect, useRef } from 'react';

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'max-w-md',
  footerActions,
}) {
  const modalRef = useRef(null);

  // Keyboard trap Tab & Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
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
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--color-neutral-1000,#172033)]/50 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onClick={(e) => e.stopPropagation()}
        className={`w-full ${maxWidth} bg-[var(--color-neutral-50,#FFFFFF)] border border-[var(--color-neutral-300,#E5E7EB)] rounded-[16px] shadow-[var(--shadow-lg,0_12px_24px_rgba(23,32,51,0.12))] overflow-hidden transition-all`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-neutral-300,#E5E7EB)]">
          <h3 id="modal-title" className="text-[18px] sm:text-[20px] font-bold text-[var(--color-neutral-1000,#172033)]">
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="w-8 h-8 flex items-center justify-center rounded-[8px] text-[var(--color-neutral-500,#98A2B3)] hover:text-[var(--color-neutral-1000,#172033)] hover:bg-[var(--color-neutral-100,#F8F9FC)] transition-colors cursor-pointer text-base"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="p-6 text-[15px] sm:text-base text-[var(--color-neutral-1000,#172033)]">{children}</div>

        {/* Footer Actions */}
        {footerActions && (
          <div className="px-6 py-3.5 bg-[var(--color-neutral-100,#F8F9FC)] border-t border-[var(--color-neutral-300,#E5E7EB)] flex items-center justify-end gap-2.5">
            {footerActions}
          </div>
        )}
      </div>
    </div>
  );
}
