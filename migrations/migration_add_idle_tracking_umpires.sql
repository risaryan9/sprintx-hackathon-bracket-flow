-- Migration: Add idle tracking columns to umpires table
-- This enables tracking when an umpire is overseeing a match and calculating when they will be free

ALTER TABLE umpires
ADD COLUMN IF NOT EXISTS is_idle BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS last_assigned_start_time TIMESTAMP NULL,
ADD COLUMN IF NOT EXISTS last_assigned_match_id UUID NULL;

-- Add foreign key constraint for last_assigned_match_id
ALTER TABLE umpires
ADD CONSTRAINT fk_umpires_last_assigned_match
FOREIGN KEY (last_assigned_match_id) REFERENCES matches(id)
ON DELETE SET NULL;

-- Create index for faster queries on is_idle status
CREATE INDEX IF NOT EXISTS idx_umpires_is_idle ON umpires(is_idle);
CREATE INDEX IF NOT EXISTS idx_umpires_last_assigned_match ON umpires(last_assigned_match_id);

COMMENT ON COLUMN umpires.is_idle IS 'Indicates whether the umpire is currently idle (true) or overseeing a match (false)';
COMMENT ON COLUMN umpires.last_assigned_start_time IS 'Timestamp when the umpire started overseeing a match';
COMMENT ON COLUMN umpires.last_assigned_match_id IS 'UUID of the match currently being overseen by this umpire';

