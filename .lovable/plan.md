

# Plano: Configurar GitHub Actions para Testes Automatizados

## Resumo

Criar um workflow do GitHub Actions que executa automaticamente os testes do Vitest sempre que houver um **push** ou **Pull Request** no repositório.

---

## O Que Vamos Fazer

### 1. Criar Estrutura de Pastas
- Criar pasta `.github/workflows/`
- Criar arquivo de configuração `tests.yml`

### 2. Adicionar Script de Teste ao package.json
- Adicionar comando `"test": "vitest run"` nos scripts

---

## Arquivo a Ser Criado

```text
.github/
└── workflows/
    └── tests.yml    (NOVO)
```

---

## Como Vai Funcionar

```text
┌─────────────────────────────────────────────────────────────┐
│  Você faz PUSH ou abre um PR no GitHub                      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  GitHub Actions detecta automaticamente                     │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Executa os passos:                                         │
│  1. Configura Node.js 20                                    │
│  2. Instala dependências (npm ci)                           │
│  3. Roda os testes (npm run test)                           │
└─────────────────────────────────────────────────────────────┘
                            │
              ┌─────────────┴─────────────┐
              ▼                           ▼
     ┌────────────────┐          ┌────────────────┐
     │   PASSOU       │          │   FALHOU       │
     │   (verde)      │          │   (vermelho)   │
     └────────────────┘          └────────────────┘
```

---

## Benefícios

- **Automático** - Não precisa lembrar de rodar testes
- **Visível** - Status aparece diretamente no PR do GitHub
- **Seguro** - Bloqueia merge se testes falharem
- **Gratuito** - GitHub Actions é gratuito para repositórios públicos (e tem limite generoso para privados)

---

## Detalhes Técnicos

### Configuração do Workflow (.github/workflows/tests.yml)

```yaml
name: Tests

on:
  push:
    branches: [main, master]
  pull_request:
    branches: [main, master]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm run test
```

### Script a Adicionar no package.json

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage"
  }
}
```

---

## Onde Ver os Resultados

Após configurar, você verá:

1. **Na aba "Actions" do GitHub** - Histórico de todas as execuções
2. **Nos Pull Requests** - Ícone verde (passou) ou vermelho (falhou)
3. **Nos commits** - Check mark indicando status

---

## Requisitos

- Projeto conectado ao GitHub (você já tem isso)
- Arquivo `vitest.config.ts` configurado (já feito)
- Testes criados na pasta `src/` (já feito)

