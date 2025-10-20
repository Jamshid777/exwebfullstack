import React from 'react';
import type { Expense } from '../../types';
import { useI18n } from '../../context/I18nContext';

interface ExpenseRowProps {
    expense: Expense;
    categoryName: string;
    onEdit: (expense: Expense) => void;
}

const ExpenseRow: React.FC<ExpenseRowProps> = ({ expense, categoryName, onEdit }) => {
    const { locale, t } = useI18n();
    const { createdAt, note, amount, currency, amountUsd } = expense;

    return (
        <div className="p-4 hover:bg-gray-50 dark:hover:bg-slate-700/50 sm:grid sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] sm:gap-4 sm:items-center">
            {/* Column 1: Details */}
            <div className="flex items-center min-w-0">
                <div className="w-10 h-10 rounded-full flex items-center justify-center mr-4 flex-shrink-0 bg-secondary/20 text-secondary-dark dark:bg-yellow-900/50 dark:text-yellow-300">
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" /></svg>
                </div>
                <div className="min-w-0">
                    <p className="font-semibold text-text-primary dark:text-slate-100 truncate" title={categoryName}>{categoryName}</p>
                    <p className="text-sm text-text-secondary dark:text-slate-400">{new Date(createdAt).toLocaleString(locale, { dateStyle: 'short', timeStyle: 'short' })}</p>
                </div>
            </div>

            {/* Column 2: Amount & Edit Button */}
             <div className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-700 sm:mt-0 sm:pt-0 sm:border-t-0 sm:text-right flex items-center justify-between sm:justify-end gap-4">
                <div>
                    <p className="font-semibold text-danger dark:text-red-400">
                        - {new Intl.NumberFormat(locale, {
                            style: 'currency',
                            currency: currency,
                            currencyDisplay: currency === 'UZS' ? 'code' : 'symbol',
                            minimumFractionDigits: currency === 'UZS' ? 0 : 2,
                            maximumFractionDigits: currency === 'UZS' ? 0 : 2,
                        }).format(amount)}
                    </p>
                    {currency === 'UZS' && (
                        <p className="text-xs text-text-secondary dark:text-slate-500 sm:text-right">
                            (${(amountUsd || 0).toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                        </p>
                    )}
                </div>
                 <button 
                    onClick={() => onEdit(expense)} 
                    className="p-2 text-text-secondary dark:text-slate-400 hover:text-primary dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-600 rounded-full"
                    aria-label={t('buttons.edit')}
                    title={t('buttons.edit')}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L16.732 3.732z" /></svg>
                </button>
            </div>
             
             {/* Note */}
             {note && (
                <div className="mt-2 text-xs text-text-secondary dark:text-slate-500 truncate sm:col-start-1 sm:col-span-2" title={note}>
                    {note}
                </div>
            )}
        </div>
    );
};

export default ExpenseRow;