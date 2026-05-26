UPDATE auth.users
SET encrypted_password = crypt('Lexflowai945@p', gen_salt('bf')),
    updated_at = now()
WHERE email = 'julia.oliveira@porveri.com.br';