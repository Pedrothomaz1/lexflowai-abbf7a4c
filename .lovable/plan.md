

# Plano: Reorganizar Menu Lateral

## Objetivo
Reorganizar as seções do menu lateral (sidebar) para a seguinte ordem:
1. **Principal** - Dashboard
2. **Organização** - Configurações e Membros da organização
3. **Gestão** - Contratos, Franquias, Requisições
4. **Sistema** - Relatórios, Segurança, Configurações e **Cadastro** (Templates, Fornecedores, Workflows)

---

## Mudanças Visuais

### Antes
```text
├── Principal
├── Gestão  
├── Cadastro
├── Sistema
└── Organização
```

### Depois
```text
├── Principal
├── Organização
├── Gestão
└── Sistema
    ├── Relatórios
    ├── Segurança
    ├── Compliance LGPD
    ├── Trilha de Auditoria
    ├── Cadastro (subgrupo)
    │   ├── Templates
    │   ├── Fornecedores
    │   └── Workflows
    └── Configurações
```

---

## Detalhes Técnicos

### Arquivo a modificar
`src/components/AppSidebar.tsx`

### Alterações no array `contratosMenuSections`

1. **Reordenar as seções** para: Principal → Organização → Gestão → Sistema

2. **Mover itens de Cadastro para dentro de Sistema** como subitens aninhados

3. **Estrutura final do array:**

```typescript
const contratosMenuSections: MenuSectionType[] = [
  {
    id: "principal",
    title: "Principal",
    // Dashboard
  },
  {
    id: "organizacao", 
    title: "Organização",
    // Configurações e Membros da organização
  },
  {
    id: "gestao",
    title: "Gestão",
    // Contratos, Franquias, Requisições
  },
  {
    id: "sistema",
    title: "Sistema",
    items: [
      // Relatórios, Segurança, Compliance, Auditoria
      { 
        title: "Cadastro", 
        subItems: [Templates, Fornecedores, Workflows]
      },
      // Configurações (com Usuários)
    ]
  },
];
```

### Alterações no array `servicosMenuSections`

Aplicar a mesma reorganização para manter consistência entre módulos:
- Principal → Organização → Gestão → Sistema (com Cadastro aninhado)

---

## Resultado Esperado

- Menu lateral mais organizado e intuitivo
- Cadastro acessível dentro de Sistema (menos seções de nível superior)
- Organização ganha destaque logo após Principal
- Consistência entre módulos Jurídico e Operacional

