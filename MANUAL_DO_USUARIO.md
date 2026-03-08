# LexFlow — Manual do Usuário

**Versão:** 1.0 | **Atualizado em:** Março 2026

---

## Sumário

1. [Introdução](#1-introdução)
2. [Primeiros Passos](#2-primeiros-passos)
   - 2.1 [Criar uma Conta](#21-criar-uma-conta)
   - 2.2 [Verificação de E-mail](#22-verificação-de-e-mail)
   - 2.3 [Autenticação em Dois Fatores (2FA)](#23-autenticação-em-dois-fatores-2fa)
   - 2.4 [Criar ou Ingressar em uma Organização](#24-criar-ou-ingressar-em-uma-organização)
3. [Navegação e Interface](#3-navegação-e-interface)
   - 3.1 [Barra Lateral (Sidebar)](#31-barra-lateral-sidebar)
   - 3.2 [Cabeçalho Global](#32-cabeçalho-global)
   - 3.3 [Módulos: Jurídico vs. Operacional](#33-módulos-jurídico-vs-operacional)
4. [Dashboard — Visão Geral](#4-dashboard--visão-geral)
   - 4.1 [KPIs e Métricas](#41-kpis-e-métricas)
   - 4.2 [Resumo Executivo](#42-resumo-executivo)
   - 4.3 [Próxima Ação Recomendada](#43-próxima-ação-recomendada)
5. [Gestão de Contratos](#5-gestão-de-contratos)
   - 5.1 [Lista de Contratos](#51-lista-de-contratos)
   - 5.2 [Criar Novo Contrato](#52-criar-novo-contrato)
   - 5.3 [Múltiplos Anexos](#53-múltiplos-anexos)
   - 5.4 [Detalhes do Contrato](#54-detalhes-do-contrato)
   - 5.5 [Análise de Contrato por IA](#55-análise-de-contrato-por-ia)
   - 5.6 [Redline (Controle de Alterações)](#56-redline-controle-de-alterações)
   - 5.7 [Histórico de Versões](#57-histórico-de-versões)
   - 5.8 [Obrigações Contratuais](#58-obrigações-contratuais)
   - 5.9 [Comentários e Anotações](#59-comentários-e-anotações)
   - 5.10 [Assinatura Eletrônica](#510-assinatura-eletrônica)
6. [Kanban — Visão por Status](#6-kanban--visão-por-status)
7. [Franquias](#7-franquias)
   - 7.1 [Cadastro de Franquias](#71-cadastro-de-franquias)
   - 7.2 [Importação em Massa (Excel)](#72-importação-em-massa-excel)
   - 7.3 [Renovação de Contrato de Franquia](#73-renovação-de-contrato-de-franquia)
   - 7.4 [Detalhes da Franquia](#74-detalhes-da-franquia)
8. [Requisições de Contrato](#8-requisições-de-contrato)
   - 8.1 [Formulário Público de Requisição](#81-formulário-público-de-requisição)
   - 8.2 [Análise e Aprovação de Requisições](#82-análise-e-aprovação-de-requisições)
9. [Fornecedores](#9-fornecedores)
   - 9.1 [Cadastro de Fornecedores](#91-cadastro-de-fornecedores)
   - 9.2 [Categorias de Serviço](#92-categorias-de-serviço)
   - 9.3 [Anexos do Fornecedor](#93-anexos-do-fornecedor)
   - 9.4 [Detalhes do Fornecedor](#94-detalhes-do-fornecedor)
10. [Unidades](#10-unidades)
11. [Modelos de Contrato (Templates)](#11-modelos-de-contrato-templates)
12. [Alertas e Prazos](#12-alertas-e-prazos)
    - 12.1 [Configuração de Alertas](#121-configuração-de-alertas)
    - 12.2 [Notificações por E-mail](#122-notificações-por-e-mail)
13. [Calendário](#13-calendário)
14. [Fluxos de Aprovação (Workflows)](#14-fluxos-de-aprovação-workflows)
15. [Módulo Operacional — Serviços](#15-módulo-operacional--serviços)
    - 15.1 [Especificações de Serviço](#151-especificações-de-serviço)
16. [Custos e Análise Financeira](#16-custos-e-análise-financeira)
17. [Relatórios](#17-relatórios)
18. [Governança e Segurança](#18-governança-e-segurança)
    - 18.1 [Histórico de Ações (Audit Logs)](#181-histórico-de-ações-audit-logs)
    - 18.2 [Painel de Segurança](#182-painel-de-segurança)
    - 18.3 [Proteção de Dados (LGPD)](#183-proteção-de-dados-lgpd)
19. [Organização](#19-organização)
    - 19.1 [Configurações da Organização](#191-configurações-da-organização)
    - 19.2 [Membros e Convites](#192-membros-e-convites)
20. [Usuários e Permissões](#20-usuários-e-permissões)
    - 20.1 [Perfis de Acesso (Roles)](#201-perfis-de-acesso-roles)
    - 20.2 [Permissões por Funcionalidade](#202-permissões-por-funcionalidade)
21. [Configurações Pessoais](#21-configurações-pessoais)
    - 21.1 [Perfil e Avatar](#211-perfil-e-avatar)
    - 21.2 [Autenticação em Dois Fatores](#212-autenticação-em-dois-fatores)
    - 21.3 [Configurações de Notificação](#213-configurações-de-notificação)
    - 21.4 [Assinatura Eletrônica](#214-assinatura-eletrônica)
22. [Central de Ajuda](#22-central-de-ajuda)
23. [Perguntas Frequentes (FAQ)](#23-perguntas-frequentes-faq)
24. [Glossário](#24-glossário)

---

## 1. Introdução

O **LexFlow** é uma plataforma de gestão de contratos empresariais projetada para centralizar, automatizar e dar visibilidade a todo o ciclo de vida dos contratos de serviço da sua organização — desde a solicitação até a assinatura, renovação e encerramento.

### Para quem é o LexFlow?

| Perfil | Benefício principal |
|--------|-------------------|
| **Gestores** | Visão executiva de prazos, riscos e valores |
| **Analistas Jurídicos** | Análise detalhada de cláusulas e obrigações |
| **Consultoria Jurídica** | Aprovação e revisão de contratos com redline |
| **Financeiro** | Controle de custos e alertas de vencimento |
| **Operacional** | Gestão de serviços e especificações técnicas |

### Principais Funcionalidades

- ✅ Gestão completa do ciclo de vida de contratos
- ✅ Análise inteligente de contratos por IA
- ✅ Fluxos de aprovação configuráveis
- ✅ Assinatura eletrônica integrada (DocuSign, Clicksign, D4Sign)
- ✅ Alertas automáticos de vencimento e renovação
- ✅ Gestão de franquias com importação em massa
- ✅ Requisições públicas de contrato
- ✅ Relatórios e dashboards em tempo real
- ✅ Conformidade com LGPD
- ✅ Autenticação segura com 2FA

---

## 2. Primeiros Passos

### 2.1 Criar uma Conta

1. Acesse a **página inicial** do LexFlow
2. Clique em **"Começar Agora"** ou **"Login"**
3. Na tela de autenticação, selecione **"Criar conta"**
4. Preencha seu e-mail e uma senha segura (mínimo 8 caracteres, incluindo maiúsculas, minúsculas e números)
5. Clique em **"Cadastrar"**

### 2.2 Verificação de E-mail

Após o cadastro, você receberá um e-mail de verificação. Clique no link enviado para ativar sua conta. **Atenção:** você não conseguirá acessar o sistema sem verificar o e-mail.

### 2.3 Autenticação em Dois Fatores (2FA)

O LexFlow suporta verificação em duas etapas via **código TOTP** (Google Authenticator, Authy, etc.):

1. Após o login, vá em **Configurações > Autenticação em Dois Fatores**
2. Escaneie o QR Code com seu aplicativo autenticador
3. Digite o código de 6 dígitos para confirmar
4. A partir de agora, todo login solicitará o código do autenticador

> **Dica:** Alguns perfis de acesso podem exigir 2FA obrigatoriamente. Nesse caso, você será redirecionado automaticamente para a configuração.

### 2.4 Criar ou Ingressar em uma Organização

Ao acessar pela primeira vez, você terá duas opções:

- **Criar uma nova organização:** Preencha o nome da empresa e torne-se o administrador
- **Aguardar convite:** Se sua empresa já utiliza o LexFlow, solicite um convite ao administrador. Você receberá um e-mail com link para ingressar

---

## 3. Navegação e Interface

### 3.1 Barra Lateral (Sidebar)

A barra lateral é dividida em **seções colapsáveis**:

| Seção | Funcionalidades |
|-------|----------------|
| **Principal** | Dashboard, Contratos, Franquias, Requisições, Alertas |
| **Base** | Fornecedores, Unidades, Modelos de Contrato |
| **Automação** | Fluxos de Aprovação |
| **Governança** | Relatórios, Histórico de Ações, Segurança, Proteção de Dados |
| **Configurações** | Usuários, Membros, Organização, Notificações, Preferências |

- Clique no **título da seção** para expandir/recolher
- O menu se adapta automaticamente ao seu **perfil de acesso** (apenas itens permitidos são exibidos)

### 3.2 Cabeçalho Global

O cabeçalho superior contém:

- **Busca Avançada:** Pesquise contratos, fornecedores e franquias em toda a plataforma
- **Central de Ajuda:** Acesso rápido à documentação e FAQ
- **Nome do módulo ativo** para orientação contextual

### 3.3 Módulos: Jurídico vs. Operacional

O LexFlow possui dois módulos integrados:

| Módulo | Foco | Cor de referência |
|--------|------|-------------------|
| **Jurídico (Contratos)** | Gestão de contratos, franquias, aprovações | Verde |
| **Operacional (Serviços)** | Gestão de serviços, especificações técnicas | Mostarda |

Se o administrador configurou acesso a **ambos os módulos**, você pode alternar clicando no **badge do módulo** no topo da barra lateral.

---

## 4. Dashboard — Visão Geral

O Dashboard é a tela inicial após o login e apresenta um resumo executivo do estado atual dos seus contratos.

### 4.1 KPIs e Métricas

Os cards de KPI mostram indicadores-chave como:

- **Total de Contratos Ativos** — Quantidade de contratos em vigor
- **Contratos Vencendo em 30 dias** — Urgência de renovação
- **Valor Total Comprometido** — Soma dos valores de todos os contratos ativos
- **Taxa de Conformidade** — Percentual de obrigações cumpridas

### 4.2 Resumo Executivo

O painel de resumo executivo mostra uma visão consolidada com gráficos de:

- Distribuição de contratos por status
- Evolução mensal de valores
- Anel de conformidade (compliance)

### 4.3 Próxima Ação Recomendada

O card de **"Próxima Ação"** sugere automaticamente a tarefa mais urgente — como renovar um contrato prestes a vencer ou analisar uma requisição pendente.

---

## 5. Gestão de Contratos

### 5.1 Lista de Contratos

A tela de **Contratos** exibe todos os contratos da organização em uma tabela com:

- **Filtros:** por status (Ativo, Pendente, Vencido, Cancelado, Em Elaboração), tipo, fornecedor
- **Busca:** por número, título ou descrição
- **Ordenação:** por data, valor, status
- **Exportação:** gere relatórios a partir da lista filtrada

**Status disponíveis:**
| Status | Significado |
|--------|------------|
| `ativo` | Contrato em vigor |
| `pendente` | Aguardando aprovação ou assinatura |
| `vencido` | Prazo expirado |
| `cancelado` | Cancelado por uma das partes |
| `em_elaboracao` | Em fase de criação ou negociação |
| `suspenso` | Temporariamente suspenso |
| `renovado` | Renovado (nova versão ativa) |
| `encerrado` | Encerrado normalmente |

### 5.2 Criar Novo Contrato

1. Clique em **"Novo Contrato"** (botão no topo da lista)
2. Preencha os campos obrigatórios:
   - **Título** — Nome descritivo do contrato
   - **Número do Contrato** — Código de referência (gerado automaticamente ou manual)
   - **Tipo** — Prestação de serviço, Fornecimento, Locação, Consultoria, etc.
   - **Fornecedor** — Selecione da lista cadastrada
   - **Unidade** — Filial ou unidade responsável
   - **Data de Início e Fim** — Vigência do contrato
   - **Valor Total** — Montante financeiro
3. Opcionais: descrição, observações, moeda, renovação automática, tags
4. Anexe um ou mais arquivos (veja seção 5.3)
5. Clique em **"Criar Contrato"**

### 5.3 Múltiplos Anexos

Ao criar ou editar um contrato, você pode anexar **múltiplos arquivos** de uma só vez:

1. Clique em **"Selecionar Arquivo(s)"** ou arraste arquivos para a área
2. Selecione um ou mais arquivos (PDFs, imagens, documentos Word)
3. Os arquivos selecionados aparecem em uma lista com nome e tamanho
4. Para remover um arquivo da lista, clique no **ícone X** ao lado dele
5. Todos os arquivos serão enviados automaticamente ao criar o contrato

> **Limite:** Cada arquivo pode ter até 50 MB. Formatos aceitos: PDF, DOC, DOCX, XLS, XLSX, JPG, PNG.

### 5.4 Detalhes do Contrato

Ao clicar em um contrato, a tela de detalhes apresenta:

- **Cabeçalho** com status, valor e datas principais
- **Card do Fornecedor** com informações de contato
- **Timeline** com eventos importantes do contrato
- **Abas:**
  - Obrigações contratuais
  - Anexos
  - Histórico de versões
  - KPIs do contrato
  - Comentários
  - Redline (controle de alterações)
  - Métricas de negociação

### 5.5 Análise de Contrato por IA

O LexFlow utiliza inteligência artificial para analisar automaticamente o conteúdo dos seus contratos:

1. Na tela de detalhes do contrato, clique em **"Analisar Contrato"**
2. A IA processará o documento e retornará:
   - **Score de Risco** — Classificação de 0 a 100
   - **Cláusulas Importantes** — Destaques automáticos
   - **Riscos Identificados** — Pontos de atenção jurídica
   - **Sugestões de Melhoria** — Recomendações práticas
3. Se o contrato já possui análise prévia, o botão mostrará **"Reanalisar"**

> **Como funciona:** A IA lê o texto do contrato (incluindo PDFs extraídos), identifica padrões e compara com boas práticas jurídicas.

### 5.6 Redline (Controle de Alterações)

O editor de redline permite rastrear todas as alterações feitas no texto do contrato:

1. Acesse a aba **"Redline"** nos detalhes do contrato
2. Faça alterações no texto — inserções aparecem em verde, exclusões em vermelho
3. Cada versão de redline é salva com autor e data
4. Revisores podem aprovar ou rejeitar alterações

### 5.7 Histórico de Versões

Toda alteração em um contrato gera um registro no histórico:

- **Campo alterado** — Qual informação mudou
- **Valor anterior** — O que era antes
- **Valor novo** — O que ficou depois
- **Quem alterou** — Usuário responsável
- **Quando** — Data e hora

Você pode navegar pelo histórico completo na aba **"Versões"**.

### 5.8 Obrigações Contratuais

Cadastre e acompanhe obrigações vinculadas a cada contrato:

- **Título e descrição** da obrigação
- **Data de vencimento**
- **Responsável** atribuído
- **Status:** Pendente, Em andamento, Concluída, Atrasada
- **Valor** (quando aplicável)

Obrigações vencidas geram alertas automáticos.

### 5.9 Comentários e Anotações

A aba de comentários permite comunicação contextual:

- **Comentários gerais** sobre o contrato
- **Comentários por seção** (vinculados a partes específicas)
- **Tipos:** Comentário, Sugestão, Revisão
- **Respostas encadeadas** (thread)
- **Status:** Aberto, Resolvido

### 5.10 Assinatura Eletrônica

O LexFlow integra com os principais provedores de assinatura:

| Provedor | Funcionalidade |
|----------|---------------|
| **DocuSign** | Envio e coleta de assinaturas |
| **Clicksign** | Assinatura conforme legislação brasileira |
| **D4Sign** | Assinatura com validade jurídica |

**Como usar:**
1. Nos detalhes do contrato, clique em **"Enviar para Assinatura"**
2. Selecione o provedor configurado
3. Adicione os signatários (nome e e-mail)
4. O sistema envia automaticamente e rastreia o status
5. Quando todos assinarem, o contrato assinado é armazenado automaticamente

Configure seus provedores em **Configurações > Assinatura Eletrônica**.

---

## 6. Kanban — Visão por Status

A visão Kanban apresenta seus contratos organizados em colunas por status, permitindo arrastar e soltar para alterar o status rapidamente.

**Colunas padrão:**
- Em Elaboração → Pendente → Ativo → Vencido → Encerrado

Ideal para equipes que preferem uma visão visual do pipeline de contratos.

---

## 7. Franquias

### 7.1 Cadastro de Franquias

O módulo de franquias permite gerenciar contratos de franqueados:

1. Acesse **Franquias** no menu lateral
2. Clique em **"Nova Franquia"**
3. Preencha:
   - **Nome completo** do franqueado
   - **CNPJ**
   - **Tipo de franquia** e **regime tributário**
   - **Datas** de assinatura e término
   - **Status do contrato**

### 7.2 Importação em Massa (Excel)

Para cadastrar muitas franquias de uma vez:

1. Clique em **"Importar Planilha"**
2. Faça download do **modelo de planilha** (.xlsx)
3. Preencha os dados seguindo o modelo
4. Selecione o arquivo e clique em **"Importar"**
5. O sistema valida os dados e mostra um resumo antes de confirmar

### 7.3 Renovação de Contrato de Franquia

O workflow de renovação acompanha cada etapa:

1. ☐ Consultora informada
2. ☐ Renovação aceita pelo franqueado
3. ☐ Novo contrato enviado
4. ☐ Novo contrato assinado
5. ☐ Nota fiscal emitida

Cada etapa pode ser marcada individualmente, e o progresso é visível no card da franquia.

### 7.4 Detalhes da Franquia

A tela de detalhes mostra:

- Informações cadastrais completas
- Status da vigência (com indicador visual)
- Workflow de renovação
- Histórico de alterações

---

## 8. Requisições de Contrato

### 8.1 Formulário Público de Requisição

Qualquer pessoa da organização pode solicitar um novo contrato sem precisar de login:

1. Acesse o link público de requisição (fornecido pelo administrador)
2. Preencha:
   - **Dados do solicitante** (nome, e-mail, telefone)
   - **Departamento** solicitante
   - **Título e descrição** do contrato necessário
   - **Tipo de contrato** e **urgência**
   - **Valor estimado** e **data de necessidade**
   - **Fornecedor sugerido** (opcional)
   - **Anexo** de referência (opcional)
3. Clique em **"Enviar Requisição"**

### 8.2 Análise e Aprovação de Requisições

Na tela interna de **Requisições**:

1. Visualize todas as requisições recebidas
2. Filtre por status: Pendente, Em análise, Aprovada, Rejeitada, Convertida
3. Clique em uma requisição para analisar
4. Registre observações e aprove ou rejeite
5. Requisições aprovadas podem ser convertidas diretamente em contratos

---

## 9. Fornecedores

### 9.1 Cadastro de Fornecedores

1. Acesse **Fornecedores** no menu lateral
2. Clique em **"Novo Fornecedor"**
3. Preencha os dados:
   - **Dados básicos:** Nome, tipo (PJ/PF), CNPJ/CPF, e-mail, telefone
   - **Endereço:** CEP, cidade, estado, endereço completo
   - **Contato principal:** Nome, cargo, e-mail, telefone
   - **Dados bancários:** Banco, agência, conta, PIX
   - **Informações fiscais:** Inscrição estadual/municipal, porte da empresa

### 9.2 Categorias de Serviço

Associe categorias de serviço a cada fornecedor para facilitar buscas e filtros:

- Tecnologia, Limpeza, Segurança, Manutenção, Consultoria, etc.
- Um fornecedor pode ter múltiplas categorias

### 9.3 Anexos do Fornecedor

Armazene documentos do fornecedor:

- Certidões, alvarás, contratos sociais
- Cada anexo é registrado com tipo, data e responsável pelo upload

### 9.4 Detalhes do Fornecedor

A tela de detalhes exibe:

- Informações completas do cadastro
- Contratos vinculados
- Documentos e anexos
- Categorias de serviço

---

## 10. Unidades

Gerencie as unidades/filiais da sua organização:

1. Acesse **Unidades** no menu lateral
2. Cadastre cada unidade com nome, endereço e informações de contato
3. Vincule contratos a unidades específicas para controle por localidade

---

## 11. Modelos de Contrato (Templates)

Crie modelos reutilizáveis para agilizar a elaboração de contratos:

1. Acesse **Modelos de Contrato** no menu lateral
2. Clique em **"Novo Modelo"**
3. Preencha:
   - **Nome** do modelo
   - **Tipo de contrato** associado
   - **Descrição**
   - **Conteúdo do template** (texto com campos variáveis)
   - **Campos variáveis** (ex: `{{nome_fornecedor}}`, `{{valor}}`, `{{data_inicio}}`)
4. Ative ou desative modelos conforme necessário

Ao criar um novo contrato, você poderá selecionar um modelo para preencher automaticamente o conteúdo inicial.

---

## 12. Alertas e Prazos

### 12.1 Configuração de Alertas

O sistema gera alertas automáticos para:

- **Vencimento de contrato** — Configurável em dias de antecedência (30, 60, 90 dias)
- **Obrigações vencidas** — Quando uma obrigação passa do prazo
- **Renovação próxima** — Para contratos com renovação automática

Na tela de **Alertas**, você pode:

- Visualizar todos os alertas pendentes
- Filtrar por tipo (vencimento, obrigação, renovação)
- Marcar alertas como resolvidos

### 12.2 Notificações por E-mail

Configure em **Configurações > Notificações** quais alertas devem gerar notificação por e-mail. Opções incluem:

- Alertas de vencimento
- Novas requisições de contrato
- Aprovações pendentes
- Atualizações de status de assinatura

---

## 13. Calendário

A visualização em calendário mostra eventos importantes distribuídos no tempo:

- Vencimentos de contratos
- Datas de renovação
- Prazos de obrigações
- Alertas programados

Navegue entre meses e clique em um evento para ir direto ao contrato relacionado.

---

## 14. Fluxos de Aprovação (Workflows)

Configure fluxos de aprovação em níveis para diferentes tipos de contrato:

1. Acesse **Fluxos de Aprovação** no menu lateral
2. Clique em **"Novo Workflow"**
3. Defina:
   - **Nome** do fluxo
   - **Tipo de contrato** ao qual se aplica
   - **Níveis de aprovação** — Quem precisa aprovar em cada etapa
   - **Aprovação paralela** — Se os aprovadores de um nível podem aprovar simultaneamente
4. Ative o workflow

Quando um contrato do tipo configurado for criado, o fluxo de aprovação será acionado automaticamente.

---

## 15. Módulo Operacional — Serviços

O módulo Operacional é focado na gestão de serviços contratados:

- **Lista de Serviços** — Todos os serviços com status, fornecedor e unidade
- **Novo Serviço** — Cadastro rápido vinculado a fornecedores e unidades

### 15.1 Especificações de Serviço

Defina especificações técnicas para padronizar os serviços:

- **Nome e categoria** (Limpeza, Segurança, Manutenção, etc.)
- **Órgão regulador** (quando aplicável)
- **Validade padrão** em meses
- **Dias de alerta** antes do vencimento
- **Certificado obrigatório** (sim/não)

---

## 16. Custos e Análise Financeira

A tela de **Custos** oferece uma visão financeira consolidada:

- **Valor total comprometido** em contratos ativos
- **Distribuição por tipo de contrato**
- **Evolução mensal de gastos**
- **Comparação entre períodos**
- **Análise de custos por IA** — Compara modelos de custo e sugere otimizações

---

## 17. Relatórios

Gere relatórios detalhados com opções de:

- **Relatório de Contratos** — Lista completa com filtros
- **Relatório de Vencimentos** — Contratos próximos ao vencimento
- **Relatório de Custos** — Análise financeira
- **Relatório de Conformidade** — Status de obrigações e compliance

Todos os relatórios podem ser exportados em **PDF**.

---

## 18. Governança e Segurança

### 18.1 Histórico de Ações (Audit Logs)

*Disponível para: Administradores*

Registra todas as ações realizadas no sistema:

- **Quem** fez (usuário)
- **O que** fez (ação: criou, editou, excluiu, acessou)
- **Quando** fez (data e hora)
- **Onde** fez (entidade e ID)
- **De onde** fez (IP e user-agent)
- **Nível de risco** da ação

Filtros disponíveis:
- Por usuário, entidade, ação, período, nível de risco

### 18.2 Painel de Segurança

*Disponível para: Administradores*

O dashboard de segurança consolida:

- **Métricas de segurança** — Taxa de 2FA, sessões ativas, tentativas de login
- **Alertas de segurança** — Atividades suspeitas detectadas
- **Matriz de risco** — Classificação visual de riscos
- **Playbooks de incidentes** — Procedimentos para cada tipo de incidente
- **Checklist Go/No-Go** — Verificações de segurança para deploy

### 18.3 Proteção de Dados (LGPD)

*Disponível para: Administradores*

Funcionalidades de conformidade com a LGPD:

- **Logs de compliance** — Registro de todas as ações com dados pessoais
- **Políticas de retenção** — Configuração de prazo e ação pós-retenção
- **Solicitações de dados** — Atendimento a pedidos de acesso e exclusão
- **Base legal** — Documentação da base legal para cada tratamento

---

## 19. Organização

### 19.1 Configurações da Organização

*Disponível para: Administradores da Organização*

- Alterar **nome** da organização
- Configurar **slug** (identificador URL)
- Gerenciar **configurações gerais**

### 19.2 Membros e Convites

*Disponível para: Administradores da Organização*

- **Visualizar membros** ativos da organização
- **Convidar novos membros** por e-mail
- **Definir role** (admin ou membro) ao convidar
- **Remover membros** da organização

**Fluxo de convite:**
1. Administrador envia convite com e-mail e role
2. Convidado recebe e-mail com link
3. Ao clicar, o convidado cria conta (se necessário) e ingressa automaticamente

---

## 20. Usuários e Permissões

### 20.1 Perfis de Acesso (Roles)

O LexFlow utiliza um sistema de permissões baseado em roles:

| Role | Descrição | Acesso |
|------|-----------|--------|
| **Administrador** | Controle total do sistema | Todas as funcionalidades + configurações + governança |
| **Consultoria Jurídica** | Gestão jurídica sênior | Contratos, aprovações, análises, relatórios |
| **Analista Jurídico** | Operação jurídica | Contratos, requisições, fornecedores |
| **Financeiro Sênior** | Gestão financeira | Contratos, custos, relatórios financeiros |
| **Operacional** | Operações básicas | Serviços, especificações, unidades |

### 20.2 Permissões por Funcionalidade

| Funcionalidade | Administrador | Consultoria | Analista | Financeiro | Operacional |
|----------------|:---:|:---:|:---:|:---:|:---:|
| Dashboard | ✅ | ✅ | ✅ | ✅ | ✅ |
| Contratos | ✅ | ✅ | ✅ | ✅ | ❌ |
| Criar Contrato | ✅ | ✅ | ✅ | ❌ | ❌ |
| Aprovar Contrato | ✅ | ✅ | ❌ | ❌ | ❌ |
| Fornecedores | ✅ | ✅ | ✅ | ✅ | ✅ |
| Franquias | ✅ | ✅ | ✅ | ❌ | ❌ |
| Relatórios | ✅ | ✅ | ✅ | ✅ | ❌ |
| Usuários | ✅ | ❌ | ❌ | ❌ | ❌ |
| Audit Logs | ✅ | ❌ | ❌ | ❌ | ❌ |
| Segurança | ✅ | ❌ | ❌ | ❌ | ❌ |
| LGPD/Compliance | ✅ | ❌ | ❌ | ❌ | ❌ |

---

## 21. Configurações Pessoais

### 21.1 Perfil e Avatar

Em **Preferências**, você pode:

- Alterar seu **nome de exibição**
- Fazer upload de uma **foto de perfil** (avatar)
- Alterar **senha**

### 21.2 Autenticação em Dois Fatores

Em **Configurações > 2FA**:

1. **Ativar 2FA** — Escaneie o QR Code e confirme
2. **Desativar 2FA** — Informe o código atual para desabilitar
3. **Verificar status** — Veja se 2FA está ativo

### 21.3 Configurações de Notificação

Em **Configurações > Notificações**, personalize:

- Quais tipos de alerta geram notificação
- Canais de notificação (e-mail, sistema)
- Frequência de resumos

### 21.4 Assinatura Eletrônica

Em **Configurações > Assinatura Eletrônica**, configure:

- **Provedor** preferencial (DocuSign, Clicksign, D4Sign)
- **Credenciais** de integração
- **Webhook URL** para callbacks automáticos

---

## 22. Central de Ajuda

Acesse a **Central de Ajuda** pelo menu lateral para:

- **Primeiros Passos** — Guias rápidos para começar
- **FAQ** — Perguntas frequentes organizadas por categoria
- **Fale Conosco** — Canais de suporte

A FAQ possui busca integrada e filtros por categoria (Geral, Contratos, Segurança, Usuários, Integrações).

---

## 23. Perguntas Frequentes (FAQ)

**Como recuperar minha senha?**
Na tela de login, clique em "Esqueci minha senha" e siga as instruções enviadas por e-mail.

**Posso ter mais de uma organização?**
Atualmente, cada usuário pertence a uma organização. Para trocar, será necessário criar uma nova conta.

**Como importar contratos existentes?**
Use a funcionalidade de importação de PDF na criação do contrato. O sistema extrai automaticamente os dados do documento.

**Os dados estão seguros?**
Sim. O LexFlow utiliza criptografia em trânsito (HTTPS/TLS), Row Level Security no banco de dados, autenticação forte com 2FA, e está em conformidade com a LGPD.

**Posso exportar meus dados?**
Sim. Todos os relatórios podem ser exportados em PDF. Para exportação completa de dados, utilize as funcionalidades de LGPD (Proteção de Dados).

**Como configuro alertas de vencimento?**
Os alertas são gerados automaticamente para contratos com data de fim definida. Personalize os dias de antecedência em Configurações > Notificações.

**O que acontece quando um contrato vence?**
O status é automaticamente atualizado para "Vencido" e alertas são enviados aos responsáveis. Se a renovação automática estiver habilitada, o sistema inicia o fluxo de renovação.

---

## 24. Glossário

| Termo | Definição |
|-------|-----------|
| **Contrato** | Documento jurídico que formaliza um acordo entre partes |
| **Fornecedor** | Empresa ou pessoa que presta serviços à organização |
| **Franquia** | Unidade franqueada vinculada à organização |
| **Obrigação** | Compromisso específico previsto em contrato com prazo |
| **Redline** | Controle de alterações no texto do contrato |
| **Template** | Modelo pré-formatado para criação de contratos |
| **Workflow** | Fluxo de aprovação com níveis hierárquicos |
| **RLS** | Row Level Security — controle de acesso ao nível de registro |
| **2FA/TOTP** | Autenticação em dois fatores via código temporário |
| **LGPD** | Lei Geral de Proteção de Dados (Lei 13.709/2018) |
| **Requisição** | Solicitação formal para criação de um novo contrato |
| **KPI** | Indicador-chave de desempenho (Key Performance Indicator) |
| **Compliance** | Conformidade com normas, leis e políticas internas |
| **Audit Log** | Registro detalhado de todas as ações no sistema |
| **Edge Function** | Função backend executada sob demanda |

---

*Manual gerado em: Março 2026 — LexFlow v1.0*
