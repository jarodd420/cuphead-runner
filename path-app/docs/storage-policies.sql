-- Supabase Storage: allow uploads and public read for your app bucket
-- Run this in Supabase Dashboard → SQL Editor if you get 403 "row violates row-level security policy".
-- Replace 'fam' with your bucket name if different (e.g. 'uploads').
-- If a policy with the same name exists, drop it first: DROP POLICY IF EXISTS "Allow uploads to app bucket" ON storage.objects;

-- Allow inserts (uploads) into the bucket (required for profile/moment photos)
CREATE POLICY "Allow uploads to app bucket"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'fam');

-- Allow public read so image URLs work (required for public bucket)
CREATE POLICY "Allow public read app bucket"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'fam');
