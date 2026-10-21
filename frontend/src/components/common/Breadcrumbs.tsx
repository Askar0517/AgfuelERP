import React from 'react';
import { ChevronRight, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export interface BreadcrumbItem {
  label: string;
  href?: string;
  onClick?: () => void;
  isCurrent?: boolean;
  icon?: React.ComponentType<{ className?: string }>;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  actions?: React.ReactNode;
  badge?: React.ReactNode;
  className?: string;
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({
  items,
  actions,
  badge,
  className = '',
}) => {
  const navigate = useNavigate();

  return (
    <nav
      aria-label="Breadcrumb navigation"
      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-1.5 px-1 ${className}`}
    >
      {/* Trail */}
      <ol className="flex items-center flex-wrap gap-1.5 text-xs text-slate-500 dark:text-slate-400 min-w-0">
        {/* Root Home Link */}
        <li className="flex items-center">
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-1 text-slate-500 dark:text-slate-400 hover:text-[#12544F] dark:hover:text-[#2BA096] transition-colors cursor-pointer"
            title="Dashboard Home"
          >
            <Home className="w-3.5 h-3.5 shrink-0" />
            <span className="sr-only sm:not-sr-only font-medium">Home</span>
          </button>
        </li>

        {items.map((item, idx) => {
          const isLast = idx === items.length - 1 || item.isCurrent;
          const Icon = item.icon;

          return (
            <li key={`${item.label}-${idx}`} className="flex items-center gap-1.5 min-w-0">
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 dark:text-slate-600 shrink-0" />
              {isLast ? (
                <span
                  className="font-bold text-slate-900 dark:text-slate-100 truncate flex items-center gap-1.5"
                  aria-current="page"
                >
                  {Icon && <Icon className="w-3.5 h-3.5 shrink-0 text-[#12544F] dark:text-[#2BA096]" />}
                  <span className="truncate">{item.label}</span>
                </span>
              ) : item.onClick || item.href ? (
                <button
                  type="button"
                  onClick={() => {
                    if (item.onClick) item.onClick();
                    else if (item.href) navigate(item.href);
                  }}
                  className="hover:text-[#12544F] dark:hover:text-[#2BA096] font-medium transition-colors truncate cursor-pointer flex items-center gap-1"
                >
                  {Icon && <Icon className="w-3.5 h-3.5 shrink-0" />}
                  <span className="truncate">{item.label}</span>
                </button>
              ) : (
                <span className="font-medium text-slate-500 dark:text-slate-400 truncate flex items-center gap-1">
                  {Icon && <Icon className="w-3.5 h-3.5 shrink-0" />}
                  <span className="truncate">{item.label}</span>
                </span>
              )}
            </li>
          );
        })}

        {badge && <div className="ml-1 shrink-0">{badge}</div>}
      </ol>

      {/* Action buttons slot */}
      {actions && (
        <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
          {actions}
        </div>
      )}
    </nav>
  );
};
