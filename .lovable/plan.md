
# Plano: Banner de Consentimento de Cookies

## Visao Geral

Implementar um sistema completo de consentimento de cookies conforme LGPD, com banner fixo no bottom da tela, gerenciamento de preferencias por categoria e persistencia em localStorage.

## Arquivos a Serem Criados/Modificados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `src/hooks/useLocalStorage.ts` | Criar | Hook customizado para persistencia em localStorage |
| `src/hooks/useCookieConsent.ts` | Criar | Hook para gerenciar estado do consentimento |
| `src/components/CookieBanner.tsx` | Criar | Componente do banner de cookies |
| `src/App.tsx` | Modificar | Adicionar CookieBanner no nivel raiz |

---

## Componentes e Funcionalidades

### 1. Hook useLocalStorage

```text
Funcionalidades:
- Getter/setter tipado para localStorage
- Suporte a valores default
- Sincronizacao entre abas (storage event)
- Tratamento de erros de parsing
```

### 2. Hook useCookieConsent

```text
Interface de preferencias:
{
  essential: true,      // Sempre ativo, nao pode desativar
  analytics: boolean,   // Cookies analiticos (opcional)
  marketing: boolean,   // Cookies de marketing (opcional)
  consentGiven: boolean // Se o usuario ja fez uma escolha
}

Funcoes expostas:
- acceptAll(): Aceita todas as categorias
- rejectNonEssential(): Aceita apenas essenciais
- updatePreferences(prefs): Atualiza preferencias especificas
- resetConsent(): Limpa o consentimento (para testes)
- hasConsent: boolean (se ja escolheu)
- preferences: objeto com as preferencias atuais
```

### 3. Componente CookieBanner

```text
Estados:
1. Banner compacto (padrao)
   - Texto explicativo
   - Botoes: "Aceitar todos", "Rejeitar nao essenciais", "Gerenciar"

2. Modal de gerenciamento
   - Lista de categorias com switches
   - Descricao de cada categoria
   - Botao salvar preferencias
   - Botao cancelar

Posicionamento:
- fixed bottom-0 left-0 right-0
- z-index alto (z-50)
- Animacao de entrada (slide-up)
```

---

## Design Visual

### Banner Principal

```text
Layout:
+------------------------------------------------------------------+
| [Cookie Icon] Utilizamos cookies para melhorar sua experiencia.  |
| Ao continuar navegando, voce concorda com nossa politica de      |
| cookies.                                                          |
|                                                                   |
| [Link: Politica de Privacidade]                                  |
|                                                                   |
| [Gerenciar]  [Rejeitar nao essenciais]  [Aceitar todos]         |
+------------------------------------------------------------------+

Cores (consistentes com design system):
- Background: bg-card com borda superior
- Texto: text-foreground e text-muted-foreground
- Botao primario (Aceitar): bg-primary
- Botao secundario (Rejeitar): variant="outline"
- Botao terciario (Gerenciar): variant="ghost"
```

### Modal de Preferencias

```text
Layout:
+-----------------------------------------------+
| [X]                                           |
| Gerenciar Preferencias de Cookies             |
|                                               |
| Cookies Essenciais               [ON] (bloq)  |
| Necessarios para funcionamento basico         |
|                                               |
| Cookies Analiticos               [OFF]        |
| Nos ajudam a entender como voce usa o site    |
|                                               |
| Cookies de Marketing             [OFF]        |
| Usados para publicidade personalizada         |
|                                               |
|            [Cancelar]  [Salvar preferencias]  |
+-----------------------------------------------+
```

---

## Categorias de Cookies

| Categoria | Obrigatorio | Descricao |
|-----------|-------------|-----------|
| Essenciais | Sim | Autenticacao, sessao, preferencias basicas |
| Analiticos | Nao | Metricas de uso, performance, erros |
| Marketing | Nao | Rastreamento, publicidade, remarketing |

---

## Fluxo de Funcionamento

```text
Usuario acessa o site
        |
        v
+-------------------+
| localStorage tem  |----Sim----> Banner oculto
| consentimento?    |             Cookies ativados conforme prefs
+-------------------+
        |
       Nao
        |
        v
+-------------------+
| Exibir banner     |
| compacto          |
+-------------------+
        |
        v
+-------------------+     +-------------------+     +-------------------+
| Aceitar todos     |     | Rejeitar nao      |     | Gerenciar         |
+-------------------+     | essenciais        |     | preferencias      |
        |                 +-------------------+     +-------------------+
        v                         |                         |
Salvar: all=true          Salvar: only essential     Abrir modal
Ocultar banner            Ocultar banner             Selecionar categorias
                                                     Salvar e ocultar
```

---

## Detalhes Tecnicos

### Estrutura de Dados no localStorage

```typescript
// Chave: 'lexflow-cookie-consent'
interface CookieConsent {
  version: 1;
  timestamp: string; // ISO date
  preferences: {
    essential: true;
    analytics: boolean;
    marketing: boolean;
  };
}
```

### Componentes Utilizados

```text
- Dialog (para modal de preferencias)
- Switch (para toggles de categoria)
- Button (para acoes)
- Card (para estrutura do banner)
- Separator (entre categorias)
- Lucide icons: Cookie, Settings, Shield, BarChart3, Megaphone
```

### Animacoes

```text
Banner:
- Entrada: animate-slide-up (ja existe em index.css)
- Saida: fade-out ao aceitar/rejeitar

Modal:
- Usar animacoes padrao do Dialog component
```

---

## Codigo do Hook useLocalStorage

```typescript
import { useState, useEffect, useCallback } from "react";

export function useLocalStorage<T>(key: string, initialValue: T) {
  // Funcao para ler valor do localStorage
  const readValue = useCallback((): T => {
    if (typeof window === "undefined") {
      return initialValue;
    }
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  }, [key, initialValue]);

  const [storedValue, setStoredValue] = useState<T>(readValue);

  // Setter com persistencia
  const setValue = useCallback((value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      console.warn(`Error setting localStorage key "${key}":`, error);
    }
  }, [key, storedValue]);

  // Sincronizar entre abas
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue) {
        setStoredValue(JSON.parse(e.newValue));
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [key]);

  return [storedValue, setValue] as const;
}
```

---

## Integracao no App.tsx

```typescript
// Adicionar import
import { CookieBanner } from "./components/CookieBanner";

// Adicionar apos BrowserRouter (dentro do JSX)
<BrowserRouter>
  <Routes>
    {/* ... rotas existentes ... */}
  </Routes>
  <CookieBanner />
</BrowserRouter>
```

---

## Acessibilidade

- Role="dialog" no modal
- aria-label nos botoes
- Focus trap no modal
- Navegacao por teclado
- Cores com contraste adequado

---

## Consideracoes LGPD

1. Consentimento antes de ativar cookies nao essenciais
2. Opcao clara de rejeitar
3. Granularidade por categoria
4. Facilidade de alterar escolha futuramente
5. Link para politica de privacidade

---

## Resumo de Alteracoes

| Acao | Quantidade |
|------|------------|
| Arquivos criados | 3 |
| Arquivos modificados | 1 |
| Hooks novos | 2 |
| Componentes novos | 1 |
