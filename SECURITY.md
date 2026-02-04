# Security Notes

This project relies on environment variables and Supabase RLS for data protection. **Do not commit real secrets** to the repository.

## Key practices

- Keep `.env` files local only; they are intentionally ignored by Git.
- Use **Supabase anon keys** on the frontend only. Never expose service-role keys in client code.
- Rotate any keys that may have been exposed and update your deployment secrets.
- Ensure Row Level Security (RLS) policies remain enabled for all tenant-scoped tables.

## Reporting

If you find a potential security issue, rotate affected keys immediately and review audit logs.
