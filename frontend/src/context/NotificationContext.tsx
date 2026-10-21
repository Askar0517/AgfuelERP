import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
} from 'react';
import { createPortal } from 'react-dom';
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Radio,
  Info,
  X,
  ExternalLink,
} from 'lucide-react';
import { AppNotification, NotificationType, StoredNotification, NotificationCategory } from '../types';

interface NotifyOptions {
  message?: string;
  errors?: string[];
  duration?: number;
  category?: NotificationCategory;
  link?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface NotificationContextType {
  // Ephemeral toast notifications
  notifications: AppNotification[];
  notify: (type: NotificationType, title: string, options?: NotifyOptions) => string;
  notifySuccess: (title: string, message?: string, options?: NotifyOptions) => string;
  notifyError: (title: string, message?: string, options?: NotifyOptions) => string;
  notifyWarning: (title: string, message?: string, options?: NotifyOptions) => string;
  notifyInfo: (title: string, message?: string, options?: NotifyOptions) => string;
  notifyValidation: (title: string, message?: string, errors?: string[], options?: NotifyOptions) => string;
  notifyLive: (title: string, message?: string, options?: NotifyOptions) => string;
  dismiss: (id: string) => void;
  dismissAll: () => void;

  // Persistent Notification Module (kept in the app for upcoming views)
  storedNotifications: StoredNotification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  deleteStoredNotification: (id: string) => void;
  clearAllStored: () => void;
  addStoredNotification: (item: Partial<StoredNotification> & { title: string; type: NotificationType }) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// Default auto-dismiss durations in milliseconds
const DURATION_MAP: Record<NotificationType, number> = {
  success: 4000,
  info: 4000,
  live: 5000,
  warning: 6000,
  validation: 7000,
  error: 8500,
};

const STORAGE_KEY = 'petropulse_notifications_v2';

// Realistic starter forecourt notifications if none exist
const DEFAULT_STORED_NOTIFICATIONS: StoredNotification[] = [
  {
    id: 'stored-notif-01',
    type: 'warning',
    title: 'Low Tank Volume Alert: Tank #02',
    message: 'Octane 95 is currently at 18.4% capacity (2,750 L remaining). Below critical replenishment threshold of 3,500 L.',
    category: 'inventory',
    timestamp: Date.now() - 12 * 60 * 1000,
    read: false,
    link: '/tanks',
    actionLabel: 'View Tank #02',
  },
  {
    id: 'stored-notif-02',
    type: 'success',
    title: 'Shift Settle Reconciled: SH-001',
    message: 'Attendant Suresh Kumar closed morning shift with ₹48,250 cash submitted. Balanced with zero cash shortage.',
    category: 'operations',
    timestamp: Date.now() - 48 * 60 * 1000,
    read: false,
    link: '/shifts',
    actionLabel: 'Review Shifts',
  },
  {
    id: 'stored-notif-03',
    type: 'info',
    title: 'Forecourt Pricing Synchronized',
    message: 'Live forecourt pricing synchronized: 98 Oct ₹112.50, 95 Oct ₹104.25, Diesel ₹92.80.',
    category: 'rates',
    timestamp: Date.now() - 2 * 3600 * 1000,
    read: true,
    link: '/dashboard',
    actionLabel: 'Forecourt Rates',
  },
  {
    id: 'stored-notif-04',
    type: 'live',
    title: 'IoT Forecourt Telemetry Online',
    message: 'Wayne Dresser ATG probes and electronic totalizers reporting healthy sensor telemetry.',
    category: 'system',
    timestamp: Date.now() - 4 * 3600 * 1000,
    read: true,
    link: '/dashboard',
  },
  {
    id: 'stored-notif-05',
    type: 'success',
    title: 'Decanting Batch Verified: Tanker DL-01-AB-1234',
    message: 'Received 12,000 L Octane 98. Density confirmed 0.742 g/cc within ASTM-15C standard.',
    category: 'operations',
    timestamp: Date.now() - 7 * 3600 * 1000,
    read: true,
    link: '/bunks',
    actionLabel: 'Decanting Log',
  },
  {
    id: 'stored-notif-06',
    type: 'info',
    title: 'Security & PBKDF2 Audit Verified',
    message: 'Administrator session authenticated for station BUNK-000001 (Metro Central Forecourt).',
    category: 'security',
    timestamp: Date.now() - 10 * 3600 * 1000,
    read: true,
    link: '/profile',
    actionLabel: 'Audit Profile',
  },
];

const deriveCategory = (type: NotificationType, title: string, message?: string): NotificationCategory => {
  const text = `${title} ${message || ''}`.toLowerCase();
  if (text.includes('tank') || text.includes('inventory') || text.includes('dip') || text.includes('stock')) return 'inventory';
  if (text.includes('rate') || text.includes('price') || text.includes('pricing')) return 'rates';
  if (text.includes('shift') || text.includes('meter') || text.includes('reading') || text.includes('sale') || text.includes('pos') || text.includes('decant')) return 'operations';
  if (text.includes('auth') || text.includes('password') || text.includes('login') || text.includes('security') || text.includes('clearance') || text.includes('role')) return 'security';
  return 'system';
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [storedNotifications, setStoredNotifications] = useState<StoredNotification[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_STORED_NOTIFICATIONS));
        return DEFAULT_STORED_NOTIFICATIONS;
      }
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_STORED_NOTIFICATIONS;
    } catch {
      return DEFAULT_STORED_NOTIFICATIONS;
    }
  });

  const recentMapRef = useRef<Map<string, number>>(new Map());
  const timerMapRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Save stored notifications safely to localStorage
  const syncToStorage = (items: StoredNotification[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, 100)));
    } catch {
      // Ignore quota errors
    }
  };

  // Dismiss a specific toast notification
  const dismiss = useCallback((id: string) => {
    const timer = timerMapRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timerMapRef.current.delete(id);
    }
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  // Dismiss all toast notifications
  const dismissAll = useCallback(() => {
    timerMapRef.current.forEach((timer) => clearTimeout(timer));
    timerMapRef.current.clear();
    setNotifications([]);
  }, []);

  // Persistent notification actions
  const markAsRead = useCallback((id: string) => {
    setStoredNotifications((prev) => {
      const updated = prev.map((n) => (n.id === id ? { ...n, read: true } : n));
      syncToStorage(updated);
      return updated;
    });
  }, []);

  const markAllAsRead = useCallback(() => {
    setStoredNotifications((prev) => {
      const updated = prev.map((n) => ({ ...n, read: true }));
      syncToStorage(updated);
      return updated;
    });
  }, []);

  const deleteStoredNotification = useCallback((id: string) => {
    setStoredNotifications((prev) => {
      const updated = prev.filter((n) => n.id !== id);
      syncToStorage(updated);
      return updated;
    });
  }, []);

  const clearAllStored = useCallback(() => {
    setStoredNotifications([]);
    syncToStorage([]);
  }, []);

  const addStoredNotification = useCallback(
    (item: Partial<StoredNotification> & { title: string; type: NotificationType }) => {
      const now = Date.now();
      const newItem: StoredNotification = {
        id: item.id || `stored-${now}-${Math.random().toString(36).substring(2, 7)}`,
        type: item.type,
        title: item.title,
        message: item.message,
        errors: item.errors,
        category: item.category || deriveCategory(item.type, item.title, item.message),
        timestamp: item.timestamp || now,
        read: item.read ?? false,
        link: item.link,
        actionLabel: item.actionLabel,
      };
      setStoredNotifications((prev) => {
        const updated = [newItem, ...prev];
        syncToStorage(updated);
        return updated;
      });
    },
    []
  );

  // Core notify dispatcher with deduplication, top-stack insertion, and persistent archive logging
  const notify = useCallback(
    (type: NotificationType, title: string, options?: NotifyOptions): string => {
      const now = Date.now();
      const dedupKey = `${type}::${title}::${options?.message || ''}`;
      const lastSeen = recentMapRef.current.get(dedupKey);

      // Prevent exact duplicate notifications within 2.5 seconds
      if (lastSeen && now - lastSeen < 2500) {
        return '';
      }
      recentMapRef.current.set(dedupKey, now);

      // Generate unique ID
      const id = `notif-${now}-${Math.random().toString(36).substring(2, 7)}`;
      const duration = options?.duration !== undefined ? options.duration : DURATION_MAP[type];

      const newNotification: AppNotification = {
        id,
        type,
        title,
        message: options?.message,
        errors: options?.errors,
        duration,
        action: options?.action,
        timestamp: now,
      };

      // 1. Toast banner at top of viewport
      setNotifications((prev) => [newNotification, ...prev]);

      // 2. Also keep in persistent notification log for upcoming views
      const category = options?.category || deriveCategory(type, title, options?.message);
      const storedItem: StoredNotification = {
        id: `stored-${now}-${Math.random().toString(36).substring(2, 7)}`,
        type,
        title,
        message: options?.message,
        errors: options?.errors,
        category,
        timestamp: now,
        read: false,
        link: options?.link,
        actionLabel: options?.action?.label,
      };
      setStoredNotifications((prev) => {
        const updated = [storedItem, ...prev.filter((n) => n.title !== title || now - n.timestamp > 4000)];
        syncToStorage(updated);
        return updated;
      });

      // Schedule auto-dismissal if duration > 0
      if (duration > 0) {
        const timer = setTimeout(() => {
          dismiss(id);
        }, duration);
        timerMapRef.current.set(id, timer);
      }

      return id;
    },
    [dismiss]
  );

  const notifySuccess = useCallback(
    (title: string, message?: string, options?: NotifyOptions) =>
      notify('success', title, { ...options, message }),
    [notify]
  );

  const notifyError = useCallback(
    (title: string, message?: string, options?: NotifyOptions) =>
      notify('error', title, { ...options, message }),
    [notify]
  );

  const notifyWarning = useCallback(
    (title: string, message?: string, options?: NotifyOptions) =>
      notify('warning', title, { ...options, message }),
    [notify]
  );

  const notifyInfo = useCallback(
    (title: string, message?: string, options?: NotifyOptions) =>
      notify('info', title, { ...options, message }),
    [notify]
  );

  const notifyValidation = useCallback(
    (title: string, message?: string, errors?: string[], options?: NotifyOptions) =>
      notify('validation', title, { ...options, message, errors }),
    [notify]
  );

  const notifyLive = useCallback(
    (title: string, message?: string, options?: NotifyOptions) =>
      notify('live', title, { ...options, message }),
    [notify]
  );

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      timerMapRef.current.forEach((t) => clearTimeout(t));
      timerMapRef.current.clear();
    };
  }, []);

  const unreadCount = storedNotifications.filter((n) => !n.read).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        notify,
        notifySuccess,
        notifyError,
        notifyWarning,
        notifyInfo,
        notifyValidation,
        notifyLive,
        dismiss,
        dismissAll,
        storedNotifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        deleteStoredNotification,
        clearAllStored,
        addStoredNotification,
      }}
    >
      {children}
      {/* Global Top-Right Toast Notification Container */}
      <NotificationContainer notifications={notifications} onDismiss={dismiss} />
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

/**
 * Global Top-Right Notification Viewport Component
 */
const NotificationContainer: React.FC<{
  notifications: AppNotification[];
  onDismiss: (id: string) => void;
}> = ({ notifications, onDismiss }) => {
  if (notifications.length === 0) return null;

  return createPortal(
    <div
      className="fixed top-4 right-4 z-[10000] flex flex-col gap-2.5 max-w-sm sm:max-w-md w-full pointer-events-none px-3 sm:px-0"
      role="region"
      aria-label="System Notifications"
      aria-live="polite"
    >
      {notifications.map((item) => (
        <NotificationCard key={item.id} item={item} onDismiss={onDismiss} />
      ))}
    </div>,
    document.body
  );
};

const NotificationCard: React.FC<{
  item: AppNotification;
  onDismiss: (id: string) => void;
}> = ({ item, onDismiss }) => {
  const [isExiting, setIsExiting] = useState(false);

  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(() => onDismiss(item.id), 200);
  };

  const getStyleProps = () => {
    switch (item.type) {
      case 'success':
        return {
          icon: CheckCircle2,
          border: 'border-emerald-500/40 dark:border-emerald-500/30',
          bg: 'bg-white/95 dark:bg-slate-900/95',
          iconColor: 'text-emerald-600 dark:text-emerald-400',
          badgeBg: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300',
          accent: 'bg-emerald-500',
          typeLabel: 'Success',
        };
      case 'error':
        return {
          icon: AlertCircle,
          border: 'border-rose-500/50 dark:border-rose-500/40',
          bg: 'bg-white/95 dark:bg-slate-900/95',
          iconColor: 'text-rose-600 dark:text-rose-400',
          badgeBg: 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300',
          accent: 'bg-rose-500',
          typeLabel: 'Error',
        };
      case 'warning':
        return {
          icon: AlertTriangle,
          border: 'border-amber-500/50 dark:border-amber-500/40',
          bg: 'bg-white/95 dark:bg-slate-900/95',
          iconColor: 'text-amber-600 dark:text-amber-400',
          badgeBg: 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300',
          accent: 'bg-amber-500',
          typeLabel: 'Warning',
        };
      case 'validation':
        return {
          icon: AlertCircle,
          border: 'border-purple-500/50 dark:border-purple-500/40',
          bg: 'bg-white/95 dark:bg-slate-900/95',
          iconColor: 'text-purple-600 dark:text-purple-400',
          badgeBg: 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300',
          accent: 'bg-purple-500',
          typeLabel: 'Validation Failed',
        };
      case 'live':
        return {
          icon: Radio,
          border: 'border-cyan-500/50 dark:border-cyan-500/40',
          bg: 'bg-white/95 dark:bg-slate-900/95',
          iconColor: 'text-cyan-600 dark:text-cyan-400 animate-pulse',
          badgeBg: 'bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300',
          accent: 'bg-cyan-500',
          typeLabel: 'Live Telemetry',
        };
      case 'info':
      default:
        return {
          icon: Info,
          border: 'border-blue-500/40 dark:border-blue-500/30',
          bg: 'bg-white/95 dark:bg-slate-900/95',
          iconColor: 'text-blue-600 dark:text-blue-400',
          badgeBg: 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300',
          accent: 'bg-blue-500',
          typeLabel: 'Notice',
        };
    }
  };

  const style = getStyleProps();
  const Icon = style.icon;

  return (
    <div
      className={`pointer-events-auto relative overflow-hidden rounded-xl border ${style.border} ${style.bg} shadow-lg backdrop-blur-md transition-all duration-300 transform ${
        isExiting
          ? 'opacity-0 translate-x-8 scale-95'
          : 'opacity-100 translate-x-0 scale-100'
      }`}
      style={{
        animation: 'slideDownFromTop 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      }}
    >
      {/* Top accent indicator line */}
      <div className={`h-1 w-full ${style.accent}`} />

      <div className="p-3.5 sm:p-4">
        <div className="flex items-start gap-3">
          {/* Status Icon */}
          <div className="shrink-0 mt-0.5">
            <Icon className={`w-5 h-5 ${style.iconColor}`} />
          </div>

          {/* Text Content */}
          <div className="flex-1 min-w-0 pr-1">
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md ${style.badgeBg}`}>
                {style.typeLabel}
              </span>
              <span className="text-[10px] text-slate-400 dark:text-slate-500">
                {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            </div>

            <h4 className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100 leading-snug">
              {item.title}
            </h4>

            {item.message && (
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-300 leading-relaxed break-words">
                {item.message}
              </p>
            )}

            {/* List of validation errors if present */}
            {item.errors && item.errors.length > 0 && (
              <ul className="mt-2 space-y-1 text-xs text-rose-600 dark:text-rose-400 list-disc list-inside bg-rose-50/50 dark:bg-rose-950/30 p-2 rounded-lg border border-rose-200/50 dark:border-rose-900/50">
                {item.errors.map((err, idx) => (
                  <li key={idx} className="leading-tight">
                    {err}
                  </li>
                ))}
              </ul>
            )}

            {/* Optional action button */}
            {item.action && (
              <div className="mt-2.5">
                <button
                  type="button"
                  onClick={() => {
                    item.action?.onClick();
                    handleDismiss();
                  }}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
                >
                  {item.action.label}
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>

          {/* Dismiss button */}
          <button
            type="button"
            onClick={handleDismiss}
            className="shrink-0 p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Dismiss notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
