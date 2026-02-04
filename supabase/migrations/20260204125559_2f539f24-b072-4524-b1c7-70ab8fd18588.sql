-- Fix handle_new_user trigger to not insert into user_roles
-- Role assignment should happen when user joins an organization, not at signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Create profile for the new user
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Usuário'),
    NEW.email
  );
  
  -- Note: Role assignment is handled when user creates/joins an organization
  -- via the organization onboarding flow, not at signup time
  
  RETURN NEW;
END;
$function$;