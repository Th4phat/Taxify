-- Migration: Add withholding tax, budgets, tax documents, notifications, and optimization tables

-- Add withholding tax columns to transactions
ALTER TABLE transactions ADD COLUMN withholding_tax REAL DEFAULT 0;
ALTER TABLE transactions ADD COLUMN withholding_tax_rate REAL;
ALTER TABLE transactions ADD COLUMN has_withholding_certificate INTEGER DEFAULT 0;

-- Create index for withholding tax queries
CREATE INDEX IF NOT EXISTS transaction_withholding_idx ON transactions(withholding_tax);

-- Create budgets table
CREATE TABLE IF NOT EXISTS budgets (
  id TEXT PRIMARY KEY,
  category_id TEXT REFERENCES categories(id),
  name TEXT NOT NULL,
  amount REAL NOT NULL,
  period TEXT NOT NULL DEFAULT 'monthly',
  start_date INTEGER NOT NULL,
  end_date INTEGER,
  alert_at_percent INTEGER DEFAULT 80,
  alert_sent INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS budget_category_idx ON budgets(category_id);
CREATE INDEX IF NOT EXISTS budget_active_idx ON budgets(is_active);

-- Create tax documents table
CREATE TABLE IF NOT EXISTS tax_documents (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  document_type TEXT NOT NULL,
  file_uri TEXT NOT NULL,
  thumbnail_uri TEXT,
  tax_year INTEGER NOT NULL,
  amount REAL,
  description TEXT,
  tags TEXT,
  issue_date INTEGER,
  expiry_date INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS tax_doc_year_idx ON tax_documents(tax_year);
CREATE INDEX IF NOT EXISTS tax_doc_type_idx ON tax_documents(document_type);

-- Create notification logs table
CREATE TABLE IF NOT EXISTS notification_logs (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  is_read INTEGER DEFAULT 0,
  is_sent INTEGER DEFAULT 0,
  sent_at INTEGER,
  related_id TEXT,
  action_route TEXT,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS notification_type_idx ON notification_logs(type);
CREATE INDEX IF NOT EXISTS notification_read_idx ON notification_logs(is_read);

-- Create tax optimization snapshots table
CREATE TABLE IF NOT EXISTS tax_optimization_snapshots (
  id TEXT PRIMARY KEY,
  tax_year INTEGER NOT NULL,
  current_taxable_income REAL NOT NULL,
  current_tax_amount REAL NOT NULL,
  effective_tax_rate REAL NOT NULL,
  current_bracket_index INTEGER NOT NULL,
  next_bracket_threshold REAL,
  amount_to_next_bracket REAL,
  suggestions TEXT NOT NULL,
  potential_savings REAL DEFAULT 0,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS tax_opt_year_idx ON tax_optimization_snapshots(tax_year);
