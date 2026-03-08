# Source Tree — LexFlow AI

```
src/
├── App.tsx                    # Roteamento principal (React.lazy + Suspense)
├── main.tsx                   # Entry point
├── pages/                     # 41 páginas (todas lazy-loaded)
│   ├── Dashboard.tsx
│   ├── Contratos.tsx
│   ├── ContratoDetalhes.tsx
│   ├── Fornecedores.tsx
│   ├── Servicos.tsx
│   ├── ComplianceLGPD.tsx
│   ├── Settings.tsx
│   └── ...
├── components/
│   ├── ui/                    # shadcn/ui + componentes base
│   ├── Dashboard/             # ExecutiveSummary, SLAIndicatorsCard, TopFornecedoresCard, ExpiryTimelineSection
│   ├── ContractDetails/       # ContractInfoCard, ContractAIAnalysis, ContractApprovalCard, ...
│   ├── contracts/             # KanbanBoard, CalendarView, ContratoFormDialog
│   ├── Servicos/              # ServicosStats, ServicosFilters, ServicoFormDialog
│   ├── compliance/            # ComplianceLogsSection, RetentionPoliciesSection, DataSubjectRightsGrid
│   ├── Fornecedores/          # FornecedorForm, FornecedorAnexos, FornecedorCategorias
│   ├── Settings/              # AvatarUpload, SettingsIntegracaoCard
│   ├── ContractImport/        # ContractImport, PDFDataExtractor
│   ├── security/              # SecurityAlertsList, MFAChallenge, ...
│   └── ...
├── contexts/
│   ├── AuthContext.tsx
│   ├── OrganizationContext.tsx
│   └── ModuloContext.tsx
├── hooks/
│   ├── useOrganization.ts
│   ├── useUserRole.tsx
│   ├── usePermissions.ts
│   └── ...
├── integrations/
│   └── supabase/              # client.ts, types.ts
├── utils/
│   └── pdfExport.ts
├── lib/
│   ├── utils.ts
│   └── help-texts.ts
└── __tests__/
    ├── pages/                 # Dashboard, Contratos, Fornecedores, Settings, Auth
    ├── rls/                   # rls-isolation, rls-policies
    └── security/              # auth-flow, mfa, permissions
```

## Convenções
- Imports de componentes UI via `@/components/ui/`
- Imports de páginas via `@/pages/`
- Supabase sempre via `@/integrations/supabase/client`
- Contextos via `@/contexts/` (AuthContext, OrganizationContext)
- Hooks customizados via `@/hooks/`
