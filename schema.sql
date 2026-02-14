-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ====================================================
-- ENUMS
-- ====================================================
CREATE TYPE user_role AS ENUM ('admin', 'vendor', 'rider');
CREATE TYPE verification_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE business_category AS ENUM ('fuel', 'food', 'repair', 'toilet', 'other');
CREATE TYPE restroom_type AS ENUM ('free', 'paid');
CREATE TYPE vehicle_type AS ENUM ('bike', 'car');
CREATE TYPE ride_status AS ENUM ('active', 'completed');
CREATE TYPE event_type AS ENUM ('free', 'paid');
CREATE TYPE event_status AS ENUM ('draft', 'published', 'closed');

-- ====================================================
-- GLOBAL USER SYSTEM
-- ====================================================
CREATE TABLE users (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name varchar NOT NULL,
    email varchar UNIQUE,
    mobile varchar UNIQUE,
    password_hash text,
    role user_role NOT NULL,
    is_active boolean DEFAULT true,
    is_verified boolean DEFAULT false,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- OTP Logs
CREATE TABLE otp_logs (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    mobile varchar NOT NULL,
    otp_code varchar NOT NULL,
    expires_at timestamptz NOT NULL,
    is_verified boolean DEFAULT false,
    created_at timestamptz DEFAULT now()
);

-- ====================================================
-- VENDOR SYSTEM
-- ====================================================
CREATE TABLE vendor_profiles (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid REFERENCES users(id) ON DELETE CASCADE,
    gst_number varchar,
    gst_document_url text,
    pan_document_url text,
    other_document_url text,
    verification_status verification_status DEFAULT 'pending',
    total_views int DEFAULT 0,
    today_views int DEFAULT 0,
    average_rating numeric DEFAULT 0,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(user_id)
);

CREATE TABLE vendor_businesses (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_id uuid REFERENCES vendor_profiles(id) ON DELETE CASCADE,
    business_name varchar NOT NULL,
    category business_category NOT NULL,
    latitude numeric NOT NULL,
    longitude numeric NOT NULL,
    landmark text,
    logo_url text,
    featured_image_url text,
    restroom_available boolean DEFAULT false,
    restroom_type restroom_type,
    open_time time,
    close_time time,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE vendor_services (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id uuid REFERENCES vendor_businesses(id) ON DELETE CASCADE,
    name varchar NOT NULL,
    price numeric NOT NULL,
    discounted_price numeric,
    quantity_label varchar, -- e.g., '1 Litre', '1 Plate'
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE business_offers (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id uuid REFERENCES vendor_businesses(id) ON DELETE CASCADE,
    percentage_discount numeric,
    discount_amount numeric,
    duration text,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE amenities_master (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    name varchar NOT NULL,
    icon_url text,
    category varchar,
    is_active boolean DEFAULT true
);

CREATE TABLE business_amenities (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id uuid REFERENCES vendor_businesses(id) ON DELETE CASCADE,
    amenity_id uuid REFERENCES amenities_master(id) ON DELETE CASCADE
);

-- ====================================================
-- RIDER SYSTEM
-- ====================================================
CREATE TABLE rider_profiles (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid REFERENCES users(id) ON DELETE CASCADE,
    referral_code varchar UNIQUE,
    xp int DEFAULT 0,
    level int DEFAULT 1,
    total_rides int DEFAULT 0,
    total_distance numeric DEFAULT 0,
    avg_speed numeric DEFAULT 0,
    created_at timestamptz DEFAULT now(),
    UNIQUE(user_id)
);

CREATE TABLE vehicles (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    rider_id uuid REFERENCES rider_profiles(id) ON DELETE CASCADE,
    nickname varchar,
    type vehicle_type NOT NULL,
    make varchar,
    model varchar,
    year int,
    fuel_type varchar,
    health_status varchar,
    document_url text,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE rides (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    rider_id uuid REFERENCES rider_profiles(id) ON DELETE CASCADE,
    vehicle_id uuid REFERENCES vehicles(id) ON DELETE SET NULL,
    ride_name varchar,
    start_lat numeric,
    start_long numeric,
    end_lat numeric,
    end_long numeric,
    total_distance numeric DEFAULT 0,
    avg_speed numeric DEFAULT 0,
    duration_minutes int DEFAULT 0,
    status ride_status DEFAULT 'active',
    created_at timestamptz DEFAULT now()
);

CREATE TABLE ride_locations (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    ride_id uuid REFERENCES rides(id) ON DELETE CASCADE,
    latitude numeric NOT NULL,
    longitude numeric NOT NULL,
    speed numeric,
    recorded_at timestamptz DEFAULT now()
);

-- ====================================================
-- EVENTS SYSTEM
-- ====================================================
CREATE TABLE events (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    rider_id uuid REFERENCES rider_profiles(id) ON DELETE CASCADE, -- Creator
    title varchar NOT NULL,
    description text,
    date date NOT NULL,
    time time NOT NULL,
    meeting_lat numeric NOT NULL,
    meeting_long numeric NOT NULL,
    end_lat numeric,
    end_long numeric,
    ride_type varchar,
    difficulty varchar,
    route_image text,
    featured_image text,
    total_distance numeric,
    event_type event_type DEFAULT 'free',
    fee numeric DEFAULT 0,
    status event_status DEFAULT 'draft',
    created_at timestamptz DEFAULT now()
);

CREATE TABLE event_stops (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id uuid REFERENCES events(id) ON DELETE CASCADE,
    stop_name varchar NOT NULL,
    stop_time time,
    description text
);

CREATE TABLE event_participants (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id uuid REFERENCES events(id) ON DELETE CASCADE,
    rider_id uuid REFERENCES rider_profiles(id) ON DELETE CASCADE,
    joined_at timestamptz DEFAULT now(),
    UNIQUE(event_id, rider_id)
);

-- ====================================================
-- REVIEWS SYSTEM
-- ====================================================
CREATE TABLE vendor_reviews (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id uuid REFERENCES vendor_businesses(id) ON DELETE CASCADE,
    rider_id uuid REFERENCES rider_profiles(id) ON DELETE CASCADE,
    rating int CHECK (rating BETWEEN 1 AND 5),
    review text,
    vendor_reply text,
    created_at timestamptz DEFAULT now()
);

-- ====================================================
-- XP SYSTEM
-- ====================================================
CREATE TABLE xp_rules (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    action_key varchar UNIQUE NOT NULL,
    category varchar,
    description text,
    xp_value int NOT NULL,
    max_per_day int,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE xp_levels (
    level int PRIMARY KEY,
    xp_required int NOT NULL,
    title varchar NOT NULL,
    description text
);

CREATE TABLE xp_transactions (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    rider_id uuid REFERENCES rider_profiles(id) ON DELETE CASCADE,
    action_key varchar NOT NULL,
    xp_earned int NOT NULL,
    reference_id uuid, -- Can link to ride_id, event_id, etc.
    created_at timestamptz DEFAULT now()
);

-- ====================================================
-- FUNCTIONS
-- ====================================================

-- Update Rider Level Function
CREATE OR REPLACE FUNCTION update_rider_level(target_rider_id uuid)
RETURNS void AS $$
DECLARE
    total_xp int;
    new_level int;
BEGIN
    SELECT xp INTO total_xp FROM rider_profiles WHERE id = target_rider_id;
    
    SELECT level INTO new_level 
    FROM xp_levels 
    WHERE xp_required <= total_xp 
    ORDER BY level DESC 
    LIMIT 1;

    IF new_level IS NOT NULL THEN
        UPDATE rider_profiles 
        SET level = new_level 
        WHERE id = target_rider_id;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Trigger to handle new user profile creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.role = 'vendor' THEN
        INSERT INTO vendor_profiles (user_id) VALUES (NEW.id);
    ELSIF NEW.role = 'rider' THEN
        INSERT INTO rider_profiles (user_id) VALUES (NEW.id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON users
FOR EACH ROW EXECUTE FUNCTION handle_new_user();


-- ====================================================
-- RLS POLICIES (Simplified for now - Enable ALL for authenticated)
-- In production, these should be strict based on role.
-- ====================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public profiles are viewable by everyone" ON users FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);

-- (Repeat for other tables - omitted for brevity in this initial file, will add detail later)

-- ====================================================
-- SEED DATA
-- ====================================================

-- XP Levels
INSERT INTO xp_levels (level, xp_required, title, description) VALUES
(1, 0, 'New Rider', 'Welcome to the journey'),
(2, 500, 'Street Explorer', 'Getting to know the roads'),
(3, 1500, 'City Cruiser', 'Confident in the city'),
(4, 3000, 'Highway Rider', 'Ready for the long haul'),
(5, 5000, 'Trail Blazer', 'Exploring new paths'),
(6, 8000, 'Road Warrior', 'Experienced and tough'),
(7, 12000, 'Adventure Captain', 'Leading the way'),
(8, 17000, 'Elite Rider', 'Top tier skill'),
(9, 23000, 'Pro Expeditioner', 'Master of expeditions'),
(10, 30000, 'Legendary Rider', 'A living legend');

-- XP Rules
INSERT INTO xp_rules (action_key, category, description, xp_value, max_per_day) VALUES
('ride_distance_per_km', 'ride', 'Rider earns 2 XP for every 1 km completed.', 2, NULL),
('multi_day_ride_bonus', 'ride', 'Bonus XP for riding on consecutive days.', 100, 1),
('join_event', 'event', 'Rider joins a published event.', 100, NULL),
('create_event', 'event', 'Rider creates an event.', 300, 1),
('host_event_10_plus', 'event', 'Event host gets bonus XP if event has more than 10 participants.', 200, 1),
('complete_event_itinerary', 'event', 'Rider completes all itinerary stops in an event.', 150, 1),
('write_review', 'social', 'Rider writes a review for a business.', 20, 5),
('upload_ride_photos', 'social', 'Rider uploads ride images.', 30, 3),
('review_helpful_upvote', 'social', 'Rider receives helpful upvote on review.', 10, 10),
('add_trusted_contacts', 'safety', 'Rider adds emergency contacts.', 50, 1),
('enable_live_tracking', 'safety', 'Rider enables live ride tracking.', 20, 1),
('ten_safe_rides_bonus', 'safety', 'Bonus after completing 10 rides without triggering SOS.', 100, NULL),
('visit_new_facility', 'exploration', 'Rider visits a business for the first time.', 10, 10),
('mark_location_verified', 'contribution', 'Rider verifies location information.', 15, 5);

