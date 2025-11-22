-- Simple SQL script to map tournament images by exact name matching
-- Run this in your Supabase SQL Editor

-- Mumbai Premier Badminton Slam
UPDATE public.tournaments
SET image_url = '/Mumbai_Premier_Badminton_slam.png'
WHERE LOWER(TRIM(name)) = LOWER('Mumbai Premier Badminton Slam')
   OR LOWER(REPLACE(REPLACE(name, ' ', ''), '_', '')) = LOWER(REPLACE(REPLACE('Mumbai Premier Badminton Slam', ' ', ''), '_', ''));

-- Hyderabad Pro Volleyball Circuit
UPDATE public.tournaments
SET image_url = '/Hyderabad_Pro_Volleyball_circuit.png'
WHERE LOWER(TRIM(name)) = LOWER('Hyderabad Pro Volleyball Circuit')
   OR LOWER(REPLACE(REPLACE(name, ' ', ''), '_', '')) = LOWER(REPLACE(REPLACE('Hyderabad Pro Volleyball Circuit', ' ', ''), '_', ''));

-- Kolkata Youth Football Carnival
UPDATE public.tournaments
SET image_url = '/Kolkata_Youth_Football_Carnival.png'
WHERE LOWER(TRIM(name)) = LOWER('Kolkata Youth Football Carnival')
   OR LOWER(REPLACE(REPLACE(name, ' ', ''), '_', '')) = LOWER(REPLACE(REPLACE('Kolkata Youth Football Carnival', ' ', ''), '_', ''));

-- Pune Grandmaster Chess League
UPDATE public.tournaments
SET image_url = '/Pune_Grandmaster_Chess_League.png'
WHERE LOWER(TRIM(name)) = LOWER('Pune Grandmaster Chess League')
   OR LOWER(REPLACE(REPLACE(name, ' ', ''), '_', '')) = LOWER(REPLACE(REPLACE('Pune Grandmaster Chess League', ' ', ''), '_', ''));

-- Chennai Open Clay Masters
UPDATE public.tournaments
SET image_url = '/chennai open clay masters.png'
WHERE LOWER(TRIM(name)) = LOWER('Chennai Open Clay Masters')
   OR LOWER(REPLACE(REPLACE(name, ' ', ''), '_', '')) = LOWER(REPLACE(REPLACE('Chennai Open Clay Masters', ' ', ''), '_', ''));

-- Bengaluru Ultra Athletics Meet
UPDATE public.tournaments
SET image_url = '/Bengaluru_Ultra_Athletics_Meet.png'
WHERE LOWER(TRIM(name)) = LOWER('Bengaluru Ultra Athletics Meet')
   OR LOWER(REPLACE(REPLACE(name, ' ', ''), '_', '')) = LOWER(REPLACE(REPLACE('Bengaluru Ultra Athletics Meet', ' ', ''), '_', ''))
   OR LOWER(TRIM(name)) = LOWER('Bangalore Ultra Athletics Meet');

-- Khelo India Kabaddi Masters
UPDATE public.tournaments
SET image_url = '/khelo _india _kabaddi _masters.png'
WHERE LOWER(TRIM(name)) = LOWER('Khelo India Kabaddi Masters')
   OR LOWER(REPLACE(REPLACE(name, ' ', ''), '_', '')) = LOWER(REPLACE(REPLACE('Khelo India Kabaddi Masters', ' ', ''), '_', ''));

-- Ahmedabad Cycling Grand Prix
UPDATE public.tournaments
SET image_url = '/ahmedabad_cycling _grand _prix.png'
WHERE LOWER(TRIM(name)) = LOWER('Ahmedabad Cycling Grand Prix')
   OR LOWER(REPLACE(REPLACE(name, ' ', ''), '_', '')) = LOWER(REPLACE(REPLACE('Ahmedabad Cycling Grand Prix', ' ', ''), '_', ''));

-- Show results
SELECT 
  name,
  image_url,
  sport,
  city
FROM public.tournaments
ORDER BY name;



