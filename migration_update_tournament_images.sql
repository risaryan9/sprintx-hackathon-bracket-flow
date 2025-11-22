-- Update tournament images based on sport type
-- This script matches images from /assets/images/ to tournaments based on their sport

-- Football/Soccer tournaments
UPDATE public.tournaments
SET image_url = '/assets/images/football-academy.png'
WHERE LOWER(sport) IN ('football', 'soccer')
  AND (image_url IS NULL OR image_url = '' OR image_url NOT LIKE '/assets/images/%');

-- Badminton tournaments
UPDATE public.tournaments
SET image_url = '/assets/images/volleyball-duo.png'
WHERE LOWER(sport) IN ('badminton')
  AND (image_url IS NULL OR image_url = '' OR image_url NOT LIKE '/assets/images/%');

-- Tennis tournaments
UPDATE public.tournaments
SET image_url = '/assets/images/tennis-stadium.png'
WHERE LOWER(sport) IN ('tennis')
  AND (image_url IS NULL OR image_url = '' OR image_url NOT LIKE '/assets/images/%');

-- Volleyball tournaments
UPDATE public.tournaments
SET image_url = '/assets/images/volleyball-duo.png'
WHERE LOWER(sport) IN ('volleyball')
  AND (image_url IS NULL OR image_url = '' OR image_url NOT LIKE '/assets/images/%');

-- Table Tennis tournaments
UPDATE public.tournaments
SET image_url = '/assets/images/extra-01.png'
WHERE LOWER(sport) IN ('table tennis', 'table-tennis', 'tabletennis')
  AND (image_url IS NULL OR image_url = '' OR image_url NOT LIKE '/assets/images/%');

-- Chess tournaments
UPDATE public.tournaments
SET image_url = '/assets/images/chess-arena.png'
WHERE LOWER(sport) IN ('chess')
  AND (image_url IS NULL OR image_url = '' OR image_url NOT LIKE '/assets/images/%');

-- Basketball tournaments
UPDATE public.tournaments
SET image_url = '/assets/images/arena-crowd.png'
WHERE LOWER(sport) IN ('basketball')
  AND (image_url IS NULL OR image_url = '' OR image_url NOT LIKE '/assets/images/%');

-- Cricket tournaments
UPDATE public.tournaments
SET image_url = '/assets/images/arena-crowd.png'
WHERE LOWER(sport) IN ('cricket')
  AND (image_url IS NULL OR image_url = '' OR image_url NOT LIKE '/assets/images/%');

-- Kabaddi tournaments
UPDATE public.tournaments
SET image_url = '/assets/images/arena-crowd.png'
WHERE LOWER(sport) IN ('kabaddi')
  AND (image_url IS NULL OR image_url = '' OR image_url NOT LIKE '/assets/images/%');

-- Athletics tournaments
UPDATE public.tournaments
SET image_url = '/assets/images/arena-crowd.png'
WHERE LOWER(sport) IN ('athletics', 'track and field', 'track-and-field')
  AND (image_url IS NULL OR image_url = '' OR image_url NOT LIKE '/assets/images/%');

-- Winter sports (if any)
UPDATE public.tournaments
SET image_url = '/assets/images/winter-stadium.png'
WHERE LOWER(sport) IN ('ice hockey', 'ice-hockey', 'icehockey', 'skating', 'skiing', 'snowboarding')
  AND (image_url IS NULL OR image_url = '' OR image_url NOT LIKE '/assets/images/%');

-- Default fallback for any remaining tournaments without images
UPDATE public.tournaments
SET image_url = '/assets/images/arena-crowd.png'
WHERE image_url IS NULL OR image_url = '' OR image_url NOT LIKE '/assets/images/%';

-- Verify the updates
SELECT 
  sport,
  COUNT(*) as count,
  image_url
FROM public.tournaments
GROUP BY sport, image_url
ORDER BY sport, image_url;



