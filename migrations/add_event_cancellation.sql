-- Migration to add Event Cancellation support

-- Add cancellation policy fields to events table
ALTER TABLE events 
ADD COLUMN cancellation_policy_type varchar DEFAULT 'default',
ADD COLUMN cancellation_window_hours int DEFAULT 48;

-- Add cancellation tracking fields to event_participants table
ALTER TABLE event_participants
ADD COLUMN is_cancelled boolean DEFAULT false,
ADD COLUMN cancellation_reason text,
ADD COLUMN cancelled_at timestamptz,
ADD COLUMN refund_eligible boolean DEFAULT false,
ADD COLUMN refund_status varchar DEFAULT 'none'; -- none, pending, processed, rejected

-- Add comment for clarity
COMMENT ON COLUMN events.cancellation_policy_type IS 'Type of cancellation policy: default (48h) or custom';
COMMENT ON COLUMN events.cancellation_window_hours IS 'Window in hours before event start for refund eligibility';
