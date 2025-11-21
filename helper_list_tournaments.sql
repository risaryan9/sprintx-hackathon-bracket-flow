-- Helper script to list all tournaments and their current image URLs
-- Run this first to see what tournaments exist and need images

SELECT 
  id,
  name,
  sport,
  city,
  image_url,
  CASE 
    WHEN image_url IS NULL OR image_url = '' THEN '❌ No Image'
    WHEN image_url LIKE '/%%.png' THEN '✅ Has Image'
    ELSE '⚠️ Custom URL'
  END as image_status
FROM public.tournaments
ORDER BY name;

-- Count tournaments by image status
SELECT 
  CASE 
    WHEN image_url IS NULL OR image_url = '' THEN 'No Image'
    WHEN image_url LIKE '/%%.png' THEN 'Has Local Image'
    ELSE 'Has Custom URL'
  END as status,
  COUNT(*) as count
FROM public.tournaments
GROUP BY status;


