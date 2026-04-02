-- ============================================================
-- LOCATION VERIFICATION ENGINE MIGRATION
-- Adds tracking columns to vendor_businesses table
-- ============================================================

-- Track when this location was last verified (set on approval + verifications)
ALTER TABLE vendor_businesses ADD COLUMN IF NOT EXISTS last_verified_at timestamptz;

-- Track who originally scouted/submitted this location (rider user_id)
ALTER TABLE vendor_businesses ADD COLUMN IF NOT EXISTS submitted_by_user_id uuid REFERENCES users(id);

-- Link to the scout reward earning_transaction
ALTER TABLE vendor_businesses ADD COLUMN IF NOT EXISTS scout_reward_tx_id uuid;

-- Extend location_requests to track hygiene_level strictly for washrooms
ALTER TABLE location_requests ADD COLUMN IF NOT EXISTS hygiene_level varchar(50) CHECK (hygiene_level IN ('clean', 'average', 'dirty'));

-- Index for the 24h cron verification loop
CREATE INDEX IF NOT EXISTS idx_vb_last_verified
    ON vendor_businesses(last_verified_at)
    WHERE is_active = true AND deleted_at IS NULL;
