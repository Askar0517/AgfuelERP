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
  Clock,
  Search,
  X,
} from 'lucide-react';
import { useNotification } from '../../context/NotificationContext';
import { StoredNotification, NotificationCategory, NotificationType } from '../../types';

interface NotificationDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (tab: string) => void;
}

export const NotificationDropdown: React.FC<NotificationDropdownProps> = ({
  isOpen,
  onClose,
  onNavigate,
}) => {
  const {
    storedNotifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteStoredNotification,
    clearAllStored,
  } = useNotification();

  const [activeTab, setActiveTab] = useState<'ALL' | 'UNREAD' | 'ALERTS' | 'OPS'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredNotifications = useMemo(() => {
    return storedNotifications.filter((n) => {
      // Tab filter
      if (activeTab === 'UNREAD' && n.read) return false;
      if (activeTab === 'ALERTS' && n.type !== 'warning' && n.type !== 'error') return false;
      if (activeTab === 'OPS' && n.category !== 'operations' && n.category !== 'inventory' && n.category !== 'rates') return false;

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = n.title.toLowerCase().includes(q);
        const matchesMessage = n.message?.toLowerCase().includes(q);
        const matchesCategory = n.category.toLowerCase().includes(q);
        return matchesTitle || matchesMessage || matchesCategory;
      }

      return true;
    });
  }, [storedNotifications, activeTab, searchQuery]);

  if (!isOpen) return null;

  const formatRelativeTime = (timestamp: number) => {
    const diffSec = Math.floor((Date.now() - timestamp) / 1000);
    if (diffSec < 60) return 'Just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return new Date(timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  const getCategoryConfig = (category: NotificationCategory, type: NotificationType) => {
    switch (category) {
      case 'inventory':
        return {
          icon: Fuel,
          badge: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30',
          label: 'Inventory',
        };
      case 'operations':
        return {
          icon: Layers,
          badge: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
          label: 'Forecourt Ops',
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
          label: 'Security',
        };
      case 'system':
      default:
        return {
          icon: Radio,
          badge: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-500/30',
          label: 'Telemetry',
        };
    }
  };

  const getTypeIcon = (type: NotificationType) => {
    switch (type) {
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-rose-500 shrink-0" />;
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />;
      case 'live':
        return <Radio className="h-4 w-4 text-cyan-500 animate-pulse shrink-0" />;
      case 'info':
      default:
        return <Info className="h-4 w-4 text-blue-500 shrink-0" />;
    }
  };

  const handleNotificationClick = (item: StoredNotification) => {
    markAsRead(item.id);
    if (item.link) {
      const route = item.link.replace(/^\//, '');
      if (onNavigate) {
        onNavigate(route);
      }
      onClose();
    }
  };

  const handleViewAll = () => {
    if (onNavigate) {
      onNavigate('notifications');
    }
    onClose();
  };

  return (
    <div
      className="absolute right-0 mt-2 w-[340px] sm:w-[410px] max-w-[calc(100vw-24px)] rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl z-50 overflow-hidden flex flex-col text-slate-800 dark:text-slate-100 animate-fadeIn"
      role="dialog"
      aria-label="Notification Center"
    >
      {/* 1. Header with Stats & Batch Actions */}
      <div className="p-3.5 sm:p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Bell className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                  Notifications
                </h3>
                {unreadCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500 text-white">
                    {unreadCount} new
                  </span>
                )}
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                Operational records & alerts kept in app
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllAsRead}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition cursor-pointer"
                title="Mark all notifications as read"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Mark read</span>
              </button>
            )}

            {storedNotifications.length > 0 && (
              <button
                type="button"
                onClick={clearAllStored}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition cursor-pointer"
                title="Clear all stored notifications"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Search Input */}
        <div className="relative mt-3">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search alerts, shifts, tanks..."
            className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 pl-8 pr-7 py-1.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 mt-2.5 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab('ALL')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
              activeTab === 'ALL'
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            All ({storedNotifications.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('UNREAD')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer flex items-center gap-1 ${
              activeTab === 'UNREAD'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <span>Unread</span>
            {unreadCount > 0 && (
              <span className="h-1.5 w-1.5 rounded-full bg-rose-400 animate-pulse" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('ALERTS')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
              activeTab === 'ALERTS'
                ? 'bg-amber-600 text-white shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Alerts
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('OPS')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
              activeTab === 'OPS'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Operations
          </button>
        </div>
      </div>

      {/* 2. Scrollable Notification List */}
      <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
        {filteredNotifications.length === 0 ? (
          <div className="p-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 mb-2.5">
              <Bell className="h-5 w-5" />
            </div>
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
              No notifications to display
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {searchQuery ? 'No alerts matched your search query.' : "You're all caught up with forecourt activity."}
            </p>
          </div>
        ) : (
          filteredNotifications.map((item) => {
            const catConfig = getCategoryConfig(item.category, item.type);
            const CatIcon = catConfig.icon;

            return (
              <div
                key={item.id}
                onClick={() => handleNotificationClick(item)}
                className={`p-3.5 transition group cursor-pointer relative hover:bg-slate-50 dark:hover:bg-slate-800/60 ${
                  !item.read
                    ? 'bg-emerald-500/[0.04] dark:bg-emerald-500/[0.07]'
                    : 'bg-white dark:bg-slate-900'
                }`}
              >
                {/* Unread indicator ribbon / dot */}
                {!item.read && (
                  <span className="absolute left-1.5 top-4 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-emerald-300 dark:ring-emerald-900" />
                )}

                <div className="flex items-start gap-3 pl-2">
                  <div className="mt-0.5 shrink-0">{getTypeIcon(item.type)}</div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded border ${catConfig.badge}`}>
                        <CatIcon className="h-2.5 w-2.5" />
                        {catConfig.label}
                      </span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                        {formatRelativeTime(item.timestamp)}
                      </span>
                    </div>

                    <h4 className={`text-xs font-semibold leading-snug ${!item.read ? 'text-slate-900 dark:text-white font-bold' : 'text-slate-700 dark:text-slate-300'}`}>
                      {item.title}
                    </h4>

                    {item.message && (
                      <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-2">
                        {item.message}
                      </p>
                    )}

                    {/* Action link if available */}
                    {item.link && (
                      <div className="mt-2 flex items-center justify-between">
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline">
                          <span>{item.actionLabel || 'View Details'}</span>
                          <ExternalLink className="h-2.5 w-2.5" />
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Item quick delete action on hover */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteStoredNotification(item.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition"
                    title="Remove notification"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 3. Footer: Full Activity Center Link */}
      <div className="p-2.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/80 flex items-center justify-between text-[11px]">
        <span className="text-slate-500 dark:text-slate-400 text-[10px] font-mono">
          Stored: {storedNotifications.length} items
        </span>
        <button
          type="button"
          onClick={handleViewAll}
          className="font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition cursor-pointer flex items-center gap-1"
        >
          <span>Open Full Center</span>
          <ExternalLink className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
};
