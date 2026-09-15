"use client";

import { useRef, useState } from "react";
import { ImagePlus, X, Loader2 } from "lucide-react";
import { useToast } from "@/components/toast-provider";

interface ImageUploadProps {
  value?: string | null;
  onChange: (value: string) => void;
  label?: string;
  aspect?: "square" | "wide";
}

async function compressImage(file: File, aspect: "square" | "wide") {
  const bitmap = await createImageBitmap(file);
  const maxWidth = aspect === "square" ? 512 : 1280;
  const maxHeight = aspect === "square" ? 512 : 720;

  const scale = Math.min(1, maxWidth / bitmap.width, maxHeight / bitmap.height);
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");

  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();

  return canvas.toDataURL("image/jpeg", 0.82);
}

export function ImageUpload({ value, onChange, label, aspect = "wide" }: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    if (file.size > 8 * 1024 * 1024) {
      toast.error("حجم تصویر باید کمتر از ۸ مگابایت باشد");
      return;
    }
    setLoading(true);
    try {
      const compressed = await compressImage(file, aspect);
      onChange(compressed);
    } catch {
      const reader = new FileReader();
      reader.onload = () => onChange(reader.result as string);
      reader.readAsDataURL(file);
    } finally {
      setLoading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div>
      {label && <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>}
      <div
        onClick={() => inputRef.current?.click()}
        className={`relative cursor-pointer rounded-xl border-2 border-dashed border-gray-200 hover:border-orange-300 bg-gray-50 hover:bg-orange-50/40 transition-colors flex items-center justify-center overflow-hidden ${
          aspect === "wide" ? "h-40" : "h-32 w-32"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
          }}
        />
        {loading ? (
          <div className="flex flex-col items-center gap-2 text-orange-400">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span className="text-xs">در حال بهینه‌سازی...</span>
          </div>
        ) : value ? (
          <>
            <img src={value} alt="پیش‌نمایش" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange("");
              }}
              className="absolute top-2 left-2 p-1.5 rounded-full bg-white/90 shadow-sm hover:bg-white cursor-pointer"
            >
              <X className="w-3.5 h-3.5 text-gray-600" />
            </button>
          </>
        ) : (
          <div className="text-center text-gray-400">
            <ImagePlus className="w-6 h-6 mx-auto mb-1" />
            <span className="text-xs">انتخاب تصویر</span>
          </div>
        )}
      </div>
      <p className="text-[11px] text-gray-400 mt-1">تصویر قبل از ذخیره بهینه‌سازی می‌شود.</p>
    </div>
  );
}
