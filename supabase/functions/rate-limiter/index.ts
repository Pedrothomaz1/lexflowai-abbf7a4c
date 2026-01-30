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

// Role-specific limits (Phase 5: Hardening)
interface RoleLimits {
  multiplier: number;
  callsPerMinute: number;
  exportsPerHour: number;
  maxConcurrentSessions: number;
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

// Role-based limits as per Phase 5 requirements
const ROLE_LIMITS: Record<string, RoleLimits> = {
  'administrador': {
    multiplier: 2.5,
    callsPerMinute: 500,
    exportsPerHour: 20,
    maxConcurrentSessions: 3
  },
  'consultoria_juridica': {
    multiplier: 2.0,
    callsPerMinute: 200,
    exportsPerHour: 10,
    maxConcurrentSessions: 2
  },
  'analista_juridico': {
    multiplier: 1.5,
    callsPerMinute: 100,
    exportsPerHour: 5,
    maxConcurrentSessions: 1
  },
  'default': {
    multiplier: 1.0,
    callsPerMinute: 50,
    exportsPerHour: 1,
    maxConcurrentSessions: 1
  }
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

function getRoleLimits(userRole: string): RoleLimits {
  return ROLE_LIMITS[userRole] || ROLE_LIMITS['default'];
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

    const { endpoint, userId, ipAddress, userRole, checkExport, checkSession } = await req.json();

    if (!endpoint) {
      return new Response(
        JSON.stringify({ error: 'Endpoint é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const rule = findMatchingRule(endpoint);
    const roleLimits = getRoleLimits(userRole || 'default');
    
    // Use role-specific multiplier for general rate limiting
    const adjustedMaxRequests = Math.floor(rule.maxRequests * roleLimits.multiplier);

    const now = new Date();
    const windowStart = new Date(now.getTime() - rule.windowSeconds * 1000);

    // Build the key for rate limiting (user-based or IP-based)
    const rateLimitKey = userId || ipAddress || 'anonymous';
    const endpointKey = endpoint.replace(/[^a-zA-Z0-9]/g, '_');

    // Check export limits if requested
    if (checkExport && userId) {
      const hourAgo = new Date(now.getTime() - 3600 * 1000);
      
      const { count: exportCount } = await supabase
        .from('rate_limits')
        .select('*', { count: 'exact', head: true })
        .eq('endpoint_key', 'export')
        .eq('user_id', userId)
        .gte('window_start', hourAgo.toISOString());

      if ((exportCount || 0) >= roleLimits.exportsPerHour) {
        console.warn(`[rate-limiter] EXPORT LIMIT: ${userId} exceeded ${roleLimits.exportsPerHour} exports/hour`);
        
        await supabase.from('audit_logs').insert({
          user_id: userId,
          acao: 'EXPORT_LIMIT_EXCEEDED',
          entidade: 'rate_limits',
          metadata: {
            endpoint,
            current_count: exportCount,
            max_allowed: roleLimits.exportsPerHour,
            role: userRole
          },
          risk_level: 'medium',
          event_category: 'security'
        });

        return new Response(
          JSON.stringify({
            allowed: false,
            reason: 'export_limit',
            limit: roleLimits.exportsPerHour,
            remaining: 0,
            retryAfter: 3600
          }),
          { 
            status: 429,
            headers: { 
              ...corsHeaders, 
              'Content-Type': 'application/json',
              'Retry-After': '3600'
            } 
          }
        );
      }
    }

    // Check concurrent sessions if requested
    if (checkSession && userId) {
      const { count: sessionCount } = await supabase
        .from('user_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_active', true)
        .gt('expires_at', now.toISOString());

      if ((sessionCount || 0) >= roleLimits.maxConcurrentSessions) {
        console.warn(`[rate-limiter] SESSION LIMIT: ${userId} has ${sessionCount}/${roleLimits.maxConcurrentSessions} sessions`);
        
        return new Response(
          JSON.stringify({
            allowed: false,
            reason: 'session_limit',
            currentSessions: sessionCount,
            maxSessions: roleLimits.maxConcurrentSessions
          }),
          { 
            status: 429,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
    }

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
          tier: rule.tier,
          role: userRole,
          role_limits: roleLimits
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
        retryAfter: allowed ? null : retryAfter,
        roleLimits: {
          callsPerMinute: roleLimits.callsPerMinute,
          exportsPerHour: roleLimits.exportsPerHour,
          maxConcurrentSessions: roleLimits.maxConcurrentSessions
        }
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
