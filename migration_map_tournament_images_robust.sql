-- Robust SQL script to map tournament images by name matching
-- This handles variations in naming (spaces, underscores, case)

-- Function to normalize strings for comparison (removes spaces, underscores, converts to lowercase)
-- We'll use a simple approach with REPLACE and LOWER

-- Mumbai Premier Badminton Slam -> Mumbai_Premier_Badminton_slam.png
UPDATE public.tournaments
SET image_url = '/Mumbai_Premier_Badminton_slam.png'
WHERE LOWER(REPLACE(REPLACE(REPLACE(name, ' ', ''), '_', ''), '-', '')) 
   = LOWER(REPLACE(REPLACE(REPLACE('Mumbai Premier Badminton Slam', ' ', ''), '_', ''), '-', ''))
   OR LOWER(name) LIKE '%mumbai%premier%badminton%slam%';

-- Hyderabad Pro Volleyball Circuit -> Hyderabad_Pro_Volleyball_circuit.png
UPDATE public.tournaments
SET image_url = '/Hyderabad_Pro_Volleyball_circuit.png'
WHERE LOWER(REPLACE(REPLACE(REPLACE(name, ' ', ''), '_', ''), '-', '')) 
   = LOWER(REPLACE(REPLACE(REPLACE('Hyderabad Pro Volleyball Circuit', ' ', ''), '_', ''), '-', ''))
   OR LOWER(name) LIKE '%hyderabad%pro%volleyball%circuit%';

-- Kolkata Youth Football Carnival -> Kolkata_Youth_Football_Carnival.png
UPDATE public.tournaments
SET image_url = '/Kolkata_Youth_Football_Carnival.png'
WHERE LOWER(REPLACE(REPLACE(REPLACE(name, ' ', ''), '_', ''), '-', '')) 
   = LOWER(REPLACE(REPLACE(REPLACE('Kolkata Youth Football Carnival', ' ', ''), '_', ''), '-', ''))
   OR LOWER(name) LIKE '%kolkata%youth%football%carnival%';

-- Pune Grandmaster Chess League -> Pune_Grandmaster_Chess_League.png
UPDATE public.tournaments
SET image_url = '/Pune_Grandmaster_Chess_League.png'
WHERE LOWER(REPLACE(REPLACE(REPLACE(name, ' ', ''), '_', ''), '-', '')) 
   = LOWER(REPLACE(REPLACE(REPLACE('Pune Grandmaster Chess League', ' ', ''), '_', ''), '-', ''))
   OR LOWER(name) LIKE '%pune%grandmaster%chess%league%';

-- Chennai Open Clay Masters -> chennai open clay masters.png
UPDATE public.tournaments
SET image_url = '/chennai open clay masters.png'
WHERE LOWER(REPLACE(REPLACE(REPLACE(name, ' ', ''), '_', ''), '-', '')) 
   = LOWER(REPLACE(REPLACE(REPLACE('Chennai Open Clay Masters', ' ', ''), '_', ''), '-', ''))
   OR LOWER(name) LIKE '%chennai%open%clay%masters%';

-- Bengaluru Ultra Athletics Meet -> Bengaluru_Ultra_Athletics_Meet.png
UPDATE public.tournaments
SET image_url = '/Bengaluru_Ultra_Athletics_Meet.png'
WHERE LOWER(REPLACE(REPLACE(REPLACE(name, ' ', ''), '_', ''), '-', '')) 
   = LOWER(REPLACE(REPLACE(REPLACE('Bengaluru Ultra Athletics Meet', ' ', ''), '_', ''), '-', ''))
   OR LOWER(REPLACE(REPLACE(REPLACE(name, ' ', ''), '_', ''), '-', '')) 
   = LOWER(REPLACE(REPLACE(REPLACE('Bangalore Ultra Athletics Meet', ' ', ''), '_', ''), '-', ''))
   OR LOWER(name) LIKE '%bengaluru%ultra%athletics%meet%'
   OR LOWER(name) LIKE '%bangalore%ultra%athletics%meet%';

-- Khelo India Kabaddi Masters -> khelo _india _kabaddi _masters.png
UPDATE public.tournaments
SET image_url = '/khelo _india _kabaddi _masters.png'
WHERE LOWER(REPLACE(REPLACE(REPLACE(name, ' ', ''), '_', ''), '-', '')) 
   = LOWER(REPLACE(REPLACE(REPLACE('Khelo India Kabaddi Masters', ' ', ''), '_', ''), '-', ''))
   OR LOWER(name) LIKE '%khelo%india%kabaddi%masters%';

-- Ahmedabad Cycling Grand Prix -> ahmedabad_cycling _grand _prix.png
UPDATE public.tournaments
SET image_url = '/ahmedabad_cycling _grand _prix.png'
WHERE LOWER(REPLACE(REPLACE(REPLACE(name, ' ', ''), '_', ''), '-', '')) 
   = LOWER(REPLACE(REPLACE(REPLACE('Ahmedabad Cycling Grand Prix', ' ', ''), '_', ''), '-', ''))
   OR LOWER(name) LIKE '%ahmedabad%cycling%grand%prix%';

-- Verification queries
-- Show all tournaments with their images
SELECT 
  id,
  name,
  image_url,
  sport,
  city
FROM public.tournaments
ORDER BY name;

-- Show tournaments that were updated
SELECT 
  name,
  image_url,
  sport
FROM public.tournaments
WHERE image_url LIKE '/%%.png'
ORDER BY name;

-- Show tournaments that still need images (if any)
SELECT 
  name,
  sport,
  city,
  image_url
FROM public.tournaments
WHERE image_url IS NULL 
   OR image_url = '' 
   OR (image_url NOT LIKE '/%%.png' AND image_url NOT LIKE '/assets/%')
ORDER BY name;


