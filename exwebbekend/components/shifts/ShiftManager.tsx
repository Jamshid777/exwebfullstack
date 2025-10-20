import React from 'react';
import type { Shift } from '../../types';
import Button from '../common/Button';
import { useI18n } from '../../context/I18nContext';

interface ShiftManagerProps {
    activeShift: Shift | null;
}

const ShiftManager: React.FC<ShiftManagerProps> = ({ activeShift }) => {
    const { t, locale } = useI18n();
    
    const formatShiftTime = (isoString: string) => {
        return new Date(isoString).toLocaleString(locale, {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
        });
    };

    return (
        <div className="bg-surface p-4 rounded-lg shadow-md mb-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center">
                {activeShift ? (
                    <>
                        <span className="relative flex h-3 w-3 mr-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-success"></span>
                        </span>
                        <div>
                            <p className="font-semibold text-text-primary">{t('shift.inProgress')}</p>
                            <p className="text-sm text-text-secondary">
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
                            <p className="font-semibold text-text-primary">{t('shift.noActiveShift')}</p>
                            <p className="text-sm text-text-secondary">
                                {t('shift.startPrompt')}
                            </p>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default ShiftManager;