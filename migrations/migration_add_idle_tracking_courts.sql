-- Migration: Add idle tracking columns to courts table
-- This enables tracking when a court is occupied by a match and calculating when it will be free

ALTER TABLE courts
ADD COLUMN IF NOT EXISTS is_idle BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS last_assigned_start_time TIMESTAMP NULL,
ADD COLUMN IF NOT EXISTS last_assigned_match_id UUID NULL;

-- Add foreign key constraint for last_assigned_match_id
ALTER TABLE courts
ADD CONSTRAINT fk_courts_last_assigned_match
FOREIGN KEY (last_assigned_match_id) REFERENCES matches(id)
ON DELETE SET NULL;

-- Create index for faster queries on is_idle status
CREATE INDEX IF NOT EXISTS idx_courts_is_idle ON courts(is_idle);
CREATE INDEX IF NOT EXISTS idx_courts_last_assigned_match ON courts(last_assigned_match_id);

COMMENT ON COLUMN courts.is_idle IS 'Indicates whether the court is currently idle (true) or busy with a match (false)';
COMMENT ON COLUMN courts.last_assigned_start_time IS 'Timestamp when the court was assigned to start a match';
COMMENT ON COLUMN courts.last_assigned_match_id IS 'UUID of the match currently occupying this court';

