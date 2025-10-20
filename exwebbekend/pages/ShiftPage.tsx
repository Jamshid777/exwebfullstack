import React, { useState, useMemo } from 'react';
import type { Shift, Balance } from '../types';
import Button from '../components/common/Button';
import { useI18n } from '../context/I18nContext';

interface ShiftPageProps {
    activeShift: Shift | null;
    shifts: Shift[];
    onStartShift: () => void;
    onEndShift: () => void;
    onNavigateBack: () => void;
}

// Shift History Item Components (from former modal)
const BalanceDetail: React.FC<{ title: string; balances: Balance[] | null }> = ({ title, balances }) => {
    const { locale } = useI18n();
    const usd = balances?.find(b => b.currency.code === 'USD')?.amount ?? 0;
    const usdt = balances?.find(b => b.currency.code === 'USDT')?.amount ?? 0;
    
    return (
        <div>
            <h4 className="font-semibold text-sm text-text-primary dark:text-slate-200">{title}</h4>
            <p className="text-sm text-text-secondary dark:text-slate-400">USD: ${usd.toLocaleString(locale, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
            <p className="text-sm text-text-secondary dark:text-slate-400">USDT: ₮{usdt.toLocaleString(locale, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
        </div>
    )
}

const ProfitDetail: React.FC<{ shift: Shift }> = ({ shift }) => {
    const { t } = useI18n();
    const { grossProfit, totalExpenses, netProfit } = shift;
    const netProfitColor = netProfit >= 0 ? 'text-success dark:text-green-400' : 'text-danger dark:text-red-400';
    
    return (
        <div className="col-span-1 sm:col-span-2 mt-2 pt-2 border-t border-gray-200 dark:border-slate-600">
             <h4 className="font-semibold text-sm text-text-primary dark:text-slate-200 mb-1">{t('shift.shiftPerformance')}</h4>
             <div className="flex justify-between text-sm">
                 <span className="text-text-secondary dark:text-slate-400">{t('dashboard.grossProfit')}:</span>
                 <span className="font-medium text-success dark:text-green-400">${grossProfit.toFixed(2)}</span>
             </div>
             <div className="flex justify-between text-sm">
                 <span className="text-text-secondary dark:text-slate-400">{t('dashboard.expenses')}:</span>
                 <span className="font-medium text-danger dark:text-red-400">-${totalExpenses.toFixed(2)}</span>
             </div>
             <div className="flex justify-between text-sm mt-1 pt-1 border-t border-dashed dark:border-slate-600">
                 <span className="font-semibold text-text-primary dark:text-slate-200">{t('dashboard.netProfit')}:</span>
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

    const netProfitColor = shift.netProfit >= 0 ? 'text-success dark:text-green-400' : 'text-danger dark:text-red-400';
    const netProfitSign = shift.netProfit >= 0 ? '+' : '';
    
    const getDuration = (start: string, end: string | null): string => {
        if (!end) return '-';
        const durationMs = new Date(end).getTime() - new Date(start).getTime();
        const hours = Math.floor(durationMs / 3600000);
        const minutes = Math.floor((durationMs % 3600000) / 60000);
        return `${hours}h ${minutes}m`;
    };

    return (
        <div className="border border-gray-200 dark:border-slate-700 rounded-md">
            <button
                className="w-full text-left p-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-slate-700/50"
                onClick={() => setIsOpen(!isOpen)}
                aria-expanded={isOpen}
            >
                <div>
                    <p className="font-semibold text-primary-dark dark:text-slate-200">
                        {formatDateTime(shift.startTime)}
                    </p>
                    <p className="text-xs text-text-secondary dark:text-slate-400">
                        {t('shift.duration')}: {getDuration(shift.startTime, shift.endTime)}
                    </p>
                </div>
                <div className="text-right">
                    <p className={`font-semibold ${netProfitColor}`}>
                        {netProfitSign}${shift.netProfit.toFixed(2)}
                    </p>
                    <p className="text-xs text-text-secondary dark:text-slate-400">
                       {shift.transactions.length} {t('shift.txns')} / {shift.expenses.length} {t('shift.exp')}
                    </p>
                </div>
                 <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 text-text-secondary dark:text-slate-400 transform transition-transform ${isOpen ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
            </button>
            {isOpen && (
                <div className="p-4 bg-gray-50 dark:bg-slate-900/50 border-t border-gray-200 dark:border-slate-700 grid grid-cols-1 sm:grid-cols-2 gap-4">
                   <BalanceDetail title={t('shift.startingBalances')} balances={shift.startingBalances} />
                   <BalanceDetail title={t('shift.endingBalances')} balances={shift.endingBalances} />
                   <ProfitDetail shift={shift} />
                </div>
            )}
        </div>
    );
};

// Main Page Component
const ShiftPage: React.FC<ShiftPageProps> = ({ activeShift, shifts, onStartShift, onEndShift, onNavigateBack }) => {
    const { t, locale } = useI18n();
    const filterOptions = [
        { key: 'today', label: t('filters.today') },
        { key: 'last7Days', label: t('filters.last7Days') },
        { key: 'last30Days', label: t('filters.last30Days') },
        { key: 'allTime', label: t('filters.allTime') },
    ];
    const [activeFilterKey, setActiveFilterKey] = useState('last7Days');

    const formatShiftTime = (isoString: string) => {
        return new Date(isoString).toLocaleString(locale, {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
        });
    };

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
        <div className="space-y-6">
            <header className="flex items-center justify-between -mb-2">
                 <Button onClick={onNavigateBack} variant="secondary" size="sm">
                    &larr; <span className="hidden sm:inline ml-2">{t('buttons.back')}</span>
                </Button>
                <h1 className="text-lg sm:text-xl font-bold text-text-primary dark:text-slate-100">{t('shift.pageTitle')}</h1>
                <div className="w-16 sm:w-24"></div> {/* Spacer */}
            </header>

            {/* Shift Controls */}
            <div className="bg-surface dark:bg-slate-800 p-4 rounded-lg shadow-md">
                <h2 className="text-lg font-semibold text-text-primary dark:text-slate-100 mb-4">{t('shift.controlsTitle')}</h2>
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center">
                        {activeShift ? (
                            <>
                                <span className="relative flex h-3 w-3 mr-3">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-success"></span>
                                </span>
                                <div>
                                    <p className="font-semibold text-text-primary dark:text-slate-200">{t('shift.inProgress')}</p>
                                    <p className="text-sm text-text-secondary dark:text-slate-400">
                                        {t('shift.started')}: {formatShiftTime(activeShift.startTime)}
                                    </p>
                                </div>
                            </>
                        ) : (
                            <>
                                 <span className="relative flex h-3 w-3 mr-3">
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-gray-400"></span>
                                </span>
                                <div>
                                    <p className="font-semibold text-text-primary dark:text-slate-200">{t('shift.noActiveShift')}</p>
                                    <p className="text-sm text-text-secondary dark:text-slate-400">
                                        {t('shift.startPrompt')}
                                    </p>
                                </div>
                            </>
                        )}
                    </div>
                    <div>
                        {activeShift ? (
                             <Button onClick={onEndShift} variant="danger" size="md">
                                {t('buttons.endShift')}
                             </Button>
                        ) : (
                             <Button onClick={onStartShift} variant="primary" size="md">
                                {t('buttons.startShift')}
                             </Button>
                        )}
                    </div>
                </div>
            </div>

            {/* Shift History */}
            <div className="bg-surface dark:bg-slate-800 p-4 sm:p-6 rounded-lg shadow-md">
                <h2 className="text-lg font-semibold text-text-primary dark:text-slate-100 mb-4">{t('modals.shiftHistoryTitle')}</h2>
                <div className="flex flex-wrap items-center justify-center gap-1 bg-gray-100 dark:bg-slate-900/50 p-1 rounded-md">
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
                <div className="mt-4 space-y-2">
                    {shifts.length === 0 ? (
                        <div className="text-center p-8">
                            <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            <h3 className="mt-2 text-sm font-medium text-text-primary dark:text-slate-200">{t('shift.noPastShifts')}</h3>
                            <p className="mt-1 text-sm text-text-secondary dark:text-slate-400">{t('shift.noPastShiftsDescription')}</p>
                        </div>
                    ) : filteredShifts.length > 0 ? (
                        filteredShifts.map(shift => <ShiftDetail key={shift.id} shift={shift} />)
                    ) : (
                        <div className="text-center p-8">
                            <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                            <h3 className="mt-2 text-sm font-medium text-text-primary dark:text-slate-200">{t('shift.noShiftsInPeriod')}</h3>
                            <p className="mt-1 text-sm text-text-secondary dark:text-slate-400">{t('shift.noShiftsInPeriodDescription')}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ShiftPage;