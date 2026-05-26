import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGINS = [
  'http://localhost:8080',
  'http://localhost:5173',
  'http://localhost:3000',
  Deno.env.get('ALLOWED_ORIGIN') || '',
].filter(Boolean);

function getCorsHeaders(req: Request): Record<string, string> | null {
  const origin = req.headers.get('Origin') || '';
  const isAllowedOrigin = ALLOWED_ORIGINS.includes(origin);
  if (!isAllowedOrigin && origin) return null;
  const allowedOrigin = isAllowedOrigin ? origin : (ALLOWED_ORIGINS[0] || 'http://localhost:8080');
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
  };
}

interface ValoresContratoRequest {
  contratoId: string;
  tipo: 'renovacao' | 'vencimento' | 'alerta';
  destinatarios?: string[];
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (!corsHeaders) {
    return new Response(JSON.stringify({ error: 'Origin not allowed' }),
      { status: 403, headers: { 'Content-Type': 'application/json' } });
  }
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Token inválido ou expirado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const body: ValoresContratoRequest = await req.json();
    const { contratoId, tipo, destinatarios: customDestinatarios } = body;

    const { data: contrato, error: contratoError } = await supabase
      .from("contratos").select(`*, fornecedores ( nome, email )`).eq("id", contratoId).single();
    if (contratoError || !contrato) {
      throw new Error(`Contrato não encontrado: ${contratoError?.message}`);
    }

    let destinatarios: string[] = customDestinatarios || [];
    if (destinatarios.length === 0) {
      const { data: userRoles } = await supabase.from("user_roles")
        .select(`user_id, profiles!inner ( email )`)
        .in("role", ["consultoria_juridica", "administrador"])
        .eq("organization_id", contrato.organization_id);
      if (userRoles) {
        destinatarios = userRoles
          .map((ur: any) => ur.profiles?.email)
          .filter((email: string | null): email is string => !!email);
      }
    }

    if (destinatarios.length === 0) {
      return new Response(JSON.stringify({ success: true, emailsEnviados: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const valorFormatado = contrato.valor_total
      ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: contrato.moeda || "BRL" }).format(contrato.valor_total)
      : undefined;
    const dataFim = contrato.data_fim
      ? new Date(contrato.data_fim).toLocaleDateString("pt-BR")
      : undefined;
    const contractUrl = `https://lexflowai.com.br/contratos/${contratoId}`;

    const templateData = {
      tipo,
      numeroContrato: contrato.numero_contrato,
      tituloContrato: contrato.titulo,
      fornecedor: contrato.fornecedores?.nome,
      vencimento: dataFim,
      valorFormatado,
      contratoUrl: contractUrl,
    };

    const unique = Array.from(new Set(destinatarios.map(e => e.toLowerCase())));
    let emailsEnviados = 0;
    const erros: string[] = [];

    for (const email of unique) {
      const { error: invokeErr } = await supabase.functions.invoke('send-transactional-email', {
        body: {
          templateName: 'contract-status-alert',
          recipientEmail: email,
          idempotencyKey: `valores-${contratoId}-${tipo}-${email}`,
          templateData,
        },
      });
      if (invokeErr) {
        erros.push(`${email}: ${invokeErr.message ?? String(invokeErr)}`);
      } else {
        emailsEnviados++;
      }
    }

    await supabase.from("uso_sistema").insert({
      tipo: "email",
      recurso: "lovable_emails",
      quantidade: emailsEnviados,
      custo_unitario: 0,
      custo_total: 0,
      user_id: user.id,
      contrato_id: contratoId,
      metadata: { tipo_email: `valores_${tipo}`, destinatarios: unique.length, provider: 'lovable_emails' },
    });

    return new Response(JSON.stringify({
      success: true, emailsEnviados, totalDestinatarios: unique.length,
      erros: erros.length > 0 ? erros : undefined,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error: any) {
    console.error("Erro na função enviar-valores-contrato:", error);
    return new Response(JSON.stringify({ error: "Erro interno. Tente novamente." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
