-- Fix: Update the user_roles record to point to the correct organization
UPDATE public.user_roles 
SET organization_id = '52bb000c-a87d-4d73-8c24-221ff19709a7'
WHERE user_id = 'b6b35ada-b410-4c40-97c4-5f947c866b89' 
AND organization_id = '00000000-0000-0000-0000-000000000001';