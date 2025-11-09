import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const payload = await req.json();
    console.log('Webhook received:', JSON.stringify(payload, null, 2));

    // Identificar o provedor pelo header ou corpo da requisição
    const provider = req.headers.get('x-signature-provider') || payload.provider || 'custom';
    
    let externalId: string;
    let status: string;
    let signedDocumentUrl: string | null = null;
    let metadata: any = {};

    // Processar webhook baseado no provedor
    switch (provider.toLowerCase()) {
      case 'docusign':
        externalId = payload.data?.envelopeId || payload.envelopeId;
        status = mapDocuSignStatus(payload.event || payload.status);
        signedDocumentUrl = payload.data?.signedDocumentUrl;
        metadata = {
          event: payload.event,
          recipients: payload.data?.recipients,
        };
        break;

      case 'clicksign':
        externalId = payload.document?.key || payload.key;
        status = mapClicksignStatus(payload.event || payload.document?.status);
        signedDocumentUrl = payload.document?.downloads?.signed_file_url;
        metadata = {
          event: payload.event,
          signers: payload.document?.signers,
        };
        break;

      case 'd4sign':
        externalId = payload.uuid_safe || payload.uuid;
        status = mapD4SignStatus(payload.status_name || payload.status);
        signedDocumentUrl = payload.url_signed;
        metadata = {
          status_name: payload.status_name,
          signers: payload.signers,
        };
        break;

      default:
        // Formato genérico
        externalId = payload.externalId || payload.id;
        status = payload.status || 'pending';
        signedDocumentUrl = payload.signedDocumentUrl;
        metadata = payload;
    }

    if (!externalId) {
      console.error('External ID not found in payload');
      return new Response(
        JSON.stringify({ error: 'External ID not found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Atualizar status da assinatura
    const updateData: any = {
      status,
      metadata,
      updated_at: new Date().toISOString(),
    };

    if (signedDocumentUrl) {
      updateData.signed_document_url = signedDocumentUrl;
    }

    if (status === 'completed') {
      updateData.completed_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('contract_signatures')
      .update(updateData)
      .eq('external_id', externalId)
      .select()
      .single();

    if (error) {
      console.error('Error updating signature:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Signature updated successfully:', data);

    // Se completado, atualizar o contrato
    if (status === 'completed' && data) {
      const { error: contratoError } = await supabase
        .from('contratos')
        .update({
          status: 'vigente',
          data_assinatura: new Date().toISOString().split('T')[0],
        })
        .eq('id', data.contrato_id);

      if (contratoError) {
        console.error('Error updating contract:', contratoError);
      }
    }

    return new Response(
      JSON.stringify({ success: true, data }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Webhook processing error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Mapeamento de status dos provedores
function mapDocuSignStatus(status: string): string {
  const statusMap: Record<string, string> = {
    'sent': 'sent',
    'delivered': 'viewed',
    'signed': 'signed',
    'completed': 'completed',
    'declined': 'declined',
    'voided': 'cancelled',
  };
  return statusMap[status?.toLowerCase()] || 'pending';
}

function mapClicksignStatus(status: string): string {
  const statusMap: Record<string, string> = {
    'running': 'sent',
    'viewed': 'viewed',
    'signed': 'signed',
    'closed': 'completed',
    'canceled': 'cancelled',
  };
  return statusMap[status?.toLowerCase()] || 'pending';
}

function mapD4SignStatus(status: string): string {
  const statusMap: Record<string, string> = {
    'aguardando assinaturas': 'sent',
    'assinado': 'completed',
    'cancelado': 'cancelled',
    'expirado': 'expired',
  };
  return statusMap[status?.toLowerCase()] || 'pending';
}
