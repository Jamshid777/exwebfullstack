import type { Balance, Transaction, Currency, Shift, Expense, ExpenseCategory } from '../types';

// API base URL: always use a relative prefix so the dev/prod proxy can route correctly.
// This avoids absolute docker-internal hosts leaking to the browser.
const API_BASE_URL = '/api/v1';
try {
    if (typeof window !== 'undefined') {
        // eslint-disable-next-line no-console
        console.debug('[api] Using API_BASE_URL =', API_BASE_URL);
    }
} catch {}

let authToken: string | null = null;

const clearStoredToken = () => {
    authToken = null;
    try {
        if (typeof window !== 'undefined') localStorage.removeItem('authToken');
    } catch {}
};

const getAuthToken = async (forceFresh = false): Promise<string> => {
    if (authToken) return authToken;
    try {
        const stored = !forceFresh && typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
        if (stored && !forceFresh) {
            authToken = stored;
            return authToken;
        }
    } catch {}

    const username = (import.meta as any).env?.VITE_ADMIN_USERNAME || 'admin';
    const password = (import.meta as any).env?.VITE_ADMIN_PASSWORD || 'admin';

    const body = new URLSearchParams();
    body.append('username', username);
    body.append('password', password);
    body.append('grant_type', 'password');
    body.append('scope', '');

    const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body
    });
    if (!res.ok) {
        clearStoredToken();
        throw new Error('Failed to obtain auth token');
    }
    const data = await res.json();
    authToken = data.access_token;
    try {
        if (typeof window !== 'undefined') localStorage.setItem('authToken', authToken);
    } catch {}
    return authToken;
};

const authedFetch = async (input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> => {
    // First try with existing or newly acquired token
    let token = await getAuthToken();
    let headers = new Headers(init.headers || {});
    headers.set('Authorization', `Bearer ${token}`);
    let response = await fetch(input, { ...init, headers });

    // If unauthorized, clear token and retry once with a fresh login
    if (response.status === 401) {
        clearStoredToken();
        token = await getAuthToken(true);
        headers = new Headers(init.headers || {});
        headers.set('Authorization', `Bearer ${token}`);
        response = await fetch(input, { ...init, headers });
    }
    return response;
};

// Helper function to handle API responses
const handleResponse = async <T>(response: Response): Promise<T> => {
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'An unknown error occurred' }));
        throw new Error(errorData.detail || errorData.message || `HTTP error! status: ${response.status}`);
    }
    return response.json();
};

// --- Data Fetching ---

export const fetchBalances = (): Promise<Balance[]> => {
    return authedFetch(`${API_BASE_URL}/balances`)
        .then(res => handleResponse<any[]>(res))
        .then(items => items.map((b: any) => {
            const amount = Number(b.amount ?? 0);
            const available = Number(b.available_amount ?? b.availableAmount ?? 0);
            const code = String(b.currency_code ?? b.currency?.code ?? 'UNKNOWN');
            const reserved = Math.max(0, amount - available);
            return {
                currency: { id: 0, code, name: code, symbol: code },
                amount,
                reservedAmount: reserved,
                availableAmount: available,
                lastUpdated: new Date().toISOString(),
            } as Balance;
        }));
};

export const fetchTransactions = (): Promise<Transaction[]> => {
    // BACKEND LOGIC: Return all transactions, sorted by `createdAt` in descending order.
    return authedFetch(`${API_BASE_URL}/transactions`).then(res => handleResponse<Transaction[]>(res));
};

export const fetchExpenses = (): Promise<Expense[]> => {
    // BACKEND LOGIC: Return all expenses, sorted by `createdAt` in descending order.
    return authedFetch(`${API_BASE_URL}/expenses`).then(res => handleResponse<Expense[]>(res));
};

export const fetchCurrencies = (): Promise<Currency[]> => {
    // BACKEND LOGIC: Return a list of all available currencies from the `currencies` table.
    return authedFetch(`${API_BASE_URL}/currencies`).then(res => handleResponse<Currency[]>(res));
}

export const fetchExpenseCategories = (): Promise<ExpenseCategory[]> => {
    // BACKEND LOGIC: Return all expense categories, sorted by name.
    return authedFetch(`${API_BASE_URL}/expense-categories`).then(res => handleResponse<ExpenseCategory[]>(res));
};

export const createExpenseCategory = (name: string): Promise<ExpenseCategory> => {
    // BACKEND LOGIC:
    // 1. Validate that the `name` is not empty and is unique (case-insensitive check).
    // 2. If validation passes, create a new record in the `expense_categories` table.
    // 3. Return the newly created category object.
    return authedFetch(`${API_BASE_URL}/expense-categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
    }).then(res => handleResponse<ExpenseCategory>(res));
};


// --- Shift Management ---
export const fetchShifts = (): Promise<Shift[]> => {
    // BACKEND LOGIC: Return all shifts from the `shifts` table, sorted by `startTime` descending.
    return authedFetch(`${API_BASE_URL}/shifts`).then(res => handleResponse<Shift[]>(res));
};

export const getActiveShift = (): Promise<Shift | null> => {
    // BACKEND LOGIC: Find a shift where `endTime` is NULL. If found, return the shift object. Otherwise, return null or a 204 No Content response.
    return authedFetch(`${API_BASE_URL}/shifts/active`).then(async res => {
        if (res.status === 204 || res.status === 404) return null;
        return handleResponse<Shift>(res);
    });
}

export const startShift = (): Promise<Shift> => {
    // BACKEND LOGIC:
    // 1. Check if there is already an active shift (a shift with `endTime` as NULL). If so, return an error.
    // 2. Get the current state of all balances.
    // 3. Create a new `Shift` record with:
    //    - `startTime`: current timestamp.
    //    - `endTime`: NULL.
    //    - `startingBalances`: a JSON snapshot of the current balances (e.g., `{"USD": 1000.00, "USDT": 5000.00, "UZS": 12500000.00}`).
    // 4. Return the newly created shift object.
    return authedFetch(`${API_BASE_URL}/shifts/start`, { method: 'POST' }).then(res => handleResponse<Shift>(res));
};

export const endShift = (): Promise<Shift> => {
    // BACKEND LOGIC (This is a critical, complex operation):
    // 1. Find the active shift (`endTime` is NULL). If none exists, return an error.
    // 2. Get all transactions and expenses that occurred between the shift's `startTime` and now.
    // 3. Calculate `grossProfit`: Sum of `profit` from all 'sell' transactions within the shift period.
    // 4. Calculate `totalExpenses`: Sum of `amountUsd` from all expenses within the shift period.
    // 5. Calculate `netProfit`: `grossProfit - totalExpenses`.
    // 6. Get the current state of all balances and save it as a JSON snapshot in `endingBalances`.
    // 7. Update the active shift record with all calculated values (`grossProfit`, `totalExpenses`, `netProfit`, `endingBalances`, and set `endTime` to the current timestamp).
    // 8. Return the updated (now closed) shift object.
    return authedFetch(`${API_BASE_URL}/shifts/end`, { method: 'POST' }).then(res => handleResponse<Shift>(res));
}

// --- Safe/Capital Management ---
export const createDeposit = (data: { currency: Currency; amount: number; rate?: number; note?: string }): Promise<Transaction> => {
    // BACKEND LOGIC:
    // 1. In a single database transaction:
    //    a. Update the corresponding balance record in the `balances` table, increasing `amount` and `availableAmount`.
    //    b. Create a new `Transaction` record with `operationType: 'deposit'`.
    //    c. **CRITICAL for FIFO**: If the currency is USDT, the `rate` is mandatory. The new transaction's `remainingAmount` field must be set to the deposit `amount`. This "lot" will be used for future profit calculation.
    // 2. Return the newly created transaction object.
    return authedFetch(`${API_BASE_URL}/safe/deposit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    }).then(res => handleResponse<Transaction>(res));
};

export const createWithdrawal = (data: { currency: Currency; amount: number; note?: string }): Promise<Transaction> => {
    // BACKEND LOGIC:
    // 1. Check if the `availableAmount` in the corresponding balance is sufficient for the withdrawal. If not, return an error.
    // 2. In a single database transaction:
    //    a. Update the balance record, decreasing `amount` and `availableAmount`.
    //    b. Create a new `Transaction` record with `operationType: 'withdrawal'`.
    // 3. Return the newly created transaction object.
    return authedFetch(`${API_BASE_URL}/safe/withdrawal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    }).then(res => handleResponse<Transaction>(res));
};

// --- Expenses ---
export const createExpense = (newExpenseData: Omit<Expense, 'id' | 'createdAt' | 'amountUsd'>): Promise<Expense> => {
    // BACKEND LOGIC:
    // 1. Get the active shift. If none, return an error.
    // 2. In a single database transaction:
    //    a. Determine the currency (USD or UZS).
    //    b. Check if the balance for that currency is sufficient. If not, return an error.
    //    c. Decrease the balance (`amount` and `availableAmount`).
    //    d. Calculate `amountUsd`. If currency is 'USD', it's the same as `amount`. If 'UZS', calculate it using `amount / uzsRate`.
    //    e. Create a new `Expense` record, linking it to the active shift and saving all data, including the calculated `amountUsd`.
    // 3. Return the newly created expense object.
    return authedFetch(`${API_BASE_URL}/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newExpenseData),
    }).then(res => handleResponse<Expense>(res));
};

export const updateExpense = (updatedExpenseData: Expense): Promise<Expense> => {
    // BACKEND LOGIC (This must be an ATOMIC operation):
    // 1. Get the active shift. If none, return an error.
    // 2. Find the original expense record in the database.
    // 3. In a single database transaction:
    //    a. **Revert**: Add the original expense `amount` back to the original currency's balance.
    //    b. **Apply New**: Check if the new currency balance is sufficient for the new `amount`. If not, fail the transaction.
    //    c. **Deduct**: Subtract the new `amount` from the new currency's balance.
    //    d. **Recalculate**: Calculate the new `amountUsd` based on the new data.
    //    e. **Update**: Update the expense record in the database with all the new data.
    // 4. If any step fails, the entire database transaction must be rolled back.
    // 5. Return the updated expense object.
    return authedFetch(`${API_BASE_URL}/expenses/${updatedExpenseData.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedExpenseData),
    }).then(res => handleResponse<Expense>(res));
};

// --- Transactions ---
type CreateTransactionData = Omit<Transaction, 'id' | 'createdAt' | 'status' | 'totalAmount' | 'totalAmountUzs' | 'profit' | 'remainingAmount'>;

export const createTransaction = (newTxData: CreateTransactionData): Promise<Transaction> => {
    // BACKEND LOGIC (Most complex endpoint, requires a robust database transaction):
    // 1. Get the active shift. If none, return an error.
    // 2. **VALIDATE BALANCES**:
    //    - For 'buy': Check if USD and/or UZS balances are sufficient based on `paymentCurrency` and amounts (`paidAmountUsd`, `paidAmountUzs`).
    //    - For 'sell': Check if the balance of the currency being sold is sufficient.
    // 3. **PROFIT CALCULATION (for 'sell' operations, especially USDT)**:
    //    a. If selling USDT, implement the FIFO (First-In, First-Out) logic:
    //    b. Find all 'buy' and 'deposit' transactions for USDT with `remainingAmount > 0`, ordered by `createdAt` (oldest first).
    //    c. Iterate through these "lots", subtracting from their `remainingAmount` to cover the current sale amount.
    //    d. For each portion taken from a lot, calculate its cost basis (`amount_taken * lot_rate`). Sum these up to get the `totalCost`.
    //    e. Calculate proceeds from the current sale: `newTxData.amount * newTxData.rate`.
    //    f. Calculate profit: `profit = proceeds - totalCost`.
    //    g. The updates to the `remainingAmount` of the source 'buy'/'deposit' transactions MUST be part of the main database transaction.
    // 4. **DATABASE TRANSACTION**:
    //    a. Debit/Credit all relevant balances (USD, UZS, and the target currency).
    //    b. For a 'buy' of USDT, set the new transaction's `remainingAmount` equal to its `amount`.
    //    c. Insert the new transaction record with all data, including the calculated `profit` (if any).
    //    d. Commit the transaction. If any part fails, roll it all back.
    // 5. Return the newly created transaction object.
    return authedFetch(`${API_BASE_URL}/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTxData),
    }).then(res => handleResponse<Transaction>(res));
};
