# LexFlowAI - Documentacao Tecnica

## Resumo Executivo

Sistema de Gestao de Contratos Empresariais desenvolvido em React + TypeScript com backend Supabase (PostgreSQL + Edge Functions).

**Stack Principal:**
- Frontend: React 18.3 + TypeScript + Vite
- UI: TailwindCSS + Shadcn/ui (Radix)
- Backend: Supabase (PostgreSQL + Deno Edge Functions)
- Autenticacao: Supabase Auth + 2FA/TOTP

---

## 1. Estrutura de Pastas

```
lexflowai/
├── src/
│   ├── components/          # Componentes React reutilizaveis
│   │   ├── ui/             # Biblioteca Shadcn (50+ componentes)
│   │   ├── ContractDetails/ # Visualizacao de contratos
│   │   ├── Fornecedores/    # Gestao de fornecedores
│   │   ├── Franquias/       # Gestao de franquias
│   │   ├── security/        # Componentes de seguranca
│   │   └── Settings/        # Configuracoes
│   ├── contexts/            # Contextos React (Auth, Organization)
│   ├── hooks/               # Hooks customizados (12+)
│   ├── pages/               # Paginas de rotas (40+)
│   ├── integrations/        # Cliente Supabase e tipos
│   ├── utils/               # Funcoes utilitarias
│   └── lib/                 # Helpers
├── supabase/
│   ├── migrations/          # 40+ migracoes SQL
│   └── functions/           # 19 Edge Functions (Deno)
└── dist/                    # Build de producao
```

---

## 2. Banco de Dados - Tabelas Principais

### Dados Core
| Tabela | Descricao |
|--------|-----------|
| `organizations` | Organizacoes/empresas |
| `organization_members` | Membros com roles |
| `profiles` | Perfis de usuario |
| `contratos` | Contratos |
| `fornecedores` | Fornecedores |
| `franquias` | Franquias |
| `unidades` | Unidades/filiais |

### Gestao de Contratos
| Tabela | Descricao |
|--------|-----------|
| `contract_templates` | Modelos de contrato |
| `contract_alerts` | Alertas de vencimento |
| `contract_attachments` | Anexos |
| `contract_analysis` | Analise IA |
| `contract_obligations` | Obrigacoes |
| `contract_signatures` | Assinaturas eletronicas |
| `contract_history` | Historico de versoes |

### Seguranca
| Tabela | Descricao |
|--------|-----------|
| `user_roles` | Roles de usuario |
| `role_permissions` | Permissoes por role |
| `mfa_requirements` | Exigencia de 2FA por role |
| `audit_logs` | Log de auditoria completo |
| `user_sessions` | Sessoes ativas |

---

## 3. Edge Functions (Backend)

### Comunicacao
| Funcao | Porta | Descricao |
|--------|-------|-----------|
| `enviar-notificacao-email` | Resend API | Emails transacionais |
| `enviar-notificacao-whatsapp` | WhatsApp API | Notificacoes WhatsApp |
| `enviar-convite-organizacao` | Resend API | Convites de equipe |

### Processamento de Contratos
| Funcao | Descricao |
|--------|-----------|
| `analisar-contrato` | Analise IA de contratos |
| `extrair-dados-pdf` | Extracao de dados de PDF |
| `processar-requisicao-contrato` | Processamento de requisicoes |
| `signature-webhook` | Webhooks de assinatura (DocuSign, Clicksign, D4Sign) |

### Seguranca
| Funcao | Descricao |
|--------|-----------|
| `totp-auth` | Geracao e verificacao 2FA |
| `rate-limiter` | Rate limiting por role |
| `security-alert-handler` | Tratamento de incidentes |
| `security-metrics` | Metricas de seguranca |
| `gdpr-handler` | Requisicoes LGPD/GDPR |

### Automacao
| Funcao | Descricao |
|--------|-----------|
| `verificar-alertas` | Verificacao automatica de alertas |
| `anomaly-detector` | Deteccao de anomalias |

---

## 4. Autenticacao e Seguranca

### Fluxo de Login
```
1. Usuario acessa /auth
2. Supabase.auth.signIn()
3. Se 2FA habilitado → TwoFactorVerification
4. AuthContext carrega sessao
5. OrganizationContext carrega organizacao
6. Redirecionamento para Dashboard
```

### Roles Disponiveis
- `administrador` - Acesso total
- `consultoria_juridica` - Gestao juridica
- `analista_juridico` - Analise de contratos
- `financeiro_senior` - Gestao financeira
- `operacional` - Operacoes basicas

### Seguranca Implementada
- Row Level Security (RLS) em todas as tabelas
- CORS validado em todas Edge Functions
- Rate limiting por endpoint e role
- 2FA com TOTP (SHA-256)
- Audit logging completo
- Sanitizacao HTML com DOMPurify

---

## 5. Variaveis de Ambiente

### Frontend (.env)
```bash
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJxxx
```

### Supabase (Dashboard > Settings > Edge Functions)
```bash
ALLOWED_ORIGIN=https://seu-dominio.com
CRON_SECRET=secret-para-jobs-agendados
RESEND_API_KEY=re_xxx
WEBHOOK_SECRET=whsec_xxx
LOVABLE_API_KEY=xxx
```

---

## 6. Comandos Principais

```bash
# Desenvolvimento
npm install          # Instalar dependencias
npm run dev          # Servidor de desenvolvimento (porta 8080)

# Producao
npm run build        # Gerar build de producao
npm run preview      # Previsualizar build

# Qualidade
npm run lint         # Verificar codigo
npm audit            # Verificar vulnerabilidades
```

---

## 7. Fluxos de Dados Principais

### Criacao de Contrato
```
Formulario → Validacao → requisicoes_compras →
Workflow Aprovacao → contrato criado → Alertas gerados →
Notificacoes enviadas
```

### Processamento de Documento
```
Upload PDF → extrair-dados-pdf → analisar-contrato (IA) →
contract_analysis → Exibicao no UI
```

### Assinatura Eletronica
```
Contrato pronto → Integracao DocuSign/Clicksign →
Envio para signatarios → Webhook atualiza status →
Notificacao de conclusao
```

---

## 8. Troubleshooting

### Erro de CORS
- Verificar `ALLOWED_ORIGIN` no Supabase
- Dominio deve incluir protocolo: `https://dominio.com`

### Erro 401 em Edge Functions
- Verificar se `CRON_SECRET` esta configurado
- Token Bearer deve ser enviado no header Authorization

### Erro de RLS (Row Level Security)
- Usuario deve ter `organization_id` compativel
- Verificar role do usuario em `user_roles`

### Build Falha
```bash
# Limpar cache
rm -rf node_modules dist
npm install
npm run build
```

### Erro de 2FA
- Verificar se `user_2fa_settings` tem registro para o usuario
- Token expira em 15 minutos

---

## 9. Integracao com Servicos Externos

| Servico | Uso | Configuracao |
|---------|-----|--------------|
| Resend | Email | `RESEND_API_KEY` |
| DocuSign | Assinatura | Webhook URL + `WEBHOOK_SECRET` |
| Clicksign | Assinatura | Webhook URL + `WEBHOOK_SECRET` |
| D4Sign | Assinatura | Webhook URL + `WEBHOOK_SECRET` |
| Lovable API | Analise IA | `LOVABLE_API_KEY` |

---

## 10. Contatos e Recursos

- **Repositorio**: GitHub (branch main)
- **Supabase Dashboard**: https://app.supabase.com
- **Logs Edge Functions**: Supabase > Edge Functions > Logs

---

## 11. Checklist de Deploy

- [ ] Variaveis de ambiente configuradas
- [ ] `ALLOWED_ORIGIN` com dominio de producao
- [ ] Buckets de storage com politicas corretas
- [ ] DNS apontando para hosting
- [ ] SSL/HTTPS habilitado
- [ ] Backup de banco configurado
- [ ] Monitoramento ativo

---

*Documento gerado em: 2026-02-01*
*Versao do Sistema: 1.0.0*
