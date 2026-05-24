-- Tornar Pedro Eduardo Thomaz administrador
UPDATE user_roles 
SET role = 'administrador'::app_role 
WHERE user_id = 'b6b35ada-b410-4c40-97c4-5f947c866b89';