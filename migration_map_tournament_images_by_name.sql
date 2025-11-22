-- Map tournament images based on tournament name matching
-- This script matches images from /public/ to tournaments based on their name

-- Helper function to normalize tournament names and image filenames for matching
-- We'll use case-insensitive matching and handle spaces/underscores

-- Mumbai Premier Badminton Slam
UPDATE public.tournaments
SET image_url = '/Mumbai_Premier_Badminton_slam.png'
WHERE LOWER(REPLACE(name, ' ', '_')) LIKE '%mumbai%premier%badminton%slam%'
   OR LOWER(REPLACE(name, ' ', '_')) LIKE '%mumbai_premier_badminton_slam%'
   OR LOWER(name) LIKE '%mumbai premier badminton slam%';

-- Hyderabad Pro Volleyball Circuit
UPDATE public.tournaments
SET image_url = '/Hyderabad_Pro_Volleyball_circuit.png'
WHERE LOWER(REPLACE(name, ' ', '_')) LIKE '%hyderabad%pro%volleyball%circuit%'
   OR LOWER(REPLACE(name, ' ', '_')) LIKE '%hyderabad_pro_volleyball_circuit%'
   OR LOWER(name) LIKE '%hyderabad pro volleyball circuit%';

-- Kolkata Youth Football Carnival
UPDATE public.tournaments
SET image_url = '/Kolkata_Youth_Football_Carnival.png'
WHERE LOWER(REPLACE(name, ' ', '_')) LIKE '%kolkata%youth%football%carnival%'
   OR LOWER(REPLACE(name, ' ', '_')) LIKE '%kolkata_youth_football_carnival%'
   OR LOWER(name) LIKE '%kolkata youth football carnival%';

-- Pune Grandmaster Chess League
UPDATE public.tournaments
SET image_url = '/Pune_Grandmaster_Chess_League.png'
WHERE LOWER(REPLACE(name, ' ', '_')) LIKE '%pune%grandmaster%chess%league%'
   OR LOWER(REPLACE(name, ' ', '_')) LIKE '%pune_grandmaster_chess_league%'
   OR LOWER(name) LIKE '%pune grandmaster chess league%';

-- Chennai Open Clay Masters
UPDATE public.tournaments
SET image_url = '/chennai open clay masters.png'
WHERE LOWER(REPLACE(name, ' ', '_')) LIKE '%chennai%open%clay%masters%'
   OR LOWER(REPLACE(name, ' ', '_')) LIKE '%chennai_open_clay_masters%'
   OR LOWER(name) LIKE '%chennai open clay masters%';

-- Bengaluru Ultra Athletics Meet
UPDATE public.tournaments
SET image_url = '/Bengaluru_Ultra_Athletics_Meet.png'
WHERE LOWER(REPLACE(name, ' ', '_')) LIKE '%bengaluru%ultra%athletics%meet%'
   OR LOWER(REPLACE(name, ' ', '_')) LIKE '%bengaluru_ultra_athletics_meet%'
   OR LOWER(name) LIKE '%bengaluru ultra athletics meet%'
   OR LOWER(name) LIKE '%bangalore ultra athletics meet%';

-- Khelo India Kabaddi Masters
UPDATE public.tournaments
SET image_url = '/khelo _india _kabaddi _masters.png'
WHERE LOWER(REPLACE(name, ' ', '_')) LIKE '%khelo%india%kabaddi%masters%'
   OR LOWER(REPLACE(name, ' ', '_')) LIKE '%khelo_india_kabaddi_masters%'
   OR LOWER(name) LIKE '%khelo india kabaddi masters%';

-- Ahmedabad Cycling Grand Prix
UPDATE public.tournaments
SET image_url = '/ahmedabad_cycling _grand _prix.png'
WHERE LOWER(REPLACE(name, ' ', '_')) LIKE '%ahmedabad%cycling%grand%prix%'
   OR LOWER(REPLACE(name, ' ', '_')) LIKE '%ahmedabad_cycling_grand_prix%'
   OR LOWER(name) LIKE '%ahmedabad cycling grand prix%';

-- Verify the updates
SELECT 
  name,
  image_url,
  sport,
  city
FROM public.tournaments
WHERE image_url LIKE '/%%.png'
ORDER BY name;

-- Show tournaments that still need images
SELECT 
  name,
  sport,
  city,
  image_url
FROM public.tournaments
WHERE image_url IS NULL 
   OR image_url = '' 
   OR image_url NOT LIKE '/%%.png'
ORDER BY name;



