import React from 'react';
import { useI18n } from '../../context/I18nContext';

interface PortfolioSummaryProps {
  totalValue: number;
  grossProfit: number;
  totalExpenses: number;
  netProfit: number;
}

const SummaryItem: React.FC<{ title: string; value: number; color?: string; sign?: boolean }> = ({ title, value, color = 'text-primary-dark', sign = false }) => {
    const { locale } = useI18n();
    const valueColor = value >= 0 ? (color === 'text-danger' ? 'text-success dark:text-green-400' : `${color} dark:text-slate-100`) : 'text-danger dark:text-red-400';
    const valueSign = value > 0 && sign ? '+' : '';
    
    return (
        <div className="p-4 flex-1">
            <h2 className="text-sm font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">{title}</h2>
            <p className={`text-2xl font-bold ${valueColor}`}>
                {valueSign}${value.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
        </div>
    );
};

const PortfolioSummary: React.FC<PortfolioSummaryProps> = ({ totalValue, grossProfit, totalExpenses, netProfit }) => {
  const { t, locale } = useI18n();

  return (
    <div className="bg-surface dark:bg-slate-800 rounded-lg shadow-md mb-8">
      <div className="flex flex-col md:flex-row md:items-center">
        <div className="p-6 flex-1 border-b md:border-b-0 md:border-r border-gray-200 dark:border-slate-700">
            <h2 className="text-sm font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">{t('dashboard.portfolioSummaryTitle')}</h2>
            <p className="text-4xl font-bold text-primary-dark dark:text-white">
                ${totalValue.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
        </div>
        <div className="flex-1">
            <div className="flex flex-col sm:flex-row">
                <SummaryItem title={t('dashboard.grossProfit')} value={grossProfit} color="text-success" sign={true} />
                <SummaryItem title={t('dashboard.expenses')} value={totalExpenses * -1} color="text-danger" />
            </div>
             <div className="border-t border-gray-200 dark:border-slate-700">
                <SummaryItem title={t('dashboard.netProfit')} value={netProfit} color="text-primary" sign={true} />
            </div>
        </div>
      </div>
    </div>
  );
};

export default PortfolioSummary;