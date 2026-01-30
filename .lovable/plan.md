
# Plano: Redesign do Header do Formulário Público

## Problema Identificado

O header atual do formulário `/requisicao` está visualmente simples e desconectado do design premium do LexFlow. Faltam:
- Container com backdrop/glassmorphism para o logo
- Hierarquia visual adequada
- Espaçamento e proporções profissionais
- Elementos decorativos que transmitam confiança

## Solução Proposta

Redesenhar o header seguindo o padrão visual do `SeletorModulo.tsx`, que utiliza o design system LexFlow corretamente.

### Mudanças Visuais

**Antes:**
- Logo pequeno (40x40) sem container
- Título simples ao lado do logo
- Subtítulos com cores diretas sem hierarquia

**Depois:**
- Logo em container glassmorphism (64x64) com backdrop blur e borda sutil
- Título principal grande e elegante abaixo do logo
- Subtítulo em cor `verde-claro` com melhor legibilidade
- Descrição com opacidade reduzida para hierarquia
- Separador visual sutil antes do card do formulário
- Badge decorativo indicando "Departamento Jurídico"

### Estrutura do Novo Header

```text
+--------------------------------------------------+
|                                                  |
|     +------------------+                         |
|     |    [LOGO]        |   <- Container glass   |
|     +------------------+                         |
|                                                  |
|           LEXFLOW                                |
|     Sistema de Gestão de Contratos               |
|                                                  |
|     [Badge: Departamento Jurídico]               |
|                                                  |
|     Formulário de Requisição de Contratos        |
|                                                  |
|     Utilize este formulário para solicitar...    |
|                                                  |
|     ────────────────────────────                 |
|                                                  |
+--------------------------------------------------+
```

## Alterações Técnicas

### Arquivo: `src/pages/RequisicaoPublica.tsx`

Modificar as linhas 177-189 (seção Header) com:

1. **Container do Logo** (glassmorphism):
```tsx
<div className="h-20 w-20 rounded-2xl bg-[hsl(var(--lexflow-off-white)/0.1)] flex items-center justify-center backdrop-blur-sm border border-[hsl(var(--lexflow-off-white)/0.15)] shadow-lg">
  <img src={logoVeridiana} alt="Veridiana" className="h-12 w-12 object-contain" />
</div>
```

2. **Título Principal**:
```tsx
<h1 className="text-4xl md:text-5xl font-bold text-[hsl(var(--lexflow-off-white))] tracking-tight">
  LexFlow
</h1>
<p className="text-lg text-[hsl(var(--lexflow-verde-claro))]">
  Sistema de Gestão de Contratos
</p>
```

3. **Badge Departamento**:
```tsx
<div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[hsl(var(--lexflow-verde-principal)/0.2)] border border-[hsl(var(--lexflow-verde-principal)/0.3)]">
  <Scale className="h-4 w-4 text-[hsl(var(--lexflow-verde-principal))]" />
  <span className="text-sm font-medium text-[hsl(var(--lexflow-verde-claro))]">
    Departamento Jurídico
  </span>
</div>
```

4. **Subtítulo e Descrição**:
```tsx
<h2 className="text-2xl md:text-3xl font-semibold text-[hsl(var(--lexflow-off-white))]">
  Formulário de Requisição
</h2>
<p className="text-[hsl(var(--lexflow-verde-claro)/0.8)] max-w-2xl mx-auto leading-relaxed">
  Solicite a elaboração ou análise de contratos pela equipe jurídica.
</p>
```

5. **Separador Decorativo**:
```tsx
<div className="w-24 h-1 mx-auto rounded-full bg-gradient-to-r from-transparent via-[hsl(var(--lexflow-verde-principal))] to-transparent" />
```

## Resumo das Alterações

| Componente | Antes | Depois |
|------------|-------|--------|
| Container Logo | Nenhum | Glassmorphism 80x80 |
| Logo Size | 40x40 | 48x48 |
| Título | text-3xl inline | text-4xl/5xl centralizado |
| Hierarquia | Plana | 4 níveis visuais |
| Badge | Não existe | Departamento Jurídico |
| Separador | Não existe | Gradiente sutil |
| Espaçamento | mb-8 | space-y-6 com padding adequado |
