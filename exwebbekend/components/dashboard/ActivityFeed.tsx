import React, { useState, useMemo } from 'react';
import RecentTransactions from '../transactions/RecentTransactions';
import RecentExpenses from '../expenses/RecentExpenses';
import type { Transaction, Expense, ExpenseCategory } from '../../types';
import { useI18n } from '../../context/I18nContext';


interface ActivityFeedProps {
    transactions: Transaction[];
    expenses: Expense[];
    expenseCategories: ExpenseCategory[];
    onViewAllTransactions: () => void;
}

const ActivityFeed: React.FC<ActivityFeedProps> = ({ transactions, expenses, expenseCategories, onViewAllTransactions }) => {
    const { t } = useI18n();
    const [activeTab, setActiveTab] = useState<'transactions' | 'expenses'>('transactions');

    const filterOptions = [
        { key: 'today', label: t('filters.today') },
        { key: 'last7Days', label: t('filters.last7Days') },
        { key: 'last30Days', label: t('filters.last30Days') },
        { key: 'allTime', label: t('filters.allTime') },
    ];
    const [activeFilterKey, setActiveFilterKey] = useState('last7Days');

    const { filteredTransactions, filteredExpenses } = useMemo(() => {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        let startDate: Date | null = null;
        switch (activeFilterKey) {
            case 'today':
                startDate = today;
                break;
            case 'last7Days':
                startDate = new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000);
                break;
            case 'last30Days':
                startDate = new Date(today.getTime() - 29 * 24 * 60 * 60 * 1000);
                break;
            case 'allTime':
            default:
                return { filteredTransactions: transactions, filteredExpenses: expenses };
        }
        
        const ft = transactions.filter(item => new Date(item.createdAt) >= startDate!);
        const fe = expenses.filter(item => new Date(item.createdAt) >= startDate!);

        return { filteredTransactions: ft, filteredExpenses: fe };
    }, [transactions, expenses, activeFilterKey]);

    const TabButton: React.FC<{ tabName: 'transactions' | 'expenses'; label: string; }> = ({ tabName, label }) => (
        <button
            onClick={() => setActiveTab(tabName)}
            className={`w-full px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === tabName 
                ? 'bg-primary dark:bg-primary-light text-white dark:text-primary-dark shadow-sm' 
                : 'text-text-secondary dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-600'
            }`}
        >
            {label}
        </button>
    );

    return (
        <div className="bg-surface dark:bg-slate-800 rounded-lg shadow-md h-full flex flex-col">
            <div className="p-4 border-b border-gray-200 dark:border-slate-700">
                 <h3 className="text-lg font-semibold text-text-primary dark:text-slate-100 mb-4">{t('dashboard.activityFeedTitle')}</h3>
                 <div className="flex flex-wrap items-center justify-center gap-1 bg-gray-100 dark:bg-slate-900/50 p-1 rounded-md mb-4">
                    {filterOptions.map(option => (
                        <button
                            key={option.key}
                            onClick={() => setActiveFilterKey(option.key)}
                            className={`px-3 py-1 text-sm font-medium rounded-md transition-colors flex-grow ${
                                activeFilterKey === option.key
                                ? 'bg-primary dark:bg-primary-light text-white dark:text-primary-dark shadow-sm' 
                                : 'text-text-secondary dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-600'
                            }`}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
                 <div className="flex items-center gap-1 bg-gray-100 dark:bg-slate-900/50 p-1 rounded-md">
                    <TabButton tabName="transactions" label={t('dashboard.transactions')} />
                    <TabButton tabName="expenses" label={t('dashboard.expenses')} />
                 </div>
            </div>
            
            <div className="flex-grow">
                 {activeTab === 'transactions' ? (
                    <RecentTransactions transactions={filteredTransactions} onViewAll={onViewAllTransactions} />
                ) : (
                    <RecentExpenses expenses={filteredExpenses} categories={expenseCategories} />
                )}
            </div>
        </div>
    );
};

export default ActivityFeed;