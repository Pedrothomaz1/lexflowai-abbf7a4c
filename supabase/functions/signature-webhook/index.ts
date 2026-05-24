import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.23.8";

// Permissive schema — webhook recebe payloads variados (DocuSign, ClickSign, ZapSign, D4Sign, custom).
const PayloadSchema = z.object({
  provider: z.string().max(60).optional(),
  event: z.string().max(120).optional(),
  status: z.string().max(120).optional(),
  externalId: z.union([z.string(), z.number()]).optional(),
  id: z.union([z.string(), z.number()]).optional(),
  signedDocumentUrl: z.string().url().max(2000).optional(),
  data: z.object({}).passthrough().optional(),
  document: z.object({}).passthrough().optional(),
}).passthrough();

// Allowed origins for CORS - add your production domain here
const ALLOWED_ORIGINS = [
  'http://localhost:8080',
  'http://localhost:5173',
  'http://localhost:3000',
  Deno.env.get('ALLOWED_ORIGIN') || '',
].filter(Boolean);

// Get CORS headers based on request origin
function getCorsHeaders(req: Request): Record<string, string> | null {
  const origin = req.headers.get('Origin') || '';
  const isAllowedOrigin = ALLOWED_ORIGINS.includes(origin);
  if (!isAllowedOrigin && origin) {
    // Reject requests from unknown origins (except empty origin for same-origin requests)
    return null;
  }
  const allowedOrigin = isAllowedOrigin ? origin : (ALLOWED_ORIGINS[0] || 'http://localhost:8080');

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
  };
}

// Timing-safe string comparison to prevent timing attacks
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    // Still do comparison to avoid length-based timing attack
    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ (b.charCodeAt(i % b.length) || 0);
    }
    return false;
  }
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

// Helper function to convert ArrayBuffer to hex string
function arrayBufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Helper function to convert ArrayBuffer to base64 string
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Verify webhook signature based on provider
async function verifyWebhookSignature(
  req: Request,
  payload: string,
  provider: string
): Promise<{ valid: boolean; error?: string }> {
  const webhookSecret = Deno.env.get('WEBHOOK_SECRET');
  
  // SECURITY: Require WEBHOOK_SECRET to be configured
  // This prevents unauthenticated access to the webhook endpoint
  if (!webhookSecret) {
    console.error('WEBHOOK_SECRET not configured - rejecting request for security');
    return { valid: false, error: 'WEBHOOK_SECRET must be configured for webhook security' };
  }

  try {
    switch (provider.toLowerCase()) {
      case 'docusign': {
        const signature = req.headers.get('x-docusign-signature-1');
        if (!signature) {
          return { valid: false, error: 'Missing DocuSign signature header' };
        }
        
        const key = await crypto.subtle.importKey(
          'raw',
          new TextEncoder().encode(webhookSecret),
          { name: 'HMAC', hash: 'SHA-256' },
          false,
          ['sign']
        );
        const computedSignature = await crypto.subtle.sign(
          'HMAC',
          key,
          new TextEncoder().encode(payload)
        );
        const computedBase64 = arrayBufferToBase64(computedSignature);
        
        if (signature !== computedBase64) {
          return { valid: false, error: 'Invalid DocuSign signature' };
        }
        return { valid: true };
      }
      
      case 'clicksign': {
        const apiKey = req.headers.get('x-clicksign-key') || req.headers.get('authorization');
        if (!apiKey) {
          return { valid: false, error: 'Missing ClickSign API key header' };
        }
        
        // ClickSign uses API key validation (timing-safe comparison)
        const isValidKey = timingSafeEqual(apiKey, webhookSecret) ||
                          timingSafeEqual(apiKey, `Bearer ${webhookSecret}`);
        if (!isValidKey) {
          return { valid: false, error: 'Invalid ClickSign API key' };
        }
        return { valid: true };
      }
      
      case 'zapsign': {
        // ZapSign envia chave compartilhada no header. Usamos WEBHOOK_SECRET para validar.
        const signature = req.headers.get('x-zapsign-signature')
          || req.headers.get('x-webhook-secret')
          || req.headers.get('authorization');
        if (!signature) {
          return { valid: false, error: 'Missing ZapSign signature header' };
        }
        const isValid = timingSafeEqual(signature, webhookSecret) ||
                        timingSafeEqual(signature, `Bearer ${webhookSecret}`);
        if (!isValid) {
          return { valid: false, error: 'Invalid ZapSign signature' };
        }
        return { valid: true };
      }

      case 'd4sign': {
        const hash = req.headers.get('x-d4sign-hash');
        if (!hash) {
          return { valid: false, error: 'Missing D4Sign hash header' };
        }
        
        const computedHash = await crypto.subtle.digest(
          'SHA-256',
          new TextEncoder().encode(payload + webhookSecret)
        );
        const computedHex = arrayBufferToHex(computedHash);
        
        if (hash !== computedHex) {
          return { valid: false, error: 'Invalid D4Sign hash' };
        }
        return { valid: true };
      }
      
      default: {
        // For custom/unknown providers, check for a generic authorization header
        const authHeader = req.headers.get('x-webhook-secret') || 
                          req.headers.get('authorization');
        
        if (authHeader && authHeader !== webhookSecret && authHeader !== `Bearer ${webhookSecret}`) {
          return { valid: false, error: 'Invalid webhook authorization' };
        }
        
        // If no auth header provided and we have a secret configured, require validation
        if (!authHeader && webhookSecret) {
          console.warn('No authorization header provided for custom webhook');
          return { valid: false, error: 'Missing webhook authorization header' };
        }
        
        return { valid: true };
      }
    }
  } catch (error) {
    console.error('Signature verification error:', error);
    return { valid: false, error: 'Signature verification failed' };
  }
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  // Reject requests from unauthorized origins
  if (!corsHeaders) {
    return new Response(
      JSON.stringify({ error: 'Origin not allowed' }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Get client IP for logging
  const clientIP = req.headers.get('x-forwarded-for') ||
                   req.headers.get('x-real-ip') ||
                   'unknown';

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Read body as text for signature verification
    const bodyText = await req.text();
    let rawPayload: unknown;

    try {
      rawPayload = JSON.parse(bodyText);
    } catch (_parseError) {
      console.error(`[${clientIP}] Invalid JSON payload`);
      return new Response(
        JSON.stringify({ error: 'Invalid JSON payload' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const parsedPayload = PayloadSchema.safeParse(rawPayload);
    if (!parsedPayload.success) {
      console.warn(`[${clientIP}] Payload com tipos inválidos`, parsedPayload.error.flatten().fieldErrors);
      return new Response(
        JSON.stringify({ error: 'Invalid payload shape', details: parsedPayload.error.flatten().fieldErrors }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const payload = parsedPayload.data as any;

    console.log(`[${clientIP}] Webhook received:`, JSON.stringify(payload, null, 2));

    // Identify provider from header or payload
    const provider = req.headers.get('x-signature-provider') || payload.provider || 'custom';
    
    // Verify webhook signature
    const verification = await verifyWebhookSignature(req, bodyText, provider);
    if (!verification.valid) {
      console.error(`[${clientIP}] Webhook verification failed for provider ${provider}: ${verification.error}`);
      return new Response(
        JSON.stringify({ error: 'Unauthorized', details: verification.error }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[${clientIP}] Webhook signature verified for provider: ${provider}`);

    let externalId: string;
    let status: string;
    let signedDocumentUrl: string | null = null;
    let metadata: any = {};

    // Process webhook based on provider
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

      case 'zapsign':
        externalId = payload.token || payload.open_id || payload.doc_token;
        status = mapZapSignStatus(payload.event_type || payload.status);
        signedDocumentUrl = payload.signed_file || payload.original_file;
        metadata = {
          event_type: payload.event_type,
          signers: payload.signers,
          name: payload.name,
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
        // Generic format
        externalId = payload.externalId || payload.id;
        status = payload.status || 'pending';
        signedDocumentUrl = payload.signedDocumentUrl;
        metadata = payload;
    }

    // Validate externalId format (basic validation)
    if (!externalId || typeof externalId !== 'string' || externalId.length < 1 || externalId.length > 500) {
      console.error(`[${clientIP}] Invalid external ID: ${externalId}`);
      return new Response(
        JSON.stringify({ error: 'Invalid external ID' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate status is one of expected values
    const validStatuses = ['pending', 'sent', 'viewed', 'signed', 'completed', 'declined', 'cancelled', 'expired'];
    if (!validStatuses.includes(status)) {
      console.warn(`[${clientIP}] Unknown status received: ${status}, defaulting to pending`);
      status = 'pending';
    }

    // Verify external_id exists before updating
    const { data: existingSignature, error: checkError } = await supabase
      .from('contract_signatures')
      .select('id, contrato_id')
      .eq('external_id', externalId)
      .single();

    if (checkError || !existingSignature) {
      console.error(`[${clientIP}] Signature not found for external_id: ${externalId}`);
      return new Response(
        JSON.stringify({ error: 'Signature record not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update signature status
    const updateData: any = {
      status,
      metadata,
      updated_at: new Date().toISOString(),
    };

    if (signedDocumentUrl && typeof signedDocumentUrl === 'string' && signedDocumentUrl.length < 2000) {
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
      console.error(`[${clientIP}] Error updating signature:`, error);
      return new Response(
        JSON.stringify({ error: 'Failed to update signature' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[${clientIP}] Signature updated successfully:`, data.id);

    // If completed, update the contract
    if (status === 'completed' && data) {
      const { error: contratoError } = await supabase
        .from('contratos')
        .update({
          status: 'vigente',
          data_assinatura: new Date().toISOString().split('T')[0],
        })
        .eq('id', data.contrato_id);

      if (contratoError) {
        console.error(`[${clientIP}] Error updating contract:`, contratoError);
      }
    }

    return new Response(
      JSON.stringify({ success: true, data }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error(`[${clientIP}] Webhook processing error:`, error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Status mapping functions
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

function mapZapSignStatus(status: string): string {
  const statusMap: Record<string, string> = {
    'doc_created': 'sent',
    'doc_sent': 'sent',
    'doc_viewed': 'viewed',
    'doc_signed': 'signed',
    'doc_completed': 'completed',
    'doc_refused': 'declined',
    'doc_deleted': 'cancelled',
    'doc_expired': 'expired',
    'signed': 'signed',
    'completed': 'completed',
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
