import type { Balance, Transaction, Currency, Shift, Expense, ExpenseCategory } from '../types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const API_BASE_URL = `${SUPABASE_URL}/functions/v1`;

const headers = {
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
};

// Helper function to handle API responses
const handleResponse = async <T>(response: Response): Promise<T> => {
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'An unknown error occurred' }));
        throw new Error(errorData.detail || errorData.message || errorData.error || `HTTP error! status: ${response.status}`);
    }
    return response.json();
};

// --- Data Fetching ---

export const fetchBalances = (): Promise<Balance[]> => {
    return fetch(`${API_BASE_URL}/balances`, { headers }).then(res => handleResponse<Balance[]>(res));
};

export const fetchTransactions = (): Promise<Transaction[]> => {
    return fetch(`${API_BASE_URL}/transactions`, { headers }).then(res => handleResponse<Transaction[]>(res));
};

export const fetchExpenses = (): Promise<Expense[]> => {
    return fetch(`${API_BASE_URL}/expenses`, { headers }).then(res => handleResponse<Expense[]>(res));
};

export const fetchCurrencies = (): Promise<Currency[]> => {
    return fetch(`${API_BASE_URL}/currencies`, { headers }).then(res => handleResponse<Currency[]>(res));
}

export const fetchExpenseCategories = (): Promise<ExpenseCategory[]> => {
    return fetch(`${API_BASE_URL}/expense-categories`, { headers }).then(res => handleResponse<ExpenseCategory[]>(res));
};

export const createExpenseCategory = (name: string): Promise<ExpenseCategory> => {
    return fetch(`${API_BASE_URL}/expense-categories`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ name }),
    }).then(res => handleResponse<ExpenseCategory>(res));
};


// --- Shift Management ---
export const fetchShifts = (): Promise<Shift[]> => {
    return fetch(`${API_BASE_URL}/shifts`, { headers }).then(res => handleResponse<Shift[]>(res));
};

export const getActiveShift = (): Promise<Shift | null> => {
    return fetch(`${API_BASE_URL}/shifts/active`, { headers }).then(async res => {
        if (res.status === 204 || res.status === 404) return null;
        return handleResponse<Shift>(res);
    });
}

export const startShift = (): Promise<Shift> => {
    return fetch(`${API_BASE_URL}/shifts/start`, { method: 'POST', headers }).then(res => handleResponse<Shift>(res));
};

export const endShift = (): Promise<Shift> => {
    return fetch(`${API_BASE_URL}/shifts/end`, { method: 'POST', headers }).then(res => handleResponse<Shift>(res));
}

// --- Safe/Capital Management ---
export const createDeposit = (data: { currency: Currency; amount: number; rate?: number; note?: string }): Promise<Transaction> => {
    return fetch(`${API_BASE_URL}/safe/deposit`, {
        method: 'POST',
        headers,
        body: JSON.stringify(data),
    }).then(res => handleResponse<Transaction>(res));
};

export const createWithdrawal = (data: { currency: Currency; amount: number; note?: string }): Promise<Transaction> => {
    return fetch(`${API_BASE_URL}/safe/withdrawal`, {
        method: 'POST',
        headers,
        body: JSON.stringify(data),
    }).then(res => handleResponse<Transaction>(res));
};

// --- Expenses ---
export const createExpense = (newExpenseData: Omit<Expense, 'id' | 'createdAt' | 'amountUsd'>): Promise<Expense> => {
    return fetch(`${API_BASE_URL}/expenses`, {
        method: 'POST',
        headers,
        body: JSON.stringify(newExpenseData),
    }).then(res => handleResponse<Expense>(res));
};

export const updateExpense = (updatedExpenseData: Expense): Promise<Expense> => {
    return fetch(`${API_BASE_URL}/expenses/${updatedExpenseData.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(updatedExpenseData),
    }).then(res => handleResponse<Expense>(res));
};

// --- Transactions ---
type CreateTransactionData = Omit<Transaction, 'id' | 'createdAt' | 'status' | 'totalAmount' | 'totalAmountUzs' | 'profit' | 'remainingAmount'>;

export const createTransaction = (newTxData: CreateTransactionData): Promise<Transaction> => {
    return fetch(`${API_BASE_URL}/transactions`, {
        method: 'POST',
        headers,
        body: JSON.stringify(newTxData),
    }).then(res => handleResponse<Transaction>(res));
};
