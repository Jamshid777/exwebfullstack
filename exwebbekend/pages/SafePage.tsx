import React, { useState, useMemo } from 'react';
import type { Balance, Transaction, Currency } from '../types';
import Button from '../components/common/Button';
import BalanceCard from '../components/dashboard/BalanceCard';
import TransactionRow from '../components/transactions/TransactionRow';
import { useI18n } from '../context/I18nContext';

// Helper functions for number formatting
const formatNumberForDisplay = (numStr: string, locale: string, isIntegerOnly: boolean = false): string => {
    if (!numStr) return '';
    const [integer, decimal] = numStr.split('.');
    
    if (integer === '') {
        return `.${decimal || ''}`;
    }
    
    const integerNum = parseInt(integer.replace(/[^0-9]/g, ''), 10);
    if (isNaN(integerNum)) {
        return '';
    }
    
    const formattedInteger = integerNum.toLocaleString(locale);

    if (isIntegerOnly) {
        return formattedInteger;
    }

    if (decimal !== undefined) {
        return `${formattedInteger}.${decimal}`;
    }
    
    if (numStr.endsWith('.')) {
        return `${formattedInteger}.`;
    }
    
    return formattedInteger;
};

const parseFormattedNumber = (value: string): string => {
    // For uz-UZ (space separator) and en-US (comma separator)
    return value.replace(/[\s,]/g, '');
};

interface SafePageProps {
    balances: Balance[];
    transactions: Transaction[];
    currencies: Currency[];
    onDeposit: (data: { currency: Currency, amount: number, rate?: number, note?: string }) => Promise<void>;
    onWithdrawal: (data: { currency: Currency, amount: number, note?: string }) => Promise<void>;
    onNavigateBack: () => void;
}

const DepositForm: React.FC<Pick<SafePageProps, 'currencies'|'onDeposit'>> = ({ currencies, onDeposit }) => {
    const { t, locale } = useI18n();
    const [currencyId, setCurrencyId] = useState<string>(currencies.find(c => c.code === 'USD')?.id.toString() || '');
    const [amount, setAmount] = useState('');
    const [rate, setRate] = useState('');
    const [note, setNote] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const selectedCurrency = useMemo(() => currencies.find(c => c.id.toString() === currencyId), [currencies, currencyId]);
    const isUzsDeposit = selectedCurrency?.code === 'UZS';

     const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const parsedValue = parseFormattedNumber(e.target.value);
        const regex = isUzsDeposit ? /^\d*$/ : /^\d*\.?\d*$/;
        if (regex.test(parsedValue)) {
            setAmount(parsedValue);
        }
    };
    
    const handleRateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const parsedValue = parseFormattedNumber(e.target.value);
        if (/^\d*\.?\d*$/.test(parsedValue)) {
            setRate(parsedValue);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        const numAmount = parseFloat(amount);
        const numRate = parseFloat(rate);

        if (!selectedCurrency) {
             setError(t('errors.selectCurrency')); return;
        }
        if (isNaN(numAmount) || numAmount <= 0) {
            setError(t('errors.validPositiveAmount')); return;
        }
        if (selectedCurrency.code === 'USDT' && (isNaN(numRate) || numRate <= 0)) {
            setError(t('errors.validRate')); return;
        }

        setIsSubmitting(true);
        try {
            await onDeposit({
                currency: selectedCurrency,
                amount: numAmount,
                ...(selectedCurrency.code === 'USDT' && { rate: numRate }),
                note: note || undefined,
            });
            // Reset form
            setAmount('');
            setRate('');
            setNote('');
        } catch(err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const inputStyles = "mt-1 w-full p-2 bg-white dark:bg-slate-700 text-text-primary dark:text-slate-200 border border-gray-300 dark:border-slate-600 rounded-md";

    return (
        <form onSubmit={handleSubmit} className="space-y-4 p-4 border border-gray-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800">
            <h3 className="font-semibold text-lg text-text-primary dark:text-slate-100">{t('safe.depositFunds')}</h3>
             <div>
                <label className="block text-sm font-medium text-text-secondary dark:text-slate-400 mb-2">{t('forms.labels.currency')}</label>
                <div className="grid grid-cols-3 gap-2">
                    {currencies.map(c => {
                        const isActive = c.id.toString() === currencyId;
                        return (
                             <button
                                type="button"
                                key={c.id}
                                onClick={() => setCurrencyId(c.id.toString())}
                                className={`p-3 border rounded-md text-center transition-all duration-200 ${
                                    isActive
                                    ? 'bg-primary dark:bg-primary-light text-white dark:text-primary-dark border-primary-dark ring-2 ring-primary-light'
                                    : 'bg-white dark:bg-slate-700 text-text-primary dark:text-slate-200 border-gray-300 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-600 hover:border-primary dark:hover:border-primary-light'
                                }`}
                            >
                                <span className="font-semibold block">{c.code}</span>
                                <span className="text-xs hidden sm:block">{c.name}</span>
                            </button>
                        )
                    })}
                </div>
            </div>
             <div>
                <label className="block text-sm font-medium text-text-secondary dark:text-slate-400">{t('forms.labels.amount')}</label>
                <input type="text" inputMode={isUzsDeposit ? 'numeric' : 'decimal'} value={formatNumberForDisplay(amount, locale, isUzsDeposit)} onChange={handleAmountChange} placeholder={isUzsDeposit ? '0' : '0.00'} required className={inputStyles}/>
            </div>
            {selectedCurrency?.code === 'USDT' && (
                 <div>
                    <label className="block text-sm font-medium text-text-secondary dark:text-slate-400">{t('forms.labels.usdtDepositRate')}</label>
                    <input type="text" inputMode="decimal" value={formatNumberForDisplay(rate, locale)} onChange={handleRateChange} placeholder="1.00" required className={inputStyles}/>
                     <p className="mt-1 text-xs text-text-secondary dark:text-slate-400">{t('forms.descriptions.usdtDepositRateInfo')}</p>
                </div>
            )}
             <div>
                <label className="block text-sm font-medium text-text-secondary dark:text-slate-400">{t('forms.labels.note')}</label>
                <input type="text" value={note} onChange={e => setNote(e.target.value)} placeholder={t('forms.placeholders.depositNote')} className={inputStyles}/>
            </div>
            {error && <p className="text-sm text-danger dark:text-red-400 text-center">{error}</p>}
            <Button type="submit" disabled={isSubmitting} className="w-full">
                {isSubmitting ? t('buttons.processing') : t('buttons.deposit')}
            </Button>
        </form>
    );
};


const WithdrawForm: React.FC<Pick<SafePageProps, 'currencies'|'onWithdrawal'|'balances'>> = ({ currencies, onWithdrawal, balances }) => {
    const { t, locale } = useI18n();
    const withdrawableCurrencies = currencies.filter(c => c.code === 'USD' || c.code === 'UZS');
    const [currencyId, setCurrencyId] = useState<string>(withdrawableCurrencies[0]?.id.toString() || '');
    const [amount, setAmount] = useState('');
    const [note, setNote] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const selectedCurrency = useMemo(() => currencies.find(c => c.id.toString() === currencyId), [currencies, currencyId]);
    const availableBalance = useMemo(() => balances.find(b => b.currency.id.toString() === currencyId)?.availableAmount ?? 0, [balances, currencyId]);
    const isUzsWithdrawal = selectedCurrency?.code === 'UZS';
    
    const formattedAvailableBalance = useMemo(() => {
        const options: Intl.NumberFormatOptions = {};
        if (isUzsWithdrawal) {
            options.minimumFractionDigits = 0;
            options.maximumFractionDigits = 0;
        }
        return availableBalance.toLocaleString(locale, options);
    }, [availableBalance, isUzsWithdrawal, locale]);

    const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const parsedValue = parseFormattedNumber(e.target.value);
        const regex = isUzsWithdrawal ? /^\d*$/ : /^\d*\.?\d*$/;
        if (regex.test(parsedValue)) {
            setAmount(parsedValue);
        }
    };


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        const numAmount = parseFloat(amount);

        if (!selectedCurrency) {
             setError(t('errors.selectCurrency')); return;
        }
        if (isNaN(numAmount) || numAmount <= 0) {
            setError(t('errors.validPositiveAmount')); return;
        }
        if (numAmount > availableBalance) {
            setError(t('errors.insufficientBalanceForWithdrawal', { currencyCode: selectedCurrency.code })); return;
        }

        setIsSubmitting(true);
        try {
            await onWithdrawal({
                currency: selectedCurrency,
                amount: numAmount,
                note: note || undefined,
            });
            // Reset form
            setAmount('');
            setNote('');
        } catch(err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const inputStyles = "mt-1 w-full p-2 bg-white dark:bg-slate-700 text-text-primary dark:text-slate-200 border border-gray-300 dark:border-slate-600 rounded-md";

    return (
        <form onSubmit={handleSubmit} className="space-y-4 p-4 border border-gray-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800">
            <h3 className="font-semibold text-lg text-text-primary dark:text-slate-100">{t('safe.withdrawFunds')}</h3>
             <div>
                <label className="block text-sm font-medium text-text-secondary dark:text-slate-400 mb-2">{t('forms.labels.currency')}</label>
                <div className="grid grid-cols-2 gap-2">
                     {withdrawableCurrencies.map(c => {
                         const isActive = c.id.toString() === currencyId;
                         return (
                             <button
                                type="button"
                                key={c.id}
                                onClick={() => setCurrencyId(c.id.toString())}
                                className={`p-3 border rounded-md text-center transition-all duration-200 ${
                                    isActive
                                    ? 'bg-primary dark:bg-primary-light text-white dark:text-primary-dark border-primary-dark ring-2 ring-primary-light'
                                    : 'bg-white dark:bg-slate-700 text-text-primary dark:text-slate-200 border-gray-300 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-600 hover:border-primary dark:hover:border-primary-light'
                                }`}
                            >
                                <span className="font-semibold block">{c.code}</span>
                                <span className="text-xs hidden sm:block">{c.name}</span>
                            </button>
                         )
                    })}
                </div>
            </div>
             <div>
                <label className="block text-sm font-medium text-text-secondary dark:text-slate-400">{t('forms.labels.amount')}</label>
                <input type="text" inputMode={isUzsWithdrawal ? 'numeric' : 'decimal'} value={formatNumberForDisplay(amount, locale, isUzsWithdrawal)} onChange={handleAmountChange} placeholder={isUzsWithdrawal ? '0' : '0.00'} required className={inputStyles}/>
                <p className="mt-1 text-xs text-text-secondary dark:text-slate-400">{t('dashboard.available')}: {formattedAvailableBalance} {selectedCurrency?.code}</p>
            </div>
             <div>
                <label className="block text-sm font-medium text-text-secondary dark:text-slate-400">{t('forms.labels.note')}</label>
                <input type="text" value={note} onChange={e => setNote(e.target.value)} placeholder={t('forms.placeholders.withdrawNote')} className={inputStyles}/>
            </div>
            {error && <p className="text-sm text-danger dark:text-red-400 text-center">{error}</p>}
            <Button type="submit" variant="danger" disabled={isSubmitting} className="w-full">
                {isSubmitting ? t('buttons.processing') : t('buttons.withdraw')}
            </Button>
        </form>
    );
};

const SafePage: React.FC<SafePageProps> = ({ balances, transactions, currencies, onDeposit, onWithdrawal, onNavigateBack }) => {
    const { t } = useI18n();

    const sortedBalances = [...balances].sort((a, b) => {
        if (a.currency.code === 'USD') return -1;
        if (b.currency.code === 'USD') return 1;
        if (a.currency.code === 'UZS') return 1;
        if (b.currency.code === 'UZS') return -1;
        return a.currency.code.localeCompare(b.currency.code);
    });

    const safeTransactions = useMemo(() => {
        return transactions.filter(tx => tx.operationType === 'deposit' || tx.operationType === 'withdrawal');
    }, [transactions]);
    
    return (
        <div className="space-y-6">
            <header className="flex items-center justify-between -mb-2">
                 <Button onClick={onNavigateBack} variant="secondary" size="sm">
                    &larr; <span className="hidden sm:inline ml-2">{t('buttons.back')}</span>
                </Button>
                <h1 className="text-lg sm:text-xl font-bold text-text-primary dark:text-slate-100">{t('safe.pageTitle')}</h1>
                <div className="w-16 sm:w-24"></div> {/* Spacer */}
            </header>

            <section aria-labelledby="current-balances-heading">
                <h2 id="current-balances-heading" className="text-lg font-semibold text-text-primary dark:text-slate-100 mb-3">{t('safe.currentBalances')}</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {sortedBalances.map(balance => (
                        <BalanceCard key={balance.currency.id} balance={balance} />
                    ))}
                </div>
            </section>
            
            <section aria-labelledby="manage-funds-heading" className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div id="manage-funds-heading" className="sr-only">Manage Funds</div>
                <DepositForm currencies={currencies} onDeposit={onDeposit} />
                <WithdrawForm currencies={currencies} onWithdrawal={onWithdrawal} balances={balances} />
            </section>

             <section aria-labelledby="safe-history-heading" className="bg-surface dark:bg-slate-800 p-4 sm:p-6 rounded-lg shadow-md">
                <h2 id="safe-history-heading" className="text-lg font-semibold text-text-primary dark:text-slate-100 mb-4">{t('safe.recentActivity')}</h2>
                <div>
                     {safeTransactions.length > 0 ? (
                         <div>
                            <div className="border border-gray-200 dark:border-slate-700 rounded-lg">
                                 {safeTransactions.map((tx, index) => (
                                     <div key={tx.id} className={index < safeTransactions.length - 1 ? 'border-b border-gray-200 dark:border-slate-700' : ''}>
                                        <TransactionRow transaction={tx} />
                                     </div>
                                 ))}
                            </div>
                        </div>
                    ) : (
                         <div className="text-center p-8 border border-gray-200 dark:border-slate-700 rounded-lg">
                            <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                            <h3 className="mt-2 text-sm font-medium text-text-primary dark:text-slate-200">{t('safe.noSafeTransactions')}</h3>
                             <p className="mt-1 text-sm text-text-secondary dark:text-slate-400">{t('safe.noSafeTransactionsDescription')}</p>
                        </div>
                    )}
                </div>
            </section>

        </div>
    );
};

export default SafePage;