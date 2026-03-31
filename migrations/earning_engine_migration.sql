-- ============================================================
-- EASY RASTA EARNING ENGINE — DATABASE MIGRATION
-- All amounts are in PAISE (integer). 1 rupee = 100 paise.
-- This migration is SAFE: uses IF NOT EXISTS / ADD COLUMN IF NOT EXISTS.
-- It does NOT drop, rename, or alter existing columns.
-- ============================================================

-- ============================================================
-- 1. SAFE COLUMN EXTENSIONS ON EXISTING TABLES
-- ============================================================

-- users table extensions
ALTER TABLE users ADD COLUMN IF NOT EXISTS trust_score int DEFAULT 100;
ALTER TABLE users ADD COLUMN IF NOT EXISTS scout_status varchar DEFAULT 'active';
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_odometer_reading int DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS referred_by_user_id uuid REFERENCES users(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS device_fingerprint text;
-- wallet_balance already exists (added by add_spin_rewards.sql)
-- referral_code already exists as my_code (added by setup_referral.sql)

-- ============================================================
-- 2. EARNING REWARDS CONFIGURATION (amounts in paise)
-- ============================================================
CREATE TABLE IF NOT EXISTS earning_rewards_config (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    action_key varchar UNIQUE NOT NULL,
    category varchar NOT NULL,
    description text,
    reward_paise int NOT NULL,
    daily_cap_applicable boolean DEFAULT false,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now()
);

-- Seed reward configs
INSERT INTO earning_rewards_config (action_key, category, description, reward_paise, daily_cap_applicable) VALUES
    ('fuel_scout',          'data_action',  'Scout a fuel bunk report',                  1000, true),
    ('fuel_verifier',       'data_action',  'Verify a fuel bunk report',                  500, true),
    ('fuel_corrector',      'data_action',  'Correct a fuel bunk report',                1000, true),
    ('toilet_scout',        'data_action',  'Scout a toilet report',                     1000, true),
    ('toilet_verifier',     'data_action',  'Verify a toilet report',                     500, true),
    ('toilet_corrector',    'data_action',  'Correct a toilet report',                   1000, true),
    ('receipt_upload',      'data_action',  'Upload a valid receipt',                      500, true),
    ('odometer_reading',    'data_action',  'Submit odometer reading',                     500, true),
    ('mileage_milestone',   'data_action',  'Every 1000km milestone',                      500, false),
    ('first_vehicle',       'garage',       'Add first vehicle to garage',               1000, false),
    ('service_oil_bike',    'garage',       'Oil change service (bike)',                   500, false),
    ('service_oil_car',     'garage',       'Oil change service (car)',                    500, false),
    ('service_tyre_bike',   'garage',       'Tyre service (bike)',                         500, false),
    ('service_tyre_car',    'garage',       'Tyre service (car)',                          500, false),
    ('service_general',     'garage',       'General service',                             500, false),
    ('event_checkin',       'event',        'GPS check-in at event',                       500, false),
    ('event_rsvp_creator',  'event',        'Creator earns per RSVP',                      200, false),
    ('event_bonus_10',      'event',        'Bonus for 10 check-ins',                     2000, false),
    ('event_bonus_25',      'event',        'Bonus for 25 check-ins',                     5000, false),
    ('event_bonus_50',      'event',        'Bonus for 50 check-ins',                    10000, false),
    ('referral_referrer',   'referral',     'Referrer reward on first action',            1000, false),
    ('referral_new_user',   'referral',     'New user reward on first action',            1000, false),
    ('bunk_full_profile',   'bunk',         'Complete bunk profile submission',           1500, false),
    ('bunk_amenity',        'bunk',         'New amenity with photo',                      300, false),
    ('bunk_offer_spotted',  'bunk',         'Community-spotted offer',                     500, false),
    ('sponsorship_tier1',   'sponsorship',  'Reimbursement 25-49 check-ins',             75000, false),
    ('sponsorship_tier2',   'sponsorship',  'Reimbursement 50-99 check-ins',            150000, false),
    ('sponsorship_tier3',   'sponsorship',  'Reimbursement 100+ check-ins',             250000, false)
ON CONFLICT (action_key) DO NOTHING;

-- ============================================================
-- 3. EARNING TRANSACTIONS — Central Ledger (amounts in paise)
-- ============================================================
CREATE TABLE IF NOT EXISTS earning_transactions (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action_type varchar NOT NULL,
    amount_paise int NOT NULL,
    status varchar NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'frozen', 'pending', 'reversed')),
    reference_type varchar,          -- 'fuel_report', 'toilet_report', 'receipt', 'odometer', etc.
    reference_id uuid,               -- FK to the specific report/entity
    metadata jsonb DEFAULT '{}'::jsonb,  -- additional context (reason, fraud details, etc.)
    frozen_reason text,              -- if status = 'frozen', why
    created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_earning_tx_user_date ON earning_transactions(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_earning_tx_action ON earning_transactions(action_type);
CREATE INDEX IF NOT EXISTS idx_earning_tx_status ON earning_transactions(status);

-- ============================================================
-- 4. DAILY EARNING CAPS TRACKER
-- ============================================================
CREATE TABLE IF NOT EXISTS daily_earning_caps (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    cap_date date NOT NULL DEFAULT CURRENT_DATE,
    total_earned_paise int NOT NULL DEFAULT 0,
    UNIQUE(user_id, cap_date)
);

-- ============================================================
-- 5. FUEL REPORTS — Chain of Truth
-- ============================================================
CREATE TABLE IF NOT EXISTS fuel_reports (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    bunk_place_id varchar,                 -- references discovered_pumps.place_id
    scout_user_id uuid NOT NULL REFERENCES users(id),
    photo_url text NOT NULL,
    photo_hash text,
    price_petrol numeric,
    price_diesel numeric,
    odometer_reading int,
    receipt_url text,
    receipt_hash text,
    latitude numeric NOT NULL,
    longitude numeric NOT NULL,
    -- Verification status
    status varchar DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'corrected', 'disputed')),
    verified_by_user_id uuid REFERENCES users(id),
    verified_at timestamptz,
    verification_result boolean,          -- true=confirmed, false=disputed
    -- Correction
    corrected_by_user_id uuid REFERENCES users(id),
    corrected_at timestamptz,
    correction_report_id uuid,            -- self-ref to the correction report
    -- Rewards
    scout_reward_tx_id uuid,
    verifier_reward_tx_id uuid,
    corrector_reward_tx_id uuid,
    created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fuel_reports_bunk ON fuel_reports(bunk_place_id);
CREATE INDEX IF NOT EXISTS idx_fuel_reports_status ON fuel_reports(status);
CREATE INDEX IF NOT EXISTS idx_fuel_reports_scout ON fuel_reports(scout_user_id);
CREATE INDEX IF NOT EXISTS idx_fuel_reports_receipt_hash ON fuel_reports(receipt_hash);

-- ============================================================
-- 6. TOILET REPORTS — Chain of Truth
-- ============================================================
CREATE TABLE IF NOT EXISTS toilet_reports (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    location_name text,
    scout_user_id uuid NOT NULL REFERENCES users(id),
    photo_url text NOT NULL,
    photo_hash text,
    hygiene_level varchar CHECK (hygiene_level IN ('clean', 'average', 'dirty')),
    bunk_place_id varchar,                 -- optional: if toilet is at a known bunk
    is_paid boolean DEFAULT false,
    price numeric,                         -- optional: cost if is_paid = true
    latitude numeric NOT NULL,
    longitude numeric NOT NULL,
    -- Verification
    status varchar DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'corrected', 'disputed')),
    verified_by_user_id uuid REFERENCES users(id),
    verified_at timestamptz,
    verification_result boolean,
    -- Correction
    corrected_by_user_id uuid REFERENCES users(id),
    corrected_at timestamptz,
    correction_report_id uuid,
    -- Rewards
    scout_reward_tx_id uuid,
    verifier_reward_tx_id uuid,
    corrector_reward_tx_id uuid,
    created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_toilet_reports_status ON toilet_reports(status);
CREATE INDEX IF NOT EXISTS idx_toilet_reports_scout ON toilet_reports(scout_user_id);

-- ============================================================
-- 7. RECEIPT SUBMISSIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS receipt_submissions (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    photo_url text NOT NULL,
    receipt_hash text NOT NULL,
    bunk_name text,                       -- OCR-extracted or user-provided
    amount_detected numeric,              -- OCR-extracted or user-provided
    timestamp_detected timestamptz,       -- OCR-extracted or user-provided
    latitude numeric NOT NULL,
    longitude numeric NOT NULL,
    target_latitude numeric,              -- bunk location for GPS check
    target_longitude numeric,
    reward_tx_id uuid,
    status varchar DEFAULT 'completed' CHECK (status IN ('completed', 'rejected', 'frozen')),
    rejection_reason text,
    created_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_receipt_hash_unique ON receipt_submissions(receipt_hash);

-- ============================================================
-- 8. ODOMETER SUBMISSIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS odometer_submissions (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    vehicle_id uuid REFERENCES vehicles(id),
    reading int NOT NULL,
    previous_reading int,
    photo_url text,
    ocr_extracted boolean DEFAULT false,
    reward_tx_id uuid,
    milestone_reward_tx_id uuid,          -- if 1000km milestone triggered
    created_at timestamptz DEFAULT now()
);

-- ============================================================
-- 9. REFERRAL ATTRIBUTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS referral_attributions (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    referrer_user_id uuid NOT NULL REFERENCES users(id),
    referred_user_id uuid NOT NULL REFERENCES users(id),
    referral_code varchar NOT NULL,
    status varchar DEFAULT 'pending' CHECK (status IN ('pending', 'activated', 'expired', 'frozen')),
    first_action_at timestamptz,
    first_action_type varchar,
    referrer_reward_tx_id uuid,
    referred_reward_tx_id uuid,
    device_fingerprint_match boolean DEFAULT false,
    phone_match boolean DEFAULT false,
    expires_at timestamptz NOT NULL,      -- 30 days from creation
    chain_depth int DEFAULT 1,            -- max 2 levels
    created_at timestamptz DEFAULT now(),
    UNIQUE(referrer_user_id, referred_user_id)
);

CREATE INDEX IF NOT EXISTS idx_referral_status ON referral_attributions(status);
CREATE INDEX IF NOT EXISTS idx_referral_referred ON referral_attributions(referred_user_id);

-- ============================================================
-- 10. BUNK PROFILES (extended pump data)
-- ============================================================
CREATE TABLE IF NOT EXISTS bunk_profiles (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    place_id varchar UNIQUE,              -- references discovered_pumps.place_id
    brand varchar,
    display_name varchar,
    profile_complete boolean DEFAULT false,
    submitted_by_user_id uuid REFERENCES users(id),
    reward_tx_id uuid,
    last_verified_at timestamptz,
    current_price_petrol numeric,
    current_price_diesel numeric,
    boost_active_until timestamptz,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- ============================================================
-- 11. BUNK AMENITIES (rider-submitted)
-- ============================================================
CREATE TABLE IF NOT EXISTS bunk_amenities (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    bunk_profile_id uuid REFERENCES bunk_profiles(id) ON DELETE CASCADE,
    amenity_type varchar NOT NULL CHECK (amenity_type IN (
        'air_pump', 'ev_charging', 'food', '24hr_open',
        'tyre_repair', 'oil_service', 'car_wash'
    )),
    photo_url text NOT NULL,
    photo_hash text,
    submitted_by_user_id uuid REFERENCES users(id),
    reward_tx_id uuid,
    verified boolean DEFAULT false,
    expires_at timestamptz,               -- food/tyre/oil=90d, 24hr=180d, permanent=null
    created_at timestamptz DEFAULT now()
);

-- ============================================================
-- 12. BUNK OFFERS
-- ============================================================
CREATE TABLE IF NOT EXISTS bunk_offers (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    bunk_profile_id uuid REFERENCES bunk_profiles(id) ON DELETE CASCADE,
    source varchar DEFAULT 'community' CHECK (source IN ('community', 'vendor', 'admin')),
    offer_text text NOT NULL,
    photo_url text,
    photo_hash text,
    ocr_text text,
    submitted_by_user_id uuid REFERENCES users(id),
    reward_tx_id uuid,
    wallet_credited boolean DEFAULT false,
    expires_at timestamptz NOT NULL,      -- auto 7 days from creation
    created_at timestamptz DEFAULT now()
);

-- ============================================================
-- 13. EVENT CHECK-INS
-- ============================================================
CREATE TABLE IF NOT EXISTS event_checkins (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    latitude numeric NOT NULL,
    longitude numeric NOT NULL,
    reward_tx_id uuid,
    created_at timestamptz DEFAULT now(),
    UNIQUE(event_id, user_id)
);

-- ============================================================
-- 14. SPONSORSHIP CLAIMS
-- ============================================================
CREATE TABLE IF NOT EXISTS sponsorship_claims (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tier varchar NOT NULL CHECK (tier IN ('tier1', 'tier2', 'tier3')),
    check_in_count int NOT NULL,
    bill_url text NOT NULL,
    latitude numeric,
    longitude numeric,
    amount_paise int NOT NULL,
    status varchar DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'flagged')),
    admin_approved_by uuid REFERENCES users(id),
    admin_note text,
    reward_tx_id uuid,
    claim_month varchar NOT NULL,         -- 'YYYY-MM' format for monthly cap
    created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sponsorship_user_month ON sponsorship_claims(user_id, claim_month);

-- ============================================================
-- 15. TRUST SCORE LOGS
-- ============================================================
CREATE TABLE IF NOT EXISTS trust_score_logs (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    previous_score int NOT NULL,
    new_score int NOT NULL,
    change_amount int NOT NULL,
    reason text NOT NULL,
    changed_by varchar DEFAULT 'system' CHECK (changed_by IN ('system', 'admin')),
    admin_user_id uuid REFERENCES users(id),
    created_at timestamptz DEFAULT now()
);

-- ============================================================
-- 16. FRAUD FLAGS
-- ============================================================
CREATE TABLE IF NOT EXISTS fraud_flags (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    flag_type varchar NOT NULL,           -- 'gps_mismatch', 'duplicate_receipt', 'duplicate_photo', 'device_match', 'cluster_suspect', etc.
    severity varchar DEFAULT 'low' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    reference_type varchar,
    reference_id uuid,
    details jsonb DEFAULT '{}'::jsonb,
    resolved boolean DEFAULT false,
    resolved_by uuid REFERENCES users(id),
    resolved_at timestamptz,
    created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fraud_flags_user ON fraud_flags(user_id);
CREATE INDEX IF NOT EXISTS idx_fraud_flags_unresolved ON fraud_flags(resolved) WHERE resolved = false;

-- ============================================================
-- 17. SERVICE REWARD TRACKING (for garage service intervals)
-- ============================================================
CREATE TABLE IF NOT EXISTS service_reward_claims (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    vehicle_id uuid NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    service_type varchar NOT NULL CHECK (service_type IN ('oil_bike', 'oil_car', 'tyre_bike', 'tyre_car', 'general')),
    bill_photo_url text NOT NULL,
    reward_tx_id uuid,
    created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_service_reward_user_type ON service_reward_claims(user_id, service_type, created_at);

-- ============================================================
-- 18. RLS POLICIES FOR ALL NEW TABLES
-- ============================================================

-- earning_transactions
ALTER TABLE earning_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own earning transactions" ON earning_transactions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Service role manages earning transactions" ON earning_transactions FOR ALL USING (auth.role() = 'service_role');

-- daily_earning_caps
ALTER TABLE daily_earning_caps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own caps" ON daily_earning_caps FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Service role manages caps" ON daily_earning_caps FOR ALL USING (auth.role() = 'service_role');

-- fuel_reports
ALTER TABLE fuel_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Fuel reports viewable by authenticated" ON fuel_reports FOR SELECT TO authenticated USING (true);
CREATE POLICY "Service role manages fuel reports" ON fuel_reports FOR ALL USING (auth.role() = 'service_role');

-- toilet_reports
ALTER TABLE toilet_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Toilet reports viewable by authenticated" ON toilet_reports FOR SELECT TO authenticated USING (true);
CREATE POLICY "Service role manages toilet reports" ON toilet_reports FOR ALL USING (auth.role() = 'service_role');

-- receipt_submissions
ALTER TABLE receipt_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own receipts" ON receipt_submissions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Service role manages receipts" ON receipt_submissions FOR ALL USING (auth.role() = 'service_role');

-- odometer_submissions
ALTER TABLE odometer_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own odometer" ON odometer_submissions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Service role manages odometer" ON odometer_submissions FOR ALL USING (auth.role() = 'service_role');

-- referral_attributions
ALTER TABLE referral_attributions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own referrals" ON referral_attributions FOR SELECT USING (
    referrer_user_id = auth.uid() OR referred_user_id = auth.uid()
);
CREATE POLICY "Service role manages referrals" ON referral_attributions FOR ALL USING (auth.role() = 'service_role');

-- bunk_profiles
ALTER TABLE bunk_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Bunk profiles viewable by everyone" ON bunk_profiles FOR SELECT USING (true);
CREATE POLICY "Service role manages bunk profiles" ON bunk_profiles FOR ALL USING (auth.role() = 'service_role');

-- bunk_amenities
ALTER TABLE bunk_amenities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Bunk amenities viewable by everyone" ON bunk_amenities FOR SELECT USING (true);
CREATE POLICY "Service role manages bunk amenities" ON bunk_amenities FOR ALL USING (auth.role() = 'service_role');

-- bunk_offers
ALTER TABLE bunk_offers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Bunk offers viewable by everyone" ON bunk_offers FOR SELECT USING (true);
CREATE POLICY "Service role manages bunk offers" ON bunk_offers FOR ALL USING (auth.role() = 'service_role');

-- event_checkins
ALTER TABLE event_checkins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own checkins" ON event_checkins FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Service role manages checkins" ON event_checkins FOR ALL USING (auth.role() = 'service_role');

-- sponsorship_claims
ALTER TABLE sponsorship_claims ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own sponsorship" ON sponsorship_claims FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Service role manages sponsorship" ON sponsorship_claims FOR ALL USING (auth.role() = 'service_role');

-- trust_score_logs
ALTER TABLE trust_score_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own trust logs" ON trust_score_logs FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Service role manages trust logs" ON trust_score_logs FOR ALL USING (auth.role() = 'service_role');

-- fraud_flags
ALTER TABLE fraud_flags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view fraud flags" ON fraud_flags FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Service role manages fraud flags" ON fraud_flags FOR ALL USING (auth.role() = 'service_role');

-- service_reward_claims
ALTER TABLE service_reward_claims ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own service rewards" ON service_reward_claims FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Service role manages service rewards" ON service_reward_claims FOR ALL USING (auth.role() = 'service_role');

-- earning_rewards_config (public read)
ALTER TABLE earning_rewards_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Config readable by everyone" ON earning_rewards_config FOR SELECT USING (true);
CREATE POLICY "Admins manage config" ON earning_rewards_config FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);
