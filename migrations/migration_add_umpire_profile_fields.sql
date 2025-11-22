-- Migration: Add profile fields to umpires table
-- Description: Adds email, gender, age, experience_years, certification_level, association, bio, and sports_expertise fields

-- Add email field
ALTER TABLE umpires 
ADD COLUMN IF NOT EXISTS email VARCHAR(255);

-- Add gender field (can be 'male', 'female', 'other', or NULL)
ALTER TABLE umpires 
ADD COLUMN IF NOT EXISTS gender VARCHAR(20);

-- Add age field
ALTER TABLE umpires 
ADD COLUMN IF NOT EXISTS age INTEGER;

-- Add experience_years field
ALTER TABLE umpires 
ADD COLUMN IF NOT EXISTS experience_years INTEGER;

-- Add certification_level field (national, state, international)
ALTER TABLE umpires 
ADD COLUMN IF NOT EXISTS certification_level VARCHAR(50);

-- Add association field (e.g., Karnataka State Association)
ALTER TABLE umpires 
ADD COLUMN IF NOT EXISTS association VARCHAR(255);

-- Add bio field (short info about experience)
ALTER TABLE umpires 
ADD COLUMN IF NOT EXISTS bio TEXT;

-- Add sports_expertise field (for multi-sport tournaments - can store JSON array or comma-separated values)
-- Using TEXT to store JSON array or comma-separated list (e.g., '["cricket", "badminton", "football"]' or 'cricket, badminton, football')
ALTER TABLE umpires 
ADD COLUMN IF NOT EXISTS sports_expertise TEXT;

-- Add comments for documentation
COMMENT ON COLUMN umpires.email IS 'Email address of the umpire';
COMMENT ON COLUMN umpires.gender IS 'Gender: male, female, other, or NULL';
COMMENT ON COLUMN umpires.age IS 'Age of the umpire in years';
COMMENT ON COLUMN umpires.experience_years IS 'Number of years of umpiring experience';
COMMENT ON COLUMN umpires.certification_level IS 'Certification level: national, state, or international';
COMMENT ON COLUMN umpires.association IS 'Umpire association or organization (e.g., Karnataka State Association)';
COMMENT ON COLUMN umpires.bio IS 'Short biographical information about the umpire''s experience';
COMMENT ON COLUMN umpires.sports_expertise IS 'Sports the umpire is certified/expert in (JSON array or comma-separated list)';

