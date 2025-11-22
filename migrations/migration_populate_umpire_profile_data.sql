-- Migration: Populate placeholder profile data for existing umpires
-- Description: Adds sample/placeholder data for the newly added umpire profile fields

-- Update Priyanka Deshmukh
UPDATE umpires 
SET 
  email = 'priyanka.deshmukh@umpire.ind.in',
  gender = 'female',
  age = 34,
  experience_years = 8,
  certification_level = 'state',
  association = 'Karnataka State Umpires Association',
  bio = 'Certified state-level umpire with 8 years of experience officiating badminton and cricket tournaments. Specializes in junior and senior state championships.',
  sports_expertise = '["badminton", "cricket"]'
WHERE id = '3068d1d9-d8ff-491a-9be8-c166a1158fe8';

-- Update Harish Narayanan
UPDATE umpires 
SET 
  email = 'harish.narayanan@umpire.ind.in',
  gender = 'male',
  age = 42,
  experience_years = 15,
  certification_level = 'national',
  association = 'All India Umpires Council',
  bio = 'National level certified umpire with 15 years of experience. Officiated multiple national championships in football and cricket. Recognized for fair play and technical expertise.',
  sports_expertise = '["football", "cricket"]'
WHERE id = '5418ff36-ad5a-4b1c-9bb0-a804144737fc';

-- Update Rajesh Kumar
UPDATE umpires 
SET 
  email = 'rajesh.kumar@umpire.ind.in',
  gender = 'male',
  age = 38,
  experience_years = 12,
  certification_level = 'national',
  association = 'Delhi Umpires Federation',
  bio = 'Experienced national level umpire with 12 years of officiating badminton tournaments. Expert in handling high-pressure matches and maintaining match discipline.',
  sports_expertise = '["badminton"]'
WHERE id = '6505d6b6-8864-48ee-b276-9dcccc721f14';

-- Update Sangeeta Iyer
UPDATE umpires 
SET 
  email = 'sangeeta.iyer@umpire.ind.in',
  gender = 'female',
  age = 29,
  experience_years = 6,
  certification_level = 'state',
  association = 'Tamil Nadu State Sports Umpires Association',
  bio = 'State-certified umpire with 6 years of experience in badminton and football. Passionate about youth development and fair play in sports.',
  sports_expertise = '["badminton", "football"]'
WHERE id = 'ab1651a4-7652-465a-83b3-428c1419096a';

