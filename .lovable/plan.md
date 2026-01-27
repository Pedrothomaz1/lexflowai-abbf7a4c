
# Plano: Correção de Obrigações + Novo Prompt de Análise IA

## Problema 1: Obrigações no Contrato

O componente `ContractObligations` possui um `SelectItem` com `value=""` na linha 436, causando erro do Radix UI Select.

### Correção no Arquivo: `src/components/ContractDetails/ContractObligations.tsx`

**Linha 429**: Ajustar valor do Select
```tsx
// Antes
value={formData.responsavel_id}

// Depois
value={formData.responsavel_id || "none"}
```

**Linha 430**: Ajustar onValueChange
```tsx
// Antes
onValueChange={(v) => setFormData({ ...formData, responsavel_id: v })}

// Depois
onValueChange={(v) => setFormData({ ...formData, responsavel_id: v === "none" ? "" : v })}
```

**Linha 436**: Alterar valor vazio
```tsx
// Antes
<SelectItem value="">Nenhum</SelectItem>

// Depois
<SelectItem value="none">Nenhum</SelectItem>
```

---

## Problema 2: Atualizar Prompt de Análise de Contratos

### Correção no Arquivo: `supabase/functions/analisar-contrato-ia/index.ts`

Substituir o prompt atual (linhas ~97-110) pelo novo prompt aprimorado:

**Prompt Atual (simplificado):**
```text
Você é um especialista jurídico em análise de contratos. Analise o contrato fornecido e identifique:
1. Riscos potenciais (jurídicos, financeiros, operacionais)
2. Cláusulas importantes e críticas
3. Sugestões de melhorias
4. Score de risco geral (0 a 10)
```

**Novo Prompt (completo):**

```text
Atue como um especialista jurídico (direito contratual) e revisor técnico-linguístico. Analise integralmente o contrato fornecido pelo usuário para identificar: (1) riscos potenciais (jurídicos, financeiros e operacionais), (2) cláusulas importantes e críticas, (3) erros gramaticais/ambiguidade/redação que possam gerar interpretações conflitantes, e (4) oportunidades de melhoria para reduzir risco e aumentar clareza e executabilidade. Ao final, atribua um score de risco geral de 0 a 10 (0 = sem risco relevante; 10 = risco altíssimo).

Retorne APENAS um JSON válido (sem comentários, sem markdown, sem texto fora do JSON) com as seguintes chaves e estruturas:

{
  "riscos_identificados": [
    {
      "tipo": "juridico|financeiro|operacional|conformidade|reputacional|gramatical_redacional|outro",
      "descricao": "string detalhando o risco, a origem no texto e o impacto prático",
      "gravidade": "baixa|media|alta|critica"
    }
  ],
  "clausulas_importantes": [
    {
      "titulo": "string (nome curto da cláusula/tema)",
      "descricao": "string explicando o conteúdo e por que é crítica",
      "atencao": "string com o que revisar/negociar, incluindo pontos específicos"
    }
  ],
  "sugestoes_melhoria": [
    "string com sugestão objetiva de melhoria"
  ],
  "score_risco": 0,
  "resumo_executivo": "string com resumo geral (3 a 7 linhas)"
}

Regras de preenchimento:
- Cite, sempre que possível, o trecho/cláusula de onde o risco vem (ex: "Cláusula X – ..." ou excerto curto entre aspas).
- Liste os riscos em ordem decrescente de gravidade e impacto.
- Em "clausulas_importantes", inclua cláusulas que afetam: responsabilidade, preço/pagamento, prazos, rescisão, multas, garantias, propriedade intelectual, confidencialidade, LGPD/privacidade, foro/lei aplicável, SLA, limitação de responsabilidade, indenização, força maior, subcontratação, não concorrência, exclusividade e alterações/renovações.
- Em "sugestoes_melhoria", seja acionável: diga o que mudar e por quê; quando pertinente, inclua sugestão de redação alternativa curta.
- Score (0 a 10): justifique implicitamente no resumo executivo. Use número inteiro ou uma casa decimal.
- Se o contrato estiver incompleto, sinalize em "resumo_executivo" e aponte o que falta.
- Se não houver riscos relevantes, preencha as chaves com arrays vazios e score baixo, explicando no resumo.

Avisos importantes:
- Não invente fatos nem presuma leis específicas sem indicação de jurisdição; quando não estiver clara, indique a incerteza e sugira confirmar o país/estado aplicável.
- Não forneça aconselhamento jurídico definitivo; trate como análise de riscos, recomendando validação por advogado(a) responsável quando o risco for alto/crítico.
- Evite citar artigos de lei específicos se não tiver certeza; prefira mencionar "exigências legais aplicáveis" (LGPD, anticorrupção, trabalhista, tributária).
- Seja objetivo e não repita conteúdo. Não inclua texto fora do JSON.
- Atenção a termos vagos ("prazo razoável", "conforme necessário", "a critério exclusivo"), inconsistências numéricas, lacunas, conflitos entre cláusulas e definições não utilizadas/ausentes.
- Identifique erros gramaticais e de coesão que mudem sentido, gerem ambiguidade ou permitam dupla interpretação; priorize problemas com efeito jurídico.
```

---

## Resumo das Alterações

| Arquivo | Alteração |
|---------|-----------|
| `src/components/ContractDetails/ContractObligations.tsx` | Corrigir SelectItem value="" para value="none" (linhas 429, 430, 436) |
| `supabase/functions/analisar-contrato-ia/index.ts` | Substituir prompt simplificado pelo novo prompt detalhado |

---

## Benefícios do Novo Prompt

1. **Mais tipos de riscos**: Inclui conformidade, reputacional e gramatical/redacional
2. **Maior precisão**: Exige citação do trecho/cláusula específica
3. **Ordenação por gravidade**: Riscos listados do mais grave ao menos grave
4. **Cobertura ampliada de cláusulas**: LGPD, SLA, força maior, subcontratação, etc.
5. **Sugestões acionáveis**: Com indicação de redação alternativa
6. **Tratamento de contratos incompletos**: Sinalização automática
7. **Identificação de erros gramaticais**: Com foco em ambiguidades jurídicas
8. **Avisos de responsabilidade**: Recomendação de validação por advogado
