-- Add latitude and longitude to event_stops

ALTER TABLE event_stops ADD COLUMN latitude numeric;
ALTER TABLE event_stops ADD COLUMN longitude numeric;
