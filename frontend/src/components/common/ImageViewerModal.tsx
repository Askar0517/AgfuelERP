import React, { useEffect } from 'react';
import { X, Download, ExternalLink, ZoomIn } from 'lucide-react';
import { ModalPortal } from './ModalPortal';

interface ImageViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string | null;
  title?: string;
  subtitle?: string;
}

export const ImageViewerModal: React.FC<ImageViewerModalProps> = ({
  isOpen,
  onClose,
  imageUrl,
  title = 'Image Preview',
  subtitle,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !imageUrl) return null;

  return (
    <ModalPortal isOpen={isOpen} onClose={onClose} ariaLabel={title} className="max-w-4xl">
      <div className="relative w-full max-h-[92vh] flex flex-col rounded-2xl border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-5 sm:p-6 shadow-2xl my-auto text-slate-900 dark:text-gray-100 transition overflow-hidden">
        {/* Flush top-right close button conforming to design rules */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-0 right-0 flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-tr-2xl rounded-bl-xl bg-red-500 hover:bg-red-600 active:scale-95 text-white transition cursor-pointer z-20"
          aria-label="Close modal"
        >
          <X className="h-4 w-4 text-white stroke-[2.5]" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-gray-800 pb-3 pr-10">
          <div className="min-w-0 flex-1 pr-2">
            <h2 className="text-base font-bold text-slate-900 dark:text-white truncate">
              {title}
            </h2>
            {subtitle && (
              <p className="text-xs text-slate-500 dark:text-gray-400 truncate">
                {subtitle}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <a
              href={imageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-800 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-700 transition"
              title="Open full size in new tab"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Open Full</span>
            </a>
            <a
              href={imageUrl}
              download
              className="flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 text-xs font-medium transition"
              title="Download image"
            >
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Download</span>
            </a>
          </div>
        </div>

        {/* Image Display Area */}
        <div className="mt-4 flex-1 flex items-center justify-center overflow-auto rounded-xl bg-slate-900/90 dark:bg-black/90 p-2 sm:p-4 min-h-[300px] max-h-[70vh]">
          <img
            src={imageUrl}
            alt={title}
            className="max-h-[66vh] max-w-full rounded-lg object-contain shadow-lg"
          />
        </div>
      </div>
    </ModalPortal>
  );
};
