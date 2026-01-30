
# Plano: Corrigir Cor de Fundo Verde do Formulário

## Problema

O fundo externo ao formulário está aparecendo branco/transparente ao invés do verde corporativo. Isso ocorre porque as variáveis CSS HSL não estão sendo interpretadas corretamente no gradiente do Tailwind.

**Causa técnica:**
```tsx
// ATUAL - não funciona corretamente
bg-gradient-to-br from-[hsl(var(--lexflow-verde-escuro))] to-[hsl(var(--lexflow-verde-medio))]
```

## Solução

Usar as cores HEX diretamente ao invés das variáveis CSS:

| Cor | Variável | HEX Direto |
|-----|----------|------------|
| Verde Escuro | `--lexflow-verde-escuro` | `#384E46` |
| Verde Médio | `--lexflow-verde-medio` | `#7F9C90` |

## Alteração Técnica

**Arquivo:** `src/pages/RequisicaoPublica.tsx`

Modificar a linha 175 (container principal) e a linha 119 (tela de sucesso):

**Tela Principal (linha 175):**
```tsx
// DE:
<div className="min-h-screen bg-gradient-to-br from-[hsl(var(--lexflow-verde-escuro))] to-[hsl(var(--lexflow-verde-medio))]">

// PARA:
<div className="min-h-screen bg-gradient-to-br from-[#384E46] to-[#7F9C90]">
```

**Tela de Sucesso (linha 119):**
```tsx
// DE:
<div className="min-h-screen bg-gradient-to-br from-[hsl(var(--lexflow-verde-escuro))] to-[hsl(var(--lexflow-verde-medio))] flex items-center justify-center p-4">

// PARA:
<div className="min-h-screen bg-gradient-to-br from-[#384E46] to-[#7F9C90] flex items-center justify-center p-4">
```

## Resultado Esperado

Fundo com gradiente verde corporativo visível e contrastante, do verde escuro (#384E46) para o verde médio (#7F9C90), com o formulário branco destacado no centro.
