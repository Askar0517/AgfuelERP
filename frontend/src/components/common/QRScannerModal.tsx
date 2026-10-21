import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  QrCode,
  Search,
  CheckCircle2,
  AlertCircle,
  Building2,
  Fuel,
  ExternalLink,
  Loader2,
  ScanLine,
  Camera,
  RefreshCw,
  Clock,
  VideoOff,
} from 'lucide-react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { api } from '../../api/client';
import { useNotification } from '../../context/NotificationContext';
import { ModalPortal } from './ModalPortal';

export interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToEntity: (resolved: {
    type: 'BUNK' | 'TANK' | 'NOZZLE';
    entity: any;
    parentStation?: any;
    action?: 'READING' | 'DETAILS';
  }) => void;
}

const SCAN_TIMEOUT_SECONDS = 120; // Maximum scanning duration: 2 minutes

export const QRScannerModal: React.FC<QRScannerModalProps> = ({
  isOpen,
  onClose,
  onNavigateToEntity,
}) => {
  const { notifySuccess, notifyError, notifyWarning } = useNotification();
  const [scannerMode, setScannerMode] = useState<'CAMERA' | 'MANUAL'>('CAMERA');
  const [cameraState, setCameraState] = useState<'IDLE' | 'STARTING' | 'SCANNING' | 'STOPPED' | 'ERROR' | 'TIMEOUT'>('IDLE');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [remainingTime, setRemainingTime] = useState<number>(SCAN_TIMEOUT_SECONDS);
  const [scanInput, setScanInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [resolvedResult, setResolvedResult] = useState<{
    type: 'BUNK' | 'TANK' | 'NOZZLE';
    entity: any;
    parentStation?: any;
    identifier: string;
    name: string;
    isActive: boolean;
  } | null>(null);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isProcessingScanRef = useRef<boolean>(false);
  const scannerContainerId = 'petropulse-qr-reader';

  // Stop camera and release all media hardware tracks safely
  const stopCamera = useCallback(async () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        await scannerRef.current.clear();
      } catch (err) {
        console.warn('Error stopping QR scanner:', err);
      } finally {
        scannerRef.current = null;
      }
    }
    setCameraState('STOPPED');
  }, []);

  // Safe Close that guarantees camera release
  const handleSafeClose = useCallback(async () => {
    await stopCamera();
    onClose();
  }, [stopCamera, onClose]);

  // Handle entity resolution
  const handleResolveCode = useCallback(async (rawCode: string) => {
    const code = rawCode.trim();
    if (!code) {
      notifyWarning('Empty QR Code', 'The scanned QR code contained no readable data.');
      return;
    }

    // Prevent duplicate scan events
    if (isProcessingScanRef.current) return;
    isProcessingScanRef.current = true;

    // Immediately stop camera upon detection
    await stopCamera();
    setIsLoading(true);
    setResolvedResult(null);

    try {
      // Decode JSON payload if applicable
      let targetId = code;
      if (code.startsWith('{') && code.endsWith('}')) {
        try {
          const parsed = JSON.parse(code);
          if (parsed.id) targetId = parsed.id;
          else if (parsed.code) targetId = parsed.code;
        } catch {
          // Keep raw string
        }
      }

      const res = await api.resolveQRCode(targetId);
      setResolvedResult(res);
      notifySuccess('Forecourt Asset Verified', `Resolved ${res.type}: ${res.name} (${res.identifier})`);
    } catch (err: any) {
      notifyError('Asset Lookup Failed', err.message || `Unable to locate asset for QR code: ${code}`);
      setCameraState('IDLE');
    } finally {
      setIsLoading(false);
      isProcessingScanRef.current = false;
    }
  }, [notifyError, notifySuccess, notifyWarning, stopCamera]);

  // Start Camera Scanning
  const startCamera = useCallback(async () => {
    await stopCamera();
    setCameraError(null);
    setCameraState('STARTING');
    setRemainingTime(SCAN_TIMEOUT_SECONDS);
    isProcessingScanRef.current = false;

    // Small delay to ensure the container element is rendered in DOM
    setTimeout(async () => {
      try {
        const container = document.getElementById(scannerContainerId);
        if (!container) {
          throw new Error('Scanner element not found in DOM.');
        }

        const html5QrCode = new Html5Qrcode(scannerContainerId, {
          formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
          verbose: false,
        });
        scannerRef.current = html5QrCode;

        const config = {
          fps: 15,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        };

        // Prefer rear camera, fallback to user camera
        await html5QrCode.start(
          { facingMode: 'environment' },
          config,
          (decodedText) => {
            handleResolveCode(decodedText);
          },
          () => {
            // Frame scanned without code; normal polling
          }
        );

        setCameraState('SCANNING');

        // Start 120s countdown timer
        const startTime = Date.now();
        timerRef.current = setInterval(() => {
          const elapsed = Math.floor((Date.now() - startTime) / 1000);
          const remaining = Math.max(0, SCAN_TIMEOUT_SECONDS - elapsed);
          setRemainingTime(remaining);

          if (remaining <= 0) {
            clearInterval(timerRef.current!);
            timerRef.current = null;
            stopCamera();
            setCameraState('TIMEOUT');
            notifyWarning('Scanner Timed Out', 'No QR code detected within 120 seconds. Click Retry to scan again.');
          }
        }, 1000);
      } catch (err: any) {
        console.error('Camera initialization error:', err);
        setCameraState('ERROR');
        let msg = 'Could not access device camera.';
        if (err.name === 'NotAllowedError' || err.message?.includes('Permission')) {
          msg = 'Camera permission was denied. Please allow camera access in browser settings.';
        } else if (err.name === 'NotFoundError' || err.message?.includes('not found')) {
          msg = 'No camera device detected on this system.';
        } else if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
          msg = 'Camera requires a secure HTTPS connection or localhost context.';
        }
        setCameraError(msg);
      }
    }, 150);
  }, [handleResolveCode, notifyWarning, stopCamera]);

  // Lifecycle on modal open / close
  useEffect(() => {
    if (isOpen) {
      setResolvedResult(null);
      setScanInput('');
      setScannerMode('CAMERA');
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, startCamera, stopCamera]);

  if (!isOpen) return null;

  const handleOpenAction = (action: 'READING' | 'DETAILS') => {
    if (!resolvedResult) return;
    onNavigateToEntity({
      type: resolvedResult.type,
      entity: resolvedResult.entity,
      parentStation: resolvedResult.parentStation,
      action,
    });
    handleSafeClose();
  };

  return (
    <ModalPortal isOpen={isOpen} onClose={handleSafeClose} ariaLabel="Forecourt QR Tag Scanner" className="max-w-lg mx-auto">
      <div className="relative w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden text-slate-900 dark:text-gray-100 transition">
        {/* Flush top-right close button */}
        <button
          type="button"
          onClick={handleSafeClose}
          className="absolute top-0 right-0 flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-tr-2xl rounded-bl-xl bg-red-500 hover:bg-red-600 active:scale-95 text-white transition cursor-pointer z-10"
          aria-label="Close scanner dialog"
        >
          <X className="h-4 w-4 text-white stroke-[2.5]" />
        </button>
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 px-5 py-4 bg-slate-50/70 dark:bg-slate-950/40 pr-10">
          <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
              <ScanLine className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                Forecourt QR Scanner
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                Auto-detect physical Bunk, Tank, and Nozzle tags
              </p>
            </div>
          </div>

        </div>

        {/* Mode Switcher Tabs */}
        <div className="flex border-b border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-950/20 px-5 pt-2">
          <button
            type="button"
            onClick={() => {
              setScannerMode('CAMERA');
              if (cameraState !== 'SCANNING') startCamera();
            }}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold border-b-2 cursor-pointer transition ${
              scannerMode === 'CAMERA'
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            Live Camera Preview
          </button>
          <button
            type="button"
            onClick={() => {
              setScannerMode('MANUAL');
              stopCamera();
            }}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold border-b-2 cursor-pointer transition ${
              scannerMode === 'MANUAL'
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            Manual Tag ID Lookup
          </button>
        </div>

        {/* Body Content */}
        <div className="p-5 sm:p-6 space-y-4">
          {/* CAMERA SCANNER VIEW */}
          {scannerMode === 'CAMERA' && (
            <div className="space-y-3">
              {/* Camera Preview Viewport */}
              <div className="relative w-full aspect-square max-h-[320px] rounded-2xl overflow-hidden bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-center shadow-inner">
                {/* HTML5-QRCode Target Element */}
                <div id={scannerContainerId} className="w-full h-full" />

                {/* Animated Targeting Frame & Radar Scanner Overlays */}
                {cameraState === 'SCANNING' && (
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6">
                    <div className="relative w-56 h-56 rounded-2xl border-2 border-emerald-400/80 shadow-[0_0_20px_rgba(16,185,129,0.35)] flex items-center justify-center animate-pulse">
                      {/* Corner Target Accents */}
                      <span className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-emerald-400" />
                      <span className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-emerald-400" />
                      <span className="absolute -bottom-1 -left-1 w-4 h-4 border-bottom-2 border-l-2 border-emerald-400" />
                      <span className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-emerald-400" />

                      {/* Moving laser scan line */}
                      <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_8px_#34d399] animate-bounce" />
                    </div>
                  </div>
                )}

                {/* Starting State */}
                {cameraState === 'STARTING' && (
                  <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs flex flex-col items-center justify-center gap-2 text-white">
                    <Loader2 className="w-7 h-7 text-emerald-400 animate-spin" />
                    <span className="text-xs font-medium">Initializing camera sensor...</span>
                  </div>
                )}

                {/* Timeout State */}
                {cameraState === 'TIMEOUT' && (
                  <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center text-white space-y-3">
                    <Clock className="w-10 h-10 text-amber-400" />
                    <div>
                      <h4 className="text-sm font-bold">Scanning Session Timed Out</h4>
                      <p className="text-xs text-slate-300 mt-1 max-w-xs">
                        No QR code detected within 120 seconds to protect device battery and camera hardware.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={startCamera}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs transition"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Retry Camera Scan
                    </button>
                  </div>
                )}

                {/* Error State */}
                {cameraState === 'ERROR' && (
                  <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center text-white space-y-3">
                    <VideoOff className="w-10 h-10 text-rose-400" />
                    <div>
                      <h4 className="text-sm font-bold text-rose-300">Camera Access Error</h4>
                      <p className="text-xs text-slate-300 mt-1 max-w-xs">
                        {cameraError || 'Unable to start camera sensor.'}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={startCamera}
                        className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold cursor-pointer transition"
                      >
                        Try Again
                      </button>
                      <button
                        type="button"
                        onClick={() => setScannerMode('MANUAL')}
                        className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white cursor-pointer transition shadow-xs"
                      >
                        Enter Tag Manually
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Status and 120s Timeout Progress */}
              {cameraState === 'SCANNING' && (
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                    <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-sans font-semibold">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                      Live Camera Scanning Active
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      Session Timeout: {remainingTime}s
                    </span>
                  </div>
                  {/* Progress bar for 120s timeout */}
                  <div className="w-full h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 transition-all duration-1000 ease-linear"
                      style={{ width: `${(remainingTime / SCAN_TIMEOUT_SECONDS) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* MANUAL ENTRY VIEW */}
          {scannerMode === 'MANUAL' && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleResolveCode(scanInput);
              }}
              className="space-y-3"
            >
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Enter Forecourt QR Tag / Asset ID:
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={scanInput}
                    onChange={(e) => setScanInput(e.target.value)}
                    placeholder="e.g. BUNK-000001, TANK-000001, NOZZ-000001"
                    autoFocus
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 py-2.5 pl-9 pr-3 text-xs font-mono font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLoading || !scanInput.trim()}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-500 disabled:opacity-50 transition shadow-xs cursor-pointer"
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <QrCode className="h-4 w-4" />}
                  Resolve
                </button>
              </div>

              {/* Sample Tag Shortcuts */}
              <div className="space-y-1 pt-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Quick Testing Tags:
                </span>
                <div className="flex flex-wrap gap-1.5 text-xs">
                  {['BUNK-000001', 'BUNK-000002', 'TANK-000001', 'TANK-000002', 'NOZZ-000001', 'NOZZ-000002'].map((id) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => {
                        setScanInput(id);
                        handleResolveCode(id);
                      }}
                      className="px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 text-[11px] font-mono text-slate-600 dark:text-slate-300 hover:border-emerald-500 hover:text-emerald-600 transition cursor-pointer"
                    >
                      {id}
                    </button>
                  ))}
                </div>
              </div>
            </form>
          )}

          {/* ASSET RESOLUTION RESULT CARD */}
          {resolvedResult && (
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/20 p-4 space-y-3 transition-all animate-fadeIn">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-xs">
                    {resolvedResult.type === 'BUNK' ? (
                      <Building2 className="h-4 w-4" />
                    ) : (
                      <Fuel className="h-4 w-4" />
                    )}
                  </div>
                  <div>
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                      {resolvedResult.type} ASSET IDENTIFIED
                    </span>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      {resolvedResult.name}
                    </h3>
                  </div>
                </div>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                    resolvedResult.isActive
                      ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                      : 'bg-rose-500/10 text-rose-600 border border-rose-500/20'
                  }`}
                >
                  {resolvedResult.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>

              <div className="rounded-xl border border-slate-200/60 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 p-3 text-xs space-y-1">
                <div className="flex justify-between font-mono">
                  <span className="text-slate-500">Tag ID:</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {resolvedResult.identifier}
                  </span>
                </div>
                {resolvedResult.parentStation && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Parent Station:</span>
                    <span className="font-semibold text-slate-900 dark:text-white truncate max-w-[220px]">
                      {resolvedResult.parentStation.name}
                    </span>
                  </div>
                )}
                {resolvedResult.entity.fuelCode && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Fuel Grade:</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      {resolvedResult.entity.fuelCode}
                    </span>
                  </div>
                )}
              </div>

              {/* Navigation Action Buttons */}
              <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                {resolvedResult.type === 'NOZZLE' && (
                  <button
                    type="button"
                    onClick={() => handleOpenAction('READING')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-500 transition shadow-xs cursor-pointer"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Enter Nozzle Reading
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleOpenAction('DETAILS')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/80 transition cursor-pointer"
                >
                  View Forecourt Details
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer info banner */}
        <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 flex items-center justify-between text-[11px] text-slate-400">
          <span>Camera automatically stops on detection or modal dismissal.</span>
          <button
            type="button"
            onClick={handleSafeClose}
            className="text-slate-500 hover:text-slate-900 dark:hover:text-white font-medium cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </ModalPortal>
  );
};
