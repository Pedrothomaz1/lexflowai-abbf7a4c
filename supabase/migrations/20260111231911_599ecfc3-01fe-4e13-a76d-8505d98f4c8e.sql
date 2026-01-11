-- Criar tipo enum para frequência de notificação
CREATE TYPE notification_frequency AS ENUM ('immediate', 'daily', 'weekly');

-- Criar tabela de preferências de notificação
CREATE TABLE public.notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  email_enabled BOOLEAN NOT NULL DEFAULT true,
  whatsapp_enabled BOOLEAN NOT NULL DEFAULT true,
  frequency notification_frequency NOT NULL DEFAULT 'immediate',
  alert_types TEXT[] NOT NULL DEFAULT ARRAY['vencimento', 'renovacao', 'obrigacao', 'pagamento'],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- Usuários podem gerenciar suas próprias preferências
CREATE POLICY "Users can view their own preferences" ON public.notification_preferences
FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own preferences" ON public.notification_preferences
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own preferences" ON public.notification_preferences
FOR UPDATE TO authenticated
USING (user_id = auth.uid());

-- Admins podem ver todas as preferências
CREATE POLICY "Admins can view all preferences" ON public.notification_preferences
FOR SELECT TO authenticated
USING (has_any_role(auth.uid(), ARRAY['administrador']::app_role[]));

-- Trigger para atualizar updated_at
CREATE TRIGGER update_notification_preferences_updated_at
BEFORE UPDATE ON public.notification_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Adicionar coluna para rastrear emails enviados na tabela de alertas
ALTER TABLE public.contract_alerts 
ADD COLUMN IF NOT EXISTS email_enviado BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS email_enviado_em TIMESTAMP WITH TIME ZONE;