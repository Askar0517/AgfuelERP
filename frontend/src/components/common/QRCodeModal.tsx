import React, { useEffect, useState, useRef } from 'react';
import QRCode from 'qrcode';
import {
  X,
  QrCode,
  Download,
  Printer,
  Copy,
  Check,
  Building2,
  Fuel,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { useNotification } from '../../context/NotificationContext';
import { ModalPortal } from './ModalPortal';

export interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  entityType: 'BUNK' | 'TANK' | 'NOZZLE';
  entityId: string;
  entityName: string;
  subtitle?: string;
  parentBunkName?: string;
  fuelCode?: string;
  fuelColor?: string;
  additionalDetails?: Record<string, string | number>;
  onNavigateToOperation?: () => void;
  operationButtonLabel?: string;
}

export const QRCodeModal: React.FC<QRCodeModalProps> = ({
  isOpen,
  onClose,
  entityType,
  entityId,
  entityName,
  subtitle,
  parentBunkName,
  fuelCode,
  fuelColor = '#10B981',
  additionalDetails,
  onNavigateToOperation,
  operationButtonLabel,
}) => {
  const { notifySuccess, notifyError } = useNotification();
  const [dataUrl, setDataUrl] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const printAreaRef = useRef<HTMLDivElement>(null);

  // Encode structured payload containing authoritative identifier
  const qrPayload = JSON.stringify({
    schema: 'petropulse-forecourt-v1',
    type: entityType,
    id: entityId,
    name: entityName,
  });

  useEffect(() => {
    if (!isOpen) return;
    QRCode.toDataURL(qrPayload, {
      width: 320,
      margin: 2,
      color: {
        dark: '#0f172a', // slate-900
        light: '#ffffff',
      },
      errorCorrectionLevel: 'H',
    })
      .then((url) => setDataUrl(url))
      .catch((err) => {
        console.error('Failed to generate QR code:', err);
        notifyError('QR Code Error', 'Failed to generate visual QR code image.');
      });
  }, [isOpen, qrPayload, notifyError]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(entityId);
    setCopied(true);
    notifySuccess('Copied', `Identifier "${entityId}" copied to clipboard.`);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!dataUrl) return;
    const link = document.createElement('a');
    link.download = `${entityId}-qrcode.png`;
    link.href = dataUrl;
    link.click();
    notifySuccess('Downloaded', `QR code image saved as ${entityId}-qrcode.png`);
  };

  const handlePrint = () => {
    window.print();
  };

  const typeConfig = {
    BUNK: {
      badge: 'Bunk Master',
      color: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
      icon: Building2,
    },
    TANK: {
      badge: 'Underground Fuel Tank',
      color: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30',
      icon: Fuel,
    },
    NOZZLE: {
      badge: 'Forecourt Dispenser Nozzle',
      color: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30',
      icon: Fuel,
    },
  }[entityType];

  const TypeIcon = typeConfig.icon;

  return (
    <ModalPortal isOpen={isOpen} onClose={onClose} ariaLabel="Forecourt QR Asset Identifier" className="max-w-md">
      <div className="relative w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden transition-colors">
        {/* Flush top-right close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-0 right-0 flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-tr-2xl rounded-bl-xl bg-red-500 hover:bg-red-600 active:scale-95 text-white transition cursor-pointer z-10"
          aria-label="Close dialog"
        >
          <X className="h-4 w-4 text-white stroke-[2.5]" />
        </button>
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 px-5 py-4 bg-slate-50/70 dark:bg-slate-950/40 pr-10">
          <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
              <QrCode className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                Forecourt QR Asset Identifier
              </h2>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border ${typeConfig.color} mt-0.5`}>
                <TypeIcon className="h-3 w-3" />
                {typeConfig.badge}
              </span>
            </div>
          </div>
        </div>

        {/* Printable Card Area */}
        <div ref={printAreaRef} className="p-6 text-center space-y-4 print:p-8">
          {/* Printable Wordmark */}
          <div className="flex items-center justify-center gap-2 text-slate-700 dark:text-slate-300">
            <span className="text-xs font-black tracking-wider uppercase text-emerald-600 dark:text-emerald-400">
              AG Fuels ERP
            </span>
            <span className="text-slate-400">·</span>
            <span className="text-[11px] text-slate-500">Asset Verification Tag</span>
          </div>

          {/* QR Code Container */}
          <div className="mx-auto w-60 h-60 p-3 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-white flex items-center justify-center shadow-inner">
            {dataUrl ? (
              <img
                src={dataUrl}
                alt={`QR Code for ${entityId}`}
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="flex flex-col items-center gap-2 text-slate-400">
                <Sparkles className="h-6 w-6 animate-spin text-emerald-500" />
                <span className="text-xs">Generating QR...</span>
              </div>
            )}
          </div>

          {/* Official Forecourt Asset Code Badge & 1-Click Copy */}
          <div className="space-y-1.5">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500 block">
              Official Forecourt Asset Code
            </span>
            <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-inner">
              <span className="font-mono text-sm sm:text-base font-black text-slate-900 dark:text-white tracking-wider">
                {entityId}
              </span>
              <button
                type="button"
                onClick={handleCopy}
                title="Copy Identifier"
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition active:scale-95 cursor-pointer shadow-xs ${
                  copied
                    ? 'bg-emerald-600 text-white'
                    : 'bg-emerald-600/15 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-600 hover:text-white'
                }`}
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy Code'}</span>
              </button>
            </div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-2">
              {entityName}
            </h3>
            {subtitle && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {subtitle}
              </p>
            )}
          </div>

          {/* Context Details */}
          {(parentBunkName || fuelCode || additionalDetails) && (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 p-3 text-left text-xs space-y-1.5">
              {parentBunkName && (
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Parent Bunk:</span>
                  <span className="font-medium text-slate-900 dark:text-white truncate max-w-[200px]">
                    {parentBunkName}
                  </span>
                </div>
              )}
              {fuelCode && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 dark:text-slate-400">Fuel Grade:</span>
                  <span
                    className="font-bold px-2 py-0.5 rounded text-[10px] text-white"
                    style={{ backgroundColor: fuelColor }}
                  >
                    {fuelCode}
                  </span>
                </div>
              )}
              {additionalDetails &&
                Object.entries(additionalDetails).map(([key, val]) => (
                  <div key={key} className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400 capitalize">{key}:</span>
                    <span className="font-medium text-slate-900 dark:text-white">{String(val)}</span>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="border-t border-slate-200 dark:border-slate-800 px-5 py-3.5 bg-slate-50/70 dark:bg-slate-950/40 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownload}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/80 transition"
            >
              <Download className="h-3.5 w-3.5" />
              Download PNG
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/80 transition"
            >
              <Printer className="h-3.5 w-3.5" />
              Print Card
            </button>
          </div>

          {onNavigateToOperation && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onNavigateToOperation();
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-500 shadow-xs transition"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              {operationButtonLabel || 'Open Operational Screen'}
            </button>
          )}
        </div>
      </div>
    </ModalPortal>
  );
};
