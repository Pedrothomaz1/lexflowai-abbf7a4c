DROP VIEW IF EXISTS public.profiles_safe;

CREATE VIEW public.profiles_safe
WITH (security_invoker=on) AS
  SELECT id, full_name, email, department, avatar_url, created_at, updated_at
  FROM public.profiles;