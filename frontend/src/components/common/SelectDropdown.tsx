import React, { useState, useRef, useEffect, useId } from 'react';
import { ChevronDown, Check, Search, X, AlertCircle } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  description?: string;
  badge?: string;
  badgeClass?: string;
  disabled?: boolean;
  disabledReason?: string;
  icon?: React.ComponentType<{ className?: string }>;
}

export interface SelectDropdownProps {
  label?: string;
  placeholder?: string;
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
  searchable?: boolean;
  searchPlaceholder?: string;
  required?: boolean;
  helpText?: string;
  className?: string;
  id?: string;
  clearable?: boolean;
}

export const SelectDropdown: React.FC<SelectDropdownProps> = ({
  label,
  placeholder = 'Select an option...',
  options,
  value,
  onChange,
  error,
  disabled = false,
  searchable = true,
  searchPlaceholder = 'Search options...',
  required = false,
  helpText,
  className = '',
  id,
  clearable = false,
}) => {
  const generatedId = useId();
  const selectId = id || generatedId;
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  // Filter options based on search query
  const filteredOptions = options.filter((opt) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      opt.label.toLowerCase().includes(q) ||
      (opt.description && opt.description.toLowerCase().includes(q)) ||
      (opt.badge && opt.badge.toLowerCase().includes(q))
    );
  });

  // Close dropdown on click outside
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

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen) {
      if (searchable && options.length > 5 && searchInputRef.current) {
        searchInputRef.current.focus();
      }
      const idx = filteredOptions.findIndex((opt) => opt.value === value);
      setHighlightedIndex(idx >= 0 ? idx : 0);
    } else {
      setSearchQuery('');
    }
  }, [isOpen, searchable, options.length, value]);

  // Scroll highlighted option into view
  useEffect(() => {
    if (isOpen && highlightedIndex >= 0 && listRef.current) {
      const el = listRef.current.children[highlightedIndex] as HTMLElement;
      if (el) {
        el.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex, isOpen]);

  const handleToggle = () => {
    if (disabled) return;
    setIsOpen((prev) => !prev);
  };

  const handleSelect = (option: SelectOption) => {
    if (option.disabled) return;
    onChange(option.value);
    setIsOpen(false);
    setSearchQuery('');
    triggerRef.current?.focus();
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
      setSearchQuery('');
      triggerRef.current?.focus();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => {
        const next = prev + 1;
        return next < filteredOptions.length ? next : 0;
      });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => {
        const next = prev - 1;
        return next >= 0 ? next : filteredOptions.length - 1;
      });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
        handleSelect(filteredOptions[highlightedIndex]);
      }
    } else if (e.key === 'Tab') {
      setIsOpen(false);
    }
  };

  const showSearch = searchable && options.length > 5;

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

      {/* Trigger Button */}
      <button
        type="button"
        id={selectId}
        ref={triggerRef}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-invalid={Boolean(error)}
        className={`w-full min-h-[38px] px-3 py-2 rounded-xl text-xs flex items-center justify-between gap-2 border transition-all text-left ${
          disabled
            ? 'bg-slate-100 dark:bg-slate-800/50 border-slate-200 dark:border-[#194C47] text-slate-400 dark:text-slate-500 cursor-not-allowed opacity-75'
            : error
            ? 'bg-white dark:bg-slate-900 border-rose-500 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-rose-500 shadow-2xs'
            : isOpen
            ? 'bg-white dark:bg-slate-900 border-[#12544F] ring-2 ring-[#12544F]/20 text-slate-900 dark:text-slate-100 shadow-2xs'
            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-[#194C47] hover:border-[#12544F]/50 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-[#12544F]/30'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {selectedOption ? (
            <>
              {selectedOption.icon && (
                <selectedOption.icon className="w-4 h-4 text-[#12544F] dark:text-[#38A399] shrink-0" />
              )}
              <span className="truncate font-medium text-slate-900 dark:text-slate-100 min-w-0 flex-1">
                {selectedOption.label}
              </span>
              {selectedOption.badge && (
                <span
                  className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border shrink-0 ${
                    selectedOption.badgeClass ||
                    'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {selectedOption.badge}
                </span>
              )}
            </>
          ) : (
            <span className="text-slate-400 dark:text-slate-500 truncate">{placeholder}</span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {clearable && selectedOption && !disabled && (
            <span
              role="button"
              tabIndex={0}
              onClick={handleClear}
              className="p-0.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded cursor-pointer"
              title="Clear selection"
            >
              <X className="w-3.5 h-3.5" />
            </span>
          )}
          <ChevronDown
            className={`w-4 h-4 text-slate-400 dark:text-slate-500 transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-[#12544F] dark:text-[#38A399]' : ''
            }`}
          />
        </div>
      </button>

      {/* Floating Menu Popover */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1.5 rounded-xl border border-slate-200 dark:border-[#194C47] bg-white dark:bg-slate-900 shadow-xl overflow-hidden animate-fadeIn">
          {/* Embedded Search Input */}
          {showSearch && (
            <div className="p-2 border-b border-slate-100 dark:border-[#194C47] bg-slate-50/70 dark:bg-slate-900/50">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder={searchPlaceholder}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-1 focus:ring-[#12544F]"
                />
              </div>
            </div>
          )}

          {/* Options List */}
          <ul
            ref={listRef}
            role="listbox"
            tabIndex={-1}
            className="max-h-56 overflow-y-auto p-1 text-xs space-y-0.5"
          >
            {filteredOptions.length === 0 ? (
              <li className="px-3 py-4 text-center text-slate-400 dark:text-slate-500 text-xs">
                No matching options found
              </li>
            ) : (
              filteredOptions.map((option, index) => {
                const isSelected = option.value === value;
                const isHighlighted = index === highlightedIndex;

                return (
                  <li
                    key={option.value}
                    role="option"
                    aria-selected={isSelected}
                    aria-disabled={option.disabled}
                    onClick={() => handleSelect(option)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    className={`px-3 py-2 rounded-lg flex items-start justify-between gap-2 transition-colors cursor-pointer select-none ${
                      option.disabled
                        ? 'opacity-40 cursor-not-allowed bg-transparent'
                        : isSelected
                        ? 'bg-[#12544F]/10 dark:bg-[#12544F]/30 text-[#12544F] dark:text-[#A1DDD7] font-semibold'
                        : isHighlighted
                        ? 'bg-slate-100 dark:bg-slate-850 text-slate-900 dark:text-slate-100'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 min-w-0">
                        <div className="flex items-center gap-1.5 min-w-0 flex-1">
                          {option.icon && (
                            <option.icon className="w-3.5 h-3.5 text-[#12544F] dark:text-[#38A399] shrink-0" />
                          )}
                          <span className="truncate">{option.label}</span>
                        </div>
                        {option.badge && (
                          <span
                            className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border shrink-0 ${
                              option.badgeClass ||
                              'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            {option.badge}
                          </span>
                        )}
                      </div>

                      {option.description && (
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 line-clamp-2">
                          {option.description}
                        </p>
                      )}

                      {option.disabled && option.disabledReason && (
                        <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5 font-medium">
                          {option.disabledReason}
                        </p>
                      )}
                    </div>

                    {isSelected && (
                      <Check className="w-4 h-4 text-[#12544F] dark:text-[#38A399] shrink-0 mt-0.5" />
                    )}
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
