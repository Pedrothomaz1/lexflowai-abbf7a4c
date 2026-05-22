## Objetivo

Substituir o prompt genérico atual da análise de contratos por **4 análises especialistas** baseadas nas skills jurídicas já carregadas, com seleção automática conforme o tipo do contrato e opção manual no UI.

## Skills aplicadas

| Skill | Quando aplicar | Output |
|-------|----------------|--------|
| `nda-triage` | tipo contém "NDA", "confidencialidade", "sigilo" | Classificação ✅/⚠️/❌ + checklist |
| `contract-review` | demais contratos (fornecimento, serviços, locação, SaaS, etc.) | Análise cláusula-a-cláusula 🟢🟡🔴⚫ + redlines + score |
| `legal-risk-assessment` | sempre (complementar) | Matriz 8 categorias + probabilidade × impacto |
| `compliance` | sempre (complementar) | LGPD + Anticorrupção + Trabalhista + Fiscal |

## Mudanças

### 1. Backend — edge functions

**Refatorar `analisar-contrato-ia`** para receber `skill: 'auto' | 'contract-review' | 'nda-triage' | 'risk-assessment' | 'compliance' | 'full'`:

- Auto-detecta skill pelo `contrato.tipo_contrato`
- `full` = roda as 4 em sequência e consolida
- Cada skill tem seu **prompt system dedicado** (extraído da skill correspondente) usando **tool calling** para output estruturado em vez do JSON via texto
- Modelo: `google/gemini-2.5-pro` para `full`/`contract-review`, `google/gemini-2.5-flash` para triage/risk/compliance (mais barato)
- Salva em `contract_analysis` com novo campo `skill_aplicada` + `payload_estruturado` (JSONB)

**Nova migration:**
```sql
ALTER TABLE contract_analysis
  ADD COLUMN IF NOT EXISTS skill_aplicada text DEFAULT 'contract-review',
  ADD COLUMN IF NOT EXISTS payload_estruturado jsonb DEFAULT '{}'::jsonb;
```

Schemas estruturados por skill (via `tools` / `function_calling`):
- **contract-review:** `{ score, clausulas: [{categoria, status, texto_original, problema, redline_sugerido, prioridade}], resumo, recomendacao }`
- **nda-triage:** `{ classificacao: 'aprovar'|'revisar'|'rejeitar', pontos_atencao, checklist }`
- **risk-assessment:** `{ score_geral, riscos: [{categoria, descricao, probabilidade, impacto, classificacao, mitigante, exposicao_estimada}] }`
- **compliance:** `{ frameworks: [{nome, status, gaps}], acoes_necessarias }`

### 2. Frontend

**`ContractAIAnalysis.tsx`** — adicionar abas para renderizar cada skill (Cláusulas / Riscos / Compliance / NDA Triage) com componentes visuais específicos:
- Cláusulas: tabela com badge de status (🟢🟡🔴⚫) + accordion mostrando redline
- Riscos: heatmap probabilidade × impacto
- Compliance: cards por framework
- NDA: card com classificação grande + checklist

**Botão "Analisar contrato" em `ContratoDetalhes`** vira um **dropdown** com opções:
- "Análise completa (recomendado)" → `skill=full`
- "Revisão cláusula-a-cláusula" → `contract-review`
- "Triagem de NDA" → `nda-triage`
- "Mapa de riscos" → `risk-assessment`
- "Compliance (LGPD/Anticorrupção)" → `compliance`

A auto-seleção sugere a opção default baseada em `tipo_contrato`.

### 3. Indicadores no Dashboard IA

`DashboardIA.tsx` ganha 1 card por skill ativa com contagem de análises e drill-down. Risk heatmap consolidado entre contratos com `risk-assessment`.

## Detalhes técnicos

- Skills permanecem em `.workspace/skills/` (não duplicar). Os prompts das edge functions são **derivados** do conteúdo da skill (copiar trechos do workflow e do template de output), mantendo a skill como fonte da verdade documental.
- Tool calling em vez de pedir JSON: mais confiável e elimina o `try/catch JSON.parse` atual.
- Disclaimer obrigatório (assistência por IA, validar com advogado) renderizado no rodapé de cada análise.
- Reutilizar `ContractRiskBadge` já existente, estendendo para aceitar classificação textual (`baixo|medio|alto|critico`).
- Custos: registrar `skill_aplicada` em `uso_sistema.metadata` para auditoria.

## Fora de escopo

- Editor de playbook configurável (skill `contract-review` menciona; fica para fase futura).
- Geração automática de NDA model (pode reaproveitar `gerar-documento` depois).
- Re-análise automática ao trocar anexo (já planejado em refinamento anterior, mantém-se).

## Entregáveis

1. Migration `contract_analysis` (2 colunas).
2. `analisar-contrato-ia` refatorada com 4 modos + `full`.
3. `ContractAIAnalysis.tsx` com abas e componentes por skill.
4. Dropdown de skill no `ContratoDetalhes.tsx`.
5. Cards de skill no `DashboardIA.tsx`.
