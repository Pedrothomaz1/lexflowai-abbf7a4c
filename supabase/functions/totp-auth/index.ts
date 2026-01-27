import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Base32 alphabet for TOTP
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

// Generate a random base32 secret
function generateSecret(length = 20): string {
  const buffer = new Uint8Array(length);
  crypto.getRandomValues(buffer);
  let secret = '';
  for (let i = 0; i < buffer.length; i++) {
    secret += BASE32_ALPHABET[buffer[i] % 32];
  }
  return secret;
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

// Generate TOTP code
async function generateTOTP(secret: string, timeStep = 30): Promise<string> {
  const key = base32Decode(secret);
  const time = Math.floor(Date.now() / 1000 / timeStep);
  
  const timeBuffer = new ArrayBuffer(8);
  const timeView = new DataView(timeBuffer);
  timeView.setUint32(4, time, false);
  
  const hmac = await hmacSha1(key, new Uint8Array(timeBuffer));
  const offset = hmac[hmac.length - 1] & 0x0f;
  
  const code = (
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff)
  ) % 1000000;
  
  return code.toString().padStart(6, '0');
}

// Verify TOTP code with time window
async function verifyTOTP(secret: string, code: string, window = 1): Promise<boolean> {
  for (let i = -window; i <= window; i++) {
    const timeStep = 30;
    const time = Math.floor(Date.now() / 1000 / timeStep) + i;
    
    const timeBuffer = new ArrayBuffer(8);
    const timeView = new DataView(timeBuffer);
    timeView.setUint32(4, time, false);
    
    const key = base32Decode(secret);
    const hmac = await hmacSha1(key, new Uint8Array(timeBuffer));
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
        // Generate new TOTP secret
        const secret = generateSecret(20);
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
