import React from 'react';
import type { Transaction } from '../../types';
import { useI18n } from '../../context/I18nContext';

const TransactionRow: React.FC<{ transaction: Transaction }> = ({ transaction }) => {
    const { t, locale } = useI18n();
    const { operationType, amount, currency, status, createdAt, walletAddress, profit, totalAmount, paymentCurrency, totalAmountUzs, paidAmountUsd, paidAmountUzs, note } = transaction;
    const isBuy = operationType === 'buy';
    const isDeposit = operationType === 'deposit';
    const isCredit = isBuy || isDeposit; // Is money coming in?
    
    const sign = isCredit ? '+' : '-';
    
    const operationClass = 
        operationType === 'buy' ? 'bg-green-100 text-success dark:bg-green-900/50 dark:text-green-300' :
        operationType === 'sell' ? 'bg-red-100 text-danger dark:bg-red-900/50 dark:text-red-300' :
        operationType === 'deposit' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300' :
        'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300'; // withdrawal

    const statusClass = status === 'completed'
        ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300'
        : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300';

    const getOperationIcon = () => {
        switch(operationType) {
            case 'buy':
                return <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>;
            case 'sell':
                return <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4" /></svg>;
            case 'deposit':
                return <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" /></svg>;
            case 'withdrawal':
                return <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm0 6a2 2 0 00-2 2v4a2 2 0 002 2h12a2 2 0 002-2v-4a2 2 0 00-2-2H4z" clipRule="evenodd" /></svg>;
            default:
                return null;
        }
    };

    const renderTotal = () => {
        if (operationType === 'deposit' || operationType === 'withdrawal') {
            return null; // Total is not relevant for capital movements in the same way as trades
        }
        if (paymentCurrency === 'MIX') {
             return (
                 <p className="text-sm text-text-secondary dark:text-slate-400">
                    {`$${(paidAmountUsd || 0).toLocaleString(locale, {minimumFractionDigits: 2})} + ${(paidAmountUzs || 0).toLocaleString(locale, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} UZS`}
                </p>
             );
        }
        if (paymentCurrency === 'UZS' && totalAmountUzs) {
            return (
                 <p className="text-sm text-text-secondary dark:text-slate-400" title={`@ ${transaction.rate.toLocaleString(locale)}`}>
                    {t(isBuy ? 'transactions.for' : 'transactions.from')} {totalAmountUzs.toLocaleString(locale, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} UZS
                </p>
            );
        }
        return (
             <p className="text-sm text-text-secondary dark:text-slate-400" title={`@ ${transaction.rate.toLocaleString(locale)}`}>
                {t(isBuy ? 'transactions.for' : 'transactions.from')} ${totalAmount.toLocaleString(locale, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
            </p>
        );
    }

    return (
        // Becomes a grid container on desktop
        <div className="p-4 hover:bg-gray-50 dark:hover:bg-slate-700/50 sm:grid sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)] sm:gap-4 sm:items-center">
            
            {/* --- Column 1: Details --- */}
            <div className="flex justify-between items-start">
                 {/* Main Details */}
                <div className="flex items-center min-w-0">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-4 flex-shrink-0 ${operationClass}`}>
                        {getOperationIcon()}
                    </div>
                    <div className="min-w-0">
                        <p className="font-semibold text-text-primary dark:text-slate-100 capitalize truncate" title={`${t(`transactions.${operationType}`)} ${currency.code}`}>{t(`transactions.${operationType}`)} {currency.code}</p>
                        <p className="text-sm text-text-secondary dark:text-slate-400">{new Date(createdAt).toLocaleString(locale, { dateStyle: 'short', timeStyle: 'short' })}</p>
                    </div>
                </div>
                {/* Status Badge (Mobile only) */}
                <div className="sm:hidden flex-shrink-0 ml-2">
                     <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusClass}`}>
                        {status}
                    </span>
                </div>
            </div>

            {/* --- Column 2: Amount --- */}
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-700 flex justify-between items-center sm:mt-0 sm:pt-0 sm:border-t-0 sm:block sm:text-right">
                <div className="sm:text-right">
                    <p className={`font-semibold ${
                        operationType === 'buy' ? 'text-success dark:text-green-400' :
                        operationType === 'sell' ? 'text-danger dark:text-red-400' :
                        operationType === 'deposit' ? 'text-blue-700 dark:text-blue-400' :
                        'text-yellow-700 dark:text-yellow-400'
                    }`}>
                        {sign}{amount.toLocaleString(locale)} {currency.code}
                    </p>
                    {renderTotal()}
                </div>
                {typeof profit === 'number' && (
                     <p className={`text-sm sm:text-xs mt-0 sm:mt-1 font-medium ${profit >= 0 ? 'text-success dark:text-green-400' : 'text-danger dark:text-red-400'}`}>
                        {profit >= 0 ? `${t('transactions.profit')}: $` : `${t('transactions.loss')}: $`}{Math.abs(profit).toLocaleString(locale, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                    </p>
                )}
            </div>

            {/* --- Column 3: Status --- */}
            <div className="hidden sm:block sm:text-right">
                 <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusClass}`}>
                    {status}
                </span>
            </div>

            {/* Wallet Address or Note */}
             <div className="mt-2 text-xs text-text-secondary dark:text-slate-500 truncate sm:col-start-1 sm:col-span-3" title={walletAddress || note}>
                {operationType === 'sell' && walletAddress && (
                    <span>{t('transactions.to')}: {walletAddress}</span>
                )}
                {(operationType === 'deposit' || operationType === 'withdrawal') && note && (
                    <span>{note}</span>
                )}
             </div>
        </div>
    );
};

export default TransactionRow;