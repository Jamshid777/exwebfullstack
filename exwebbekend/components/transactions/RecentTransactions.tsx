import React from 'react';
import type { Transaction } from '../../types';
import { useI18n } from '../../context/I18nContext';
import TransactionRow from './TransactionRow';

interface RecentTransactionsProps {
  transactions: Transaction[];
  onViewAll?: () => void;
}

const RecentTransactions: React.FC<RecentTransactionsProps> = ({ transactions, onViewAll }) => {
    const { t } = useI18n();
    
  if (transactions.length === 0) {
    return (
        <div className="p-6 h-full flex flex-col items-center justify-center text-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-300 dark:text-gray-600 mb-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm0 6a2 2 0 00-2 2v4a2 2 0 002 2h12a2 2 0 002-2v-4a2 2 0 00-2-2H4z" clipRule="evenodd" /></svg>
            <h3 className="text-lg font-semibold text-text-primary dark:text-slate-100">{t('dashboard.noTransactions')}</h3>
            <p className="text-text-secondary dark:text-slate-400 mt-1">{t('dashboard.noTransactionsDescription')}</p>
        </div>
    );
  }
    
  return (
    <div className="h-full flex flex-col">
      <div className="flex-grow">
          <div className="divide-y divide-gray-200 dark:divide-slate-700">
             {transactions.slice(0, 5).map(tx => <TransactionRow key={tx.id} transaction={tx} />)}
          </div>
      </div>
       {onViewAll && (
         <div className="p-2 text-center border-t border-gray-200 dark:border-slate-700">
            <button onClick={onViewAll} className="text-sm font-semibold text-primary dark:text-primary-light hover:text-primary-light dark:hover:text-indigo-400 transition-colors">
                {t('buttons.viewAll')} &rarr;
            </button>
         </div>
       )}
    </div>
  );
};

export default RecentTransactions;