-- Add wallet_balance to users table if it doesn't exist
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS wallet_balance NUMERIC(10, 2) DEFAULT 0;

-- Create the `rider_rewards` table
CREATE TABLE IF NOT EXISTS public.rider_rewards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rider_id UUID NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
    reward_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
    reward_type VARCHAR(50) NOT NULL, -- e.g., 'cash', 'coupon', 'points'
    reward_description TEXT,          -- Details of what was won
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Turn on Row Level Security
ALTER TABLE public.rider_rewards ENABLE ROW LEVEL SECURITY;

-- Allow riders to view their own rewards
CREATE POLICY "Riders can view their own rewards"
    ON public.rider_rewards
    FOR SELECT
    USING (auth.uid() = rider_id);

-- Allow riders to insert their own rewards
CREATE POLICY "Riders can insert their own rewards"
    ON public.rider_rewards
    FOR INSERT
    WITH CHECK (auth.uid() = rider_id);
