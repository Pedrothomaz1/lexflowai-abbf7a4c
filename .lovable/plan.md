
# Plano: Central de Ajuda Completa

## Visão Geral

Criar uma Central de Ajuda profissional e funcional em `/ajuda` que centralize FAQs pesquisáveis, guias rápidos organizados por módulo, e seção de suporte/contato. A página será acessível via sidebar e seguirá o design system existente.

---

## 1. Estrutura da Página

### Layout Proposto

```text
+------------------------------------------------------------------+
|  CENTRAL DE AJUDA                              [Campo de Busca]  |
|  Encontre respostas e aprenda a usar o sistema                   |
+------------------------------------------------------------------+
|                                                                   |
|  [Card: Primeiros Passos]  [Card: FAQ]  [Card: Fale Conosco]    |
|   Icone: Rocket             Icone: HelpCircle  Icone: MessageCircle
|   "Comece por aqui"         "Perguntas frequentes" "Precisa de ajuda?"
+------------------------------------------------------------------+
|                                                                   |
|  GUIAS RÁPIDOS                                                   |
|  [Tab: Todos] [Tab: Contratos] [Tab: Alertas] [Tab: Administração]
|  +------------------------------------------------------------+  |
|  | [Card] Criar primeiro contrato        [5 min]              |  |
|  | [Card] Configurar alertas             [3 min]              |  |
|  | [Card] Adicionar fornecedor           [2 min]              |  |
|  | [Card] Configurar fluxo de aprovação  [4 min]              |  |
|  +------------------------------------------------------------+  |
|                                                                   |
|  PERGUNTAS FREQUENTES                                            |
|  [Busca: Filtrar perguntas...]                                   |
|  +------------------------------------------------------------+  |
|  | Como criar meu primeiro contrato?                     [v]  |  |
|  |   Resposta expandida com passos...                         |  |
|  +------------------------------------------------------------+  |
|  | Como configurar alertas de vencimento?                [v]  |  |
|  +------------------------------------------------------------+  |
|  | Como funciona o fluxo de aprovação?                   [v]  |  |
|  +------------------------------------------------------------+  |
|  | ... mais perguntas                                         |  |
|  +------------------------------------------------------------+  |
|                                                                   |
|  PRECISA DE MAIS AJUDA?                                          |
|  +------------------------------------------------------------+  |
|  | Email: suporte@lexflow.com.br                              |  |
|  | Horário: Seg-Sex, 9h-18h                                   |  |
|  | [Botão: Enviar Mensagem]                                   |  |
|  +------------------------------------------------------------+  |
+------------------------------------------------------------------+
```

---

## 2. Conteúdo do FAQ

### Categorias e Perguntas

| Categoria | Pergunta | Resposta (resumo) |
|-----------|----------|-------------------|
| **Primeiros Passos** | Como criar meu primeiro contrato? | Acesse Contratos > Novo Contrato. Preencha dados básicos e salve. |
| **Primeiros Passos** | Como adicionar um fornecedor? | Vá em Fornecedores > Novo. Informe CNPJ/CPF e dados de contato. |
| **Primeiros Passos** | Como configurar meu perfil? | Acesse Preferências no menu. Atualize nome, foto e telefone. |
| **Contratos** | Como funciona o fluxo de aprovação? | Contratos passam por níveis configuráveis. Cada nível aprova em sequência. |
| **Contratos** | Como anexar documentos a um contrato? | Na página do contrato, clique em "Anexos" e arraste os arquivos. |
| **Contratos** | Como usar modelos de contrato? | Ao criar, selecione um modelo. Os campos serão preenchidos automaticamente. |
| **Alertas** | Como configurar alertas de vencimento? | Em Alertas e Prazos, defina dias de antecedência e canais de notificação. |
| **Alertas** | Quais canais de notificação posso usar? | E-mail, notificação no sistema e WhatsApp (se configurado). |
| **Relatórios** | Como exportar relatórios em PDF? | Em Relatórios, aplique filtros e clique em "Exportar PDF". |
| **Segurança** | Como ativar autenticação de dois fatores? | Acesse Preferências > 2FA. Escaneie o QR code com seu app autenticador. |
| **Segurança** | Como gerenciar sessões ativas? | Em Preferências > Sessões, veja dispositivos conectados e encerre se necessário. |
| **Administração** | Como convidar novos usuários? | Acesse Usuários e Permissões > Convidar Membro. Informe email e perfil. |
| **Administração** | Como definir permissões de acesso? | Ao convidar, escolha o perfil: Membro, Administrador ou Proprietário. |

---

## 3. Guias Rápidos

### Lista de Guias

| Guia | Tempo | Categoria | Descrição |
|------|-------|-----------|-----------|
| Criar seu primeiro contrato | 5 min | Contratos | Passo a passo para cadastrar e acompanhar um contrato |
| Configurar alertas | 3 min | Alertas | Como nunca perder um prazo importante |
| Adicionar fornecedor | 2 min | Base | Cadastre parceiros comerciais rapidamente |
| Configurar fluxo de aprovação | 4 min | Automação | Monte seu processo de aprovação em níveis |
| Gerar relatório de vencimentos | 3 min | Relatórios | Exporte lista de contratos a vencer |
| Ativar 2FA | 2 min | Segurança | Proteja sua conta com verificação em duas etapas |
| Convidar equipe | 2 min | Administração | Adicione membros à sua organização |

---

## 4. Arquivos a Criar

| Arquivo | Descrição |
|---------|-----------|
| `src/pages/CentralAjuda.tsx` | Página principal da Central de Ajuda |
| `src/components/Help/FAQSection.tsx` | Componente de FAQ com accordion e busca |
| `src/components/Help/QuickGuides.tsx` | Cards de guias rápidos com filtro por categoria |
| `src/components/Help/SupportContact.tsx` | Seção de contato e suporte |
| `src/components/Help/HeroCards.tsx` | Cards de destaque no topo da página |
| `src/components/Help/index.ts` | Barrel export |
| `src/lib/faq-data.ts` | Dados estruturados de FAQ e guias |

---

## 5. Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/App.tsx` | Adicionar rota `/ajuda` |
| `src/components/AppSidebar.tsx` | Alterar link "Central de Ajuda" para rota interna |

---

## 6. Funcionalidades

### Busca em Tempo Real
- Campo de busca no topo da página
- Filtra FAQs por palavra-chave instantaneamente
- Destaca termos encontrados

### Categorização
- FAQs organizadas por categoria
- Guias filtráveis por tipo (Contratos, Alertas, etc.)
- Tabs para navegação rápida

### Links Contextuais
- Cada FAQ tem link "Ir para a página" quando aplicável
- Guias direcionam para a funcionalidade relacionada

### Responsivo
- Layout adaptável para mobile
- Cards empilham verticalmente em telas menores

---

## 7. Detalhes Técnicos

### Estrutura de Dados (faq-data.ts)

```typescript
interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: "primeiros-passos" | "contratos" | "alertas" | "relatorios" | "seguranca" | "administracao";
  relatedLink?: string;
}

interface GuideItem {
  id: string;
  title: string;
  description: string;
  duration: string;
  category: string;
  link: string;
  icon: string;
}
```

### Componentes Reutilizados
- `Accordion` - Para expandir/colapsar FAQs
- `Tabs` - Para filtrar guias por categoria
- `Card` - Para layout dos guias e destaques
- `Input` - Para campo de busca
- `Badge` - Para indicar tempo de leitura

---

## 8. Navegação no Sidebar

### Alteração no AppSidebar.tsx

```text
Antes:
- Central de Ajuda (link externo para docs.lexflow.com.br)

Depois:
- Central de Ajuda (rota interna /ajuda)
```

Também adicionar no footer do sidebar um ícone de ajuda para acesso rápido.

---

## 9. Ordem de Execução

1. **Fase 1: Dados**
   - Criar `src/lib/faq-data.ts` com conteúdo de FAQ e guias

2. **Fase 2: Componentes**
   - Criar componentes Help (FAQSection, QuickGuides, SupportContact, HeroCards)

3. **Fase 3: Página**
   - Criar `src/pages/CentralAjuda.tsx` integrando os componentes

4. **Fase 4: Navegação**
   - Registrar rota em App.tsx
   - Atualizar link no AppSidebar.tsx

---

## 10. Estilo Visual

- **Cores**: Seguir paleta existente do LexFlow
- **Ícones**: Lucide React (consistência com o resto da aplicação)
- **Espaçamento**: Padding generoso para legibilidade
- **Cards**: Hover sutil com elevação (shadow-md)
- **Accordion**: Transições suaves de abertura/fechamento

---

## 11. Acessibilidade

- Todos os elementos interativos com `aria-label`
- Navegação por teclado no accordion
- Contraste adequado para textos
- Focus visible em todos os links e botões
