import React, { useState, useEffect } from 'react';
import { useI18n } from '../../context/I18nContext';

interface UzsRateManagerProps {
    rate: number;
    onRateChange: (newRate: number) => void;
    disabled: boolean;
}

const UzsRateManager: React.FC<UzsRateManagerProps> = ({ rate, onRateChange, disabled }) => {
    const { t } = useI18n();
    const [localRate, setLocalRate] = useState(String(rate));

    useEffect(() => {
        setLocalRate(String(rate));
    }, [rate]);

    const handleBlur = () => {
        const newRate = parseFloat(localRate);
        if (!isNaN(newRate) && newRate > 0) {
            onRateChange(newRate);
        } else {
            setLocalRate(String(rate)); // Reset if invalid
        }
    };
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setLocalRate(e.target.value);
    }

    return (
        <div className="flex items-center space-x-2">
            <label htmlFor="uzsRate" className="text-sm font-medium text-gray-300 whitespace-nowrap">{t('uzsUsdRate')}:</label>
            <input 
                type="number"
                id="uzsRate"
                value={localRate}
                onChange={handleChange}
                onBlur={handleBlur}
                disabled={disabled}
                className="w-28 bg-primary-light text-white text-sm font-semibold rounded-md px-2 py-1 border-transparent focus:outline-none focus:ring-2 focus:ring-secondary disabled:opacity-70 disabled:cursor-not-allowed"
                min="0"
                step="any"
            />
        </div>
    );
};

export default UzsRateManager;
