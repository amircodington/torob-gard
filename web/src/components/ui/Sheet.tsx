"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";

// ponytail: tap-to-close only, drag arrives with apple-design pass
export function Sheet({ open, onClose, labelledby, children }: { open: boolean; onClose: () => void; labelledby: string; children: ReactNode }) {
  const close = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    close.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-labelledby={labelledby}>
      <div aria-hidden onClick={onClose} className="absolute inset-0 bg-ink/45" />
      <div className="absolute inset-x-0 bottom-0 mx-auto max-h-[90dvh] w-full max-w-2xl overflow-y-auto overscroll-contain rounded-t-sheet bg-panel p-5 pb-[max(20px,env(safe-area-inset-bottom))] text-on-dark shadow-sheet">
        <div className="mx-auto mb-3 h-1.5 w-12 rounded-pill bg-panel-2" />
        <button
          ref={close}
          type="button"
          onClick={onClose}
          aria-label="بستن"
          className="absolute end-4 top-4 grid h-11 w-11 place-items-center rounded-full bg-white/12 focus-visible:outline-2 focus-visible:outline-focus"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" aria-hidden>
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
        {children}
      </div>
    </div>,
    document.body,
  );
}
