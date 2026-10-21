import React, { useState, useEffect } from 'react';
import { Database, RefreshCw, X, CheckCircle2, AlertTriangle, Layers, Server, Clock } from 'lucide-react';
import { api } from '../../api/client';
import { ModalPortal } from './ModalPortal';

interface TableInfo {
  tableName: string;
  label: string;
  status: 'SYNCED' | 'MISSING' | 'READY_IN_MEMORY';
  rowCount: number;
  error?: string;
}

interface DbSyncData {
  timestamp: string;
  connection: {
    target: string;
    connected: boolean;
    engine: string;
    database: string;
    latencyMs?: number;
    error?: string;
    pool: {
      total: number;
      idle: number;
      waiting: number;
    };
  };
  tableSync: {
    mode: 'POSTGRESQL' | 'IN_MEMORY_FALLBACK';
    totalExpectedTables: number;
    syncedTablesCount: number;
    missingTablesCount: number;
    tables: TableInfo[];
  };
}

interface DbSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DbSyncModal: React.FC<DbSyncModalProps> = ({ isOpen, onClose }) => {
  const [data, setData] = useState<DbSyncData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.getDbStatus();
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Failed fetching database status');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTriggerSync = async () => {
    setIsSyncing(true);
    try {
      const res = await api.triggerDbSync();
      if (res?.report) {
        setData(res.report);
      } else {
        await fetchStatus();
      }
    } catch (err: any) {
      setError(err.message || 'Failed triggering database sync');
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchStatus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isPostgres = data?.connection.connected;

  return (
    <ModalPortal isOpen={isOpen} onClose={onClose}>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
        <div
          className="relative w-full max-w-2xl bg-white dark:bg-[#0D2926] border border-slate-200 dark:border-[#194C47] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150"
          role="dialog"
          aria-modal="true"
        >
          {/* Modal Header */}
          <div className="px-5 py-4 border-b border-slate-200 dark:border-[#194C47] flex items-center justify-between bg-slate-50/50 dark:bg-emerald-950/20">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <Database className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  Database & Table Sync Diagnostics
                  <span
                    className={`text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full border ${
                      isPostgres
                        ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                        : 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30'
                    }`}
                  >
                    {isPostgres ? 'PostgreSQL Active' : 'In-Memory Fallback'}
                  </span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Forecourt database connection health & real-time table synchronization
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              aria-label="Close dialog"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-5 overflow-y-auto space-y-4 text-xs">
            {error && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
                <span>{error}</span>
              </div>
            )}

            {/* Connection Info Banner */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60">
                <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mb-1 font-medium">
                  <Server className="h-3.5 w-3.5 text-slate-400" /> Target Connection
                </div>
                <div className="font-mono text-[11px] text-slate-900 dark:text-white truncate" title={data?.connection.target}>
                  {data?.connection.target || 'Loading...'}
                </div>
              </div>

              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60">
                <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mb-1 font-medium">
                  <Clock className="h-3.5 w-3.5 text-slate-400" /> Latency & Engine
                </div>
                <div className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <span>{data?.connection.latencyMs !== undefined ? `${data.connection.latencyMs} ms` : 'N/A'}</span>
                  <span className="text-[10px] text-slate-400">· {data?.connection.engine || 'Loading...'}</span>
                </div>
              </div>

              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60">
                <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mb-1 font-medium">
                  <Layers className="h-3.5 w-3.5 text-slate-400" /> Tables Synchronized
                </div>
                <div className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                  {data ? `${data.tableSync.syncedTablesCount} / ${data.tableSync.totalExpectedTables}` : '...'} Synced
                </div>
              </div>
            </div>

            {/* Tables List */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Layers className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  Forecourt Authoritative Entity Tables (15 Tables)
                </h4>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                  Mode: {data?.tableSync.mode || 'Loading...'}
                </span>
              </div>

              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800/60 bg-white dark:bg-slate-900/40">
                {isLoading ? (
                  <div className="p-8 text-center text-slate-400">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-emerald-500" />
                    Checking database connection and table synchronization...
                  </div>
                ) : (
                  data?.tableSync.tables.map((tbl) => (
                    <div
                      key={tbl.tableName}
                      className="px-3.5 py-2 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/40 transition"
                    >
                      <div className="flex items-center gap-2.5">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                        <div>
                          <div className="font-mono font-medium text-slate-900 dark:text-white text-[11px]">
                            {tbl.tableName}
                          </div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400">
                            {tbl.label}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] text-slate-600 dark:text-slate-300 font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
                          {tbl.rowCount} {tbl.rowCount === 1 ? 'record' : 'records'}
                        </span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                          {tbl.status === 'SYNCED' ? 'SYNCED' : 'READY'}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Diagnostic Footer Notice */}
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-slate-700 dark:text-slate-300">Resilient Forecourt Engine: </span>
                {isPostgres
                  ? 'Authoritative PostgreSQL database is online. All entity modifications synchronize directly to PostgreSQL storage.'
                  : 'PostgreSQL connection offline or pending setup. System is safely operating in high-availability In-Memory Store. All station shifts, meter readings, tanks, and nozzles remain fully functional.'}
              </div>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="px-5 py-3 border-t border-slate-200 dark:border-[#194C47] bg-slate-50/50 dark:bg-emerald-950/20 flex items-center justify-between">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
              Last Diagnostic: {data ? new Date(data.timestamp).toLocaleTimeString() : '...'}
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleTriggerSync}
                disabled={isSyncing}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-semibold text-xs transition cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                {isSyncing ? 'Synchronizing...' : 'Re-sync & Test'}
              </button>

              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-xs transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};

export default DbSyncModal;
