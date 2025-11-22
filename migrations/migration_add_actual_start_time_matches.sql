-- Migration: Add actual_start_time to matches table
-- This tracks when the umpire actually started the match (vs scheduled_time which is the planned start)

ALTER TABLE matches
ADD COLUMN IF NOT EXISTS actual_start_time TIMESTAMP NULL;

-- Create index for faster queries on actual_start_time
CREATE INDEX IF NOT EXISTS idx_matches_actual_start_time ON matches(actual_start_time);

COMMENT ON COLUMN matches.actual_start_time IS 'Timestamp when the umpire actually started the match by clicking "Start Match"';

