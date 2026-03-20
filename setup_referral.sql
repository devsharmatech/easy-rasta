-- Add new columns for referral system
ALTER TABLE users ADD COLUMN my_code varchar UNIQUE;
ALTER TABLE users ADD COLUMN friend_code varchar;

-- Insert XP rule for referral bonus
INSERT INTO xp_rules (action_key, category, description, xp_value, max_per_day) VALUES
('referral_bonus', 'social', 'Rider earns 100 XP for referring a new rider.', 100, NULL)
ON CONFLICT (action_key) DO NOTHING;

-- Function to perfectly generate pseudo-random 8-char codes for existing users
CREATE OR REPLACE FUNCTION generate_referral_codes() RETURNS void AS $$
DECLARE
    u RECORD;
    new_code VARCHAR;
BEGIN
    FOR u IN SELECT id FROM users WHERE my_code IS NULL LOOP
        -- Generate 8 character random string
        new_code := upper(substr(md5(random()::text), 1, 8));
        
        -- Ensure uniqueness
        WHILE EXISTS(SELECT 1 FROM users WHERE my_code = new_code) LOOP
            new_code := upper(substr(md5(random()::text), 1, 8));
        END LOOP;

        UPDATE users SET my_code = new_code WHERE id = u.id;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Execute the generated function to backfill existing users
SELECT generate_referral_codes();
