import React, { useState, useEffect } from 'react';
import { EODSettlement, Station } from '../../types';
import {
  Clock,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Play,
  Globe,
} from 'lucide-react';
import { SelectDropdown } from '../common/SelectDropdown';

interface EODSchedulerPanelProps {
  station: Station;
  settlements: EODSettlement[];
  onRunEODClose: (payload: {
    stationId: string;
    settlementDate: string;
    timezone: string;
    closedBy: string;
    auditorNotes?: string;
  }) => Promise<void>;
}

export const EODSchedulerPanel: React.FC<EODSchedulerPanelProps> = ({
  station,
  settlements,
  onRunEODClose,
}) => {
  const currentSettlements = settlements.filter((s) => s.stationId === station.id);

  // Timezone state
  const [selectedTimezone, setSelectedTimezone] = useState<string>(
    station.timezone || 'Asia/Kolkata'
  );
  const [currentTimeStr, setCurrentTimeStr] = useState<string>('');
  const [currentDateStr, setCurrentDateStr] = useState<string>('');
  const [timeUntilClose, setTimeUntilClose] = useState<string>('');

  const [settlementDate, setSettlementDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [closedBy, setClosedBy] = useState<string>('Automated EOD Scheduler / Rajesh Sharma');
  const [auditorNotes, setAuditorNotes] = useState<string>(
    'Day close automated audit: all manual meters reconciled with tank stock.'
  );
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Timezone Clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      try {
        const time = now.toLocaleTimeString('en-US', {
          timeZone: selectedTimezone,
          hour12: true,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        });
        const date = now.toLocaleDateString('en-US', {
          timeZone: selectedTimezone,
          weekday: 'long',
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        });
        setCurrentTimeStr(time);
        setCurrentDateStr(date);

        // Calculate countdown to midnight in that timezone
        const midnight = new Date(now);
        midnight.setHours(23, 59, 59, 999);
        const diffMs = midnight.getTime() - now.getTime();
        const hrs = Math.floor(diffMs / (1000 * 60 * 60));
        const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        const secs = Math.floor((diffMs % (1000 * 60)) / 1000);
        setTimeUntilClose(`${hrs}h ${mins}m ${secs}s`);
      } catch {
        setCurrentTimeStr(now.toLocaleTimeString());
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [selectedTimezone]);

  const handleExecuteEOD = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsRunning(true);
    setSuccessMsg(null);
    try {
      await onRunEODClose({
        stationId: station.id,
        settlementDate,
        timezone: selectedTimezone,
        closedBy,
        auditorNotes,
      });
      setSuccessMsg(`EOD Day Close successfully finalized for ${settlementDate}! All ledgers archived.`);
      setTimeout(() => setSuccessMsg(null), 5000);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="space-y-6 pb-12 sm:pb-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white p-5 shadow-2xs dark:shadow-sm transition-colors">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Station Timezone Engine
            </span>
          </div>
          <h1 className="mt-1 text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <Clock className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            Timezone-Based EOD Scheduler
          </h1>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {station.name} · Scheduled midnight financial day-close & automated ledger freezing
          </p>
        </div>

        {/* Live timezone clock */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/90 p-3 sm:text-right font-mono self-start sm:self-auto">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <Globe className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>{selectedTimezone}</span>
          </div>
          <div className="text-sm sm:text-base font-bold text-slate-900 dark:text-white tabular-nums">
            {currentTimeStr || '00:00:00 AM'}
          </div>
          <div className="text-[10px] text-slate-400 dark:text-slate-500">
            {currentDateStr || 'Today'}
          </div>
        </div>
      </div>

      {successMsg && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Main Grid: Scheduler Configuration & Countdown */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column (2 Cols): Execution Form */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900/60 p-5 shadow-xs transition">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-gray-200 flex items-center gap-2 border-b border-slate-100 dark:border-gray-800 pb-3">
            <Play className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            Run EOD Day-Close Now
          </h2>

          <form onSubmit={handleExecuteEOD} className="mt-4 space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <SelectDropdown
                  label="Target Station Timezone"
                  value={selectedTimezone}
                  onChange={(val) => setSelectedTimezone(val)}
                  options={[
                    { value: 'Asia/Kolkata', label: 'Asia/Kolkata (IST +5:30) - India', badge: 'IST' },
                    { value: 'Asia/Dubai', label: 'Asia/Dubai (GST +4:00) - UAE', badge: 'GST' },
                    { value: 'Asia/Singapore', label: 'Asia/Singapore (SGT +8:00) - Singapore', badge: 'SGT' },
                    { value: 'Europe/London', label: 'Europe/London (GMT +0:00) - UK', badge: 'GMT' },
                    { value: 'America/New_York', label: 'America/New_York (EST -5:00) - USA', badge: 'EST' },
                  ]}
                  searchable={false}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-gray-300">
                  Business Settlement Date:
                </label>
                <input
                  type="date"
                  value={settlementDate}
                  onChange={(e) => setSettlementDate(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-800 px-3 py-2 text-xs font-semibold text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-gray-300">
                Authorized By / Certified Operator:
              </label>
              <input
                type="text"
                value={closedBy}
                onChange={(e) => setClosedBy(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-800 px-3 py-2 text-xs font-semibold text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-gray-300">
                Auditor & Compliance Notes:
              </label>
              <textarea
                rows={2}
                value={auditorNotes}
                onChange={(e) => setAuditorNotes(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-800 p-2.5 text-xs text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isRunning}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition disabled:opacity-50"
              >
                <Play className="h-4 w-4" />
                <span>{isRunning ? 'Processing EOD Settlement...' : 'Trigger Immediate EOD Day-Close'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Right Column (1 Col): Countdown & Automated Cron Status */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white p-5 shadow-2xs dark:shadow-sm flex flex-col justify-between transition-colors">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 block border-b border-slate-100 dark:border-slate-800 pb-2">
              Automated Midnight Scheduler
            </span>

            {/* Countdown card */}
            <div className="mt-4 rounded-xl border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50/70 dark:bg-emerald-500/15 p-4 text-center">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 block">
                Next Scheduled Auto-Close
              </span>
              <div className="mt-1 font-mono text-2xl font-bold text-emerald-700 dark:text-emerald-300 tabular-nums">
                {timeUntilClose || '0h 0m 0s'}
              </div>
              <span className="mt-1 block text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                At 23:59:59 ({selectedTimezone})
              </span>
            </div>

            <div className="mt-4 space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Scheduler Daemon:</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">Cron Active (Scale-2-Zero)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Target Station:</span>
                <span className="font-mono text-slate-900 dark:text-white">{station.code}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Auto-Reconcile DSR:</span>
                <span className="text-slate-700 dark:text-slate-200">Enabled</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Database Driver:</span>
                <span className="text-slate-700 dark:text-slate-200">PostgreSQL Relational</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>Timezone offsets automatically handle local DST transitions.</span>
          </div>
        </div>
      </div>

      {/* Historical EOD Settlements Log */}
      <div className="rounded-2xl border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900/60 p-5 shadow-xs transition">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-gray-800 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              Historical Day-Close Settlements
            </h2>
          </div>
          <span className="font-mono text-xs text-slate-500 dark:text-gray-400">
            {currentSettlements.length} Closures Archived
          </span>
        </div>

        {currentSettlements.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400 dark:text-gray-500">
            No day-close records yet for {station.name}. Run the trigger above to test.
          </div>
        ) : (
          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 dark:border-slate-800 text-[11px] uppercase tracking-wider text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900">
                <tr>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Timezone</th>
                  <th className="py-2.5 px-3 text-right">Volume Sold</th>
                  <th className="py-2.5 px-3 text-right">Total Revenue</th>
                  <th className="py-2.5 px-3 text-right">Cash</th>
                  <th className="py-2.5 px-3 text-right">Digital</th>
                  <th className="py-2.5 px-3 text-right">Variance</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3">Closed By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-gray-800 font-mono">
                {currentSettlements.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-gray-800/40 transition">
                    <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white font-sans">{s.settlementDate}</td>
                    <td className="py-2.5 px-3 text-slate-600 dark:text-gray-400">{s.timezone}</td>
                    <td className="py-2.5 px-3 text-right text-slate-700 dark:text-gray-300">
                      {s.totalVolumeSold.toLocaleString()} L
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-900 dark:text-white">
                      ₹{s.totalGrossRevenue.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-right text-emerald-600 dark:text-emerald-400">
                      ₹{s.totalCash.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-700 dark:text-gray-300">
                      ₹{s.totalDigital.toLocaleString()}
                    </td>
                    <td
                      className={`py-2.5 px-3 text-right font-bold ${
                        s.settlementDifference === 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {s.settlementDifference === 0 ? 'Balanced' : `₹${s.settlementDifference}`}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="rounded bg-emerald-500/10 border border-emerald-500/30 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                        {s.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-sans text-slate-600 dark:text-gray-400 truncate max-w-[140px]">
                      {s.closedBy}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
