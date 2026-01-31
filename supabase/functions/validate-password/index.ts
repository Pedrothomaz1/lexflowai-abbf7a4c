import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Allowed origins for CORS - add your production domain here
const ALLOWED_ORIGINS = [
  'http://localhost:8080',
  'http://localhost:5173',
  'http://localhost:3000',
  Deno.env.get('ALLOWED_ORIGIN') || '',
].filter(Boolean);

// Get CORS headers based on request origin
function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin') || '';
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0] || '*';

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
  };
}

// Common passwords list (top 100 most common)
const COMMON_PASSWORDS = new Set([
  'password', '123456', '123456789', '12345678', '12345', '1234567', 'password1',
  'qwerty', 'abc123', '111111', '123123', 'admin', 'letmein', 'welcome',
  'monkey', 'dragon', 'master', 'login', 'passw0rd', 'hello', 'shadow',
  'sunshine', 'princess', 'football', 'baseball', 'iloveyou', 'trustno1',
  'superman', 'batman', 'starwars', 'whatever', 'qwerty123', 'password123',
  '654321', '7777777', '121212', '000000', 'qwertyuiop', 'asdfghjkl',
  'zxcvbnm', 'charlie', 'donald', 'michael', 'ashley', 'jessica', 'jennifer',
  'daniel', 'matthew', 'joshua', 'andrew', 'david', 'james', 'robert', 'john',
  'senha', 'senha123', 'mudar123', 'trocar123', 'admin123', 'usuario',
  'brasil', 'flamengo', 'palmeiras', 'corinthians', 'saopaulo', 'gremio'
]);

interface ValidationResult {
  valid: boolean;
  score: number;
  errors: string[];
  suggestions: string[];
}

function validatePassword(password: string, email?: string): ValidationResult {
  const errors: string[] = [];
  const suggestions: string[] = [];
  let score = 0;

  // Minimum length (12 characters)
  if (password.length < 12) {
    errors.push('Senha deve ter no mínimo 12 caracteres');
  } else {
    score += 20;
    if (password.length >= 16) score += 10;
    if (password.length >= 20) score += 10;
  }

  // Uppercase letter
  if (!/[A-Z]/.test(password)) {
    errors.push('Senha deve conter pelo menos uma letra maiúscula');
  } else {
    score += 15;
  }

  // Lowercase letter
  if (!/[a-z]/.test(password)) {
    errors.push('Senha deve conter pelo menos uma letra minúscula');
  } else {
    score += 15;
  }

  // Number
  if (!/[0-9]/.test(password)) {
    errors.push('Senha deve conter pelo menos um número');
  } else {
    score += 15;
  }

  // Special character
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Senha deve conter pelo menos um caractere especial (!@#$%^&*...)');
  } else {
    score += 15;
  }

  // No spaces
  if (/\s/.test(password)) {
    errors.push('Senha não pode conter espaços');
  }

  // Check against common passwords
  const lowerPassword = password.toLowerCase();
  if (COMMON_PASSWORDS.has(lowerPassword)) {
    errors.push('Esta senha é muito comum e fácil de adivinhar');
    score = Math.max(0, score - 30);
  }

  // Check for sequential characters
  if (/(.)\1{2,}/.test(password)) {
    suggestions.push('Evite caracteres repetidos consecutivos (ex: aaa, 111)');
    score = Math.max(0, score - 10);
  }

  // Check for keyboard patterns
  const keyboardPatterns = ['qwerty', 'asdf', 'zxcv', '1234', 'abcd'];
  for (const pattern of keyboardPatterns) {
    if (lowerPassword.includes(pattern)) {
      suggestions.push('Evite padrões de teclado (ex: qwerty, 1234)');
      score = Math.max(0, score - 10);
      break;
    }
  }

  // Check if password contains email parts
  if (email) {
    const emailParts = email.split('@')[0].toLowerCase().split(/[._\-]/);
    for (const part of emailParts) {
      if (part.length >= 3 && lowerPassword.includes(part)) {
        errors.push('Senha não pode conter partes do seu email');
        score = Math.max(0, score - 20);
        break;
      }
    }
  }

  // Add suggestions based on score
  if (score < 50) {
    suggestions.push('Use uma frase-senha com palavras aleatórias');
    suggestions.push('Considere usar um gerenciador de senhas');
  }

  return {
    valid: errors.length === 0,
    score: Math.min(100, score),
    errors,
    suggestions
  };
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { password, email } = await req.json();

    if (!password || typeof password !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Senha é obrigatória' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = validatePassword(password, email);

    console.log(`[validate-password] Score: ${result.score}, Valid: ${result.valid}`);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[validate-password] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Erro ao validar senha' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
