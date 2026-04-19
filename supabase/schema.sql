-- Run once in Supabase SQL editor

CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  amount_paise BIGINT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  category TEXT,
  payment_mode TEXT,
  party TEXT,
  description TEXT,
  date DATE NOT NULL,
  gst_applicable BOOLEAN DEFAULT false,
  gst_rate_pct INTEGER DEFAULT 0,
  gst_amount_paise BIGINT DEFAULT 0,
  confidence FLOAT,
  raw_input TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name TEXT NOT NULL,
  items JSONB NOT NULL,
  subtotal_paise BIGINT NOT NULL,
  gst_rate_pct INTEGER DEFAULT 18,
  gst_amount_paise BIGINT NOT NULL,
  total_amount_paise BIGINT NOT NULL,
  currency TEXT DEFAULT 'INR',
  date DATE NOT NULL,
  raw_input TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security (enable for production)
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
