# Tech Stack — LexFlow AI

## Frontend
- **Framework:** React 18 + TypeScript
- **Build:** Vite
- **Styling:** Tailwind CSS + shadcn/ui
- **Animations:** framer-motion
- **Routing:** react-router-dom v6
- **State:** React Context (AuthContext, OrganizationContext, ModuloContext)
- **Data Fetching:** Supabase JS client (direct queries)

## Backend
- **Platform:** Supabase
- **Database:** PostgreSQL com Row Level Security (RLS)
- **Auth:** Supabase Auth + 2FA (TOTP)
- **Storage:** Supabase Storage (contratos-documentos)
- **Edge Functions:** Deno (testar-conexao-compras, etc.)

## Testing
- **Framework:** Vitest + jsdom
- **Library:** @testing-library/react + @testing-library/user-event
- **Mocks:** vi.mock() para supabase, contexts e hooks pesados

## Ferramentas
- **Package Manager:** npm
- **Linter:** ESLint
- **PDF Export:** jsPDF + jspdf-autotable
- **Charts:** Recharts (via shadcn/ui)
