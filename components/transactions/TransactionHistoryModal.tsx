import React, { useState, useMemo, useEffect } from 'react';
import type { Transaction, Currency } from '../../types';
import Modal from '../common/Modal';
import Button from '../common/Button';
import TransactionRow from './TransactionRow';
import { useI18n } from '../../context/I18nContext';

interface TransactionHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    transactions: Transaction[];
    currencies: Currency[];
}

const TransactionHistoryModal: React.FC<TransactionHistoryModalProps> = ({ isOpen, onClose, transactions, currencies }) => {
    const { t } = useI18n();

    const [filterType, setFilterType] = useState<'all' | 'buy' | 'sell'>('all');
    const [filterCurrencyId, setFilterCurrencyId] = useState<string>('all');
    const [filterStartDate, setFilterStartDate] = useState('');
    const [filterEndDate, setFilterEndDate] = useState('');
    const [filterWallet, setFilterWallet] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 15;

    const resetFilters = () => {
        setFilterType('all');
        setFilterCurrencyId('all');
        setFilterStartDate('');
        setFilterEndDate('');
        setFilterWallet('');
    };

    const filteredTransactions = useMemo(() => {
        return transactions.filter(tx => {
            if (filterType !== 'all' && tx.operationType !== filterType) {
                return false;
            }
            if (filterCurrencyId !== 'all' && tx.currency.id !== parseInt(filterCurrencyId)) {
                return false;
            }
            if (filterWallet && (!tx.walletAddress || !tx.walletAddress.toLowerCase().includes(filterWallet.toLowerCase()))) {
                return false;
            }
            const txDate = new Date(tx.createdAt);
            if (filterStartDate) {
                const startDate = new Date(filterStartDate);
                startDate.setHours(0, 0, 0, 0);
                if (txDate < startDate) return false;
            }
            if (filterEndDate) {
                const endDate = new Date(filterEndDate);
                endDate.setHours(23, 59, 59, 999);
                if (txDate > endDate) return false;
            }
            return true;
        });
    }, [transactions, filterType, filterCurrencyId, filterStartDate, filterEndDate, filterWallet]);

    useEffect(() => {
        setCurrentPage(1);
    }, [filteredTransactions]);

    const totalPages = Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE);
    const paginatedTransactions = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredTransactions.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    }, [filteredTransactions, currentPage]);


    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t('modals.transactionHistoryTitle')}>
            <div className="space-y-4">
                <details className="bg-gray-50 p-3 rounded-md">
                    <summary className="font-semibold text-text-primary cursor-pointer">{t('filters.filters')}</summary>
                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-text-secondary">{t('filters.type')}</label>
                            <select value={filterType} onChange={e => setFilterType(e.target.value as any)} className="mt-1 w-full p-2 border border-gray-300 rounded-md">
                                <option value="all">{t('filters.all')}</option>
                                <option value="buy">{t('transactions.buy')}</option>
                                <option value="sell">{t('transactions.sell')}</option>
                            </select>
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-text-secondary">{t('filters.currency')}</label>
                            <select value={filterCurrencyId} onChange={e => setFilterCurrencyId(e.target.value)} className="mt-1 w-full p-2 border border-gray-300 rounded-md">
                                <option value="all">{t('filters.all')}</option>
                                {currencies.map(c => <option key={c.id} value={c.id}>{c.code}</option>)}
                            </select>
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-text-secondary">{t('filters.startDate')}</label>
                            <input type="date" value={filterStartDate} onChange={e => setFilterStartDate(e.target.value)} className="mt-1 w-full p-2 border border-gray-300 rounded-md" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-text-secondary">{t('filters.endDate')}</label>
                            <input type="date" value={filterEndDate} onChange={e => setFilterEndDate(e.target.value)} className="mt-1 w-full p-2 border border-gray-300 rounded-md" />
                        </div>
                        <div className="sm:col-span-2">
                            <label className="block text-sm font-medium text-text-secondary">{t('filters.walletAddress')}</label>
                            <input type="text" value={filterWallet} onChange={e => setFilterWallet(e.target.value)} placeholder="0x..." className="mt-1 w-full p-2 border border-gray-300 rounded-md" />
                        </div>
                    </div>
                    <div className="mt-4 text-right">
                         <Button onClick={resetFilters} variant="secondary" size="sm">{t('buttons.reset')}</Button>
                    </div>
                </details>
                
                <div className="max-h-[50vh] overflow-y-auto">
                    {paginatedTransactions.length > 0 ? (
                         <table className="w-full text-sm text-left">
                            <thead className="text-xs text-text-secondary uppercase bg-gray-50 sticky top-0">
                                <tr>
                                    <th scope="col" className="p-2 sm:p-4">{t('transactions.details')}</th>
                                    <th scope="col" className="p-2 sm:p-4 text-right">{t('transactions.amount')}</th>
                                    <th scope="col" className="p-2 sm:p-4 text-right">{t('transactions.status')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedTransactions.map(tx => <TransactionRow key={tx.id} transaction={tx} />)}
                            </tbody>
                        </table>
                    ) : (
                         <div className="text-center p-8">
                            <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                            <h3 className="mt-2 text-sm font-medium text-text-primary">{t('transactions.noMatch')}</h3>
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
                        <span className="text-sm text-text-secondary">
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
        </Modal>
    );
};

export default TransactionHistoryModal;