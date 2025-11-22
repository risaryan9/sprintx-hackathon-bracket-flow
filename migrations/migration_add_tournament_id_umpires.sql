-- Migration: Add tournament_id column to umpires table
-- This aligns umpires to specific tournaments, similar to how courts are aligned

-- Add tournament_id column
ALTER TABLE umpires
ADD COLUMN IF NOT EXISTS tournament_id UUID NULL;

-- Add foreign key constraint for tournament_id
ALTER TABLE umpires
ADD CONSTRAINT fk_umpires_tournament
FOREIGN KEY (tournament_id) REFERENCES tournaments(id)
ON DELETE SET NULL;

-- Create index for faster queries on tournament_id
CREATE INDEX IF NOT EXISTS idx_umpires_tournament_id ON umpires(tournament_id);

-- Update all existing umpires to be assigned to Mumbai Premier Badminton Slam
-- Tournament ID: b6d3f9e2-6a1a-4672-9e3d-8f7d0f0f04a5
UPDATE umpires
SET tournament_id = 'b6d3f9e2-6a1a-4672-9e3d-8f7d0f0f04a5'
WHERE tournament_id IS NULL;

-- Add comment to column
COMMENT ON COLUMN umpires.tournament_id IS 'UUID of the tournament this umpire is assigned to';

