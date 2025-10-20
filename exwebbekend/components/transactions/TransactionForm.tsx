

import React, { useState, useMemo, useEffect } from 'react';
import type { Currency, Balance, Transaction } from '../../types';
import Button from '../common/Button';
import { useI18n } from '../../context/I18nContext';

interface TransactionFormProps {
    balances: Balance[];
    currencies: Currency[];
    onCreateTransaction: (transactionData: Omit<Transaction, 'id' | 'createdAt' | 'status' | 'totalAmount' | 'totalAmountUzs' | 'profit' | 'remainingAmount'>) => Promise<void>;
    onClose: () => void;
    initialOperationType: 'buy' | 'sell';
    uzsRate: number;
}

// Helper functions for number formatting
const formatNumberForDisplay = (numStr: string, locale: string): string => {
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


const TransactionForm: React.FC<TransactionFormProps> = ({ balances, currencies, onCreateTransaction, onClose, initialOperationType, uzsRate }) => {
    const { t, locale } = useI18n();
    const operationType = initialOperationType;
    const isBuy = operationType === 'buy';
    const [selectedCurrency, setSelectedCurrency] = useState<Currency | undefined>(currencies[0]);
    const [amount, setAmount] = useState('');
    const [rate, setRate] = useState('1');
    const [baseRate, setBaseRate] = useState('1');
    const [walletAddress, setWalletAddress] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [customMargin, setCustomMargin] = useState('');
    const [activeMargin, setActiveMargin] = useState<number | null>(null);
    const [paidUsd, setPaidUsd] = useState('');
    const [paidUzs, setPaidUzs] = useState('');


    const usdBalance = useMemo(() => balances.find(b => b.currency.code === 'USD'), [balances]);
    const uzsBalance = useMemo(() => balances.find(b => b.currency.code === 'UZS'), [balances]);
    const targetBalance = useMemo(() => balances.find(b => b.currency.id === selectedCurrency?.id), [balances, selectedCurrency]);

    const totalInUsd = useMemo(() => (parseFloat(parseFormattedNumber(amount)) || 0) * (parseFloat(rate) || 0), [amount, rate]);
    
    const selectedCurrencyCode = selectedCurrency?.code || '...';
    
     useEffect(() => {
        if(totalInUsd > 0) {
            setPaidUsd(totalInUsd.toFixed(2));
            setPaidUzs('0');
        } else {
            setPaidUsd('');
            setPaidUzs('');
        }
    }, [totalInUsd]);
    
    const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const parsedValue = parseFormattedNumber(e.target.value);
        if (/^\d*\.?\d*$/.test(parsedValue)) {
            setAmount(parsedValue);
        }
    };
    
    const handleMarginClick = (margin: number) => {
        setActiveMargin(margin);
        setCustomMargin('');
        const currentBaseRate = parseFloat(baseRate);
        if (!isNaN(currentBaseRate) && currentBaseRate > 0) {
            const newRate = currentBaseRate * (1 + margin / 100);
            setRate(newRate.toFixed(6));
        }
    };
    
    const handleCustomMarginChange = (marginStr: string) => {
        setCustomMargin(marginStr);
        setActiveMargin(null);
        const margin = parseFloat(marginStr);
        const currentBaseRate = parseFloat(baseRate);

        if (!isNaN(currentBaseRate) && currentBaseRate > 0) {
            let newRate;
            if (!isNaN(margin)) {
                newRate = currentBaseRate * (1 + margin / 100);
            } else {
                newRate = currentBaseRate;
            }
            const newRateStr = newRate.toFixed(6);
            setRate(newRateStr);
        }
    };
    
    const handlePaidUsdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const parsedValue = parseFormattedNumber(e.target.value);
        if (!/^\d*\.?\d*$/.test(parsedValue)) return;

        setPaidUsd(parsedValue);
        const paidUsdNum = parseFloat(parsedValue) || 0;
        if (totalInUsd > 0 && uzsRate > 0) {
            const remainingUsd = totalInUsd - paidUsdNum;
            setPaidUzs(remainingUsd >= 0 ? (remainingUsd * uzsRate).toFixed(0) : '0');
        }
    };

    const handlePaidUzsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const parsedValue = parseFormattedNumber(e.target.value);
        if (!/^\d*$/.test(parsedValue)) return;
        
        setPaidUzs(parsedValue);
        const paidUzsNum = parseFloat(parsedValue) || 0;
        if (totalInUsd > 0 && uzsRate > 0) {
            const paidUzsInUsd = paidUzsNum / uzsRate;
            const remainingUsd = totalInUsd - paidUzsInUsd;
            setPaidUsd(remainingUsd >= 0 ? remainingUsd.toFixed(2) : '0.00');
        }
    };
    
    const validateForm = () => {
        const numAmount = parseFloat(parseFormattedNumber(amount));

        if (!selectedCurrency) {
            setError(t('errors.selectCurrency')); return false;
        }
        if (isNaN(numAmount) || numAmount <= 0) {
            setError(t('errors.validAmount')); return false;
        }
        if (isNaN(totalInUsd) || totalInUsd <= 0) {
            setError(t('errors.validRate')); return false;
        }

        if (operationType === 'buy') {
            const numPaidUsd = parseFloat(parseFormattedNumber(paidUsd)) || 0;
            const numPaidUzs = parseFloat(parseFormattedNumber(paidUzs)) || 0;
            if (!usdBalance || usdBalance.availableAmount < numPaidUsd) {
                setError(t('errors.insufficientUsd')); return false;
            }
            if (!uzsBalance || uzsBalance.availableAmount < numPaidUzs) {
                setError(t('errors.insufficientUzs')); return false;
            }
            const totalPaidInUsd = numPaidUsd + (numPaidUzs / uzsRate);
            if (Math.abs(totalPaidInUsd - totalInUsd) > 0.01) {
                setError(t('errors.mixPaymentError')); return false;
            }
        } else { // SELL
            if (!targetBalance || targetBalance.availableAmount < numAmount) {
                setError(t('errors.insufficientCurrency', { currencyCode: selectedCurrency.code }));
                return false;
            }
        }
        
        setError('');
        return true;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateForm()) return;

        setIsSubmitting(true);
        try {
            const transactionData = {
                operationType,
                currency: selectedCurrency!,
                amount: parseFloat(parseFormattedNumber(amount)),
                rate: parseFloat(rate),
                paymentCurrency: 'MIX' as const,
                ...(operationType === 'sell' && walletAddress && { walletAddress }),
                paidAmountUsd: parseFloat(parseFormattedNumber(paidUsd)),
                paidAmountUzs: parseFloat(parseFormattedNumber(paidUzs))
            };

            await onCreateTransaction(transactionData);
        } catch (err) {
            setError(err instanceof Error ? err.message : t('errors.unknownTransaction'));
            setIsSubmitting(false);
        }
    };
    
    const displayMarginValue = useMemo(() => {
        if (activeMargin !== null) {
            return activeMargin;
        }
        if (customMargin) {
            const parsed = parseFloat(customMargin);
            return isNaN(parsed) ? 0 : parsed;
        }
        const numRate = parseFloat(rate);
        const numBaseRate = parseFloat(baseRate);

        if (!isNaN(numRate) && !isNaN(numBaseRate) && numBaseRate > 0) {
            return ((numRate / numBaseRate) - 1) * 100;
        }
        
        return 0;
    }, [activeMargin, customMargin, rate, baseRate]);

    const formatMargin = (margin: number) => {
        const sign = margin > 0 ? '+' : '';
        const formatted = margin.toLocaleString(locale, { minimumFractionDigits: 1, maximumFractionDigits: 2 });
        return `${sign}${formatted}%`;
    }

    const inputStyles = "mt-1 w-full px-3 py-2 bg-white dark:bg-slate-700 text-text-primary dark:text-slate-200 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-primary dark:focus:ring-primary-light focus:border-primary dark:focus:border-primary-light disabled:bg-gray-100 dark:disabled:bg-slate-800 disabled:text-text-secondary dark:disabled:text-slate-500";
    const selectStyles = "mt-1 block w-full pl-3 pr-10 py-2 text-base bg-white dark:bg-slate-700 text-text-primary dark:text-slate-200 border-gray-300 dark:border-slate-600 focus:outline-none focus:ring-primary dark:focus:ring-primary-light focus:border-primary dark:focus:border-primary-light sm:text-sm rounded-md disabled:bg-gray-100 dark:disabled:bg-slate-800 disabled:text-text-secondary dark:disabled:text-slate-500";

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            
            <div className={`p-3 rounded-lg mb-4 flex justify-between items-center text-sm ${isBuy ? 'bg-success/10' : 'bg-secondary/10'}`}>
                <div>
                    <p className={`font-semibold ${isBuy ? 'text-green-800 dark:text-green-300' : 'text-yellow-800 dark:text-yellow-300'}`}>
                        {t(isBuy ? 'transactions.buy' : 'transactions.sell')} {selectedCurrencyCode}
                    </p>
                </div>
                <div className="text-right">
                    <p className={`text-xs uppercase ${isBuy ? 'text-green-700 dark:text-green-400' : 'text-yellow-700 dark:text-yellow-400'}`}>{t('forms.labels.margin')}</p>
                    <p className={`text-lg font-bold ${isBuy ? 'text-green-900 dark:text-green-200' : 'text-yellow-900 dark:text-yellow-200'}`}>
                        {formatMargin(displayMarginValue)}
                    </p>
                </div>
            </div>

            {/* Amount Input */}
             <div>
                <label htmlFor="amount" className="block text-sm font-medium text-text-secondary dark:text-slate-400">{t('forms.labels.amount', { currencyCode: selectedCurrencyCode })}</label>
                <input type="text" inputMode="decimal" id="amount" value={formatNumberForDisplay(amount, locale)} onChange={handleAmountChange} placeholder={t('forms.placeholders.amount')} required className={inputStyles}/>
            </div>

            {/* MIX Payment Inputs */}
            <div className="p-3 bg-gray-50 dark:bg-slate-700/50 rounded-md space-y-3">
                <p className="text-sm text-center text-text-secondary dark:text-slate-400 font-medium">
                    {t('forms.descriptions.totalToPay')}: ${totalInUsd.toFixed(2)}
                </p>
               <div className="grid grid-cols-2 gap-4">
                   <div>
                       <label htmlFor="paidUsd" className="block text-sm font-medium text-text-secondary dark:text-slate-400">{t('forms.labels.payInUsd')}</label>
                       <input type="text" inputMode="decimal" id="paidUsd" value={formatNumberForDisplay(paidUsd, locale)} onChange={handlePaidUsdChange} placeholder="0.00" className={inputStyles}/>
                   </div>
                    <div>
                       <label htmlFor="paidUzs" className="block text-sm font-medium text-text-secondary dark:text-slate-400">{t('forms.labels.payInUzs')}</label>
                       <input type="text" inputMode="numeric" id="paidUzs" value={formatNumberForDisplay(paidUzs, locale)} onChange={handlePaidUzsChange} placeholder="0" className={inputStyles}/>
                   </div>
               </div>
           </div>
            
            {/* Margin Tools */}
            <div className="flex flex-wrap items-center justify-end gap-x-1 gap-y-2">
                {[-2, -1, -0.5, 0.5, 1, 2].map(margin => {
                    const isActive = activeMargin === margin;
                    return ( <button key={margin} type="button" onClick={() => handleMarginClick(margin)} className={`px-4 py-2 text-base font-medium rounded-md transition-colors ${ isActive ? 'bg-secondary text-primary-dark' : 'bg-gray-200 dark:bg-slate-600 text-text-secondary dark:text-slate-300 hover:bg-primary hover:text-white dark:hover:bg-primary-light' }`} title={`${margin > 0 ? '+' : ''}${margin}%`}> {margin > 0 ? '+' : ''}{margin}% </button> );
                })}
                <div className="flex items-center">
                    <input type="number" value={customMargin} onChange={(e) => handleCustomMarginChange(e.target.value)} placeholder="%" step="any" className="w-24 px-2 py-1 text-sm bg-white dark:bg-slate-700 text-text-primary dark:text-slate-200 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-primary dark:focus:ring-primary-light focus:border-primary dark:focus:border-primary-light" aria-label={t('forms.labels.customMargin')}/>
                </div>
            </div>
            
            <div className="flex justify-end -mt-3 mr-1 space-x-4">
                {operationType === 'sell' && targetBalance && (<span className="text-xs text-text-secondary dark:text-slate-400">{t('forms.descriptions.available')}: {targetBalance.availableAmount.toLocaleString(locale)} {targetBalance.currency.code}</span>)}
            </div>

            {/* Wallet Address for Sell */}
            {operationType === 'sell' && (<div><label htmlFor="walletAddress" className="block text-sm font-medium text-text-secondary dark:text-slate-400">{t('forms.labels.recipientWallet')}</label><input type="text" id="walletAddress" value={walletAddress} onChange={e => setWalletAddress(e.target.value)} placeholder={t('forms.placeholders.wallet')} className={inputStyles}/></div>)}

            {error && <p className="text-sm text-danger dark:text-red-400 text-center p-3 bg-danger/10 dark:bg-danger/20 rounded-md">{error}</p>}

            <div className="flex justify-end gap-4">
                <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>{t('buttons.cancel')}</Button>
                <Button type="submit" disabled={isSubmitting}>{isSubmitting ? t('buttons.processing') : t('buttons.confirmTransaction')}</Button>
            </div>
        </form>
    );
};

export default TransactionForm;