-- Migration: Add SOS Number and Live Location Sharing

-- 1. Add sos_number to users table
ALTER TABLE users ADD COLUMN sos_number varchar;

-- 2. Create live_location_shares table
CREATE TABLE live_location_shares (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid REFERENCES users(id) ON DELETE CASCADE,
    shared_with varchar NOT NULL, -- User ID or identifier of the person it's shared with
    share_token varchar UNIQUE NOT NULL,
    expires_at timestamptz NOT NULL,
    status varchar DEFAULT 'active', -- active, inactive
    created_at timestamptz DEFAULT now()
);

-- Note: RLS policies can be added if needed, but the primary interactions 
-- will be via server-side secure admin APIs. Use the Firebase DB 
-- specifically for live real-time coordinate syncing.
