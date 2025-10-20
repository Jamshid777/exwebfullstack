export interface Currency {
  id: number;
  code: string;
  name: string;
  symbol: string;
}

export interface Balance {
  currency: Currency;
  amount: number;
  reservedAmount: number;
  availableAmount: number;
  lastUpdated: string;
}

export interface Transaction {
  id: string;
  operationType: 'buy' | 'sell' | 'cancel' | 'deposit' | 'withdrawal';
  amount: number;
  currency: Currency;
  rate: number;
  totalAmount: number; // always in USD
  profit?: number;
  status: 'completed' | 'pending' | 'failed' | 'cancelled';
  createdAt: string;
  note?: string;
  walletAddress?: string;
  paymentCurrency: 'USD' | 'UZS' | 'MIX';
  uzsRate?: number;
  totalAmountUzs?: number;
  paidAmountUsd?: number; // For MIX payment
  paidAmountUzs?: number; // For MIX payment
  remainingAmount?: number; // For FIFO tracking on buy transactions
}

export interface ExpenseCategory {
    id: string;
    name: string;
}

export interface Expense {
    id: string;
    categoryId: string;
    amount: number; // Amount in the specified currency
    currency: 'USD' | 'UZS';
    amountUsd: number; // Always the equivalent amount in USD
    uzsRate?: number; // The UZS to USD rate if currency is UZS
    note?: string;
    createdAt: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
  role: 'admin' | 'manager' | 'user';
}

export interface ProfitData {
  date: string;
  grossProfit: number;
  expenses: number;
  netProfit: number;
}

export interface Shift {
  id: string;
  startTime: string;
  endTime: string | null;
  startingBalances: Balance[];
  endingBalances: Balance[] | null;
  transactions: Transaction[];
  expenses: Expense[];
  grossProfit: number;
  totalExpenses: number;
  netProfit: number;
}