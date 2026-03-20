-- 1. Create System Settings Table
CREATE TABLE IF NOT EXISTS system_settings (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    key varchar UNIQUE NOT NULL,
    value jsonb NOT NULL,
    description text,
    updated_at timestamptz DEFAULT now()
);

-- Insert default cashback percentages (5% for all as base)
INSERT INTO system_settings (key, value, description) 
VALUES ('cashback_percentages', '{"fuel": 5, "service": 5, "washroom": 5, "other": 5}'::jsonb, 'Cashback percentage configurations for rider expenses')
ON CONFLICT (key) DO NOTHING;

-- 2. Add Wallet Balance to Rider Profiles
ALTER TABLE rider_profiles ADD COLUMN IF NOT EXISTS wallet_balance numeric DEFAULT 0;

-- 3. Create Rider Expenses Table
CREATE TABLE IF NOT EXISTS rider_expenses (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    rider_id uuid REFERENCES rider_profiles(id) ON DELETE CASCADE,
    vehicle_id uuid REFERENCES vehicles(id) ON DELETE SET NULL,
    type varchar NOT NULL CHECK (type IN ('fuel', 'service', 'washroom', 'other')),
    amount numeric NOT NULL CHECK (amount > 0),
    description text,
    image text,
    latitude numeric NOT NULL,
    longitude numeric NOT NULL,
    -- Fuel specific fields
    fuel_type varchar,
    price_per_liter numeric,
    quantity numeric,
    -- Status
    status varchar DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 4. Create Wallet Transactions Table
CREATE TABLE IF NOT EXISTS wallet_transactions (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    rider_id uuid REFERENCES rider_profiles(id) ON DELETE CASCADE,
    amount numeric NOT NULL,
    type varchar NOT NULL CHECK (type IN ('credit', 'debit')),
    description text,
    reference_id uuid, -- Link to rider_expenses.id or other source
    created_at timestamptz DEFAULT now()
);

-- 5. Enable RLS and Policies for rider_expenses
ALTER TABLE rider_expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Riders manage own expenses" ON rider_expenses FOR ALL USING (
    EXISTS (SELECT 1 FROM rider_profiles WHERE id = rider_id AND user_id = auth.uid())
);
CREATE POLICY "Admins view all expenses" ON rider_expenses FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins update all expenses" ON rider_expenses FOR UPDATE USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- 6. Enable RLS and Policies for wallet_transactions
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Riders view own wallet transactions" ON wallet_transactions FOR SELECT USING (
    EXISTS (SELECT 1 FROM rider_profiles WHERE id = rider_id AND user_id = auth.uid())
);
CREATE POLICY "Admins manage wallet transactions" ON wallet_transactions FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- 7. RLS for System Settings
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read settings" ON system_settings FOR SELECT USING (true);
CREATE POLICY "Admins manage settings" ON system_settings FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);
