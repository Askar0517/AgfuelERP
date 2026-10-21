import React, { useState, useRef, useEffect, useId } from 'react';
import { ChevronDown, Check, Search, X, AlertCircle } from 'lucide-react';

export interface MultiSelectOption {
  value: string;
  label: string;
  description?: string;
  badge?: string;
  disabled?: boolean;
}

export interface MultiSelectDropdownProps {
  label?: string;
  placeholder?: string;
  options: MultiSelectOption[];
  value: string[];
  onChange: (value: string[]) => void;
  error?: string;
  disabled?: boolean;
  searchable?: boolean;
  searchPlaceholder?: string;
  required?: boolean;
  helpText?: string;
  maxDisplayChips?: number;
  showSelectAll?: boolean;
  className?: string;
  id?: string;
}

export const MultiSelectDropdown: React.FC<MultiSelectDropdownProps> = ({
  label,
  placeholder = 'Select options...',
  options,
  value = [],
  onChange,
  error,
  disabled = false,
  searchable = true,
  searchPlaceholder = 'Search...',
  required = false,
  helpText,
  maxDisplayChips = 3,
  showSelectAll = true,
  className = '',
  id,
}) => {
  const generatedId = useId();
  const selectId = id || generatedId;
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close when clicked outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Focus search input when open
  useEffect(() => {
    if (isOpen && searchable && options.length > 5 && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen, searchable, options.length]);

  const filteredOptions = options.filter((opt) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      opt.label.toLowerCase().includes(q) ||
      (opt.description && opt.description.toLowerCase().includes(q)) ||
      (opt.badge && opt.badge.toLowerCase().includes(q))
    );
  });

  const handleToggleOption = (val: string) => {
    if (disabled) return;
    const exists = value.includes(val);
    if (exists) {
      onChange(value.filter((v) => v !== val));
    } else {
      onChange([...value, val]);
    }
  };

  const handleRemoveChip = (e: React.MouseEvent, val: string) => {
    e.stopPropagation();
    if (disabled) return;
    onChange(value.filter((v) => v !== val));
  };

  const handleSelectAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled) return;
    const allEnabledValues = options.filter((o) => !o.disabled).map((o) => o.value);
    onChange(allEnabledValues);
  };

  const handleClearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled) return;
    onChange([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (e.key === 'Escape' && isOpen) {
      setIsOpen(false);
      triggerRef.current?.focus();
    }
  };

  const selectedOptions = options.filter((opt) => value.includes(opt.value));
  const hiddenChipsCount = selectedOptions.length - maxDisplayChips;

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && (
        <label
          htmlFor={selectId}
          className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
        >
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}

      {/* Trigger Bar */}
      <button
        type="button"
        id={selectId}
        ref={triggerRef}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-invalid={Boolean(error)}
        className={`w-full min-h-[38px] px-3 py-1.5 rounded-xl text-xs flex items-center justify-between gap-2 border transition-all text-left ${
          disabled
            ? 'bg-slate-100 dark:bg-slate-800/50 border-slate-200 dark:border-[#194C47] text-slate-400 dark:text-slate-500 cursor-not-allowed opacity-75'
            : error
            ? 'bg-white dark:bg-slate-900 border-rose-500 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-rose-500 shadow-2xs'
            : isOpen
            ? 'bg-white dark:bg-slate-900 border-[#12544F] ring-2 ring-[#12544F]/20 text-slate-900 dark:text-slate-100 shadow-2xs'
            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-[#194C47] hover:border-[#12544F]/50 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-[#12544F]/30'
        }`}
      >
        <div className="flex-1 min-w-0">
          {selectedOptions.length === 0 ? (
            <span className="text-slate-400 dark:text-slate-500">{placeholder}</span>
          ) : (
            <div className="flex flex-wrap items-center gap-1.5 py-0.5">
              {selectedOptions.slice(0, maxDisplayChips).map((opt) => (
                <span
                  key={opt.value}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-[#12544F]/10 dark:bg-[#12544F]/30 text-[#12544F] dark:text-[#A1DDD7] border border-[#12544F]/25 dark:border-[#2BA096]/40 shrink-0"
                >
                  <span className="truncate max-w-[140px]">{opt.label}</span>
                  {!disabled && (
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => handleRemoveChip(e, opt.value)}
                      className="p-0.2 hover:bg-[#12544F]/20 dark:hover:bg-[#12544F]/40 rounded text-[#12544F] dark:text-[#A1DDD7] cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </span>
                  )}
                </span>
              ))}

              {hiddenChipsCount > 0 && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-[#12544F] dark:text-[#A1DDD7] border border-slate-200 dark:border-slate-700">
                  +{hiddenChipsCount} more
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0 ml-1">
          {selectedOptions.length > 0 && !disabled && (
            <span
              role="button"
              tabIndex={0}
              onClick={handleClearAll}
              className="p-0.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded cursor-pointer mr-0.5"
              title="Clear all selections"
            >
              <X className="w-3.5 h-3.5" />
            </span>
          )}
          <ChevronDown
            className={`w-4 h-4 text-slate-400 dark:text-slate-500 transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-[#12544F] dark:text-[#2BA096]' : ''
            }`}
          />
        </div>
      </button>

      {/* Floating Dropdown Popover */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1.5 rounded-xl border border-slate-200 dark:border-[#194C47] bg-white dark:bg-slate-900 shadow-xl overflow-hidden animate-fadeIn">
          {/* Header Actions & Search */}
          <div className="p-2 border-b border-slate-100 dark:border-[#194C47] bg-slate-50/70 dark:bg-slate-900/50 space-y-2">
            {searchable && options.length > 5 && (
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder={searchPlaceholder}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-1 focus:ring-[#12544F]"
                />
              </div>
            )}

            {showSelectAll && (
              <div className="flex items-center justify-between text-[11px] px-1 text-slate-500 dark:text-slate-400">
                <span>
                  {value.length} of {options.length} selected
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="text-[#12544F] dark:text-[#2BA096] hover:underline font-semibold cursor-pointer"
                  >
                    Select All
                  </button>
                  <span>•</span>
                  <button
                    type="button"
                    onClick={handleClearAll}
                    className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:underline cursor-pointer"
                  >
                    Clear All
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Options List */}
          <ul role="listbox" className="max-h-56 overflow-y-auto p-1 text-xs space-y-0.5">
            {filteredOptions.length === 0 ? (
              <li className="px-3 py-4 text-center text-slate-400 dark:text-slate-500 text-xs">
                No matching options found
              </li>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = value.includes(opt.value);
                return (
                  <li
                    key={opt.value}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => !opt.disabled && handleToggleOption(opt.value)}
                    className={`px-3 py-2 rounded-lg flex items-center justify-between gap-2.5 transition-colors cursor-pointer select-none ${
                      opt.disabled
                        ? 'opacity-40 cursor-not-allowed bg-transparent'
                        : isSelected
                        ? 'bg-[#12544F]/10 dark:bg-[#12544F]/30 text-[#12544F] dark:text-[#A1DDD7] font-semibold'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      {/* Checkbox indicator */}
                      <div
                        className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                          isSelected
                            ? 'bg-[#12544F] border-[#12544F] text-white'
                            : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`truncate ${isSelected ? 'font-semibold' : 'font-medium'}`}>
                            {opt.label}
                          </span>
                          {opt.badge && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 shrink-0">
                              {opt.badge}
                            </span>
                          )}
                        </div>
                        {opt.description && (
                          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 truncate">
                            {opt.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}

      {/* Helper & Error Messages */}
      {error && (
        <p className="mt-1.5 text-[11px] text-rose-500 flex items-center gap-1 font-medium">
          <AlertCircle className="w-3 h-3 shrink-0" />
          <span>{error}</span>
        </p>
      )}
      {!error && helpText && (
        <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">{helpText}</p>
      )}
    </div>
  );
};
