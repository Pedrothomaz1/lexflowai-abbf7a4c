# Manual do Usuário — LexFlow

> Versão 1.0 — Maio/2026

LexFlow é a plataforma de gestão preventiva de contratos, fornecedores, obrigações e franquias. Este manual cobre o uso diário pelo cliente final (gestor, jurídico interno e equipe operacional).

---

## 1. Primeiro acesso

1. Você receberá um **e-mail de convite** enviado pelo administrador da sua organização (ou pela equipe LexFlow após a contratação).
2. Clique em **"Aceitar convite"**. Você será direcionado para criar sua senha (mínimo 12 caracteres).
3. Após criar a senha, o sistema valida o convite no servidor e te vincula automaticamente à organização correta.
4. No primeiro login, complete seu perfil (nome completo, telefone opcional) em **Configurações → Meu perfil**.

> **Importante:** O LexFlow usa apenas autenticação por **e-mail e senha**. Não há login social (Google/Microsoft). Mantenha sua senha segura — recuperação é feita via "Esqueci minha senha" na tela de login.

---

## 2. Visão geral dos módulos

| Módulo | Para que serve |
|---|---|
| **Dashboard** | Indicadores executivos: contratos ativos, vencimentos próximos, obrigações abertas, alertas. |
| **Contratos** | Cadastro, versionamento, anexos, aprovação e assinatura de contratos. |
| **Fornecedores** | Base única de fornecedores com CNPJ, contatos e documentos. |
| **Serviços** | Catálogo de serviços contratados ligados a contratos. |
| **Franquias** | Gestão de unidades (matriz/filial), apenas para clientes do plano com módulo de franquias. |
| **Obrigações** | Tarefas e compromissos contratuais com vencimento e responsável. |
| **Notificações** | Alertas em tempo real de vencimentos, mudanças de status e novos contratos. |
| **Configurações** | Perfil, membros da organização, convites, papéis (RBAC) e plano. |

---

## 3. Fluxos principais

### 3.1 Cadastrar um contrato

1. Acesse **Contratos → Novo contrato**.
2. Preencha título, número, tipo, datas de início/fim, valor e moeda.
3. Selecione o **fornecedor** (ou crie um novo direto no formulário com o botão "Novo fornecedor").
4. Anexe documentos (PDF/DOCX) — armazenados de forma privada e acessíveis apenas por membros autorizados.
5. Salve. O contrato entra como **rascunho**; mudanças de status geram notificação para todos os membros.

### 3.2 Convidar um membro

1. Acesse **Configurações → Membros → Convidar**.
2. Informe o e-mail e selecione o papel (Administrador, Analista Jurídico, Consultoria, Visualizador).
3. O convite é enviado por e-mail e expira em 7 dias.
4. O convidado deve criar conta com o **mesmo e-mail** do convite para que a vinculação ocorra automaticamente.

### 3.3 Acompanhar vencimentos

- O **Dashboard** mostra contratos que vencem em 30/60/90 dias.
- Um job diário gera alertas automáticos para vencimentos em até 30 dias.
- Notificações em tempo real aparecem no sino do topo da tela.

### 3.4 Aprovar contratos

- Contratos podem requerer aprovação antes de mudar para "ativo".
- Aprovadores recebem notificação e veem a fila em **Contratos → Aprovações pendentes**.

---

## 4. Papéis (RBAC)

| Papel | O que pode fazer |
|---|---|
| **Administrador** | Tudo: gerenciar membros, convites, plano, todos os módulos. |
| **Analista Jurídico** | Cadastrar/editar contratos, fornecedores, obrigações, anexos. |
| **Consultoria Jurídica** | Visualizar contratos e adicionar pareceres; sem gestão de membros. |
| **Visualizador** | Apenas leitura. |

Permissões são verificadas no servidor (RLS + role checks). Trocas de papel são feitas pelo administrador em **Configurações → Membros**.

---

## 5. Segurança e privacidade

- Todos os dados são isolados por organização (multi-tenant estrito com RLS).
- Documentos ficam em storage privado, acessados por URL assinada de curta duração.
- Sessão fica em `localStorage` no seu navegador — sempre faça **logout em computadores compartilhados**.
- LGPD: você pode solicitar exportação ou exclusão dos seus dados em **Configurações → Privacidade**.

---

## 6. Suporte

- E-mail: `suporte@lexflowai.com.br`
- Horário: dias úteis, 9h–18h (BRT)
- SLA por plano: ver contrato

Para incidentes críticos (indisponibilidade, vazamento suspeito), use o canal de emergência informado no onboarding.
