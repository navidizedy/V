"use client";

import { X } from "lucide-react";

export function ImageLightbox({
  src,
  alt,
  onClose,
}: {
  src: string | null;
  alt?: string;
  onClose: () => void;
}) {
  if (!src) return null;

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <button
        onClick={onClose}
        className="absolute top-4 left-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
        aria-label="بستن تصویر"
      >
        <X className="w-6 h-6" />
      </button>
      <img
        src={src}
        alt={alt || "تصویر"}
        className="max-w-full max-h-[88vh] object-contain rounded-2xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}
