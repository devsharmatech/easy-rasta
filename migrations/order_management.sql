-- ====================================================
-- ORDER MANAGEMENT ENHANCEMENTS
-- ====================================================

-- Add tracking number to orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_number varchar;

-- Order activity logs (audit trail)
CREATE TABLE IF NOT EXISTS order_logs (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
    action varchar NOT NULL, -- status_change, payment_update, tracking_added, note_added
    old_value varchar,
    new_value varchar,
    message text,
    performed_by uuid REFERENCES users(id),
    created_at timestamptz DEFAULT now()
);

-- Add suspended field to rider_profiles if not exists
ALTER TABLE rider_profiles ADD COLUMN IF NOT EXISTS suspended boolean DEFAULT false;

-- Vendor activity logs (audit trail)
CREATE TABLE IF NOT EXISTS vendor_logs (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_id uuid REFERENCES vendor_profiles(id) ON DELETE CASCADE,
    action varchar NOT NULL, -- verification_change, account_status, note_added
    old_value varchar,
    new_value varchar,
    message text,
    performed_by uuid REFERENCES users(id),
    created_at timestamptz DEFAULT now()
);

-- Product activity logs (audit trail)
CREATE TABLE IF NOT EXISTS product_logs (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id uuid REFERENCES products(id) ON DELETE CASCADE,
    action varchar NOT NULL, -- product_created, stock_update, price_change, status_change, product_updated
    old_value varchar,
    new_value varchar,
    message text,
    performed_by uuid REFERENCES users(id),
    created_at timestamptz DEFAULT now()
);
