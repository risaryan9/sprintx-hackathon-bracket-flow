-- Migration: Add awaiting_result column to matches table
-- This tracks when a match has finished its duration but is waiting for the umpire to submit results

ALTER TABLE matches
ADD COLUMN IF NOT EXISTS awaiting_result BOOLEAN DEFAULT false;

-- Create index for faster queries on awaiting_result status
CREATE INDEX IF NOT EXISTS idx_matches_awaiting_result ON matches(awaiting_result);

-- Update existing completed matches to not be awaiting result
UPDATE matches
SET awaiting_result = false
WHERE is_completed = true;

COMMENT ON COLUMN matches.awaiting_result IS 'Indicates the match duration has ended but umpire has not yet submitted the final result';

