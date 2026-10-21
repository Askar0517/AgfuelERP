import React, { useState, useEffect } from 'react';
import { AlertTriangle, AlertCircle, Info, X, Loader2 } from 'lucide-react';
import { ModalPortal } from './ModalPortal';

export interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  title: string;
  message: string | React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
  requiredText?: string;
  requiredTextPlaceholder?: string;
  isLoading?: boolean;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm Action',
  cancelLabel = 'Cancel',
  variant = 'warning',
  requiredText,
  requiredTextPlaceholder = 'Type to confirm',
  isLoading = false,
}) => {
  const [typedText, setTypedText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset typed text on open/close
  useEffect(() => {
    if (isOpen) {
      setTypedText('');
      setIsSubmitting(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isConfirmedDisabled =
    isLoading ||
    isSubmitting ||
    (requiredText ? typedText.trim().toUpperCase() !== requiredText.trim().toUpperCase() : false);

  const handleConfirm = async () => {
    if (isConfirmedDisabled) return;
    setIsSubmitting(true);
    try {
      await onConfirm();
    } finally {
      setIsSubmitting(false);
    }
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return {
          icon: AlertCircle,
          iconColor: 'text-rose-600 dark:text-rose-400',
          iconBg: 'bg-rose-100 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-900',
          buttonBg: 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/20',
        };
      case 'info':
        return {
          icon: Info,
          iconColor: 'text-[#12544F] dark:text-[#2BA096]',
          iconBg: 'bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-900',
          buttonBg: 'bg-[#12544F] hover:bg-[#0E433F] text-white shadow-[#12544F]/20',
        };
      case 'warning':
      default:
        return {
          icon: AlertTriangle,
          iconColor: 'text-amber-600 dark:text-amber-400',
          iconBg: 'bg-amber-100 dark:bg-amber-950/80 border border-amber-200 dark:border-amber-900',
          buttonBg: 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/20',
        };
    }
  };

  const style = getVariantStyles();
  const Icon = style.icon;

  return (
    <ModalPortal
      isOpen={isOpen}
      onClose={onClose}
      ariaLabel={title}
      closeOnEsc={!isLoading && !isSubmitting}
      closeOnBackdropClick={!isLoading && !isSubmitting}
      className="max-w-md"
    >
      <div className="relative w-full rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden p-6 transition-all">
        {/* Flush top-right close button */}
        <button
          type="button"
          onClick={onClose}
          disabled={isLoading || isSubmitting}
          className="absolute top-0 right-0 flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-tr-2xl rounded-bl-xl bg-red-500 hover:bg-red-600 active:scale-95 text-white transition cursor-pointer z-10 disabled:opacity-50"
          aria-label="Close dialog"
        >
          <X className="w-4 h-4 text-white stroke-[2.5]" />
        </button>
        {/* Modal Header with aligned red close button */}
        <div className="flex items-start gap-3.5 mb-4 pr-10">
          <div className="flex items-center gap-3.5 flex-1 min-w-0 pr-2">
            <div className={`shrink-0 p-2.5 rounded-xl ${style.iconBg}`}>
              <Icon className={`w-6 h-6 ${style.iconColor}`} />
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 leading-snug">
                {title}
              </h3>
            </div>
          </div>
        </div>

        <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed pl-1">
          {message}
        </div>

            {/* Optional Typed Confirmation Requirement */}
            {requiredText && (
              <div className="mt-4 space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Type <span className="font-mono text-rose-600 dark:text-rose-400 font-bold">{requiredText}</span> to confirm:
                </label>
                <input
                  type="text"
                  value={typedText}
                  onChange={(e) => setTypedText(e.target.value)}
                  placeholder={requiredTextPlaceholder}
                  disabled={isLoading || isSubmitting}
                  className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-rose-500"
                  autoFocus
                />
              </div>
            )}

            {/* Actions */}
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading || isSubmitting}
                className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors cursor-pointer"
              >
                {cancelLabel}
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={isConfirmedDisabled}
                className={`px-4 py-2 text-xs font-semibold rounded-lg flex items-center gap-2 cursor-pointer shadow-md transition-all ${
                  isConfirmedDisabled
                    ? 'opacity-50 cursor-not-allowed bg-slate-300 dark:bg-slate-800 text-slate-500'
                    : style.buttonBg
                }`}
              >
                {(isLoading || isSubmitting) && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {confirmLabel}
              </button>
            </div>
        </div>
      </ModalPortal>
  );
};
