import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { Balance, Transaction, Currency, Shift, Expense, ExpenseCategory } from './types';
import { 
    fetchBalances, 
    fetchTransactions, 
    fetchCurrencies, 
    createTransaction, 
    startShift,
    endShift,
    fetchShifts,
    getActiveShift,
    createExpense,
    updateExpense,
    fetchExpenses,
    fetchExpenseCategories,
    createExpenseCategory,
    createDeposit,
    createWithdrawal
} from './services/api';
import { useI18n } from './context/I18nContext';

import TransactionForm from './components/transactions/TransactionForm';
import Button from './components/common/Button';
import Modal from './components/common/Modal';
import ExpenseForm from './components/expenses/ExpenseForm';
import LanguageSwitcher from './components/common/LanguageSwitcher';
import SideNav from './components/common/SideNav';
import DashboardPage from './pages/DashboardPage';
import TransactionHistoryPage from './pages/TransactionHistoryPage';
import ExpenseHistoryPage from './pages/ExpenseHistoryPage';
import ShiftPage from './pages/ShiftPage';
import SafePage from './pages/SafePage';
import UzsRateManager from './components/common/UzsRateManager';
import ThemeSwitcher from './components/common/ThemeSwitcher';


// --- Floating Action Button Component ---
interface FloatingActionButtonsProps {
  onBuy: () => void;
  onSell: () => void;
  onExpense: () => void;
  disabled: boolean;
  disabledTooltip: string;
}

const FloatingActionButtons: React.FC<FloatingActionButtonsProps> = ({ onBuy, onSell, onExpense, disabled, disabledTooltip }) => {
    const { t } = useI18n();
    const [isInactive, setIsInactive] = useState(false);
    const timerRef = useRef<number | null>(null);

    const resetTimer = useCallback(() => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
        }
        setIsInactive(false);
        timerRef.current = window.setTimeout(() => {
            setIsInactive(true);
        }, 1700); // 1.7 seconds of inactivity
    }, []);

    useEffect(() => {
        const handleActivity = () => resetTimer();
        const activityEvents = ['mousemove', 'mousedown', 'scroll', 'touchstart', 'keydown'];
        
        activityEvents.forEach(event => window.addEventListener(event, handleActivity));
        resetTimer(); // Initial call

        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
            activityEvents.forEach(event => window.removeEventListener(event, handleActivity));
        };
    }, [resetTimer]);

    const containerClasses = `fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3 transition-opacity duration-300 ${isInactive && !disabled ? 'opacity-60 hover:opacity-100 focus-within:opacity-100' : 'opacity-100'}`;
    const buttonBaseClasses = "w-14 h-14 rounded-full flex items-center justify-center text-white shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-200";
    
    const disabledButtonClasses = "bg-gray-400 cursor-not-allowed";

    return (
        <div 
            className={containerClasses} 
            onMouseEnter={resetTimer} 
            onFocus={resetTimer}
            title={disabled ? disabledTooltip : undefined}
        >
            <button
                onClick={!disabled ? onBuy : undefined}
                className={`${buttonBaseClasses} ${disabled ? disabledButtonClasses : 'bg-success hover:bg-green-700 focus:ring-success'}`}
                aria-label={t('buttons.buy')}
                title={!disabled ? t('buttons.buy') : disabledTooltip}
                disabled={disabled}
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>
            </button>
            <button
                onClick={!disabled ? onSell : undefined}
                className={`${buttonBaseClasses} ${disabled ? disabledButtonClasses : 'bg-danger hover:bg-red-700 focus:ring-danger'}`}
                aria-label={t('buttons.sell')}
                title={!disabled ? t('buttons.sell') : disabledTooltip}
                disabled={disabled}
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" /></svg>
            </button>
            <button
                onClick={!disabled ? onExpense : undefined}
                className={`${buttonBaseClasses} ${disabled ? disabledButtonClasses : 'bg-secondary text-primary-dark hover:bg-yellow-500 focus:ring-secondary'}`}
                aria-label={t('buttons.expense')}
                title={!disabled ? t('buttons.expense') : disabledTooltip}
                disabled={disabled}
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" /></svg>
            </button>
        </div>
    );
};


const App: React.FC = () => {
    const { t, language } = useI18n();
    const [balances, setBalances] = useState<Balance[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [currencies, setCurrencies] = useState<Currency[]>([]);
    const [tradeableCurrencies, setTradeableCurrencies] = useState<Currency[]>([]);
    const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([]);
    const [shifts, setShifts] = useState<Shift[]>([]);
    const [activeShift, setActiveShift] = useState<Shift | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isTxModalOpen, setIsTxModalOpen] = useState(false);
    const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
    const [expenseToEdit, setExpenseToEdit] = useState<Expense | null>(null);
    const [initialOperationType, setInitialOperationType] = useState<'buy' | 'sell'>('buy');
    const [error, setError] = useState<string | null>(null);
    const [isSideNavOpen, setIsSideNavOpen] = useState(false);
    const [page, setPage] = useState<'dashboard' | 'transactions' | 'shifts' | 'safe' | 'expenses'>('dashboard');
    const [uzsRate, setUzsRate] = useState(12500);

    useEffect(() => {
        document.documentElement.lang = language;
    }, [language]);

    const navigateTo = (targetPage: 'dashboard' | 'transactions' | 'shifts' | 'safe' | 'expenses') => {
        setPage(targetPage);
        setIsSideNavOpen(false);
        window.scrollTo(0, 0); // Scroll to top on page change
    };

    const loadData = useCallback(async (showLoading = true) => {
        try {
            if (showLoading) setIsLoading(true);
            setError(null);
            const [
                fetchedBalances, 
                fetchedTransactions, 
                fetchedCurrencies,
                fetchedActiveShift,
                fetchedShifts,
                fetchedExpenses,
                fetchedExpenseCategories,
            ] = await Promise.all([
                fetchBalances(),
                fetchTransactions(),
                fetchCurrencies(),
                getActiveShift(),
                fetchShifts(),
                fetchExpenses(),
                fetchExpenseCategories(),
            ]);
            
            setBalances(fetchedBalances);
            setTransactions(fetchedTransactions);
            setExpenses(fetchedExpenses);
            setCurrencies(fetchedCurrencies);
            setTradeableCurrencies(fetchedCurrencies.filter(c => c.code === 'USDT'));
            setExpenseCategories(fetchedExpenseCategories);
            setActiveShift(fetchedActiveShift);
            setShifts(fetchedShifts);
        } catch (err) {
            setError(t('errors.loadData'));
            console.error(err);
        } finally {
            if (showLoading) setIsLoading(false);
        }
    }, [t]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleCreateTransaction = useCallback(async (transactionData: Omit<Transaction, 'id' | 'createdAt' | 'status' | 'totalAmount' | 'profit' | 'totalAmountUzs'>) => {
        try {
            const dataWithRate = {
                ...transactionData,
                ...(transactionData.paymentCurrency === 'UZS' && { uzsRate }),
            };
            await createTransaction(dataWithRate);
            setIsTxModalOpen(false);
            await loadData(false); // Refresh data without full loading screen
        } catch (err) {
            console.error("Transaction failed:", err);
            throw err;
        }
    }, [loadData, uzsRate]);
    
    const handleCreateExpense = useCallback(async (expenseData: Omit<Expense, 'id' | 'createdAt' | 'amountUsd'>) => {
        try {
            await createExpense(expenseData);
            setIsExpenseModalOpen(false);
            await loadData(false);
        } catch (err) {
            console.error("Expense creation failed:", err);
            throw err;
        }
    }, [loadData]);

    const handleUpdateExpense = useCallback(async (expenseData: Expense) => {
        try {
            await updateExpense(expenseData);
            setIsExpenseModalOpen(false);
            setExpenseToEdit(null);
            await loadData(false);
        } catch (err) {
            console.error("Expense update failed:", err);
            throw err;
        }
    }, [loadData]);

    const handleDeposit = useCallback(async (data: { currency: Currency; amount: number; rate?: number; note?: string; }) => {
        try {
            await createDeposit(data);
            await loadData(false);
        } catch (err) {
             console.error("Deposit failed:", err);
            throw err;
        }
    }, [loadData]);

    const handleWithdrawal = useCallback(async (data: { currency: Currency; amount: number; note?: string; }) => {
        try {
            await createWithdrawal(data);
            await loadData(false);
        } catch (err) {
             console.error("Withdrawal failed:", err);
            throw err;
        }
    }, [loadData]);
    
    const handleCreateExpenseCategory = useCallback(async (name: string): Promise<ExpenseCategory> => {
        try {
            const newCategory = await createExpenseCategory(name);
            await loadData(false); // Reload all data including new category
            return newCategory;
        } catch (err) {
            console.error("Failed to create category:", err);
            throw err;
        }
    }, [loadData]);


    const handleStartShift = useCallback(async () => {
        try {
            await startShift();
            await loadData(false);
        } catch (err) {
            setError(err instanceof Error ? err.message : t('errors.startShift'));
        }
    }, [loadData, t]);

    const handleEndShift = useCallback(async () => {
        try {
            await endShift();
            await loadData(false);
        } catch (err) {
            setError(err instanceof Error ? err.message : t('errors.endShift'));
        }
    }, [loadData, t]);
    
    const handleOpenModal = useCallback((type: 'buy' | 'sell') => {
        setInitialOperationType(type);
        setIsTxModalOpen(true);
    }, []);
    
    const handleOpenEditExpenseModal = (expense: Expense) => {
        setExpenseToEdit(expense);
        setIsExpenseModalOpen(true);
    };

    const handleCloseExpenseModal = () => {
        setIsExpenseModalOpen(false);
        setExpenseToEdit(null);
    };

    const portfolioData = useMemo(() => {
        const usd = balances.find(b => b.currency.code === 'USD');
        const usdt = balances.find(b => b.currency.code === 'USDT');
        const uzs = balances.find(b => b.currency.code === 'UZS');

        const grossProfit = transactions
            .filter(tx => typeof tx.profit === 'number')
            .reduce((acc, tx) => acc + (tx.profit ?? 0), 0);
        
        const totalExpenses = expenses.reduce((acc, ex) => acc + ex.amountUsd, 0);
        const netProfit = grossProfit - totalExpenses;

        const lastUsdtTx = transactions.slice().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).find(tx => tx.currency.code === 'USDT');
        const usdtRate = lastUsdtTx ? lastUsdtTx.rate : 1;

        const usdValue = usd ? usd.amount : 0;
        const usdtValueInUsd = usdt ? usdt.amount * usdtRate : 0;
        const uzsValueInUsd = (uzs && uzsRate > 0) ? uzs.amount / uzsRate : 0;
        
        const totalValue = usdValue + usdtValueInUsd + uzsValueInUsd;

        return { totalValue, grossProfit, totalExpenses, netProfit };
    }, [balances, transactions, expenses, uzsRate]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-background dark:bg-slate-900 flex items-center justify-center">
                <div role="status" className="flex flex-col items-center">
                    <svg aria-hidden="true" className="w-10 h-10 text-gray-200 dark:text-gray-600 animate-spin fill-primary dark:fill-primary-light" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="currentColor"/><path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0492C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentFill"/></svg>
                    <span className="text-text-primary dark:text-slate-200 text-lg mt-4">{t('loadingApp')}</span>
                </div>
            </div>
        );
    }

    const renderPage = () => {
        switch (page) {
            case 'transactions':
                return <TransactionHistoryPage 
                            transactions={transactions} 
                            currencies={currencies.filter(c => c.code !== 'USD' && c.code !== 'UZS')} 
                            onNavigateBack={() => navigateTo('dashboard')} 
                        />;
            case 'expenses':
                return <ExpenseHistoryPage
                            expenses={expenses}
                            categories={expenseCategories}
                            onNavigateBack={() => navigateTo('dashboard')}
                            onEditExpense={handleOpenEditExpenseModal}
                        />;
            case 'shifts':
                return <ShiftPage
                            activeShift={activeShift}
                            shifts={shifts}
                            onStartShift={handleStartShift}
                            onEndShift={handleEndShift}
                            onNavigateBack={() => navigateTo('dashboard')}
                        />;
            case 'safe':
                return <SafePage
                            balances={balances}
                            transactions={transactions}
                            currencies={currencies}
                            onDeposit={handleDeposit}
                            onWithdrawal={handleWithdrawal}
                            onNavigateBack={() => navigateTo('dashboard')}
                        />;
            case 'dashboard':
            default:
                return <DashboardPage
                            balances={balances}
                            transactions={transactions}
                            expenses={expenses}
                            expenseCategories={expenseCategories}
                            portfolioData={portfolioData}
                            onNavigateToTransactions={() => navigateTo('transactions')}
                        />;
        }
    };

    return (
        <>
            <div className="min-h-screen bg-background dark:bg-slate-900 font-sans text-text-primary dark:text-slate-200">
                <header className="bg-primary-dark shadow-md sticky top-0 z-10">
                    <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex items-center justify-between h-16">
                            <div className="flex items-center space-x-3">
                                <button onClick={() => setIsSideNavOpen(true)} className="p-2 rounded-md text-secondary hover:bg-primary-light focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white" aria-label="Open menu">
                                    <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                                    </svg>
                                </button>
                                <h1 className="hidden sm:block text-2xl font-bold text-white">Valyuta Ayirboshlash</h1>
                            </div>
                            <div className="flex items-center space-x-2">
                                <UzsRateManager 
                                    rate={uzsRate}
                                    onRateChange={setUzsRate}
                                    disabled={!activeShift}
                                />
                                <ThemeSwitcher />
                                <LanguageSwitcher />
                            </div>
                        </div>
                    </div>
                </header>

                <main className="container mx-auto p-4 sm:p-6 lg:p-8">
                    {error && (
                        <div className="bg-danger/10 dark:bg-danger/20 border-l-4 border-danger dark:border-red-500 text-danger dark:text-red-400 p-4 mb-6 rounded-md" role="alert" onClick={() => setError(null)}>
                            <p className="font-bold">{t('error')}</p>
                            <p>{error}</p>
                        </div>
                    )}
                    {renderPage()}
                </main>
            </div>
            
            {page === 'dashboard' && (
                <FloatingActionButtons
                    onBuy={() => handleOpenModal('buy')}
                    onSell={() => handleOpenModal('sell')}
                    onExpense={() => setIsExpenseModalOpen(true)}
                    disabled={!activeShift}
                    disabledTooltip={t('tooltips.startShiftToBuy')}
                />
            )}

            <SideNav
                isOpen={isSideNavOpen}
                onClose={() => setIsSideNavOpen(false)}
                onNavigate={navigateTo}
            />

            <Modal isOpen={isTxModalOpen} onClose={() => setIsTxModalOpen(false)} title={initialOperationType === 'buy' ? t('modals.buyTitle') : t('modals.sellTitle')}>
                <TransactionForm
                    balances={balances}
                    currencies={tradeableCurrencies}
                    onCreateTransaction={handleCreateTransaction}
                    onClose={() => setIsTxModalOpen(false)}
                    initialOperationType={initialOperationType}
                    uzsRate={uzsRate}
                />
            </Modal>
            
            <Modal isOpen={isExpenseModalOpen} onClose={handleCloseExpenseModal} title={expenseToEdit ? t('modals.editExpenseTitle') : t('modals.addExpenseTitle')}>
                <ExpenseForm
                    onCreateExpense={handleCreateExpense}
                    onUpdateExpense={handleUpdateExpense}
                    onClose={handleCloseExpenseModal}
                    categories={expenseCategories}
                    onCreateCategory={handleCreateExpenseCategory}
                    uzsRate={uzsRate}
                    expenseToEdit={expenseToEdit}
                />
            </Modal>
        </>
    );
};

export default App;