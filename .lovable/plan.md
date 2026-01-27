
# Comparação de Custos por Modelo IA

## Objetivo
Adicionar uma nova seção na página `/custos` que mostre uma comparação entre os modelos de IA disponíveis no Lovable AI Gateway, calculando automaticamente quanto seria economizado se modelos mais baratos fossem utilizados.

## Contexto Atual
- A página já possui cards de estatísticas, gráficos de evolução e distribuição
- Dados de uso já registram o modelo utilizado em `metadata.modelo`
- Atualmente o sistema usa `google/gemini-2.5-flash`
- Já existe 1 registro real: 1.479 tokens com custo de R$ 0,01

## Solução Proposta

### 1. Tabela de Preços dos Modelos
Definir uma estrutura com custos estimados por 1.000 tokens para cada modelo:

```text
Modelo                        Custo/1K tokens    Velocidade    Qualidade
google/gemini-2.5-flash-lite      R$ 0,003         Rápido        Básica
openai/gpt-5-nano                 R$ 0,004         Rápido        Básica
google/gemini-2.5-flash           R$ 0,010         Médio         Boa
openai/gpt-5-mini                 R$ 0,012         Médio         Boa
google/gemini-2.5-pro             R$ 0,025         Lento         Excelente
openai/gpt-5                      R$ 0,030         Lento         Excelente
```

### 2. Nova Seção Visual
Um card com tabela comparativa mostrando:
- Modelo atual utilizado
- Tokens consumidos no período
- Custo real (com modelo atual)
- Custo simulado (se usasse cada modelo)
- Economia potencial (diferença entre custo real e modelo mais barato)
- Indicador visual de economia (percentual em badge verde)

### 3. Card de Recomendação
Um destaque mostrando:
- Modelo mais econômico recomendado
- Economia total potencial no período
- Trade-off em qualidade/velocidade

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/pages/Custos.tsx` | Adicionar nova seção de comparação de modelos IA com tabela e card de economia potencial |

## Detalhes Técnicos

### Estrutura de Dados para Comparação
```typescript
const modelPricing = {
  'google/gemini-2.5-flash-lite': { 
    custoMil: 0.003, 
    velocidade: 'Rápido', 
    qualidade: 'Básica' 
  },
  'openai/gpt-5-nano': { 
    custoMil: 0.004, 
    velocidade: 'Rápido', 
    qualidade: 'Básica' 
  },
  'google/gemini-2.5-flash': { 
    custoMil: 0.010, 
    velocidade: 'Médio', 
    qualidade: 'Boa' 
  },
  'openai/gpt-5-mini': { 
    custoMil: 0.012, 
    velocidade: 'Médio', 
    qualidade: 'Boa' 
  },
  'google/gemini-2.5-pro': { 
    custoMil: 0.025, 
    velocidade: 'Lento', 
    qualidade: 'Excelente' 
  },
  'openai/gpt-5': { 
    custoMil: 0.030, 
    velocidade: 'Lento', 
    qualidade: 'Excelente' 
  },
};
```

### Cálculo de Economia
```typescript
// Para cada modelo, calcular custo simulado
const custoSimulado = (totalTokens / 1000) * modelPricing[modelo].custoMil;

// Economia = custo atual - custo do modelo mais barato
const economiaPotencial = custoAtual - custoModeloMaisBarato;
const percentualEconomia = (economiaPotencial / custoAtual) * 100;
```

### Layout da Nova Seção
```text
+------------------------------------------------------------------+
|  💡 Comparação de Custos por Modelo IA                           |
+------------------------------------------------------------------+
| Modelo                  | Custo/1K  | Custo Simulado | Economia  |
|-------------------------|-----------|----------------|-----------|
| gemini-2.5-flash-lite   | R$ 0,003  | R$ 0,0044      | 70% ↓     |
| gpt-5-nano              | R$ 0,004  | R$ 0,0059      | 60% ↓     |
| gemini-2.5-flash ✓      | R$ 0,010  | R$ 0,0148      | Atual     |
| gpt-5-mini              | R$ 0,012  | R$ 0,0177      | +20% ↑    |
| gemini-2.5-pro          | R$ 0,025  | R$ 0,0370      | +150% ↑   |
| gpt-5                   | R$ 0,030  | R$ 0,0444      | +200% ↑   |
+------------------------------------------------------------------+

+------------------------------------------+
|  🎯 Recomendação de Economia             |
+------------------------------------------+
|  Usando gemini-2.5-flash-lite você       |
|  economizaria R$ 0,0104 (70%) no período |
|                                          |
|  ⚠️ Trade-off: Qualidade básica,         |
|  ideal para tarefas simples              |
+------------------------------------------+
```

### Componentes Visuais
- Usar `Table` existente do projeto para tabela de comparação
- Badges coloridos para indicar economia (verde) ou aumento (vermelho)
- Ícone de check para marcar o modelo atualmente em uso
- Card com destaque para recomendação de economia
- Tooltip explicando o trade-off de cada modelo

## Resultado Esperado
O administrador poderá visualizar claramente:
1. Quanto está gastando com o modelo atual
2. Quanto gastaria com cada modelo alternativo
3. Economia potencial em reais e percentual
4. Recomendação clara do modelo mais econômico com seus trade-offs
