import React, { useState, useEffect } from 'react';
import type { Expense, ExpenseCategory } from '../../types';
import Button from '../common/Button';
import { useI18n } from '../../context/I18nContext.tsx';

interface ExpenseFormProps {
    onCreateExpense: (expenseData: Omit<Expense, 'id' | 'createdAt' | 'amountUsd'>) => Promise<void>;
    onUpdateExpense?: (expenseData: Expense) => Promise<void>;
    onClose: () => void;
    categories: ExpenseCategory[];
    onCreateCategory: (name: string) => Promise<ExpenseCategory>;
    uzsRate: number;
    expenseToEdit?: Expense | null;
}

// Helper functions for number formatting
const formatNumberForDisplay = (numStr: string, locale: string, isIntegerOnly: boolean = false): string => {
    if (!numStr) return '';
    const [integer, decimal] = numStr.split('.');
    
    if (integer === '') {
        if (isIntegerOnly) return '';
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

const ExpenseForm: React.FC<ExpenseFormProps> = ({ onCreateExpense, onUpdateExpense, onClose, categories, onCreateCategory, uzsRate, expenseToEdit }) => {
    const { t, locale } = useI18n();
    const [currency, setCurrency] = useState<'USD' | 'UZS'>('USD');
    const [selectedCategoryId, setSelectedCategoryId] = useState('');
    const [amount, setAmount] = useState('');
    const [note, setNote] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    
    const [isAddingCategory, setIsAddingCategory] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [categoryError, setCategoryError] = useState('');
    const [isSubmittingCategory, setIsSubmittingCategory] = useState(false);
    
    const isEditMode = !!expenseToEdit;

    useEffect(() => {
        if (expenseToEdit) {
            setCurrency(expenseToEdit.currency);
            setSelectedCategoryId(expenseToEdit.categoryId);
            setAmount(String(expenseToEdit.amount));
            setNote(expenseToEdit.note || '');
        } else {
             // Reset form for 'create' mode, but only if categories are available
            if (!selectedCategoryId && categories.length > 0) {
                setSelectedCategoryId(categories[0].id);
            }
        }
    }, [expenseToEdit, categories, selectedCategoryId]);

    const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const parsedValue = parseFormattedNumber(e.target.value);
        const isUzs = currency === 'UZS';
        const regex = isUzs ? /^\d*$/ : /^\d*\.?\d*$/; // No decimals for UZS

        if (regex.test(parsedValue)) {
            setAmount(parsedValue);
        }
    };

    const handleSaveNewCategory = async () => {
        setCategoryError('');
        if (!newCategoryName.trim()) {
            setCategoryError(t('errors.emptyCategoryName'));
            return;
        }
        setIsSubmittingCategory(true);
        try {
            const newCategory = await onCreateCategory(newCategoryName);
            setSelectedCategoryId(newCategory.id);
            setNewCategoryName('');
            setIsAddingCategory(false);
        } catch (err) {
            setCategoryError(err instanceof Error ? err.message : t('errors.saveCategory'));
        } finally {
            setIsSubmittingCategory(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        const parsedAmount = parseFloat(amount);

        if (!selectedCategoryId) {
            setError(t('errors.selectCategory'));
            return;
        }
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
            setError(t('errors.validPositiveAmount'));
            return;
        }

        setIsSubmitting(true);
        try {
            if (isEditMode && onUpdateExpense) {
                 await onUpdateExpense({
                    ...expenseToEdit,
                    categoryId: selectedCategoryId,
                    amount: parsedAmount,
                    note: note || undefined,
                    currency: currency,
                    uzsRate: currency === 'UZS' ? uzsRate : undefined,
                 });
            } else {
                await onCreateExpense({
                    categoryId: selectedCategoryId,
                    amount: parsedAmount,
                    note: note || undefined,
                    currency: currency,
                    ...(currency === 'UZS' && { uzsRate }),
                });
            }
            onClose(); // Close on success
        } catch (err) {
            setError(err instanceof Error ? err.message : t('errors.unknownExpense'));
            setIsSubmitting(false);
        }
    };
    
    const inputStyles = "mt-1 w-full px-3 py-2 bg-white dark:bg-slate-700 text-text-primary dark:text-slate-200 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-primary dark:focus:ring-primary-light focus:border-primary dark:focus:border-primary-light disabled:bg-gray-100 dark:disabled:bg-slate-800 disabled:text-text-secondary dark:disabled:text-slate-500";
    const selectStyles = "mt-1 block w-full pl-3 pr-10 py-2 text-base bg-white dark:bg-slate-700 text-text-primary dark:text-slate-200 border-gray-300 dark:border-slate-600 focus:outline-none focus:ring-primary dark:focus:ring-primary-light focus:border-primary dark:focus:border-primary-light sm:text-sm rounded-md disabled:bg-gray-100 dark:disabled:bg-slate-800 disabled:text-text-secondary dark:disabled:text-slate-500";

    const CurrencyButton: React.FC<{ value: 'USD' | 'UZS'; children: React.ReactNode; }> = ({ value, children }) => (
        <button
            type="button"
            onClick={() => setCurrency(value)}
            className={`w-full px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                currency === value
                ? 'bg-primary dark:bg-primary-light text-white dark:text-primary-dark shadow-sm'
                : 'bg-gray-200 dark:bg-slate-600 text-text-secondary dark:text-slate-300 hover:bg-gray-300 dark:hover:bg-slate-500'
            }`}
        >
            {children}
        </button>
    );


    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-text-secondary dark:text-slate-400">{t('forms.labels.currency')}</label>
                 <div className="mt-1 flex items-center gap-1 bg-gray-100 dark:bg-slate-900/50 p-1 rounded-md">
                    <CurrencyButton value="USD">USD ($)</CurrencyButton>
                    <CurrencyButton value="UZS">UZS (so'm)</CurrencyButton>
                 </div>
            </div>

            <div>
                <label htmlFor="category" className="block text-sm font-medium text-text-secondary dark:text-slate-400">{t('forms.labels.category')}</label>
                <select
                    id="category"
                    value={selectedCategoryId}
                    onChange={(e) => setSelectedCategoryId(e.target.value)}
                    className={selectStyles}
                    disabled={isAddingCategory}
                >
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
            </div>

            {!isAddingCategory ? (
                <div className="text-right -mt-2">
                    <button 
                        type="button" 
                        onClick={() => setIsAddingCategory(true)}
                        className="text-sm font-medium text-primary dark:text-primary-light hover:text-primary-light dark:hover:text-indigo-400"
                        disabled={isSubmitting}
                    >
                        {t('buttons.newCategory')}
                    </button>
                </div>
            ) : (
                <div className="p-3 bg-gray-50 dark:bg-slate-700/50 rounded-md space-y-2">
                    <label htmlFor="newCategory" className="block text-sm font-medium text-text-secondary dark:text-slate-400">{t('forms.labels.newCategoryName')}</label>
                    <input 
                        type="text" 
                        id="newCategory"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        placeholder={t('forms.placeholders.newCategory')}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-700 text-text-primary dark:text-slate-200 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-primary dark:focus:ring-primary-light focus:border-primary dark:focus:border-primary-light"
                    />
                    {categoryError && <p className="text-xs text-danger dark:text-red-400">{categoryError}</p>}
                    <div className="flex justify-end gap-2">
                        <Button type="button" size="sm" variant="secondary" onClick={() => { setIsAddingCategory(false); setCategoryError(''); }} disabled={isSubmittingCategory}>
                            {t('buttons.cancel')}
                        </Button>
                        <Button type="button" size="sm" onClick={handleSaveNewCategory} disabled={isSubmittingCategory}>
                            {isSubmittingCategory ? t('buttons.saving') : t('buttons.save')}
                        </Button>
                    </div>
                </div>
            )}

            <div>
                <label htmlFor="amount" className="block text-sm font-medium text-text-secondary dark:text-slate-400">{t('forms.labels.amount')} ({currency})</label>
                <input 
                    type="text" 
                    id="amount"
                    inputMode={currency === 'UZS' ? 'numeric' : 'decimal'}
                    value={formatNumberForDisplay(amount, locale, currency === 'UZS')} 
                    onChange={handleAmountChange} 
                    placeholder={currency === 'UZS' ? '100 000' : '100.00'} 
                    required 
                    className={inputStyles}
                />
            </div>

            <div>
                <label htmlFor="note" className="block text-sm font-medium text-text-secondary dark:text-slate-400">{t('forms.labels.note')}</label>
                <input type="text" id="note" value={note} onChange={e => setNote(e.target.value)} placeholder={t('forms.placeholders.note')} className={inputStyles}/>
            </div>

            {error && <p className="text-sm text-danger dark:text-red-400 text-center p-3 bg-danger/10 dark:bg-danger/20 rounded-md">{error}</p>}

            <div className="flex justify-end gap-4 pt-4">
                <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
                    {t('buttons.cancel')}
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? t('buttons.saving') : (isEditMode ? t('buttons.updateExpense') : t('buttons.addExpense'))}
                </Button>
            </div>
        </form>
    );
};

export default ExpenseForm;