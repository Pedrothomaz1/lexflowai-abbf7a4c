# LexFlow AI — Product Requirements Document

## Visão Geral
LexFlow AI é uma plataforma SaaS de gestão jurídica e de contratos para empresas e franquias.

## Módulos Principais
1. **Contratos** — Gestão de contratos com fornecedores (CRUD, kanban, calendário, importação)
2. **Fornecedores** — Cadastro e gestão de fornecedores e parceiros
3. **Serviços** — Controle de serviços periódicos e especificações
4. **Dashboard** — Visão executiva com KPIs, alertas e timeline
5. **Compliance LGPD** — Logs, políticas de retenção, direitos dos titulares
6. **Franquias** — Gestão de unidades franqueadas
7. **Workflow de Aprovações** — Fluxo de aprovação de contratos
8. **Relatórios** — Exportação PDF e dashboards

## Usuários
- **Analista Jurídico** — Visualiza e cadastra contratos em rascunho
- **Administrador** — Gerencia usuários, integrações e configurações; aprova e edita qualquer contrato

## Multi-tenancy
- Cada organização é isolada via RLS no Supabase
- Usuários pertencem a uma organização
- Dados nunca vazam entre organizações
