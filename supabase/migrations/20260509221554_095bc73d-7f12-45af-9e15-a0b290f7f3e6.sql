-- Fix realtime.messages SELECT policy: remove broad `topic !~~ 'org:%'` clause
-- and restrict to explicit per-user and per-organization topics.

DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'realtime' AND tablename = 'messages' AND cmd = 'SELECT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON realtime.messages', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "Realtime messages SELECT scoped"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  (realtime.topic() = ('user:' || (auth.uid())::text))
  OR
  (realtime.topic() LIKE ('org:' || (public.current_user_org())::text || ':%'))
  OR
  (realtime.topic() = ('org:' || (public.current_user_org())::text))
);