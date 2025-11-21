-- Update tournament images to match uploaded images in /public/
-- This script updates ALL tournaments, even if they already have an image_url

-- Mumbai Premier Badminton Slam
UPDATE public.tournaments
SET image_url = '/Mumbai_Premier_Badminton_slam.png'
WHERE name = 'Mumbai Premier Badminton Slam';

-- Hyderabad Pro Volleyball Circuit
UPDATE public.tournaments
SET image_url = '/Hyderabad_Pro_Volleyball_circuit.png'
WHERE name = 'Hyderabad Pro Volleyball Circuit';

-- Kolkata Youth Football Carnival
UPDATE public.tournaments
SET image_url = '/Kolkata_Youth_Football_Carnival.png'
WHERE name = 'Kolkata Youth Football Carnival';

-- Pune Grandmaster Chess League
UPDATE public.tournaments
SET image_url = '/Pune_Grandmaster_Chess_League.png'
WHERE name = 'Pune Grandmaster Chess League';

-- Chennai Open Clay Masters
UPDATE public.tournaments
SET image_url = '/chennai open clay masters.png'
WHERE name = 'Chennai Open Clay Masters';

-- Bengaluru Ultra Athletics Meet
UPDATE public.tournaments
SET image_url = '/Bengaluru_Ultra_Athletics_Meet.png'
WHERE name = 'Bengaluru Ultra Athletics Meet';

-- Khelo India Kabaddi Masters
UPDATE public.tournaments
SET image_url = '/khelo _india _kabaddi _masters.png'
WHERE name = 'Khelo India Kabaddi Masters';

-- Ahmedabad Cycling Grand Prix
UPDATE public.tournaments
SET image_url = '/ahmedabad_cycling _grand _prix.png'
WHERE name = 'Ahmedabad Cycling Grand Prix';

-- Verify the updates
SELECT 
  name,
  image_url,
  sport,
  city
FROM public.tournaments
ORDER BY name;


