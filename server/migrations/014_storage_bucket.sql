-- 014_storage_bucket.sql
-- Create object storage bucket for Content Studio and Canopy media assets

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'canopy-media',
    'canopy-media',
    true,
    5242880, -- 5MB limit
    ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];

-- Storage RLS: Public read policy
DROP POLICY IF EXISTS "Public can view canopy-media" ON storage.objects;
CREATE POLICY "Public can view canopy-media"
ON storage.objects FOR SELECT
USING (bucket_id = 'canopy-media');

-- Storage RLS: Authenticated upload policy
DROP POLICY IF EXISTS "Authenticated staff can upload canopy-media" ON storage.objects;
CREATE POLICY "Authenticated staff can upload canopy-media"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'canopy-media');
