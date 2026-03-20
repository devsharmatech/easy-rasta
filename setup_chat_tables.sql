-- Create the event_messages table
CREATE TABLE IF NOT EXISTS event_messages (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id uuid REFERENCES events(id) ON DELETE CASCADE,
    organizer_id uuid REFERENCES rider_profiles(id) ON DELETE CASCADE,
    participant_id uuid REFERENCES rider_profiles(id) ON DELETE CASCADE,
    sender_id uuid REFERENCES rider_profiles(id) ON DELETE CASCADE,
    message_type varchar DEFAULT 'text' CHECK (message_type IN ('text', 'image')),
    content text NOT NULL,
    is_read boolean DEFAULT false,
    created_at timestamptz DEFAULT now()
);

-- Indexes for efficient querying by event, organizer, and participant
CREATE INDEX IF NOT EXISTS idx_event_messages_event ON event_messages(event_id);
CREATE INDEX IF NOT EXISTS idx_event_messages_chat ON event_messages(event_id, participant_id);
CREATE INDEX IF NOT EXISTS idx_event_messages_organizer ON event_messages(organizer_id);
CREATE INDEX IF NOT EXISTS idx_event_messages_participant ON event_messages(participant_id);

-- Enable RLS
ALTER TABLE event_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Messages viewable by everyone" ON event_messages FOR SELECT USING (true);

-- Insert policy for everyone as well (assuming the API handles proper validation)
CREATE POLICY "Messages insertable by everyone" ON event_messages FOR INSERT WITH CHECK (true);
CREATE POLICY "Messages updatable by everyone" ON event_messages FOR UPDATE USING (true);
