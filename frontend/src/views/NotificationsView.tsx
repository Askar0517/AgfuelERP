import React, { useState, useMemo } from 'react';
import {
  Bell,
  CheckCheck,
  Trash2,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Info,
  Radio,
  ExternalLink,
  Fuel,
  Layers,
  Shield,
  Search,
  Filter,
  Check,
  X,
  ArrowRight,
  Clock,
  Sparkles,
} from 'lucide-react';
import { useNotification } from '../context/NotificationContext';
import { StoredNotification, NotificationCategory, NotificationType } from '../types';
import { Breadcrumbs } from '../components/common/Breadcrumbs';

interface NotificationsViewProps {
  onNavigate?: (tab: string) => void;
}

export const NotificationsView: React.FC<NotificationsViewProps> = ({ onNavigate }) => {
  const {
    storedNotifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteStoredNotification,
    clearAllStored,
  } = useNotification();

  const [activeTab, setActiveTab] = useState<'ALL' | 'UNREAD' | 'OPERATIONS' | 'INVENTORY' | 'RATES' | 'SECURITY' | 'SYSTEM'>('ALL');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'warning' | 'error' | 'success' | 'info'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredNotifications = useMemo(() => {
    return storedNotifications.filter((n) => {
      // Category tab filter
      if (activeTab === 'UNREAD' && n.read) return false;
      if (activeTab === 'OPERATIONS' && n.category !== 'operations') return false;
      if (activeTab === 'INVENTORY' && n.category !== 'inventory') return false;
      if (activeTab === 'RATES' && n.category !== 'rates') return false;
      if (activeTab === 'SECURITY' && n.category !== 'security') return false;
      if (activeTab === 'SYSTEM' && n.category !== 'system') return false;

      // Type filter
      if (typeFilter !== 'ALL' && n.type !== typeFilter) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = n.title.toLowerCase().includes(q);
        const matchesMessage = n.message?.toLowerCase().includes(q);
        const matchesCat = n.category.toLowerCase().includes(q);
        return matchesTitle || matchesMessage || matchesCat;
      }

      return true;
    });
  }, [storedNotifications, activeTab, typeFilter, searchQuery]);

  const getCategoryConfig = (category: NotificationCategory) => {
    switch (category) {
      case 'inventory':
        return {
          icon: Fuel,
          badge: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30',
          label: 'Inventory & Tanks',
        };
      case 'operations':
        return {
          icon: Layers,
          badge: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
          label: 'Forecourt Operations',
        };
      case 'rates':
        return {
          icon: Fuel,
          badge: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/30',
          label: 'Fuel Pricing',
        };
      case 'security':
        return {
          icon: Shield,
          badge: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30',
          label: 'Security & Access',
        };
      case 'system':
      default:
        return {
          icon: Radio,
          badge: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-500/30',
          label: 'Telemetry & IoT',
        };
    }
  };

  const getTypeIcon = (type: NotificationType) => {
    switch (type) {
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-rose-500 shrink-0" />;
      case 'success':
        return <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />;
      case 'live':
        return <Radio className="h-5 w-5 text-cyan-500 animate-pulse shrink-0" />;
      case 'info':
      default:
        return <Info className="h-5 w-5 text-blue-500 shrink-0" />;
    }
  };

  const handleAction = (item: StoredNotification) => {
    markAsRead(item.id);
    if (item.link && onNavigate) {
      const tab = item.link.replace(/^\//, '');
      onNavigate(tab);
    }
  };

  return (
    <div className="w-full space-y-3.5 pb-12 sm:pb-6">
      {/* Breadcrumb Navigation */}
      <Breadcrumbs
        items={[
          { label: 'Operations' },
          { label: 'Notifications', isCurrent: true, icon: Bell },
        ]}
      />

      {/* 1. Header Card */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-xs w-full">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-lg shadow-emerald-500/20 shrink-0">
              <Bell className="h-7 w-7" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                  Notification Center
                </h1>
                {unreadCount > 0 ? (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500 text-white animate-pulse">
                    {unreadCount} Unread
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                    All Caught Up
                  </span>
                )}
                <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  {storedNotifications.length} Total Saved
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Persistent audit log of operational alerts, decanting logs, shifts, meter entries, and IoT telemetry.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllAsRead}
                className="flex items-center gap-1.5 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 px-3.5 py-2 text-xs font-bold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 active:scale-95 transition cursor-pointer"
              >
                <CheckCheck className="h-4 w-4" />
                <span>Mark All Read</span>
              </button>
            )}

            {storedNotifications.length > 0 && (
              <button
                type="button"
                onClick={clearAllStored}
                className="flex items-center gap-1.5 rounded-xl border border-rose-300 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/30 px-3.5 py-2 text-xs font-bold text-rose-700 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/50 active:scale-95 transition cursor-pointer"
              >
                <Trash2 className="h-4 w-4" />
                <span>Clear All</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. Filters & Search Bar */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search notifications by title, message, or category..."
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 pl-9 pr-8 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Type Filter */}
          <div className="flex items-center gap-2 shrink-0">
            <Filter className="h-3.5 w-3.5 text-slate-400" />
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Type:</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none"
            >
              <option value="ALL">All Types</option>
              <option value="warning">Warnings</option>
              <option value="error">Errors</option>
              <option value="success">Success</option>
              <option value="info">Info</option>
            </select>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
              activeTab === 'ALL'
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            All ({storedNotifications.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('UNREAD')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'UNREAD'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <span>Unread</span>
            {unreadCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-rose-500 text-white">
                {unreadCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('OPERATIONS')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
              activeTab === 'OPERATIONS'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Forecourt Ops
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('INVENTORY')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
              activeTab === 'INVENTORY'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Inventory & Tanks
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('RATES')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
              activeTab === 'RATES'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Fuel Pricing
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('SECURITY')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
              activeTab === 'SECURITY'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Security
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('SYSTEM')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
              activeTab === 'SYSTEM'
                ? 'bg-cyan-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Telemetry & IoT
          </button>
        </div>
      </div>

      {/* 3. Notifications List */}
      <div className="space-y-3">
        {filteredNotifications.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-12 text-center shadow-xs">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 mb-3">
              <Bell className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              No notifications found
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {searchQuery
                ? 'No notifications match your current search query or filter.'
                : 'All forecourt operations and sensor checks are clear.'}
            </p>
          </div>
        ) : (
          filteredNotifications.map((item) => {
            const catConfig = getCategoryConfig(item.category);
            const CatIcon = catConfig.icon;

            return (
              <div
                key={item.id}
                className={`group rounded-2xl border transition-all duration-200 p-4 sm:p-5 shadow-xs relative overflow-hidden ${
                  !item.read
                    ? 'border-emerald-500/40 bg-emerald-500/[0.03] dark:bg-emerald-500/[0.06]'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
                }`}
              >
                {/* Left accent strip for unread */}
                {!item.read && (
                  <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-emerald-500" />
                )}

                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div className="mt-0.5 p-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 shrink-0">
                      {getTypeIcon(item.type)}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md border ${catConfig.badge}`}>
                          <CatIcon className="h-3 w-3" />
                          {catConfig.label}
                        </span>

                        <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(item.timestamp).toLocaleString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                        </span>

                        {!item.read && (
                          <span className="h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-emerald-300 dark:ring-emerald-900" />
                        )}
                      </div>

                      <h3 className={`text-sm leading-snug ${!item.read ? 'font-bold text-slate-900 dark:text-white' : 'font-semibold text-slate-800 dark:text-slate-200'}`}>
                        {item.title}
                      </h3>

                      {item.message && (
                        <p className="mt-1 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                          {item.message}
                        </p>
                      )}

                      {item.errors && item.errors.length > 0 && (
                        <ul className="mt-2 text-xs text-rose-600 dark:text-rose-400 list-disc list-inside bg-rose-50/50 dark:bg-rose-950/30 p-2 rounded-lg border border-rose-200/50 dark:border-rose-900/50">
                          {item.errors.map((err, idx) => (
                            <li key={idx}>{err}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>

                  {/* Actions Zone */}
                  <div className="flex items-center gap-2 self-end sm:self-start shrink-0 pt-2 sm:pt-0">
                    {item.link && (
                      <button
                        type="button"
                        onClick={() => handleAction(item)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-[#12544F] text-white hover:bg-[#0E433F] transition shadow-2xs cursor-pointer"
                      >
                        <span>{item.actionLabel || 'View Record'}</span>
                        <ArrowRight className="h-3 w-3" />
                      </button>
                    )}

                    {!item.read ? (
                      <button
                        type="button"
                        onClick={() => markAsRead(item.id)}
                        className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-emerald-600 hover:border-emerald-300 dark:hover:border-emerald-700 transition cursor-pointer"
                        title="Mark as read"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                    ) : (
                      <span className="text-[11px] text-slate-400 font-medium px-2 py-1">
                        Read
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() => deleteStoredNotification(item.id)}
                      className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-rose-600 hover:border-rose-300 dark:hover:border-rose-900 transition cursor-pointer"
                      title="Delete notification"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
