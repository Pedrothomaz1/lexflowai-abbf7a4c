import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Rate limit configurations by endpoint tier
interface RateLimitRule {
  tier: string;
  maxRequests: number;
  windowSeconds: number;
  burstAllowed: number;
}

const RATE_LIMIT_RULES: Record<string, RateLimitRule> = {
  // Critical tier - auth endpoints
  '/auth/login': { tier: 'CRITICAL', maxRequests: 5, windowSeconds: 300, burstAllowed: 0 },
  '/auth/reset-password': { tier: 'CRITICAL', maxRequests: 3, windowSeconds: 3600, burstAllowed: 0 },
  '/auth/signup': { tier: 'CRITICAL', maxRequests: 5, windowSeconds: 600, burstAllowed: 0 },
  
  // High tier - financial operations
  '/financial': { tier: 'HIGH', maxRequests: 20, windowSeconds: 60, burstAllowed: 5 },
  '/export': { tier: 'HIGH', maxRequests: 5, windowSeconds: 3600, burstAllowed: 0 },
  '/contracts/create': { tier: 'HIGH', maxRequests: 10, windowSeconds: 60, burstAllowed: 2 },
  '/contracts/delete': { tier: 'HIGH', maxRequests: 5, windowSeconds: 60, burstAllowed: 0 },
  
  // Medium tier - data mutations
  '/api/write': { tier: 'MEDIUM', maxRequests: 50, windowSeconds: 60, burstAllowed: 10 },
  
  // Baseline - default
  'default': { tier: 'BASELINE', maxRequests: 200, windowSeconds: 60, burstAllowed: 50 }
};

// Role-based multipliers
const ROLE_MULTIPLIERS: Record<string, number> = {
  'administrador': 2.5,
  'consultoria_juridica': 2.0,
  'analista_juridico': 1.5,
  'default': 1.0
};

function findMatchingRule(endpoint: string): RateLimitRule {
  // Check for exact match first
  if (RATE_LIMIT_RULES[endpoint]) {
    return RATE_LIMIT_RULES[endpoint];
  }
  
  // Check for prefix match
  for (const [pattern, rule] of Object.entries(RATE_LIMIT_RULES)) {
    if (pattern !== 'default' && endpoint.startsWith(pattern)) {
      return rule;
    }
  }
  
  return RATE_LIMIT_RULES['default'];
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { endpoint, userId, ipAddress, userRole } = await req.json();

    if (!endpoint) {
      return new Response(
        JSON.stringify({ error: 'Endpoint é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const rule = findMatchingRule(endpoint);
    const roleMultiplier = ROLE_MULTIPLIERS[userRole] || ROLE_MULTIPLIERS['default'];
    const adjustedMaxRequests = Math.floor(rule.maxRequests * roleMultiplier);

    const now = new Date();
    const windowStart = new Date(now.getTime() - rule.windowSeconds * 1000);

    // Build the key for rate limiting (user-based or IP-based)
    const rateLimitKey = userId || ipAddress || 'anonymous';
    const endpointKey = endpoint.replace(/[^a-zA-Z0-9]/g, '_');

    // Count requests in the current window
    const { count, error: countError } = await supabase
      .from('rate_limits')
      .select('*', { count: 'exact', head: true })
      .eq('endpoint_key', endpointKey)
      .or(`user_id.eq.${userId || 'null'},ip_address.eq.${ipAddress || '0.0.0.0'}`)
      .gte('window_start', windowStart.toISOString());

    if (countError) {
      console.error('[rate-limiter] Count error:', countError);
      // On error, allow the request (fail open for availability)
      return new Response(
        JSON.stringify({ 
          allowed: true, 
          warning: 'Rate limit check failed, allowing request'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const currentCount = count || 0;
    const remaining = Math.max(0, adjustedMaxRequests - currentCount);
    const allowed = currentCount < adjustedMaxRequests;

    // Calculate retry-after if blocked
    const retryAfter = allowed ? 0 : rule.windowSeconds;

    // Record this request
    if (allowed) {
      await supabase.from('rate_limits').insert({
        user_id: userId || null,
        ip_address: ipAddress || '0.0.0.0',
        endpoint_key: endpointKey,
        window_start: now.toISOString()
      });
    }

    // Log blocked requests
    if (!allowed) {
      console.warn(`[rate-limiter] BLOCKED: ${rateLimitKey} on ${endpoint} (${currentCount}/${adjustedMaxRequests})`);
      
      // Record in audit log for security monitoring
      await supabase.from('audit_logs').insert({
        user_id: userId || null,
        acao: 'RATE_LIMIT_EXCEEDED',
        entidade: 'rate_limits',
        metadata: {
          endpoint,
          ip_address: ipAddress,
          current_count: currentCount,
          max_allowed: adjustedMaxRequests,
          tier: rule.tier
        },
        risk_level: rule.tier === 'CRITICAL' ? 'high' : 'medium',
        event_category: 'security'
      });
    }

    return new Response(
      JSON.stringify({
        allowed,
        tier: rule.tier,
        limit: adjustedMaxRequests,
        remaining,
        resetIn: rule.windowSeconds,
        retryAfter: allowed ? null : retryAfter
      }),
      { 
        status: allowed ? 200 : 429,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': String(adjustedMaxRequests),
          'X-RateLimit-Remaining': String(remaining),
          'X-RateLimit-Reset': String(rule.windowSeconds),
          ...(allowed ? {} : { 'Retry-After': String(retryAfter) })
        } 
      }
    );
  } catch (error) {
    console.error('[rate-limiter] Error:', error);
    // Fail open for availability
    return new Response(
      JSON.stringify({ allowed: true, error: 'Rate limit check failed' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
