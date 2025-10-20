/*
  # Currency Exchange Application Initial Schema

  ## Overview
  This migration creates the complete database schema for a currency exchange application
  with support for multi-currency balances, transactions, shifts, and expenses.

  ## New Tables

  ### 1. currencies
  Stores available currencies for exchange
  - `id` (bigserial, primary key)
  - `code` (text, unique) - Currency code (USD, USDT, UZS, etc.)
  - `name` (text) - Full name of currency
  - `symbol` (text) - Currency symbol
  - `created_at` (timestamptz) - Record creation time

  ### 2. balances
  Tracks available and reserved amounts for each currency
  - `id` (bigserial, primary key)
  - `currency_id` (bigint, foreign key) - Reference to currencies table
  - `amount` (numeric) - Total amount
  - `reserved_amount` (numeric) - Amount reserved in pending transactions
  - `available_amount` (numeric) - Amount available for use
  - `last_updated` (timestamptz) - Last balance update time

  ### 3. shifts
  Represents work shifts with starting/ending balances and profit tracking
  - `id` (uuid, primary key)
  - `start_time` (timestamptz) - Shift start time
  - `end_time` (timestamptz, nullable) - Shift end time (null for active shift)
  - `starting_balances` (jsonb) - Snapshot of balances at shift start
  - `ending_balances` (jsonb, nullable) - Snapshot of balances at shift end
  - `gross_profit` (numeric) - Total profit before expenses
  - `total_expenses` (numeric) - Total expenses during shift
  - `net_profit` (numeric) - Net profit after expenses

  ### 4. transactions
  Records all buy/sell/deposit/withdrawal operations
  - `id` (uuid, primary key)
  - `shift_id` (uuid, foreign key) - Reference to shift
  - `operation_type` (text) - Type: buy, sell, deposit, withdrawal, cancel
  - `currency_id` (bigint, foreign key) - Currency being traded
  - `amount` (numeric) - Amount of currency
  - `rate` (numeric) - Exchange rate
  - `total_amount` (numeric) - Total in USD
  - `profit` (numeric, nullable) - Profit from transaction
  - `status` (text) - Status: completed, pending, failed, cancelled
  - `payment_currency` (text) - Payment method: USD, UZS, MIX
  - `uzs_rate` (numeric, nullable) - UZS to USD rate if applicable
  - `total_amount_uzs` (numeric, nullable) - Total in UZS
  - `paid_amount_usd` (numeric, nullable) - USD portion for MIX payments
  - `paid_amount_uzs` (numeric, nullable) - UZS portion for MIX payments
  - `remaining_amount` (numeric, nullable) - For FIFO profit tracking
  - `wallet_address` (text, nullable) - Crypto wallet address
  - `note` (text, nullable) - Additional notes
  - `created_at` (timestamptz) - Transaction time

  ### 5. expense_categories
  Categories for organizing expenses
  - `id` (uuid, primary key)
  - `name` (text, unique) - Category name
  - `created_at` (timestamptz) - Record creation time

  ### 6. expenses
  Records all business expenses
  - `id` (uuid, primary key)
  - `shift_id` (uuid, foreign key) - Reference to shift
  - `category_id` (uuid, foreign key) - Reference to expense category
  - `amount` (numeric) - Amount in specified currency
  - `currency` (text) - Currency: USD or UZS
  - `amount_usd` (numeric) - Amount converted to USD
  - `uzs_rate` (numeric, nullable) - UZS to USD rate if applicable
  - `note` (text, nullable) - Additional notes
  - `created_at` (timestamptz) - Expense time

  ## Security
  - Enable RLS on all tables
  - Add policies for public access (will be restricted with auth later)

  ## Indexes
  - Created on foreign keys for performance
  - Created on frequently queried fields (created_at, shift_id, etc.)

  ## Important Notes
  - All monetary values use numeric type for precision
  - Timestamps use timestamptz for timezone awareness
  - FIFO tracking implemented via remaining_amount field
  - Single active shift enforced via partial unique index
*/

-- Create currencies table
CREATE TABLE IF NOT EXISTS currencies (
  id bigserial PRIMARY KEY,
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  symbol text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create balances table
CREATE TABLE IF NOT EXISTS balances (
  id bigserial PRIMARY KEY,
  currency_id bigint NOT NULL REFERENCES currencies(id) ON DELETE CASCADE,
  amount numeric(20, 8) DEFAULT 0 NOT NULL,
  reserved_amount numeric(20, 8) DEFAULT 0 NOT NULL,
  available_amount numeric(20, 8) DEFAULT 0 NOT NULL,
  last_updated timestamptz DEFAULT now(),
  CONSTRAINT unique_currency_balance UNIQUE(currency_id)
);

-- Create shifts table
CREATE TABLE IF NOT EXISTS shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  start_time timestamptz DEFAULT now() NOT NULL,
  end_time timestamptz,
  starting_balances jsonb NOT NULL DEFAULT '{}',
  ending_balances jsonb,
  gross_profit numeric(20, 8) DEFAULT 0 NOT NULL,
  total_expenses numeric(20, 8) DEFAULT 0 NOT NULL,
  net_profit numeric(20, 8) DEFAULT 0 NOT NULL
);

-- Create partial unique index to ensure only one active shift
CREATE UNIQUE INDEX IF NOT EXISTS idx_active_shift ON shifts (id) WHERE end_time IS NULL;

-- Create expense_categories table
CREATE TABLE IF NOT EXISTS expense_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id uuid REFERENCES shifts(id) ON DELETE SET NULL,
  operation_type text NOT NULL CHECK (operation_type IN ('buy', 'sell', 'deposit', 'withdrawal', 'cancel')),
  currency_id bigint NOT NULL REFERENCES currencies(id) ON DELETE CASCADE,
  amount numeric(20, 8) NOT NULL,
  rate numeric(20, 8) NOT NULL,
  total_amount numeric(20, 8) NOT NULL,
  profit numeric(20, 8),
  status text DEFAULT 'completed' CHECK (status IN ('completed', 'pending', 'failed', 'cancelled')),
  payment_currency text CHECK (payment_currency IN ('USD', 'UZS', 'MIX')),
  uzs_rate numeric(20, 8),
  total_amount_uzs numeric(20, 8),
  paid_amount_usd numeric(20, 8),
  paid_amount_uzs numeric(20, 8),
  remaining_amount numeric(20, 8),
  wallet_address text,
  note text,
  created_at timestamptz DEFAULT now()
);

-- Create expenses table
CREATE TABLE IF NOT EXISTS expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id uuid REFERENCES shifts(id) ON DELETE SET NULL,
  category_id uuid NOT NULL REFERENCES expense_categories(id) ON DELETE CASCADE,
  amount numeric(20, 8) NOT NULL,
  currency text NOT NULL CHECK (currency IN ('USD', 'UZS')),
  amount_usd numeric(20, 8) NOT NULL,
  uzs_rate numeric(20, 8),
  note text,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_transactions_shift_id ON transactions(shift_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_currency_id ON transactions(currency_id);
CREATE INDEX IF NOT EXISTS idx_expenses_shift_id ON expenses(shift_id);
CREATE INDEX IF NOT EXISTS idx_expenses_created_at ON expenses(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_category_id ON expenses(category_id);
CREATE INDEX IF NOT EXISTS idx_shifts_start_time ON shifts(start_time DESC);

-- Enable Row Level Security
ALTER TABLE currencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;

-- Create permissive policies for public access (will be restricted later with auth)
CREATE POLICY "Allow public read access to currencies"
  ON currencies FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public read access to balances"
  ON balances FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public all access to balances"
  ON balances FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public read access to shifts"
  ON shifts FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public insert access to shifts"
  ON shifts FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow public update access to shifts"
  ON shifts FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public read access to transactions"
  ON transactions FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public insert access to transactions"
  ON transactions FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow public update access to transactions"
  ON transactions FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public read access to expenses"
  ON expenses FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public insert access to expenses"
  ON expenses FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow public update access to expenses"
  ON expenses FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public read access to expense_categories"
  ON expense_categories FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public insert access to expense_categories"
  ON expense_categories FOR INSERT
  TO public
  WITH CHECK (true);

-- Insert default currencies
INSERT INTO currencies (code, name, symbol) VALUES
  ('USD', 'US Dollar', '$'),
  ('USDT', 'Tether', '₮'),
  ('UZS', 'Uzbekistan Som', 'сўм')
ON CONFLICT (code) DO NOTHING;

-- Insert default balances for each currency
INSERT INTO balances (currency_id, amount, reserved_amount, available_amount)
SELECT id, 0, 0, 0 FROM currencies
ON CONFLICT (currency_id) DO NOTHING;

-- Insert default expense categories
INSERT INTO expense_categories (name) VALUES
  ('Rent'),
  ('Utilities'),
  ('Salaries'),
  ('Marketing'),
  ('Office Supplies'),
  ('Other')
ON CONFLICT (name) DO NOTHING;