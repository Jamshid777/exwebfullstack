import type { Currency, Balance, Transaction, ProfitData, ExpenseCategory, Expense } from './types';

export const MOCK_CURRENCIES: Currency[] = [
  { id: 1, code: 'USD', name: 'US Dollar', symbol: '$' },
  { id: 2, code: 'UZS', name: 'Uzbekistani Som', symbol: 'soʻm' },
  { id: 5, code: 'USDT', name: 'Tether', symbol: '₮' },
];

export const MOCK_EXPENSE_CATEGORIES: ExpenseCategory[] = [];

// Initial data is now empty and will be set by the user in the setup screen.
export const MOCK_INITIAL_BALANCES: Balance[] = [];
export const MOCK_INITIAL_TRANSACTIONS: Transaction[] = [];
export const MOCK_INITIAL_EXPENSES: Expense[] = [];


export const MOCK_PROFIT_DATA: ProfitData[] = [
  { date: 'Jan', grossProfit: 400, expenses: 50, netProfit: 350 },
  { date: 'Feb', grossProfit: 300, expenses: 50, netProfit: 250 },
  { date: 'Mar', grossProfit: 500, expenses: 70, netProfit: 430 },
  { date: 'Apr', grossProfit: 280, expenses: 40, netProfit: 240 },
  { date: 'May', grossProfit: 450, expenses: 60, netProfit: 390 },
  { date: 'Jun', grossProfit: 320, expenses: 50, netProfit: 270 },
];