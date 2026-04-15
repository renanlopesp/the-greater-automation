-- Create storage bucket for chat file uploads (images, PDFs, etc.)
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-uploads', 'chat-uploads', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload files to their own folder
CREATE POLICY "Users can upload chat files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'chat-uploads' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow public read access (needed for Instagram API, AI model, etc.)
CREATE POLICY "Public read access for chat uploads"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'chat-uploads');
