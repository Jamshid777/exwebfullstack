import React, { useMemo } from 'react';
import type { Expense, ExpenseCategory } from '../../types';
import { useI18n } from '../../context/I18nContext';

interface RecentExpensesProps {
  expenses: Expense[];
  categories: ExpenseCategory[];
}

const RecentExpenses: React.FC<RecentExpensesProps> = ({ expenses, categories }) => {
    const { t, locale } = useI18n();
    const categoryMap = useMemo(() => {
        return new Map(categories.map(c => [c.id, c.name]));
    }, [categories]);

    if (expenses.length === 0) {
        return (
            <div className="p-6 h-full flex flex-col items-center justify-center text-center">
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-300 dark:text-gray-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" /></svg>
                <h3 className="text-lg font-semibold text-text-primary dark:text-slate-100">{t('dashboard.noExpenses')}</h3>
                <p className="text-text-secondary dark:text-slate-400 mt-1">{t('dashboard.noExpensesDescription')}</p>
            </div>
        );
    }
    
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
                <thead className="text-xs text-text-secondary dark:text-slate-400 uppercase bg-gray-50 dark:bg-slate-700">
                    <tr>
                        <th scope="col" className="p-2 sm:p-4">{t('expenses.details')}</th>
                        <th scope="col" className="p-2 sm:p-4 text-right">{t('expenses.amount')}</th>
                    </tr>
                </thead>
                <tbody>
                    {expenses.slice(0, 5).map(expense => (
                         <tr key={expense.id} className="border-b border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700/50">
                            <td className="p-2 sm:p-4">
                                <p className="font-semibold text-text-primary dark:text-slate-200">{categoryMap.get(expense.categoryId) || t('expenses.expense')}</p>
                                <p className="text-sm text-text-secondary dark:text-slate-400">{new Date(expense.createdAt).toLocaleDateString(locale)}</p>
                                {expense.note && <p className="text-xs text-text-secondary dark:text-slate-500 truncate mt-1 max-w-[100px] sm:max-w-[150px]" title={expense.note}>{expense.note}</p>}
                            </td>
                            <td className="p-2 sm:p-4 text-right">
                                <div>
                                    <p className="font-semibold text-danger dark:text-red-400">
                                        - {new Intl.NumberFormat(locale, {
                                            style: 'currency',
                                            currency: expense.currency,
                                            currencyDisplay: expense.currency === 'UZS' ? 'code' : 'symbol',
                                            minimumFractionDigits: expense.currency === 'UZS' ? 0 : 2,
                                            maximumFractionDigits: expense.currency === 'UZS' ? 0 : 2,
                                        }).format(expense.amount)}
                                    </p>
                                    {expense.currency === 'UZS' && (
                                        <p className="text-xs text-text-secondary dark:text-slate-500">
                                            (${(expense.amountUsd || 0).toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                                        </p>
                                    )}
                                </div>
                            </td>
                         </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default RecentExpenses;