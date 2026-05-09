
-- 1) role_permissions: make immutable from client; only service_role can write
DROP POLICY IF EXISTS "Admins can manage role_permissions" ON public.role_permissions;
DROP POLICY IF EXISTS "Admins can view role_permissions" ON public.role_permissions;
DROP POLICY IF EXISTS "Authenticated users can view role_permissions" ON public.role_permissions;
DROP POLICY IF EXISTS role_permissions_select ON public.role_permissions;
DROP POLICY IF EXISTS role_permissions_service_write ON public.role_permissions;

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY role_permissions_select
ON public.role_permissions
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

CREATE POLICY role_permissions_service_insert
ON public.role_permissions
FOR INSERT
TO public
WITH CHECK ((auth.jwt() ->> 'role') = 'service_role');

CREATE POLICY role_permissions_service_update
ON public.role_permissions
FOR UPDATE
TO public
USING ((auth.jwt() ->> 'role') = 'service_role')
WITH CHECK ((auth.jwt() ->> 'role') = 'service_role');

CREATE POLICY role_permissions_service_delete
ON public.role_permissions
FOR DELETE
TO public
USING ((auth.jwt() ->> 'role') = 'service_role');

-- 2) notifications: restrict cross-user inserts
DROP POLICY IF EXISTS system_insert_notifications ON public.notifications;
DROP POLICY IF EXISTS notifications_insert_self ON public.notifications;
DROP POLICY IF EXISTS notifications_insert_service ON public.notifications;

CREATE POLICY notifications_insert_self
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (
  organization_id = current_user_org()
  AND user_id = auth.uid()
);

CREATE POLICY notifications_insert_service
ON public.notifications
FOR INSERT
TO public
WITH CHECK ((auth.jwt() ->> 'role') = 'service_role');
