-- Create storage bucket for lab reports
INSERT INTO storage.buckets (id, name, public)
VALUES ('lab-reports', 'lab-reports', true);

-- Policy to allow authenticated users to upload files
CREATE POLICY "Users can upload lab reports" ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'lab-reports' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy to allow users to view their own files
CREATE POLICY "Users can view their own lab reports" ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'lab-reports' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy to allow users to delete their own files
CREATE POLICY "Users can delete their own lab reports" ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'lab-reports' 
  AND auth.uid()::text = (storage.foldername(name))[1]
); 