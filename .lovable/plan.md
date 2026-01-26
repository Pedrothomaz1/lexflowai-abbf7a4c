

## Plano Consolidado: Menu + Custos em Configurações + Registro de Tokens

---

## Parte 1: Reorganização do Menu da Sidebar

### Mudanças no Menu

| Mudança | Arquivo | Antes | Depois |
|---------|---------|-------|--------|
| Renomear grupo | AppSidebar.tsx (linha 278) | `Admin Central` | `Cadastro` |
| Mover Custos para Settings | AppSidebar.tsx | Item separado no menu | Seção dentro de /settings |

### Remover "Custos" do Menu Lateral

Atualmente, "Custos" aparece como item separado no grupo "Sistema" (linha 80):

```typescript
const sistemaMenuItems = [
  { title: "Custos", url: "/custos", icon: DollarSign, roles: ["administrador"], group: "sistema" },
  { title: "Configurações", url: "/settings", icon: Settings, roles: ["all"], group: "sistema" },
];
```

**Mudança:** Remover o item "Custos" do `sistemaMenuItems`:

```typescript
const sistemaMenuItems = [
  { title: "Configurações", url: "/settings", icon: Settings, roles: ["all"], group: "sistema" },
];
```

### Renomear "Admin Central" para "Cadastro" (linha 278)

```typescript
// Antes
<SidebarGroupLabel>Admin Central</SidebarGroupLabel>

// Depois
<SidebarGroupLabel>Cadastro</SidebarGroupLabel>
```

---

## Parte 2: Adicionar "Custos" dentro de Configurações

### Mudança na Página Settings.tsx

Adicionar um novo Card para "Custos Operacionais" que redireciona para `/custos`, visível apenas para administradores:

```typescript
{/* Custos - Admin Only */}
{isAdmin && (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <DollarSign className="h-5 w-5" />
        Custos Operacionais
      </CardTitle>
      <CardDescription>
        Acompanhe o consumo de recursos e custos da plataforma
      </CardDescription>
    </CardHeader>
    <CardContent>
      <Button 
        variant="outline" 
        className="w-full sm:w-auto"
        onClick={() => navigate('/custos')}
      >
        <DollarSign className="h-4 w-4 mr-2" />
        Ver Custos e Consumo
      </Button>
    </CardContent>
  </Card>
)}
```

### Adicionar Import de DollarSign

```typescript
import { 
  Shield, 
  CheckCircle2, 
  FileSignature, 
  Bell, 
  Link2, 
  ShoppingCart,
  TestTube,
  Loader2,
  AlertCircle,
  Check,
  DollarSign  // Adicionar
} from "lucide-react";
```

---

## Parte 3: Registro de Uso de Tokens de IA

### Problema Atual

As edge functions que consomem tokens **NÃO registram** o uso na tabela `uso_sistema`, impossibilitando o rastreamento de custos de IA.

### Funções a Modificar

| Função | Tokens Estimados | Registro Atual |
|--------|------------------|----------------|
| `analisar-contrato` | ~500-1500/doc | Nao registra |
| `analisar-contrato-ia` | ~2000-5000/doc | Nao registra |

### Modificacao em `analisar-contrato-ia/index.ts`

**1. Capturar tokens da resposta da API (apos `const data = await response.json()`):**

```typescript
const data = await response.json();
const analiseTexto = data.choices[0]?.message?.content;

// Capturar tokens utilizados
const tokensUsados = data.usage?.total_tokens || 0;
const promptTokens = data.usage?.prompt_tokens || 0;
const completionTokens = data.usage?.completion_tokens || 0;

console.log(`Tokens utilizados: ${tokensUsados} (prompt: ${promptTokens}, completion: ${completionTokens})`);
```

**2. Registrar na tabela `uso_sistema` (apos salvar analise no banco):**

```typescript
// Registrar uso de tokens
if (userId && tokensUsados > 0) {
  const { error: usageError } = await supabase
    .from('uso_sistema')
    .insert({
      tipo: 'ai_tokens',
      recurso: 'analisar-contrato-ia',
      quantidade: tokensUsados,
      custo_unitario: 0.00001, // Custo estimado por token
      custo_total: tokensUsados * 0.00001,
      user_id: userId,
      contrato_id: contratoId,
      metadata: {
        modelo: 'google/gemini-2.5-flash',
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens
      }
    });

  if (usageError) {
    console.error('Erro ao registrar uso de tokens:', usageError);
  } else {
    console.log('Uso de tokens registrado com sucesso');
  }
}
```

### Modificacao em `analisar-contrato/index.ts`

**1. Capturar tokens da resposta (apos `const aiResponse = await response.json()`):**

```typescript
const aiResponse = await response.json();

// Capturar tokens utilizados
const tokensUsados = aiResponse.usage?.total_tokens || 0;
const promptTokens = aiResponse.usage?.prompt_tokens || 0;
const completionTokens = aiResponse.usage?.completion_tokens || 0;

console.log(`Tokens utilizados: ${tokensUsados}`);
```

**2. Registrar na tabela (antes do return de sucesso):**

```typescript
// Registrar uso de tokens
const authHeader = req.headers.get('Authorization');
const token = authHeader?.replace('Bearer ', '');

if (token && tokensUsados > 0) {
  const { data: { user } } = await supabase.auth.getUser(token);
  
  if (user) {
    await supabase
      .from('uso_sistema')
      .insert({
        tipo: 'ai_tokens',
        recurso: 'analisar-contrato',
        quantidade: tokensUsados,
        custo_unitario: 0.00001,
        custo_total: tokensUsados * 0.00001,
        user_id: user.id,
        metadata: {
          modelo: 'google/gemini-2.5-flash',
          prompt_tokens: promptTokens,
          completion_tokens: completionTokens
        }
      });
  }
}
```

---

## Resumo de Arquivos a Modificar

| Arquivo | Mudanca |
|---------|---------|
| `src/components/AppSidebar.tsx` | Remover "Custos" do menu, renomear "Admin Central" para "Cadastro" |
| `src/pages/Settings.tsx` | Adicionar Card "Custos Operacionais" com botao para /custos |
| `supabase/functions/analisar-contrato-ia/index.ts` | Capturar e registrar tokens usados |
| `supabase/functions/analisar-contrato/index.ts` | Capturar e registrar tokens usados |

---

## Estrutura Final do Menu

### Modulo Contratos

```text
OPERACAO
  - Dashboard
  - Contratos

CONTROLE
  - Obrigacoes
  - Workflows (admin)

CADASTRO  ← renomeado
  - Fornecedores
  - Templates
  - Usuarios (admin)

SISTEMA
  - Configuracoes  ← Custos agora esta aqui dentro
```

### Modulo Servicos

```text
OPERACAO
  - Dashboard
  - Servicos

CADASTRO  ← renomeado
  - Fornecedores
  - Unidades
  - Especificacoes
  - Usuarios (admin)

SISTEMA
  - Configuracoes  ← Custos agora esta aqui dentro
```

---

## Resultado Esperado

### Menu
- Grupo "Admin Central" renomeado para "Cadastro"
- Item "Custos" removido do menu lateral
- Custos acessivel via Configuracoes (para admins)

### Rastreamento de Custos
- Cada analise de IA registra automaticamente os tokens consumidos
- Pagina `/custos` mostrara o uso real de tokens por usuario
- Metadados incluem: funcao, modelo, contrato analisado
- Permite controle e planejamento de custos de IA

