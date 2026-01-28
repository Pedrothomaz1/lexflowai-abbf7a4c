import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface ValidationResult {
  valid: boolean;
  score: number;
  errors: string[];
  suggestions: string[];
}

interface PasswordStrength {
  level: 'weak' | 'fair' | 'good' | 'strong';
  color: string;
  label: string;
}

export function usePasswordValidation() {
  const [validating, setValidating] = useState(false);
  const [result, setResult] = useState<ValidationResult | null>(null);

  const getStrength = (score: number): PasswordStrength => {
    if (score < 40) return { level: 'weak', color: 'bg-red-500', label: 'Fraca' };
    if (score < 60) return { level: 'fair', color: 'bg-yellow-500', label: 'Razoável' };
    if (score < 80) return { level: 'good', color: 'bg-blue-500', label: 'Boa' };
    return { level: 'strong', color: 'bg-green-500', label: 'Forte' };
  };

  // Client-side validation (fast, no network call)
  const validateLocal = useCallback((password: string, email?: string): ValidationResult => {
    const errors: string[] = [];
    const suggestions: string[] = [];
    let score = 0;

    // Minimum length
    if (password.length < 12) {
      errors.push('Mínimo 12 caracteres');
    } else {
      score += 20;
      if (password.length >= 16) score += 10;
      if (password.length >= 20) score += 10;
    }

    // Complexity checks
    if (!/[A-Z]/.test(password)) {
      errors.push('Adicione letra maiúscula');
    } else {
      score += 15;
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Adicione letra minúscula');
    } else {
      score += 15;
    }

    if (!/[0-9]/.test(password)) {
      errors.push('Adicione um número');
    } else {
      score += 15;
    }

    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('Adicione caractere especial');
    } else {
      score += 15;
    }

    // No spaces
    if (/\s/.test(password)) {
      errors.push('Remova espaços');
    }

    // Sequential characters
    if (/(.)\1{2,}/.test(password)) {
      suggestions.push('Evite caracteres repetidos (aaa, 111)');
      score = Math.max(0, score - 10);
    }

    // Email check
    if (email) {
      const emailPart = email.split('@')[0].toLowerCase();
      if (emailPart.length >= 3 && password.toLowerCase().includes(emailPart)) {
        errors.push('Não use partes do seu email');
        score = Math.max(0, score - 20);
      }
    }

    return {
      valid: errors.length === 0,
      score: Math.min(100, score),
      errors,
      suggestions
    };
  }, []);

  // Server-side validation (more thorough, checks against common passwords)
  const validateServer = useCallback(async (password: string, email?: string): Promise<ValidationResult> => {
    setValidating(true);
    try {
      const { data, error } = await supabase.functions.invoke('validate-password', {
        body: { password, email }
      });

      if (error) {
        console.error('[usePasswordValidation] Server error:', error);
        // Fall back to local validation on error
        return validateLocal(password, email);
      }

      const serverResult = data as ValidationResult;
      setResult(serverResult);
      return serverResult;
    } catch (err) {
      console.error('[usePasswordValidation] Error:', err);
      return validateLocal(password, email);
    } finally {
      setValidating(false);
    }
  }, [validateLocal]);

  const validate = useCallback((password: string, email?: string, serverCheck = false) => {
    const localResult = validateLocal(password, email);
    setResult(localResult);

    if (serverCheck && localResult.valid) {
      // Only call server if local validation passes
      return validateServer(password, email);
    }

    return Promise.resolve(localResult);
  }, [validateLocal, validateServer]);

  const reset = useCallback(() => {
    setResult(null);
    setValidating(false);
  }, []);

  return {
    validate,
    validateLocal,
    validateServer,
    reset,
    result,
    validating,
    getStrength,
    strength: result ? getStrength(result.score) : null
  };
}
