
# Plano: Correção Visual Completa do Formulário de Requisição

## Problema Identificado

O header do formulário público está com cores muito desbotadas e sem contraste adequado:
- Título "LexFlow" quase invisível (usando `--lexflow-off-white` que é cinza claro)
- Subtítulos com verde muito pálido
- Badge com cores muito translúcidas
- Falta de hierarquia visual clara

## Solução: Redesign com Cores de Alto Contraste

Usar cores sólidas e diretas para garantir legibilidade máxima:
- **Branco puro (#FFFFFF)** para títulos principais
- **Verde vibrante (#7F9C90)** para destaques e badges
- Aumentar opacidade dos elementos decorativos

## Mudanças Visuais Propostas

| Elemento | Antes (Problema) | Depois (Solução) |
|----------|------------------|------------------|
| Logo Container | `bg-[...off-white/0.1]` muito transparente | `bg-white/15` com mais presença |
| Título "LexFlow" | `text-[hsl(var(--lexflow-off-white))]` cinza | `text-white` branco puro |
| Subtítulo Sistema | `text-[hsl(var(--lexflow-verde-claro))]` pálido | `text-white/80` claro e legível |
| Badge | Cores translúcidas | `bg-white/20` com `text-white` |
| Título Formulário | Cor pálida | `text-white` sólido |
| Descrição | Opacidade muito baixa | `text-white/70` legível |
| Separador | Verde translúcido | `bg-white/40` mais visível |

## Estrutura Visual Final

```text
+----------------------------------------------------------+
|                                                          |
|     +------------------+                                 |
|     |    [LOGO]        |   <- bg-white/15, borda branca  |
|     +------------------+                                 |
|                                                          |
|           LEXFLOW              <- text-white (puro)      |
|     Sistema de Gestão          <- text-white/80          |
|                                                          |
|     [ Departamento Jurídico ]  <- bg-white/20 + branco   |
|                                                          |
|     Formulário de Requisição   <- text-white (puro)      |
|     Solicite a elaboração...   <- text-white/70          |
|                                                          |
|     ════════════════════       <- bg-white/40            |
|                                                          |
+----------------------------------------------------------+
```

## Alterações Técnicas

### Arquivo: `src/pages/RequisicaoPublica.tsx`

Modificar o bloco de header (linhas 178-218):

**1. Logo Container:**
```tsx
// DE:
<div className="h-20 w-20 rounded-2xl bg-[hsl(var(--lexflow-off-white)/0.1)] ... border border-[hsl(var(--lexflow-off-white)/0.15)]">

// PARA:
<div className="h-20 w-20 rounded-2xl bg-white/15 ... border border-white/20 shadow-xl">
```

**2. Título Principal:**
```tsx
// DE:
<h1 className="text-4xl md:text-5xl font-bold text-[hsl(var(--lexflow-off-white))] tracking-tight">

// PARA:
<h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight drop-shadow-sm">
```

**3. Subtítulo:**
```tsx
// DE:
<p className="text-lg text-[hsl(var(--lexflow-verde-claro))]">

// PARA:
<p className="text-lg text-white/80">
```

**4. Badge Departamento:**
```tsx
// DE:
<div className="inline-flex ... bg-[hsl(var(--lexflow-verde-principal)/0.2)] border border-[hsl(var(--lexflow-verde-principal)/0.3)]">
  <Scale className="... text-[hsl(var(--lexflow-verde-principal))]" />
  <span className="... text-[hsl(var(--lexflow-verde-claro))]">

// PARA:
<div className="inline-flex ... bg-white/20 border border-white/30 backdrop-blur-sm">
  <Scale className="... text-white" />
  <span className="... text-white font-medium">
```

**5. Título Formulário:**
```tsx
// DE:
<h2 className="text-2xl md:text-3xl font-semibold text-[hsl(var(--lexflow-off-white))]">

// PARA:
<h2 className="text-2xl md:text-3xl font-semibold text-white">
```

**6. Descrição:**
```tsx
// DE:
<p className="text-[hsl(var(--lexflow-verde-claro)/0.8)] max-w-2xl mx-auto leading-relaxed">

// PARA:
<p className="text-white/70 max-w-2xl mx-auto leading-relaxed">
```

**7. Separador:**
```tsx
// DE:
<div className="w-24 h-1 mx-auto rounded-full bg-gradient-to-r from-transparent via-[hsl(var(--lexflow-verde-principal))] to-transparent" />

// PARA:
<div className="w-32 h-1 mx-auto rounded-full bg-gradient-to-r from-transparent via-white/50 to-transparent" />
```

**8. Footer (mesma correção):**
```tsx
// DE:
<div className="text-center mt-8 text-[hsl(var(--lexflow-verde-claro)/0.6)] text-sm">

// PARA:
<div className="text-center mt-8 text-white/50 text-sm">
```

## Resumo das Cores

| Uso | Classe CSS |
|-----|------------|
| Títulos principais | `text-white` |
| Subtítulos | `text-white/80` |
| Descrições | `text-white/70` |
| Footer | `text-white/50` |
| Containers glass | `bg-white/15` ou `bg-white/20` |
| Bordas | `border-white/20` ou `border-white/30` |
| Separadores | `bg-white/50` |

## Resultado Esperado

Formulário com visual limpo, profissional e com alto contraste, garantindo que todos os textos sejam perfeitamente legíveis sobre o fundo verde escuro, mantendo a identidade visual LexFlow.
