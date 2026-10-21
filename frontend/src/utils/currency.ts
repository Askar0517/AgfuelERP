import { Station } from '../types';

export interface CurrencyConfig {
  code: string;
  symbol: string;
  name: string;
  locale: string;
  decimals: number;
}

export const SUPPORTED_CURRENCIES: Record<string, CurrencyConfig> = {
  INR: {
    code: 'INR',
    symbol: '\u20B9',
    name: 'Indian Rupee',
    locale: 'en-IN',
    decimals: 2,
  },
  AED: {
    code: 'AED',
    symbol: 'AED',
    name: 'UAE Dirham',
    locale: 'en-AE',
    decimals: 2,
  },
  USD: {
    code: 'USD',
    symbol: '$',
    name: 'US Dollar',
    locale: 'en-US',
    decimals: 2,
  },
  EUR: {
    code: 'EUR',
    symbol: '\u20AC',
    name: 'Euro',
    locale: 'de-DE',
    decimals: 2,
  },
  SGD: {
    code: 'SGD',
    symbol: 'S$',
    name: 'Singapore Dollar',
    locale: 'en-SG',
    decimals: 2,
  },
};

/**
 * Authoritatively resolve the currency configuration for a bunk station.
 * 1. If station has an explicit configured `currency`, use it.
 * 2. If station timezone is 'Asia/Dubai' or location indicates UAE/Dubai, default to AED.
 * 3. Otherwise, default to INR (Indian Rupee) as standard forecourt currency.
 */
export function getBunkCurrency(station?: Station | { currency?: string; timezone?: string; location?: string } | null): CurrencyConfig {
  if (station?.currency && SUPPORTED_CURRENCIES[station.currency.toUpperCase()]) {
    return SUPPORTED_CURRENCIES[station.currency.toUpperCase()];
  }

  const tz = station?.timezone || '';
  const loc = (station?.location || '').toLowerCase();

  if (tz === 'Asia/Dubai' || loc.includes('dubai') || loc.includes('uae') || loc.includes('emirates')) {
    return SUPPORTED_CURRENCIES.AED;
  }

  if (tz === 'Asia/Singapore' || loc.includes('singapore')) {
    return SUPPORTED_CURRENCIES.SGD;
  }

  return SUPPORTED_CURRENCIES.INR;
}

/**
 * Format an amount with the station's configured currency symbol and localized formatting.
 */
export function formatBunkAmount(
  amount: number,
  station?: Station | { currency?: string; timezone?: string; location?: string } | null,
  showCode = false
): string {
  const cfg = getBunkCurrency(station);
  const formatted = amount.toLocaleString(cfg.locale, {
    minimumFractionDigits: cfg.decimals,
    maximumFractionDigits: cfg.decimals,
  });

  if (showCode) {
    return `${cfg.symbol} ${formatted} (${cfg.code})`;
  }
  return `${cfg.symbol} ${formatted}`;
}
