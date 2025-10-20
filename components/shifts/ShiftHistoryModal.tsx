import React, { useState, useMemo } from 'react';
import type { Shift, Balance } from '../../types';
import Modal from '../common/Modal';
import { useI18n } from '../../context/I18nContext';

interface ShiftHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    shifts: Shift[];
}

const BalanceDetail: React.FC<{ title: string; balances: Balance[] | null }> = ({ title, balances }) => {
    const { locale } = useI18n();
    const usd = balances?.find(b => b.currency.code === 'USD')?.amount ?? 0;
    const usdt = balances?.find(b => b.currency.code === 'USDT')?.amount ?? 0;
    
    return (
        <div>
            <h4 className="font-semibold text-sm text-text-primary">{title}</h4>
            <p className="text-sm text-text-secondary">USD: ${usd.toLocaleString(locale, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
            <p className="text-sm text-text-secondary">USDT: ₮{usdt.toLocaleString(locale, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
        </div>
    )
}

const ProfitDetail: React.FC<{ shift: Shift }> = ({ shift }) => {
    const { t } = useI18n();
    const { grossProfit, totalExpenses, netProfit } = shift;
    const netProfitColor = netProfit >= 0 ? 'text-success' : 'text-danger';
    
    return (
        <div className="col-span-1 sm:col-span-2 mt-2 pt-2 border-t border-gray-200">
             <h4 className="font-semibold text-sm text-text-primary mb-1">{t('shift.shiftPerformance')}</h4>
             <div className="flex justify-between text-sm">
                 <span className="text-text-secondary">{t('dashboard.grossProfit')}:</span>
                 <span className="font-medium text-success">${grossProfit.toFixed(2)}</span>
             </div>
             <div className="flex justify-between text-sm">
                 <span className="text-text-secondary">{t('dashboard.expenses')}:</span>
                 <span className="font-medium text-danger">-${totalExpenses.toFixed(2)}</span>
             </div>
             <div className="flex justify-between text-sm mt-1 pt-1 border-t border-dashed">
                 <span className="font-semibold text-text-primary">{t('dashboard.netProfit')}:</span>
                 <span className={`font-bold ${netProfitColor}`}>${netProfit.toFixed(2)}</span>
             </div>
        </div>
    )
}

const ShiftDetail: React.FC<{ shift: Shift }> = ({ shift }) => {
    const { t, locale } = useI18n();
    const [isOpen, setIsOpen] = useState(false);

    const formatDateTime = (isoString: string | null) => {
        if (!isoString) return t('shift.inProgressLabel');
        return new Date(isoString).toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' });
    };

    const netProfitColor = shift.netProfit >= 0 ? 'text-success' : 'text-danger';
    const netProfitSign = shift.netProfit >= 0 ? '+' : '';
    
    const getDuration = (start: string, end: string | null): string => {
        if (!end) return '-';
        const durationMs = new Date(end).getTime() - new Date(start).getTime();
        const hours = Math.floor(durationMs / 3600000);
        const minutes = Math.floor((durationMs % 3600000) / 60000);
        return `${hours}h ${minutes}m`;
    };

    return (
        <div className="border border-gray-200 rounded-md mb-2">
            <button
                className="w-full text-left p-3 flex items-center justify-between hover:bg-gray-50"
                onClick={() => setIsOpen(!isOpen)}
                aria-expanded={isOpen}
            >
                <div>
                    <p className="font-semibold text-primary-dark">
                        {formatDateTime(shift.startTime)}
                    </p>
                    <p className="text-xs text-text-secondary">
                        {t('shift.duration')}: {getDuration(shift.startTime, shift.endTime)}
                    </p>
                </div>
                <div className="text-right">
                    <p className={`font-semibold ${netProfitColor}`}>
                        {netProfitSign}${shift.netProfit.toFixed(2)}
                    </p>
                    <p className="text-xs text-text-secondary">
                       {shift.transactions.length} {t('shift.txns')} / {shift.expenses.length} {t('shift.exp')}
                    </p>
                </div>
                 <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 text-text-secondary transform transition-transform ${isOpen ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
            </button>
            {isOpen && (
                <div className="p-4 bg-gray-50 border-t border-gray-200 grid grid-cols-1 sm:grid-cols-2 gap-4">
                   <BalanceDetail title={t('shift.startingBalances')} balances={shift.startingBalances} />
                   <BalanceDetail title={t('shift.endingBalances')} balances={shift.endingBalances} />
                   <ProfitDetail shift={shift} />
                </div>
            )}
        </div>
    );
};


const ShiftHistoryModal: React.FC<ShiftHistoryModalProps> = ({ isOpen, onClose, shifts }) => {
    const { t } = useI18n();
    const [filter, setFilter] = useState('Last 7 Days');
    const filterOptions = [
        { key: 'today', label: t('filters.today') },
        { key: 'last7Days', label: t('filters.last7Days') },
        { key: 'last30Days', label: t('filters.last30Days') },
        { key: 'allTime', label: t('filters.allTime') },
    ];
    const [activeFilterKey, setActiveFilterKey] = useState('last7Days');

    const filteredShifts = useMemo(() => {
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
                return shifts;
        }

        return shifts.filter(shift => new Date(shift.startTime) >= startDate!);
    }, [shifts, activeFilterKey]);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t('modals.shiftHistoryTitle')}>
            <div className="mb-4">
                <div className="flex flex-wrap items-center justify-center gap-1 bg-gray-100 p-1 rounded-md">
                    {filterOptions.map(option => (
                        <button
                            key={option.key}
                            onClick={() => setActiveFilterKey(option.key)}
                            className={`px-3 py-1 text-sm font-medium rounded-md transition-colors flex-grow ${
                                activeFilterKey === option.key
                                ? 'bg-primary text-white shadow-sm' 
                                : 'text-text-secondary hover:bg-gray-200'
                            }`}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
            </div>
            <div className="max-h-[50vh] overflow-y-auto pr-2">
                {shifts.length === 0 ? (
                    <div className="text-center p-8">
                        <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        <h3 className="mt-2 text-sm font-medium text-gray-900">{t('shift.noPastShifts')}</h3>
                        <p className="mt-1 text-sm text-gray-500">{t('shift.noPastShiftsDescription')}</p>
                    </div>
                ) : filteredShifts.length > 0 ? (
                    filteredShifts.map(shift => <ShiftDetail key={shift.id} shift={shift} />)
                ) : (
                    <div className="text-center p-8">
                        <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        <h3 className="mt-2 text-sm font-medium text-gray-900">{t('shift.noShiftsInPeriod')}</h3>
                        <p className="mt-1 text-sm text-gray-500">{t('shift.noShiftsInPeriodDescription')}</p>
                    </div>
                )}
            </div>
        </Modal>
    );
};

export default ShiftHistoryModal;