import React from 'react';
import type { Balance } from '../../types';
import { useI18n } from '../../context/I18nContext';

interface BalanceCardProps {
  balance: Balance;
}

const BalanceCard: React.FC<BalanceCardProps> = ({ balance }) => {
  const { locale, t } = useI18n();
  const { currency, amount, availableAmount } = balance;

  const formatAmount = (value: number) => {
    // Special formatter for UZS which has a very different scale and formatting rules.
    if (currency.code === 'UZS') {
      return new Intl.NumberFormat('uz-UZ', {
        style: 'currency',
        currency: 'UZS',
        currencyDisplay: 'symbol',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value);
    }
    
    try {
      // Standard ISO currency formatting
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currency.code,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(value);
    } catch (error) {
      // Fallback for non-ISO currency codes like USDT
      if (error instanceof RangeError) {
        return `${currency.symbol}${value.toLocaleString(locale, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`;
      }
      // Log other unexpected errors and provide a simple fallback
      console.error("Formatting error:", error);
      return `${currency.symbol}${value.toFixed(2)}`;
    }
  };

  return (
    <div className="bg-surface dark:bg-slate-800 p-6 rounded-lg shadow-md flex flex-col justify-between h-full">
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-text-primary dark:text-slate-100">{currency.name} ({currency.code})</h3>
          <span className="text-2xl dark:text-slate-300">{currency.symbol}</span>
        </div>
        <p className="text-3xl font-bold text-primary dark:text-primary-light truncate" title={String(amount)}>
          {formatAmount(amount)}
        </p>
      </div>
      <div className="mt-4">
        <p className="text-sm text-text-secondary dark:text-slate-400">{t('dashboard.available')}: {formatAmount(availableAmount)}</p>
      </div>
    </div>
  );
};

export default BalanceCard;