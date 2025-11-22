-- Add score columns to matches table for umpire scoring functionality

-- Add entry1_score column (nullable, for goals/points scored by entry 1)
ALTER TABLE public.matches 
ADD COLUMN IF NOT EXISTS entry1_score INTEGER NULL;

-- Add entry2_score column (nullable, for goals/points scored by entry 2)
ALTER TABLE public.matches 
ADD COLUMN IF NOT EXISTS entry2_score INTEGER NULL;

-- Add comments to document the columns
COMMENT ON COLUMN public.matches.entry1_score IS 'Score (goals/points) for entry 1. Nullable for sports without scoring (e.g., chess)';
COMMENT ON COLUMN public.matches.entry2_score IS 'Score (goals/points) for entry 2. Nullable for sports without scoring (e.g., chess)';

-- Optional: Add check constraints to ensure scores are non-negative
-- Note: These will fail if constraints already exist, but that's okay
DO $$
BEGIN
    -- Add constraint for entry1_score if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'matches_entry1_score_non_negative'
    ) THEN
        ALTER TABLE public.matches 
        ADD CONSTRAINT matches_entry1_score_non_negative 
        CHECK (entry1_score IS NULL OR entry1_score >= 0);
    END IF;

    -- Add constraint for entry2_score if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'matches_entry2_score_non_negative'
    ) THEN
        ALTER TABLE public.matches 
        ADD CONSTRAINT matches_entry2_score_non_negative 
        CHECK (entry2_score IS NULL OR entry2_score >= 0);
    END IF;
END $$;

