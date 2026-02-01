
# Plano: Correção de Erros e Refinamento de UX no LexFlow

## Visao Geral

Este plano aborda duas frentes: (1) correção imediata de erros de build que bloqueiam a aplicação, e (2) refinamento de UX/UI conforme solicitado, focando em Landing Page, Login, Sidebar, Dashboards e Serviços.

---

## Parte 1: Correção de Erros de Build (Prioridade Crítica)

### 1.1 ContractRedlineEditor.tsx - Erro DOMPurify

**Problema**: Propriedade `PARSER_MEDIA_TYPE` não existe no tipo `DOMPurify.Config` atual.

**Solução**: Remover a configuração problemática, pois ela não está sendo utilizada de qualquer forma (a configuração atual já não inclui essa propriedade - o erro é de outro tipo).

**Arquivo**: `src/components/ContractDetails/ContractRedlineEditor.tsx`

**Ação**: O código atual na linha 35-41 está correto. Verificar se há outro local com PARSER_MEDIA_TYPE ou usar type assertion.

```typescript
// Linha 35-41: Usar type assertion para evitar erro de tipagem
const REDLINE_PURIFY_CONFIG = {
  ALLOWED_TAGS: ['span', 'ins', 'del', 'mark', 'b', 'i', 'strong', 'em', 'br', 'p', 'div'],
  ALLOWED_ATTR: ['class', 'style', 'data-change-id'],
  ALLOW_DATA_ATTR: false,
  FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'link', 'style', 'img', 'svg', 'math'],
  FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur'],
};

// Linha 44-46: Usar o objeto diretamente sem tipagem explícita
function sanitizeRedlineHTML(html: string): string {
  return DOMPurify.sanitize(html, REDLINE_PURIFY_CONFIG);
}
```

---

### 1.2 FranquiaImport.tsx - Erros de Promise

**Problema**: `parseFranquiasXLSX` e `generateFranquiasTemplate` são funções assíncronas que retornam Promise, mas o código as trata como síncronas.

**Solução**: Adicionar `await` às chamadas.

**Arquivo**: `src/components/Franquias/FranquiaImport.tsx`

**Alterações**:

```typescript
// Linha 59: Adicionar await
const results = await parseFranquiasXLSX(buffer);

// Linha 97-98: Tornar função async e adicionar await
const handleDownloadTemplate = async () => {
  const buffer = await generateFranquiasTemplate();
  // ... resto do código
};
```

---

### 1.3 Calendar.tsx - Erro IconLeft/IconRight

**Problema**: react-day-picker v9 removeu `IconLeft` e `IconRight` em favor de `Chevron` com prop `orientation`.

**Solução**: Atualizar para nova API do react-day-picker v9.

**Arquivo**: `src/components/ui/calendar.tsx`

**Alterações**:

```typescript
// Linha 44-47: Atualizar componentes
components={{
  Chevron: ({ orientation }) => 
    orientation === "left" 
      ? <ChevronLeft className="h-4 w-4" />
      : <ChevronRight className="h-4 w-4" />
}}
```

---

## Parte 2: Refinamento de UX/UI

### 2.1 Landing Page (Index.tsx)

**Objetivo**: Aumentar clareza, confiança e conversão.

**Alterações**:

1. **Subtítulo mais escaneável**: Reduzir texto e usar bullets
2. **Adicionar 3 bullets com ícones**:
   - Aprovações automatizadas
   - Assinatura eletrônica
   - Alertas de risco e vencimento
3. **CTA mais proeminente**: Aumentar destaque visual do "Começar Agora"
4. **Prova visual**: Adicionar ilustração ou mockup do dashboard (SVG inline)

```typescript
// Hero Section atualizada
<section className="py-20 text-center">
  <h1 className="text-5xl md:text-6xl font-bold mb-4 ...">
    Gestão de Contratos Inteligente
  </h1>
  <p className="text-xl text-muted-foreground mb-6 max-w-xl mx-auto">
    Automatize todo o ciclo contratual em uma única plataforma.
  </p>
  
  {/* Bullets com ícones */}
  <div className="flex flex-wrap justify-center gap-6 mb-8 text-sm">
    <div className="flex items-center gap-2">
      <CheckCircle className="h-5 w-5 text-primary" />
      <span>Aprovações automatizadas</span>
    </div>
    <div className="flex items-center gap-2">
      <FileSignature className="h-5 w-5 text-primary" />
      <span>Assinatura eletrônica</span>
    </div>
    <div className="flex items-center gap-2">
      <Bell className="h-5 w-5 text-primary" />
      <span>Alertas de vencimento</span>
    </div>
  </div>
  
  {/* CTAs com hierarquia clara */}
  <div className="flex gap-4 justify-center">
    <Button size="lg" onClick={() => navigate("/auth")} className="btn-cta gap-2 shadow-lg">
      Começar Agora
      <ArrowRight className="h-5 w-5" />
    </Button>
    <Button size="lg" variant="outline">
      Saiba Mais
    </Button>
  </div>
</section>
```

---

### 2.2 Login e Cadastro (Auth.tsx)

**Objetivo**: Reduzir fricção e difernciar hierarquia.

**Alterações**:

1. **Checkbox LGPD**:
   - Manter apenas no Cadastro (remover do Login)
   - Login: termos implícitos no ato de logar

2. **Hierarquia visual**:
   - Login como Tab ativa por padrão (já está)
   - Botão de Login com estilo `btn-cta`
   - Botão de Cadastro com estilo secundário

3. **Mensagens de erro inline**:
   - Usar `aria-describedby` nos inputs
   - Mostrar erros abaixo dos campos específicos

**NOTA**: Após análise, o checkbox LGPD deve permanecer em ambas as telas por conformidade legal. A melhoria será no microcopy e feedback visual.

---

### 2.3 Sidebar e Seletor de Módulo

**Objetivo**: Facilitar entendimento e navegação.

**Alterações no AppSidebar.tsx**:

1. **Item ativo mais destacado**:
   - Background sólido diferenciado
   - Ícone com preenchimento
   
2. **Tooltip no seletor de módulo** (já implementado via HelpTooltip)

**Alterações no SeletorModulo.tsx**:

1. **Adicionar badges/tooltips explicativos**:
   - Jurídico: "Contratos, riscos e compliance"
   - Operacional: "Serviços, manutenções e conformidade"

---

### 2.4 Dashboard Executivo

**Objetivo**: Gerar valor imediato, mesmo sem dados.

**Alterações**:

1. **Estados vazios educativos**:
   - Quando não há contratos: mostrar EmptyState com CTA
   - Explicar cada métrica com tooltips (já parcialmente implementado)

2. **KPIs clicáveis**:
   - Já implementado via `onClick` nos StatCards
   - Adicionar `cursor-pointer` explícito e hover state

3. **Contraste de cores**:
   - Verificar e ajustar textos muted

---

### 2.5 Serviços Periódicos

**Objetivo**: Facilitar onboarding e percepção de valor.

**Alterações**:

1. **Estado vazio aprimorado**:
   ```typescript
   <EmptyState
     icon={Wrench}
     title="Comece a gerenciar seus serviços"
     description="Cadastre serviços periódicos para receber alertas automáticos de vencimento."
     action={{ label: "Cadastrar Primeiro Serviço", onClick: () => setIsDialogOpen(true) }}
   />
   ```

2. **Adicionar onboarding checklist visual** quando não há dados:
   - [ ] Cadastrar unidades
   - [ ] Definir tipos de serviço
   - [ ] Criar primeiro serviço
   - [ ] Ativar alertas

3. **Explicar taxa de conformidade**:
   - Adicionar HelpTooltip explicando o cálculo

---

### 2.6 Consistência Visual e Acessibilidade

**Alterações transversais**:

1. **Botões**:
   - Primário: `btn-cta` (sombra, destaque)
   - Secundário: `variant="outline"` (borda visível)
   - Ghost: `variant="ghost"` (sem borda)

2. **Touch targets**:
   - Mínimo 44x44px em botões mobile
   - Adicionar `min-h-[44px] min-w-[44px]` onde necessário

3. **Contraste**:
   - Verificar textos `text-muted-foreground`
   - Garantir ratio 4.5:1 mínimo

4. **Acessibilidade**:
   - `aria-label` em botões de ícone
   - `aria-describedby` para inputs com erro
   - Focus visible em todos elementos

---

## Estrutura de Arquivos Afetados

```text
src/
├── components/
│   ├── ContractDetails/
│   │   └── ContractRedlineEditor.tsx   (corrigir DOMPurify)
│   ├── Franquias/
│   │   └── FranquiaImport.tsx          (corrigir async/await)
│   └── ui/
│       ├── calendar.tsx                (corrigir react-day-picker v9)
│       └── empty-state.tsx             (opcional: adicionar prop suggestions)
├── pages/
│   ├── Index.tsx                       (refinar Landing Page)
│   ├── Auth.tsx                        (ajustar hierarquia e feedback)
│   ├── Dashboard.tsx                   (estados vazios educativos)
│   ├── Servicos.tsx                    (onboarding e empty state)
│   └── SeletorModulo.tsx               (tooltips explicativos)
└── index.css                           (ajustes de contraste se necessário)
```

---

## Cronograma de Implementação

### Fase 1: Correções Críticas (Imediato)
1. Corrigir `ContractRedlineEditor.tsx` - DOMPurify
2. Corrigir `FranquiaImport.tsx` - async/await
3. Corrigir `calendar.tsx` - react-day-picker v9

### Fase 2: Quick Wins de UX
1. Landing Page - bullets e CTA
2. Serviços - empty state aprimorado
3. Dashboard - empty state educativo

### Fase 3: Refinamentos
1. Auth - hierarquia visual
2. Seletor de Módulo - tooltips
3. Acessibilidade transversal

---

## Detalhes Técnicos

### Correção DOMPurify

```typescript
// ContractRedlineEditor.tsx - Remover tipagem explícita problemática
const REDLINE_PURIFY_CONFIG = {
  ALLOWED_TAGS: ['span', 'ins', 'del', 'mark', 'b', 'i', 'strong', 'em', 'br', 'p', 'div'],
  ALLOWED_ATTR: ['class', 'style', 'data-change-id'],
  ALLOW_DATA_ATTR: false,
  FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'link', 'style', 'img', 'svg', 'math'],
  FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur'],
} as const;
```

### Correção react-day-picker v9

```typescript
// calendar.tsx
import { DayPicker, type ChevronProps } from "react-day-picker";

function Calendar({ ... }: CalendarProps) {
  return (
    <DayPicker
      ...
      components={{
        Chevron: (props: ChevronProps) => {
          if (props.orientation === "left") {
            return <ChevronLeft className="h-4 w-4" />;
          }
          return <ChevronRight className="h-4 w-4" />;
        },
      }}
    />
  );
}
```

### Correção FranquiaImport

```typescript
// Linha 57-66
try {
  const buffer = await file.arrayBuffer();
  const results = await parseFranquiasXLSX(buffer); // await adicionado
  
  if (results.length === 0) {
    setError("Nenhum dado encontrado no arquivo.");
    return;
  }
  
  setParseResults(results);
} catch (err) {
  // ...
}

// Linha 97-108
const handleDownloadTemplate = async () => {
  const buffer = await generateFranquiasTemplate(); // await adicionado
  const blob = new Blob([buffer], { ... });
  // ...
};
```

---

## Resultados Esperados

| Métrica | Antes | Depois |
|---------|-------|--------|
| Erros de build | 5 | 0 |
| Clareza do Hero | Média | Alta |
| Onboarding Serviços | Nenhum | Checklist visual |
| Estados vazios | Genéricos | Contextuais com CTA |
| Touch targets mobile | Variável | 44px mínimo |
