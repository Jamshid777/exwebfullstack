import React, { useState } from 'react';
import Button from '../common/Button';
import { useI18n } from '../../context/I18nContext';

interface SetupFormProps {
    onSetupComplete: (data: { usdAmount: number; usdtAmount: number; usdtBuyRate: number; }) => Promise<void>;
}

const SetupForm: React.FC<SetupFormProps> = ({ onSetupComplete }) => {
    const { t } = useI18n();
    const [usdAmount, setUsdAmount] = useState('');
    const [usdtAmount, setUsdtAmount] = useState('');
    const [usdtBuyRate, setUsdtBuyRate] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        

        const parsedUsd = parseFloat(usdAmount);
        const parsedUsdt = parseFloat(usdtAmount) || 0; // USDT is optional
        const parsedRate = parseFloat(usdtBuyRate) || 0; // Rate is optional if USDT is 0

        if (isNaN(parsedUsd) || parsedUsd < 0) {
            setError(t('errors.validUsdAmount'));
            return;
        }
        
        if (parsedUsdt < 0) {
            setError(t('errors.usdtNegative'));
            return;
        }

        if (parsedUsdt > 0 && (isNaN(parsedRate) || parsedRate <= 0)) {
            setError(t('errors.validUsdtRate'));
            return;
        }
        
        setIsSubmitting(true);
        try {
            await onSetupComplete({
                usdAmount: parsedUsd,
                usdtAmount: parsedUsdt,
                usdtBuyRate: parsedRate,
            });
        } catch (err) {
            setError(err instanceof Error ? err.message : t('errors.unknownSetup'));
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="bg-surface rounded-lg shadow-xl p-8">
                    <h1 className="text-2xl font-bold text-primary-dark text-center mb-2">{t('setup.welcome')}</h1>
                    <p className="text-text-secondary text-center mb-6">{t('setup.intro')}</p>
                    
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label htmlFor="usdAmount" className="block text-sm font-medium text-text-secondary">{t('forms.labels.initialUsd')}</label>
                            <div className="mt-1 relative rounded-md shadow-sm">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <span className="text-gray-500 sm:text-sm">$</span>
                                </div>
                                <input
                                    type="number"
                                    id="usdAmount"
                                    value={usdAmount}
                                    onChange={e => setUsdAmount(e.target.value)}
                                    placeholder={t('forms.placeholders.usd')}
                                    min="0"
                                    step="any"
                                    required
                                    className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                                    aria-describedby="usd-currency"
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="usdtAmount" className="block text-sm font-medium text-text-secondary">{t('forms.labels.initialUsdt')}</label>
                             <div className="mt-1 relative rounded-md shadow-sm">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <span className="text-gray-500 sm:text-sm">₮</span>
                                </div>
                                <input
                                    type="number"
                                    id="usdtAmount"
                                    value={usdtAmount}
                                    onChange={e => setUsdtAmount(e.target.value)}
                                    placeholder={t('forms.placeholders.usdt')}
                                    min="0"
                                    step="any"
                                    className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                                />
                            </div>
                        </div>

                        {(parseFloat(usdtAmount) || 0) > 0 && (
                             <div>
                                <label htmlFor="usdtBuyRate" className="block text-sm font-medium text-text-secondary">{t('forms.labels.usdtBuyRate')}</label>
                                 <div className="mt-1 relative rounded-md shadow-sm">
                                     <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <span className="text-gray-500 sm:text-sm">$</span>
                                    </div>
                                    <input
                                        type="number"
                                        id="usdtBuyRate"
                                        value={usdtBuyRate}
                                        onChange={e => setUsdtBuyRate(e.target.value)}
                                        placeholder="1.00"
                                        min="0.000001"
                                        step="any"
                                        required
                                        className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                                    />
                                </div>
                                <p className="mt-2 text-xs text-text-secondary">{t('forms.descriptions.usdtRateInfo')}</p>
                            </div>
                        )}

                        {error && <p className="text-sm text-danger text-center bg-danger/10 p-3 rounded-md">{error}</p>}

                        <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
                            {isSubmitting ? t('buttons.saving') : t('buttons.completeSetup')}
                        </Button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default SetupForm;