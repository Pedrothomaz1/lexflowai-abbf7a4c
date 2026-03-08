-- Tabela de notificações em tempo real
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('vencimento', 'status_change', 'aprovacao', 'obrigacao', 'geral')),
  titulo TEXT NOT NULL,
  mensagem TEXT,
  referencia_id UUID,
  referencia_tipo TEXT CHECK (referencia_tipo IN ('contrato', 'obrigacao', 'fornecedor', NULL)),
  lida BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_see_own_notifications"
  ON notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "users_update_own_notifications"
  ON notifications FOR UPDATE
  USING (user_id = auth.uid());

-- Habilitar Realtime na tabela
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- Index para performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_lida
  ON notifications (user_id, lida, created_at DESC);
