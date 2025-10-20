import React, { useState, useMemo, useEffect } from 'react';
import type { Expense, ExpenseCategory } from '../types';
import Button from '../components/common/Button';
import ExpenseRow from '../components/expenses/ExpenseRow';
import { useI18n } from '../context/I18nContext';

interface ExpenseHistoryPageProps {
    expenses: Expense[];
    categories: ExpenseCategory[];
    onNavigateBack: () => void;
    onEditExpense: (expense: Expense) => void;
}

const ExpenseHistoryPage: React.FC<ExpenseHistoryPageProps> = ({ expenses, categories, onNavigateBack, onEditExpense }) => {
    const { t } = useI18n();

    const [filterCategoryId, setFilterCategoryId] = useState<string>('all');
    const [filterStartDate, setFilterStartDate] = useState('');
    const [filterEndDate, setFilterEndDate] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 15;

    const categoryMap = useMemo(() => new Map(categories.map(c => [c.id, c.name])), [categories]);

    const resetFilters = () => {
        setFilterCategoryId('all');
        setFilterStartDate('');
        setFilterEndDate('');
    };

    const filteredExpenses = useMemo(() => {
        return expenses.filter(ex => {
            if (filterCategoryId !== 'all' && ex.categoryId !== filterCategoryId) {
                return false;
            }
            const exDate = new Date(ex.createdAt);
            if (filterStartDate) {
                const startDate = new Date(filterStartDate);
                startDate.setHours(0, 0, 0, 0);
                if (exDate < startDate) return false;
            }
            if (filterEndDate) {
                const endDate = new Date(filterEndDate);
                endDate.setHours(23, 59, 59, 999);
                if (exDate > endDate) return false;
            }
            return true;
        });
    }, [expenses, filterCategoryId, filterStartDate, filterEndDate]);

    useEffect(() => {
        setCurrentPage(1);
    }, [filteredExpenses]);

    const totalPages = Math.ceil(filteredExpenses.length / ITEMS_PER_PAGE);
    const paginatedExpenses = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredExpenses.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    }, [filteredExpenses, currentPage]);

    const filterInputStyles = "mt-1 w-full p-2 bg-white dark:bg-slate-700 text-text-primary dark:text-slate-200 border border-gray-300 dark:border-slate-600 rounded-md";

    return (
        <div className="bg-surface dark:bg-slate-800 p-4 sm:p-6 rounded-lg shadow-md">
            <header className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200 dark:border-slate-700">
                <Button onClick={onNavigateBack} variant="secondary" size="sm">
                    &larr; <span className="hidden sm:inline ml-2">{t('buttons.back')}</span>
                </Button>
                <h1 className="text-lg sm:text-xl font-bold text-text-primary dark:text-slate-100">{t('expenses.pageTitle')}</h1>
                <div className="w-16 sm:w-24"></div> {/* Spacer */}
            </header>

            <div className="space-y-4">
                <details className="bg-gray-50 dark:bg-slate-900/50 p-3 rounded-md">
                    <summary className="font-semibold text-text-primary dark:text-slate-200 cursor-pointer">{t('filters.filters')}</summary>
                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="sm:col-span-3">
                            <label className="block text-sm font-medium text-text-secondary dark:text-slate-400">{t('filters.category')}</label>
                            <select value={filterCategoryId} onChange={e => setFilterCategoryId(e.target.value)} className={filterInputStyles}>
                                <option value="all">{t('filters.allCategories')}</option>
                                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-text-secondary dark:text-slate-400">{t('filters.startDate')}</label>
                            <input type="date" value={filterStartDate} onChange={e => setFilterStartDate(e.target.value)} className={filterInputStyles} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-text-secondary dark:text-slate-400">{t('filters.endDate')}</label>
                            <input type="date" value={filterEndDate} onChange={e => setFilterEndDate(e.target.value)} className={filterInputStyles} />
                        </div>
                         <div className="flex items-end">
                            <Button onClick={resetFilters} variant="secondary" size="sm" className="w-full">{t('buttons.reset')}</Button>
                        </div>
                    </div>
                </details>
                
                <div>
                    {paginatedExpenses.length > 0 ? (
                         <div>
                            {/* Desktop Header */}
                            <div className="hidden sm:grid sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] sm:gap-4 bg-gray-50 dark:bg-slate-700 px-4 py-2 text-xs text-text-secondary dark:text-slate-400 uppercase font-semibold">
                                <div>{t('expenses.details')}</div>
                                <div className="text-right">{t('expenses.amount')}</div>
                            </div>
                            {/* Expense List */}
                            <div className="border border-gray-200 dark:border-slate-700 sm:border-t-0 rounded-b-lg">
                                 {paginatedExpenses.map((ex, index) => (
                                     <div key={ex.id} className={index < paginatedExpenses.length - 1 ? 'border-b border-gray-200 dark:border-slate-700' : ''}>
                                        <ExpenseRow 
                                            expense={ex} 
                                            categoryName={categoryMap.get(ex.categoryId) || '...'} 
                                            onEdit={onEditExpense}
                                        />
                                     </div>
                                 ))}
                            </div>
                        </div>
                    ) : (
                         <div className="text-center p-8 border border-gray-200 dark:border-slate-700 rounded-lg">
                            <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                            <h3 className="mt-2 text-sm font-medium text-text-primary dark:text-slate-200">{t('expenses.noMatch')}</h3>
                        </div>
                    )}
                </div>
                 {totalPages > 1 && (
                    <div className="flex justify-between items-center mt-4">
                        <Button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            variant="secondary"
                            size="sm"
                        >
                            {t('pagination.previous')}
                        </Button>
                        <span className="text-sm text-text-secondary dark:text-slate-400">
                            {t('pagination.pageOf', { currentPage, totalPages })}
                        </span>
                        <Button
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            variant="secondary"
                            size="sm"
                        >
                            {t('pagination.next')}
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ExpenseHistoryPage;