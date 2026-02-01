import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
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

// Base32 alphabet for TOTP
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

// Generate a random base32 secret (20 bytes = 32 Base32 characters)
function generateSecret(): string {
  const bytes = new Uint8Array(20);
  crypto.getRandomValues(bytes);
  return base32Encode(bytes);
}

// Encode bytes to Base32 (RFC 4648)
function base32Encode(data: Uint8Array): string {
  let result = '';
  let buffer = 0;
  let bitsLeft = 0;

  for (const byte of data) {
    buffer = (buffer << 8) | byte;
    bitsLeft += 8;

    while (bitsLeft >= 5) {
      bitsLeft -= 5;
      result += BASE32_ALPHABET[(buffer >> bitsLeft) & 0x1f];
    }
  }

  if (bitsLeft > 0) {
    result += BASE32_ALPHABET[(buffer << (5 - bitsLeft)) & 0x1f];
  }

  return result;
}

// Decode base32 to bytes
function base32Decode(encoded: string): Uint8Array {
  const cleaned = encoded.toUpperCase().replace(/[^A-Z2-7]/g, '');
  const output = [];
  let buffer = 0;
  let bitsLeft = 0;

  for (const char of cleaned) {
    const value = BASE32_ALPHABET.indexOf(char);
    if (value === -1) continue;
    buffer = (buffer << 5) | value;
    bitsLeft += 5;
    if (bitsLeft >= 8) {
      bitsLeft -= 8;
      output.push((buffer >> bitsLeft) & 0xff);
    }
  }
  return new Uint8Array(output);
}

// Generate HMAC-SHA1
async function hmacSha1(key: Uint8Array, data: Uint8Array): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key.buffer as ArrayBuffer,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, data.buffer as ArrayBuffer);
  return new Uint8Array(signature);
}

// Generate TOTP code with correct 8-byte counter
async function generateTOTP(secret: string, timeStep = 30): Promise<string> {
  const key = base32Decode(secret);
  const counter = Math.floor(Date.now() / 1000 / timeStep);
  
  const buffer = new ArrayBuffer(8);
  const view = new DataView(buffer);
  // Correctly set 8-byte counter: high 32 bits + low 32 bits
  view.setUint32(0, Math.floor(counter / 0x100000000), false);
  view.setUint32(4, counter >>> 0, false);
  
  const hmac = await hmacSha1(key, new Uint8Array(buffer));
  const offset = hmac[hmac.length - 1] & 0x0f;
  
  const code = (
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff)
  ) % 1000000;
  
  return code.toString().padStart(6, '0');
}

// Verify TOTP code with time window (correct 8-byte counter)
async function verifyTOTP(secret: string, code: string, window = 1): Promise<boolean> {
  const key = base32Decode(secret);
  const timeStep = 30;
  const currentCounter = Math.floor(Date.now() / 1000 / timeStep);
  
  for (let i = -window; i <= window; i++) {
    const counter = currentCounter + i;
    
    const buffer = new ArrayBuffer(8);
    const view = new DataView(buffer);
    // Correctly set 8-byte counter: high 32 bits + low 32 bits
    view.setUint32(0, Math.floor(counter / 0x100000000), false);
    view.setUint32(4, counter >>> 0, false);
    
    const hmac = await hmacSha1(key, new Uint8Array(buffer));
    const offset = hmac[hmac.length - 1] & 0x0f;
    
    const generatedCode = (
      ((hmac[offset] & 0x7f) << 24) |
      ((hmac[offset + 1] & 0xff) << 16) |
      ((hmac[offset + 2] & 0xff) << 8) |
      (hmac[offset + 3] & 0xff)
    ) % 1000000;
    
    if (generatedCode.toString().padStart(6, '0') === code) {
      return true;
    }
  }
  return false;
}

// Generate backup codes
function generateBackupCodes(count = 10): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const buffer = new Uint8Array(4);
    crypto.getRandomValues(buffer);
    const code = Array.from(buffer)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase();
    codes.push(code.slice(0, 4) + '-' + code.slice(4, 8));
  }
  return codes;
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

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getUser(token);
    
    if (claimsError || !claimsData?.user) {
      return new Response(
        JSON.stringify({ error: 'Token inválido' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = claimsData.user.id;
    const userEmail = claimsData.user.email || '';

    const { action, code } = await req.json();
    console.log(`[totp-auth] Action: ${action}, User: ${userId}`);

    switch (action) {
      case 'setup': {
        // Generate new TOTP secret (20 bytes = 32 Base32 chars)
        const secret = generateSecret();
        const backupCodes = generateBackupCodes(10);
        
        // Generate otpauth URL for QR code
        const issuer = 'LexFlow';
        const otpauthUrl = `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(userEmail)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
        
        // Store secret temporarily (not enabled yet)
        const { error: upsertError } = await supabase
          .from('user_2fa_settings')
          .upsert({
            user_id: userId,
            totp_secret: secret,
            backup_codes: backupCodes,
            is_enabled: false,
            verified_at: null
          }, { onConflict: 'user_id' });

        if (upsertError) {
          console.error('[totp-auth] Setup error:', upsertError);
          return new Response(
            JSON.stringify({ error: 'Erro ao configurar 2FA' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({
            success: true,
            secret,
            otpauthUrl,
            backupCodes
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'verify-setup': {
        // Verify code and enable 2FA
        if (!code || typeof code !== 'string' || code.length !== 6) {
          return new Response(
            JSON.stringify({ error: 'Código inválido' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { data: settings, error: fetchError } = await supabase
          .from('user_2fa_settings')
          .select('totp_secret')
          .eq('user_id', userId)
          .single();

        if (fetchError || !settings?.totp_secret) {
          return new Response(
            JSON.stringify({ error: 'Configure o 2FA primeiro' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const isValid = await verifyTOTP(settings.totp_secret, code);
        
        if (!isValid) {
          return new Response(
            JSON.stringify({ error: 'Código incorreto', valid: false }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Enable 2FA
        const { error: updateError } = await supabase
          .from('user_2fa_settings')
          .update({
            is_enabled: true,
            verified_at: new Date().toISOString()
          })
          .eq('user_id', userId);

        if (updateError) {
          console.error('[totp-auth] Enable error:', updateError);
          return new Response(
            JSON.stringify({ error: 'Erro ao ativar 2FA' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ success: true, valid: true, enabled: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'verify': {
        // Verify TOTP code for login
        if (!code || typeof code !== 'string') {
          return new Response(
            JSON.stringify({ error: 'Código inválido' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { data: settings, error: fetchError } = await supabase
          .from('user_2fa_settings')
          .select('totp_secret, is_enabled, backup_codes')
          .eq('user_id', userId)
          .single();

        if (fetchError || !settings) {
          return new Response(
            JSON.stringify({ error: '2FA não configurado', valid: false }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        if (!settings.is_enabled) {
          return new Response(
            JSON.stringify({ valid: true, message: '2FA não está ativo' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Check if it's a backup code
        const cleanCode = code.toUpperCase().replace(/[^A-F0-9-]/g, '');
        if (cleanCode.length === 9 && cleanCode.includes('-')) {
          const backupCodes = settings.backup_codes || [];
          const codeIndex = backupCodes.indexOf(cleanCode);
          
          if (codeIndex !== -1) {
            // Remove used backup code
            const newBackupCodes = backupCodes.filter((_: string, i: number) => i !== codeIndex);
            await supabase
              .from('user_2fa_settings')
              .update({ backup_codes: newBackupCodes })
              .eq('user_id', userId);

            return new Response(
              JSON.stringify({ valid: true, usedBackupCode: true }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        }

        // Verify TOTP code
        const isValid = await verifyTOTP(settings.totp_secret, code);

        return new Response(
          JSON.stringify({ valid: isValid }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'disable': {
        // Disable 2FA
        if (!code || typeof code !== 'string') {
          return new Response(
            JSON.stringify({ error: 'Código necessário para desativar' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { data: settings, error: fetchError } = await supabase
          .from('user_2fa_settings')
          .select('totp_secret, is_enabled')
          .eq('user_id', userId)
          .single();

        if (fetchError || !settings?.totp_secret) {
          return new Response(
            JSON.stringify({ error: '2FA não configurado' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const isValid = await verifyTOTP(settings.totp_secret, code);
        
        if (!isValid) {
          return new Response(
            JSON.stringify({ error: 'Código incorreto' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { error: deleteError } = await supabase
          .from('user_2fa_settings')
          .delete()
          .eq('user_id', userId);

        if (deleteError) {
          console.error('[totp-auth] Disable error:', deleteError);
          return new Response(
            JSON.stringify({ error: 'Erro ao desativar 2FA' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ success: true, disabled: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'status': {
        // Get 2FA status
        const { data: settings } = await supabase
          .from('user_2fa_settings')
          .select('is_enabled, verified_at')
          .eq('user_id', userId)
          .single();

        return new Response(
          JSON.stringify({
            enabled: settings?.is_enabled || false,
            verifiedAt: settings?.verified_at || null
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Ação inválida' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error) {
    console.error('[totp-auth] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
