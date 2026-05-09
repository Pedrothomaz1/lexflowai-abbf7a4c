
-- Drop overly permissive storage policies
DROP POLICY IF EXISTS "Users can view own documents or with role" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update all documents" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete all documents" ON storage.objects;
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own documents or admins" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload to their own folder" ON storage.objects;

-- Realtime: restrict subscriptions to authenticated users
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can receive realtime" ON realtime.messages;
CREATE POLICY "Authenticated users can receive realtime"
ON realtime.messages
FOR SELECT
TO authenticated
USING (true);
