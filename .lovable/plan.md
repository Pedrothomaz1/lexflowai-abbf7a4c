
# Plano: Configurar Testes Automatizados com Vitest

## Resumo

Configurar um ambiente completo de testes automatizados usando **Vitest** + **React Testing Library** para testar os componentes do projeto, incluindo os gráficos premium, utilitários de validação e componentes UI, sem consumir créditos do Lovable.

---

## O Que Vamos Fazer

### 1. Configurar Infraestrutura de Testes
- Adicionar dependências de teste ao projeto
- Criar arquivo de configuração do Vitest
- Configurar arquivo de setup para React Testing Library
- Atualizar TypeScript para reconhecer tipos de teste

### 2. Criar Testes para Componentes Principais

| Componente/Utilitário | Tipo de Teste | Prioridade |
|----------------------|---------------|------------|
| `documentValidation.ts` | Unitário (CPF/CNPJ) | Alta |
| `PremiumCharts.tsx` | Renderização | Alta |
| `utils.ts` (cn function) | Unitário | Média |
| Componentes UI (Button, Card) | Renderização | Média |

### 3. Adicionar Script de Teste
- Comando `npm run test` para rodar testes
- Comando `npm run test:ui` para interface visual (opcional)

---

## Arquivos a Serem Criados/Modificados

```text
projeto/
├── vitest.config.ts              (NOVO)
├── src/
│   └── test/
│       ├── setup.ts              (NOVO)
│       └── example.test.ts       (NOVO - verificação)
├── src/utils/
│   └── documentValidation.test.ts (NOVO)
├── src/components/charts/
│   └── PremiumCharts.test.tsx    (NOVO)
├── src/lib/
│   └── utils.test.ts             (NOVO)
├── package.json                  (ATUALIZAR)
└── tsconfig.app.json             (ATUALIZAR)
```

---

## Benefícios

- **Zero custo de créditos** - Testes rodam localmente
- **Controle total** - Você define o que testar
- **Rápido feedback** - Resultados em segundos
- **Integração CI/CD** - Compatível com GitHub Actions
- **Documentação viva** - Testes servem como especificação

---

## Detalhes Técnicos

### Dependências a Adicionar (devDependencies)

```json
{
  "@testing-library/jest-dom": "^6.6.0",
  "@testing-library/react": "^16.0.0",
  "jsdom": "^20.0.3",
  "vitest": "^3.2.4"
}
```

### Configuracao vitest.config.ts

```typescript
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
```

### Exemplo de Teste: Validacao CPF/CNPJ

```typescript
import { describe, it, expect } from "vitest";
import { validateCPF, validateCNPJ, formatCPF } from "./documentValidation";

describe("validateCPF", () => {
  it("valida CPF correto", () => {
    expect(validateCPF("529.982.247-25")).toBe(true);
  });

  it("rejeita CPF com digitos repetidos", () => {
    expect(validateCPF("111.111.111-11")).toBe(false);
  });

  it("rejeita CPF com digitos verificadores incorretos", () => {
    expect(validateCPF("529.982.247-00")).toBe(false);
  });
});
```

### Exemplo de Teste: Componente React

```typescript
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Sparkline } from "./PremiumCharts";

describe("Sparkline", () => {
  it("renderiza sem erros", () => {
    render(<Sparkline data={[10, 20, 30, 40]} />);
    // Sparkline usa SVG internamente
    expect(document.querySelector("svg")).toBeInTheDocument();
  });
});
```

### Scripts package.json

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:ui": "vitest --ui"
  }
}
```

---

## Como Executar os Testes

Apos a implementacao, voce podera rodar:

```bash
# Rodar todos os testes uma vez
npm run test

# Rodar em modo watch (re-executa ao salvar)
npm run test:watch
```

---

## Cobertura de Testes Inicial

| Arquivo | Testes Planejados |
|---------|-------------------|
| `documentValidation.ts` | 12 testes (CPF valido/invalido, CNPJ valido/invalido, formatacao, deteccao tipo) |
| `PremiumCharts.tsx` | 5 testes (renderizacao de cada componente) |
| `utils.ts` | 3 testes (funcao cn com diferentes inputs) |

**Total inicial: ~20 testes**

