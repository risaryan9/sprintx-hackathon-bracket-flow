-- Final SQL script to map tournament images by name
-- This script matches tournament names to image files in /public/
-- 
-- Image files available:
-- - Mumbai_Premier_Badminton_slam.png
-- - Hyderabad_Pro_Volleyball_circuit.png
-- - Kolkata_Youth_Football_Carnival.png
-- - Pune_Grandmaster_Chess_League.png
-- - chennai open clay masters.png
-- - Bengaluru_Ultra_Athletics_Meet.png
-- - khelo _india _kabaddi _masters.png
-- - ahmedabad_cycling _grand _prix.png

-- Mumbai Premier Badminton Slam
UPDATE public.tournaments
SET image_url = '/Mumbai_Premier_Badminton_slam.png'
WHERE LOWER(REPLACE(REPLACE(name, ' ', ''), '_', '')) 
   LIKE LOWER(REPLACE(REPLACE('Mumbai Premier Badminton Slam', ' ', ''), '_', ''))
   OR LOWER(name) LIKE '%mumbai%premier%badminton%slam%';

-- Hyderabad Pro Volleyball Circuit
UPDATE public.tournaments
SET image_url = '/Hyderabad_Pro_Volleyball_circuit.png'
WHERE LOWER(REPLACE(REPLACE(name, ' ', ''), '_', '')) 
   LIKE LOWER(REPLACE(REPLACE('Hyderabad Pro Volleyball Circuit', ' ', ''), '_', ''))
   OR LOWER(name) LIKE '%hyderabad%pro%volleyball%circuit%';

-- Kolkata Youth Football Carnival
UPDATE public.tournaments
SET image_url = '/Kolkata_Youth_Football_Carnival.png'
WHERE LOWER(REPLACE(REPLACE(name, ' ', ''), '_', '')) 
   LIKE LOWER(REPLACE(REPLACE('Kolkata Youth Football Carnival', ' ', ''), '_', ''))
   OR LOWER(name) LIKE '%kolkata%youth%football%carnival%';

-- Pune Grandmaster Chess League
UPDATE public.tournaments
SET image_url = '/Pune_Grandmaster_Chess_League.png'
WHERE LOWER(REPLACE(REPLACE(name, ' ', ''), '_', '')) 
   LIKE LOWER(REPLACE(REPLACE('Pune Grandmaster Chess League', ' ', ''), '_', ''))
   OR LOWER(name) LIKE '%pune%grandmaster%chess%league%';

-- Chennai Open Clay Masters
UPDATE public.tournaments
SET image_url = '/chennai open clay masters.png'
WHERE LOWER(REPLACE(REPLACE(name, ' ', ''), '_', '')) 
   LIKE LOWER(REPLACE(REPLACE('Chennai Open Clay Masters', ' ', ''), '_', ''))
   OR LOWER(name) LIKE '%chennai%open%clay%masters%';

-- Bengaluru Ultra Athletics Meet (also handles Bangalore variant)
UPDATE public.tournaments
SET image_url = '/Bengaluru_Ultra_Athletics_Meet.png'
WHERE LOWER(REPLACE(REPLACE(name, ' ', ''), '_', '')) 
   LIKE LOWER(REPLACE(REPLACE('Bengaluru Ultra Athletics Meet', ' ', ''), '_', ''))
   OR LOWER(REPLACE(REPLACE(name, ' ', ''), '_', '')) 
   LIKE LOWER(REPLACE(REPLACE('Bangalore Ultra Athletics Meet', ' ', ''), '_', ''))
   OR LOWER(name) LIKE '%bengaluru%ultra%athletics%meet%'
   OR LOWER(name) LIKE '%bangalore%ultra%athletics%meet%';

-- Khelo India Kabaddi Masters
UPDATE public.tournaments
SET image_url = '/khelo _india _kabaddi _masters.png'
WHERE LOWER(REPLACE(REPLACE(name, ' ', ''), '_', '')) 
   LIKE LOWER(REPLACE(REPLACE('Khelo India Kabaddi Masters', ' ', ''), '_', ''))
   OR LOWER(name) LIKE '%khelo%india%kabaddi%masters%';

-- Ahmedabad Cycling Grand Prix
UPDATE public.tournaments
SET image_url = '/ahmedabad_cycling _grand _prix.png'
WHERE LOWER(REPLACE(REPLACE(name, ' ', ''), '_', '')) 
   LIKE LOWER(REPLACE(REPLACE('Ahmedabad Cycling Grand Prix', ' ', ''), '_', ''))
   OR LOWER(name) LIKE '%ahmedabad%cycling%grand%prix%';

-- Verification: Show updated tournaments
SELECT 
  name,
  image_url,
  sport,
  city
FROM public.tournaments
WHERE image_url LIKE '/%%.png'
ORDER BY name;

