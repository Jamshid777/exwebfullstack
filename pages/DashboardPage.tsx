import React from 'react';
import type { Balance, Transaction, Expense, ExpenseCategory } from '../types';
import PortfolioSummary from '../components/dashboard/PortfolioSummary';
import BalanceCard from '../components/dashboard/BalanceCard';
import ProfitChart from '../components/dashboard/ProfitChart';
import ActivityFeed from '../components/dashboard/ActivityFeed';
import { useI18n } from '../context/I18nContext';

interface DashboardPageProps {
    balances: Balance[];
    transactions: Transaction[];
    expenses: Expense[];
    expenseCategories: ExpenseCategory[];
    portfolioData: {
        totalValue: number;
        grossProfit: number;
        totalExpenses: number;
        netProfit: number;
    };
    onNavigateToTransactions: () => void;
}

const DashboardPage: React.FC<DashboardPageProps> = ({
    balances,
    transactions,
    expenses,
    expenseCategories,
    portfolioData,
    onNavigateToTransactions,
}) => {
    const { t } = useI18n();

    const sortedBalances = [...balances].sort((a, b) => {
        if (a.currency.code === 'USD') return -1;
        if (b.currency.code === 'USD') return 1;
        if (a.currency.code === 'UZS') return 1;
        if (b.currency.code === 'UZS') return -1;
        return a.currency.code.localeCompare(b.currency.code);
    });


    return (
        <>
            <PortfolioSummary 
                totalValue={portfolioData.totalValue} 
                grossProfit={portfolioData.grossProfit}
                totalExpenses={portfolioData.totalExpenses}
                netProfit={portfolioData.netProfit}
            />
            
            <section aria-labelledby="balances-heading" className="mb-8">
                <h2 id="balances-heading" className="text-xl font-semibold text-text-primary mb-4 sr-only">{t('dashboard.balancesTitle')}</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {sortedBalances.map(balance => (
                        <BalanceCard key={balance.currency.id} balance={balance} />
                    ))}
                </div>
            </section>

            <section aria-labelledby="analytics-heading" className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                <div className="lg:col-span-3">
                     <ProfitChart transactions={transactions} expenses={expenses} />
                </div>
                <div className="lg:col-span-2">
                     <ActivityFeed 
                        transactions={transactions} 
                        expenses={expenses} 
                        expenseCategories={expenseCategories} 
                        onViewAllTransactions={onNavigateToTransactions}
                     />
                </div>
            </section>
        </>
    );
};

export default DashboardPage;