import React, { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon, Loader2, CheckCircle2 } from 'lucide-react';
import { api } from '../../api/client';

interface ImageUploadInputProps {
  label?: string;
  helperText?: string;
  category: 'profile' | 'invoice' | 'reading';
  value?: string | null;
  onChange: (url: string | null) => void;
  className?: string;
  compactAvatar?: boolean;
}

export const ImageUploadInput: React.FC<ImageUploadInputProps> = ({
  label,
  helperText,
  category,
  value,
  onChange,
  className = '',
  compactAvatar = false,
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setUploadError('Only image files (PNG, JPG, WEBP) are supported.');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setUploadError('Image size exceeds 15MB limit.');
      return;
    }

    setUploadError(null);
    setIsUploading(true);

    try {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (err) => reject(err);
      });
      reader.readAsDataURL(file);
      const dataUrl = await base64Promise;

      const res = await api.uploadImage({
        dataUrl,
        category,
        filename: file.name,
      });

      if (res.url) {
        onChange(res.url);
      } else {
        throw new Error('Upload succeeded but no URL was returned.');
      }
    } catch (err: any) {
      console.error('Image upload failed:', err);
      setUploadError(err.message || 'Failed to upload image. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  if (compactAvatar) {
    return (
      <div className={`relative flex items-center gap-3 ${className}`}>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleInputChange}
          disabled={isUploading}
        />
        <div className="relative group">
          {value ? (
            <div className="relative h-20 w-20 rounded-2xl overflow-hidden border-2 border-emerald-500 shadow-md">
              <img src={value} alt="Avatar" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => onChange(null)}
                className="absolute top-1 right-1 h-5 w-5 rounded-full bg-red-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition cursor-pointer"
                title="Remove photo"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="h-20 w-20 rounded-2xl border-2 border-dashed border-slate-300 dark:border-gray-700 hover:border-emerald-500 dark:hover:border-emerald-400 bg-slate-50 dark:bg-gray-800/60 flex flex-col items-center justify-center gap-1 text-slate-500 dark:text-gray-400 hover:text-emerald-600 transition cursor-pointer"
            >
              {isUploading ? (
                <Loader2 className="h-5 w-5 animate-spin text-emerald-500" />
              ) : (
                <>
                  <Upload className="h-5 w-5" />
                  <span className="text-[10px] font-semibold">Upload</span>
                </>
              )}
            </button>
          )}
        </div>
        <div className="min-w-0">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer block"
          >
            {value ? 'Change Profile Photo' : 'Upload Profile Photo'}
          </button>
          <span className="text-[11px] text-slate-500 dark:text-gray-400 block mt-0.5">
            PNG, JPG or WEBP (Max 15MB)
          </span>
          {uploadError && (
            <p className="text-[11px] font-medium text-rose-500 mt-1">{uploadError}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label className="block text-xs font-semibold text-slate-700 dark:text-gray-300">
          {label}
        </label>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleInputChange}
        disabled={isUploading}
      />

      {value ? (
        <div className="relative rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative h-14 w-14 shrink-0 rounded-lg overflow-hidden border border-emerald-500/20 bg-slate-100 dark:bg-gray-800">
              <img src={value} alt="Preview" className="h-full w-full object-cover" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span className="truncate">Image Attached</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-gray-400 font-mono truncate">
                {value.split('/').pop()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="rounded-lg border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-2.5 py-1 text-[11px] font-medium text-slate-700 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-gray-700 transition cursor-pointer"
            >
              Replace
            </button>
            <button
              type="button"
              onClick={() => onChange(null)}
              className="rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 px-2.5 py-1 text-[11px] font-medium text-red-600 dark:text-red-400 hover:bg-red-100 transition cursor-pointer flex items-center gap-1"
            >
              <X className="h-3 w-3" />
              <span>Remove</span>
            </button>
          </div>
        </div>
      ) : (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-4 transition cursor-pointer ${
            dragActive
              ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20'
              : 'border-slate-200 dark:border-gray-700 bg-slate-50/60 dark:bg-gray-800/40 hover:border-emerald-500 dark:hover:border-emerald-400 hover:bg-slate-50 dark:hover:bg-gray-800'
          }`}
        >
          {isUploading ? (
            <div className="flex flex-col items-center gap-2 py-1">
              <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
              <span className="text-xs font-semibold text-slate-700 dark:text-gray-300">
                Uploading to local storage...
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1.5 py-1 text-center">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <ImageIcon className="h-4 w-4" />
              </div>
              <div className="text-xs font-semibold text-slate-800 dark:text-gray-200">
                Click or drag & drop image here
              </div>
              <p className="text-[11px] text-slate-400 dark:text-gray-500">
                {helperText || 'Attach invoice copy, meter photo, or receipt (PNG, JPG up to 15MB)'}
              </p>
            </div>
          )}
        </div>
      )}

      {uploadError && (
        <p className="text-[11px] font-medium text-rose-500 pt-0.5">{uploadError}</p>
      )}
    </div>
  );
};
