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
    device_token text, -- For Firebase Notifications
    profile_image_url text,
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
    deleted_at timestamptz DEFAULT null, -- Soft delete (trash bin)
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
-- REVIEWS & REPORTS
-- ====================================================
CREATE TABLE vendor_reviews (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id uuid REFERENCES vendor_businesses(id) ON DELETE CASCADE,
    rider_id uuid REFERENCES rider_profiles(id) ON DELETE CASCADE,
    rating int NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review text,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE review_reports (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    review_id uuid REFERENCES vendor_reviews(id) ON DELETE CASCADE,
    reported_by uuid REFERENCES users(id) ON DELETE CASCADE,
    reason text NOT NULL,
    status varchar DEFAULT 'pending', -- pending, reviewed, dismissed
    created_at timestamptz DEFAULT now()
);

CREATE TABLE rider_notices (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    rider_user_id uuid REFERENCES users(id) ON DELETE CASCADE,
    type varchar NOT NULL, -- review_violation, review_warning, general
    title varchar NOT NULL,
    message text NOT NULL,
    is_read boolean DEFAULT false,
    sent_by uuid REFERENCES users(id),
    created_at timestamptz DEFAULT now()
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
    updated_at timestamptz DEFAULT now(),
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
    image_url text,
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
    vehicle_id uuid REFERENCES vehicles(id),
    consent_safety boolean DEFAULT false,
    consent_liability boolean DEFAULT false,
    payment_id uuid,  -- References event_payments.id
    joined_at timestamptz DEFAULT now(),
    UNIQUE(event_id, rider_id)
);

CREATE TABLE event_payments (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id uuid REFERENCES events(id) ON DELETE CASCADE,
    rider_id uuid REFERENCES rider_profiles(id) ON DELETE CASCADE,
    razorpay_order_id varchar NOT NULL,
    razorpay_payment_id varchar,
    razorpay_signature varchar,
    amount numeric NOT NULL,
    currency varchar DEFAULT 'INR',
    status varchar DEFAULT 'created', -- created, paid, failed, refunded
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
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
-- RLS POLICIES
-- ====================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public profiles are viewable by everyone" ON users FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);

ALTER TABLE vendor_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Vendor profiles viewable by everyone" ON vendor_profiles FOR SELECT USING (true);
CREATE POLICY "Vendors update own profile" ON vendor_profiles FOR UPDATE USING (auth.uid() = user_id);

ALTER TABLE vendor_businesses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Businesses viewable by everyone" ON vendor_businesses FOR SELECT USING (true);
CREATE POLICY "Vendors insert own business" ON vendor_businesses FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM vendor_profiles WHERE id = vendor_id AND user_id = auth.uid())
);
CREATE POLICY "Vendors update own business" ON vendor_businesses FOR UPDATE USING (
    EXISTS (SELECT 1 FROM vendor_profiles WHERE id = vendor_id AND user_id = auth.uid())
);

ALTER TABLE vendor_services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Services viewable by everyone" ON vendor_services FOR SELECT USING (true);
CREATE POLICY "Vendors manage own services" ON vendor_services FOR ALL USING (
    EXISTS (
        SELECT 1 FROM vendor_businesses vb
        JOIN vendor_profiles vp ON vb.vendor_id = vp.id
        WHERE vb.id = business_id AND vp.user_id = auth.uid()
    )
);

ALTER TABLE business_offers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Offers viewable by everyone" ON business_offers FOR SELECT USING (true);
CREATE POLICY "Vendors manage own offers" ON business_offers FOR ALL USING (
    EXISTS (
        SELECT 1 FROM vendor_businesses vb
        JOIN vendor_profiles vp ON vb.vendor_id = vp.id
        WHERE vb.id = business_id AND vp.user_id = auth.uid()
    )
);

ALTER TABLE rider_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Rider profiles viewable by authenticated" ON rider_profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Riders update own profile" ON rider_profiles FOR UPDATE USING (auth.uid() = user_id);

ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Riders view own vehicles" ON vehicles FOR SELECT USING (
    EXISTS (SELECT 1 FROM rider_profiles WHERE id = rider_id AND user_id = auth.uid())
);
CREATE POLICY "Riders manage own vehicles" ON vehicles FOR ALL USING (
    EXISTS (SELECT 1 FROM rider_profiles WHERE id = rider_id AND user_id = auth.uid())
);

ALTER TABLE rides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Riders view own rides" ON rides FOR SELECT USING (
    EXISTS (SELECT 1 FROM rider_profiles WHERE id = rider_id AND user_id = auth.uid())
);
CREATE POLICY "Riders insert own rides" ON rides FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM rider_profiles WHERE id = rider_id AND user_id = auth.uid())
);
CREATE POLICY "Riders update own rides" ON rides FOR UPDATE USING (
    EXISTS (SELECT 1 FROM rider_profiles WHERE id = rider_id AND user_id = auth.uid())
);

ALTER TABLE events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Events viewable by everyone" ON events FOR SELECT USING (true);
CREATE POLICY "Riders manage own events" ON events FOR ALL USING (
    EXISTS (SELECT 1 FROM rider_profiles WHERE id = rider_id AND user_id = auth.uid())
);

ALTER TABLE event_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants viewable by everyone" ON event_participants FOR SELECT USING (true);
CREATE POLICY "Riders manage participation" ON event_participants FOR ALL USING (
    EXISTS (SELECT 1 FROM rider_profiles WHERE id = rider_id AND user_id = auth.uid())
);

ALTER TABLE vendor_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Reviews viewable by everyone" ON vendor_reviews FOR SELECT USING (true);
CREATE POLICY "Riders create reviews" ON vendor_reviews FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM rider_profiles WHERE id = rider_id AND user_id = auth.uid())
);

-- ====================================================
-- SEED DATA
-- ====================================================

-- Admin User Seed
-- Password: Admin@123
-- Hash: $2b$10$N0xy2246yXayIQCprLBHfeDNBoeplMMFxmU/i9L0cDi2oKhDsTVma
INSERT INTO users (full_name, email, password_hash, role, is_active, is_verified)
VALUES ('Admin', 'admin@gmail.com', '$2b$10$N0xy2246yXayIQCprLBHfeDNBoeplMMFxmU/i9L0cDi2oKhDsTVma', 'admin', true, true)
ON CONFLICT (email) DO NOTHING;

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
(10, 30000, 'Legendary Rider', 'A living legend')
ON CONFLICT (level) DO NOTHING;

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
('mark_location_verified', 'contribution', 'Rider verifies location information.', 15, 5)
ON CONFLICT (action_key) DO NOTHING;


-- ====================================================
-- E-COMMERCE SYSTEM (Added for Rider Products)
-- ====================================================
CREATE TABLE products (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    name varchar NOT NULL,
    description text,
    price numeric NOT NULL,
    image_url text,
    stock int DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Products viewable by everyone" ON products FOR SELECT USING (true);
CREATE POLICY "Admins manage products" ON products FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);
-- ====================================================
-- PRODUCTS & ORDERS SYSTEM
-- ====================================================
CREATE TABLE products (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    name varchar NOT NULL,
    description text,
    price numeric NOT NULL,
    image_url text,
    category varchar,
    stock int DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE cart_items (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    rider_id uuid REFERENCES rider_profiles(id) ON DELETE CASCADE,
    product_id uuid REFERENCES products(id) ON DELETE CASCADE,
    quantity int DEFAULT 1,
    created_at timestamptz DEFAULT now(),
    UNIQUE(rider_id, product_id)
);

CREATE TABLE delivery_addresses (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid REFERENCES users(id) ON DELETE CASCADE,
    full_name varchar NOT NULL,
    mobile varchar NOT NULL,
    address_line text NOT NULL,
    city varchar,
    state varchar,
    pincode varchar,
    is_default boolean DEFAULT false,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE orders (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    rider_id uuid REFERENCES rider_profiles(id) ON DELETE CASCADE,
    address_id uuid REFERENCES delivery_addresses(id),
    total_amount numeric NOT NULL,
    status varchar DEFAULT 'pending', -- pending, confirmed, shipped, delivered, cancelled
    payment_status varchar DEFAULT 'unpaid', -- unpaid, paid, refunded
    razorpay_order_id varchar,
    razorpay_payment_id varchar,
    razorpay_signature varchar,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE order_items (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
    product_id uuid REFERENCES products(id),
    product_name varchar NOT NULL,
    price numeric NOT NULL,
    quantity int NOT NULL,
    total numeric NOT NULL
);

-- Track rider location
ALTER TABLE rider_profiles ADD COLUMN last_latitude numeric;
ALTER TABLE rider_profiles ADD COLUMN last_longitude numeric;
ALTER TABLE rider_profiles ADD COLUMN updated_at timestamptz DEFAULT now();

-- Spatial Search Function (Haversine)
DROP FUNCTION IF EXISTS get_nearby_businesses(numeric,numeric,numeric,business_category,numeric,numeric,numeric,numeric,boolean);
CREATE OR REPLACE FUNCTION get_nearby_businesses(
    p_lat numeric,
    p_long numeric,
    p_radius_km numeric DEFAULT 50,
    p_category business_category DEFAULT NULL,
    p_min_lat numeric DEFAULT NULL,
    p_max_lat numeric DEFAULT NULL,
    p_min_long numeric DEFAULT NULL,
    p_max_long numeric DEFAULT NULL,
    p_sort_by_price boolean DEFAULT false
)
RETURNS TABLE (
    id uuid,
    business_name varchar,
    category business_category,
    latitude numeric,
    longitude numeric,
    logo_url text,
    open_time time,
    close_time time,
    distance double precision,
    min_service_price numeric,
    is_open boolean
) AS $$
BEGIN
    RETURN QUERY
    WITH business_prices AS (
        SELECT business_id, MIN(price) as min_price
        FROM vendor_services
        WHERE is_active = true
        GROUP BY business_id
    )
    SELECT 
        b.id, b.business_name, b.category, b.latitude, b.longitude, b.logo_url, b.open_time, b.close_time,
        (6371 * acos(cos(radians(p_lat)) * cos(radians(b.latitude)) * cos(radians(b.longitude) - radians(p_long)) + sin(radians(p_lat)) * sin(radians(b.latitude)))) AS distance,
        bp.min_price,
        (CASE 
            WHEN b.open_time IS NULL OR b.close_time IS NULL THEN true
            WHEN b.open_time <= b.close_time THEN (current_time::time BETWEEN b.open_time AND b.close_time)
            ELSE (current_time::time >= b.open_time OR current_time::time <= b.close_time)
        END) as is_open
    FROM vendor_businesses b
    LEFT JOIN business_prices bp ON b.id = bp.business_id
    WHERE b.is_active = true AND b.deleted_at IS NULL
    AND (p_category IS NULL OR b.category = p_category)
    AND (p_min_lat IS NULL OR b.latitude BETWEEN p_min_lat AND p_max_lat)
    AND (p_min_long IS NULL OR b.longitude BETWEEN p_min_long AND p_max_long)
    AND (6371 * acos(cos(radians(p_lat)) * cos(radians(b.latitude)) * cos(radians(b.longitude) - radians(p_long)) + sin(radians(p_lat)) * sin(radians(b.latitude)))) <= p_radius_km
    ORDER BY 
        CASE WHEN p_sort_by_price THEN bp.min_price END ASC NULLS LAST,
        distance ASC;
END;
$$ LANGUAGE plpgsql;

-- ====================================================
-- ADMIN DASHBOARD GRAPHS
-- ====================================================

-- 1. Daily Rider Registrations
CREATE OR REPLACE FUNCTION get_daily_registrations_counts()
RETURNS TABLE (date date, count bigint) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        d.date::date,
        COUNT(r.id)
    FROM generate_series(
        current_date - interval '29 days', 
        current_date, 
        '1 day'::interval
    ) d(date)
    LEFT JOIN rider_profiles r ON r.created_at::date = d.date::date
    GROUP BY d.date
    ORDER BY d.date;
END;
$$ LANGUAGE plpgsql;

-- 2. Daily Ride Completions
CREATE OR REPLACE FUNCTION get_daily_rides_counts()
RETURNS TABLE (date date, count bigint) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        d.date::date,
        COUNT(r.id)
    FROM generate_series(
        current_date - interval '29 days', 
        current_date, 
        '1 day'::interval
    ) d(date)
    LEFT JOIN rides r ON r.created_at::date = d.date::date AND r.status = 'completed'
    GROUP BY d.date
    ORDER BY d.date;
END;
$$ LANGUAGE plpgsql;

-- ====================================================
-- STORAGE BUCKET (For Media/Product Images)
-- ====================================================
INSERT INTO storage.buckets (id, name, public) VALUES ('media', 'media', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'media');
CREATE POLICY "Admin Upload Access" ON storage.objects FOR INSERT WITH CHECK (
    bucket_id = 'media' AND (auth.role() = 'service_role' OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'))
);
CREATE POLICY "Admin Delete Access" ON storage.objects FOR DELETE USING (
    bucket_id = 'media' AND (auth.role() = 'service_role' OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'))
);
