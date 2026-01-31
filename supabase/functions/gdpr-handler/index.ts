import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

interface GDPRRequest {
  action: 'erasure' | 'export' | 'access';
  user_id?: string;
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  // Reject requests from unauthorized origins
  if (!corsHeaders) {
    return new Response(
      JSON.stringify({ error: 'Origin not allowed' }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Validate authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    // Validate user
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: 'Token inválido' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const requestingUserId = claimsData.claims.sub as string;

    // Parse request body
    const body: GDPRRequest = await req.json();
    const { action, user_id } = body;

    if (!action) {
      return new Response(
        JSON.stringify({ error: 'Ação LGPD não especificada' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // =========================================================
    // MULTI-TENANT: Resolve requesting user's organization
    // =========================================================
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: requestingMembership } = await serviceClient
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', requestingUserId)
      .eq('is_active', true)
      .single();

    if (!requestingMembership?.organization_id) {
      return new Response(
        JSON.stringify({ error: 'Usuário não pertence a nenhuma organização' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const requestingOrgId = requestingMembership.organization_id;

    // Target user (self or specified by admin)
    const targetUserId = user_id || requestingUserId;

    // =========================================================
    // MULTI-TENANT: Verify target user belongs to same organization
    // =========================================================
    if (targetUserId !== requestingUserId) {
      // Check if requesting user is admin
      const { data: roles } = await serviceClient
        .from('user_roles')
        .select('role')
        .eq('user_id', requestingUserId)
        .single();

      if (roles?.role !== 'administrador') {
        return new Response(
          JSON.stringify({ error: 'Apenas administradores podem processar solicitações de outros usuários' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Verify target user is in the same organization
      const { data: targetMembership } = await serviceClient
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', targetUserId)
        .eq('is_active', true)
        .single();

      if (targetMembership?.organization_id !== requestingOrgId) {
        return new Response(
          JSON.stringify({ error: 'Não é possível processar solicitações de usuários de outras organizações' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    console.log(`[GDPR] Processing ${action} for user ${targetUserId} in org ${requestingOrgId}`);

    let result: any;

    switch (action) {
      case 'erasure': {
        console.log(`Processing erasure request for user: ${targetUserId}`);
        
        // Call the gdpr_delete_user function
        const { data, error } = await serviceClient.rpc('gdpr_delete_user', {
          user_uuid: targetUserId
        });

        if (error) {
          console.error('Erasure error:', error);
          throw new Error(`Erro ao processar exclusão: ${error.message}`);
        }

        // Log to compliance - SCOPED BY ORGANIZATION
        await serviceClient.from('compliance_logs').insert({
          organization_id: requestingOrgId,
          tipo_evento: 'erasure_executed',
          entidade: 'profiles',
          entidade_id: targetUserId,
          dados_afetados: { action: 'gdpr_delete_user', result: data },
          base_legal: 'LGPD Art. 18',
          user_id: requestingUserId
        });

        result = {
          success: true,
          action: 'erasure',
          user_id: targetUserId,
          message: 'Dados do usuário foram anonimizados conforme LGPD Art. 18',
          details: data
        };
        break;
      }

      case 'export': {
        console.log(`Processing export request for user: ${targetUserId}`);

        // Gather all user data - SCOPED BY ORGANIZATION
        const [profileData, contractsData, auditData] = await Promise.all([
          serviceClient.from('profiles').select('*').eq('id', targetUserId).single(),
          serviceClient.from('contratos').select('*').eq('organization_id', requestingOrgId).eq('created_by', targetUserId),
          serviceClient.from('audit_logs').select('acao, entidade, created_at').eq('organization_id', requestingOrgId).eq('user_id', targetUserId).limit(100)
        ]);

        // Log the export event - SCOPED BY ORGANIZATION
        await serviceClient.from('compliance_logs').insert({
          organization_id: requestingOrgId,
          tipo_evento: 'exportacao',
          entidade: 'profiles',
          entidade_id: targetUserId,
          dados_afetados: { campos: ['profile', 'contratos', 'audit_logs'] },
          base_legal: 'LGPD Art. 18',
          user_id: requestingUserId
        });

        result = {
          success: true,
          action: 'export',
          user_id: targetUserId,
          message: 'Dados exportados conforme LGPD Art. 18',
          data: {
            profile: profileData.data,
            contracts_created: contractsData.data?.length || 0,
            recent_activity: auditData.data?.length || 0
          }
        };
        break;
      }

      case 'access': {
        console.log(`Processing access request for user: ${targetUserId}`);

        // Get profile and summary of stored data
        const { data: profile } = await serviceClient
          .from('profiles')
          .select('full_name, email, phone, department, created_at')
          .eq('id', targetUserId)
          .single();

        // Count data SCOPED BY ORGANIZATION
        const { count: contractCount } = await serviceClient
          .from('contratos')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', requestingOrgId)
          .eq('created_by', targetUserId);

        const { count: auditCount } = await serviceClient
          .from('audit_logs')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', requestingOrgId)
          .eq('user_id', targetUserId);

        // Log the access event - SCOPED BY ORGANIZATION
        await serviceClient.from('compliance_logs').insert({
          organization_id: requestingOrgId,
          tipo_evento: 'acesso_dados',
          entidade: 'profiles',
          entidade_id: targetUserId,
          dados_afetados: { tipo: 'resumo' },
          base_legal: 'LGPD Art. 18',
          user_id: requestingUserId
        });

        result = {
          success: true,
          action: 'access',
          user_id: targetUserId,
          message: 'Resumo dos dados armazenados',
          data: {
            profile: profile ? {
              nome: profile.full_name,
              email: profile.email,
              telefone: profile.phone,
              departamento: profile.department,
              criado_em: profile.created_at
            } : null,
            contratos_criados: contractCount || 0,
            registros_auditoria: auditCount || 0
          }
        };
        break;
      }

      default:
        return new Response(
          JSON.stringify({ error: `Ação desconhecida: ${action}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    console.log(`GDPR ${action} completed successfully for user ${targetUserId} in org ${requestingOrgId}`);

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('GDPR Handler error:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno ao processar solicitação LGPD' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
