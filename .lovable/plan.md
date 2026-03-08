

## Plano: Executar migrations de notificacoes e agendar cron job

A tabela `notifications`, as funcoes helper e os triggers ainda nao existem no banco. Preciso executar as duas migrations e agendar o cron.

---

### Passo 1: Criar tabela `notifications` + RLS + Realtime

Executar o conteudo de `supabase/migrations/20260308120000_notifications_realtime.sql`:
- Cria tabela `notifications` com colunas: id, organization_id, user_id, tipo, titulo, mensagem, referencia_id, referencia_tipo, lida, created_at
- Habilita RLS com policies de SELECT e UPDATE para o proprio usuario
- Adiciona a tabela ao Realtime
- Cria indice de performance

### Passo 2: Criar triggers de notificacao

Executar o conteudo de `supabase/migrations/20260308130000_notification_triggers.sql`:
- Funcao `notify_org_members()` — helper que insere notificacao para todos os membros ativos
- Trigger `trg_contrato_status_change` — dispara ao alterar status de contrato
- Trigger `trg_nova_obrigacao` — dispara ao inserir nova obrigacao
- Trigger `trg_novo_contrato` — dispara ao inserir novo contrato
- Funcao `job_notificar_vencimentos()` atualizada — alerta em 30, 15 e 7 dias

### Passo 3: Agendar cron job diario

Agendar via `cron.schedule` para rodar todo dia as 8h UTC.

### Passo 4: Inserir notificacao de teste

Inserir um registro de teste para validar que o sino de notificacoes funciona em tempo real.

---

### Arquivos — nenhuma alteracao de codigo

Todas as mudancas sao exclusivamente no banco de dados, executadas via migration tool.

