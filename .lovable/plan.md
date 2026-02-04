
# Plano: Implementação do Novo Logo LexFlow

## Resumo
Substituir o logo antigo (`logo-veridiana.png`) pelos novos assets do LexFlow em todas as áreas da aplicação:
- Logo horizontal (400x100px) para a página de login
- Logo quadrado (200x200px) para a sidebar e ícone

---

## Assets a serem adicionados

| Arquivo | Destino | Uso |
|---------|---------|-----|
| `Logo_400x100px.png` | `src/assets/logo-lexflow-horizontal.png` | Página de login (desktop e mobile) |
| `Logo_200x200px.png` | `src/assets/logo-lexflow-icon.png` | Sidebar header (ícone compacto) |

---

## Componentes a serem atualizados

### 1. Sidebar (`src/components/AppSidebar.tsx`)

| Linha | Alteração |
|-------|-----------|
| 61 | Trocar `import logoVeridiana from "@/assets/logo-veridiana.png"` por `import logoLexFlowIcon from "@/assets/logo-lexflow-icon.png"` |
| 319 | Atualizar `<img src={logoVeridiana}` para `<img src={logoLexFlowIcon}` e ajustar alt para "LexFlow" |

**Resultado visual:** O ícone quadrado aparecerá no topo da sidebar, ao lado do nome "LexFlow".

---

### 2. Página de Login (`src/pages/Auth.tsx`)

| Linha | Alteração |
|-------|-----------|
| 11 | Trocar `import logoVeridiana from "@/assets/logo-veridiana.png"` por `import logoLexFlowIcon from "@/assets/logo-lexflow-icon.png"` e adicionar `import logoLexFlowHorizontal from "@/assets/logo-lexflow-horizontal.png"` |
| 206-210 | Desktop: usar o ícone quadrado no container |
| 258-262 | Mobile: usar o ícone quadrado no container |

**Alternativa:** Opcionalmente, podemos usar o logo horizontal completo no desktop e apenas o ícone no mobile para melhor aproveitamento do espaço.

---

### 3. Arquivo legado a remover

| Arquivo | Ação |
|---------|------|
| `src/assets/logo-veridiana.png` | Pode ser removido após a migração |

---

## Visualização das mudanças

```text
ANTES:
┌────────────────────────┐
│ [Veridiana Icon]       │
│  LexFlow               │
│  Módulo: Jurídico      │
└────────────────────────┘

DEPOIS:
┌────────────────────────────────┐
│ [LexFlow Icon]                 │
│  (escudo com lupa + relógio)   │
│  LexFlow                       │
│  Módulo: Jurídico              │
└────────────────────────────────┘
```

---

## Arquivos que serão modificados

| Arquivo | Tipo |
|---------|------|
| `src/assets/logo-lexflow-icon.png` | Novo (copiar de upload) |
| `src/assets/logo-lexflow-horizontal.png` | Novo (copiar de upload) |
| `src/components/AppSidebar.tsx` | Editar imports e referências |
| `src/pages/Auth.tsx` | Editar imports e referências |

---

## Detalhes Técnicos

Os logos serão importados como módulos ES6 através da pasta `src/assets/`, seguindo o padrão já existente no projeto. Isso garante:
- Otimização de bundling pelo Vite
- Type safety com TypeScript
- Cache busting automático em produção

```typescript
// Exemplo de uso nos componentes
import logoLexFlowIcon from "@/assets/logo-lexflow-icon.png";
import logoLexFlowHorizontal from "@/assets/logo-lexflow-horizontal.png";

// Sidebar
<img src={logoLexFlowIcon} alt="LexFlow" className="h-6 w-6 object-contain" />

// Login page (desktop)
<img src={logoLexFlowIcon} alt="LexFlow" className="h-6 w-6 object-contain" />
```
