import { useState, useCallback } from "react";
import { validateCPF, validateCNPJ } from "@/utils/documentValidation";

export type InputType = 'text' | 'email' | 'cpf' | 'cnpj' | 'phone' | 'currency' | 'date' | 'password';

export interface ValidationRule {
  type: InputType;
  required?: boolean;
  min?: number;
  max?: number;
  pattern?: RegExp;
  custom?: (value: string) => { valid: boolean; error?: string };
}

export interface ValidationResult {
  valid: boolean;
  error: string | null;
  sanitized: string;
}

// XSS and injection patterns to block
const DANGEROUS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
  /data:/gi,
  /<iframe/gi,
  /<object/gi,
  /<embed/gi,
  /<link/gi,
  /<meta/gi,
];

// SQL injection patterns
const SQL_INJECTION_PATTERNS = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|TRUNCATE|GRANT|REVOKE)\b)/gi,
  /(-{2}|\/\*|\*\/|;)/g,
  /(\bOR\b|\bAND\b)\s*\d+\s*=\s*\d+/gi,
];

// Email regex (RFC 5322 simplified)
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

// Phone regex (Brazilian format)
const PHONE_REGEX = /^\(?([0-9]{2})\)?[-. ]?([0-9]{4,5})[-. ]?([0-9]{4})$/;

// Currency regex
const CURRENCY_REGEX = /^[0-9]+([,.][0-9]{1,2})?$/;

export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') return '';
  
  // Trim whitespace
  let sanitized = input.trim();
  
  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '');
  
  // Escape HTML entities
  sanitized = sanitized
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
  
  return sanitized;
}

export function checkDangerousPatterns(input: string): boolean {
  // Check XSS patterns
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(input)) {
      return true;
    }
  }
  
  // Check SQL injection patterns
  for (const pattern of SQL_INJECTION_PATTERNS) {
    if (pattern.test(input)) {
      return true;
    }
  }
  
  return false;
}

export function validateEmail(email: string): boolean {
  return EMAIL_REGEX.test(email);
}

export function validatePhone(phone: string): boolean {
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.length >= 10 && cleaned.length <= 11;
}

export function validateCurrency(value: string): boolean {
  return CURRENCY_REGEX.test(value.replace(/[R$\s]/g, ''));
}

export function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (password.length < 12) {
    errors.push('Mínimo 12 caracteres');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Pelo menos 1 letra maiúscula');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Pelo menos 1 letra minúscula');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Pelo menos 1 número');
  }
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Pelo menos 1 caractere especial');
  }
  
  // Check common passwords
  const commonPasswords = [
    'password', '123456', 'qwerty', 'abc123', 'letmein',
    'welcome', 'monkey', 'dragon', 'master', 'admin'
  ];
  
  if (commonPasswords.some(p => password.toLowerCase().includes(p))) {
    errors.push('Senha muito comum');
  }
  
  return { valid: errors.length === 0, errors };
}

export function useSecureInput(rules: ValidationRule) {
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  const validate = useCallback((input: string): ValidationResult => {
    // Basic sanitization
    const sanitized = sanitizeInput(input);
    
    // Check for dangerous patterns
    if (checkDangerousPatterns(input)) {
      return {
        valid: false,
        error: 'Conteúdo não permitido detectado',
        sanitized: ''
      };
    }
    
    // Required check
    if (rules.required && !sanitized) {
      return {
        valid: false,
        error: 'Campo obrigatório',
        sanitized
      };
    }
    
    // Empty is valid if not required
    if (!sanitized && !rules.required) {
      return { valid: true, error: null, sanitized };
    }
    
    // Length checks
    if (rules.min && sanitized.length < rules.min) {
      return {
        valid: false,
        error: `Mínimo ${rules.min} caracteres`,
        sanitized
      };
    }
    
    if (rules.max && sanitized.length > rules.max) {
      return {
        valid: false,
        error: `Máximo ${rules.max} caracteres`,
        sanitized
      };
    }
    
    // Type-specific validation
    switch (rules.type) {
      case 'email':
        if (!validateEmail(sanitized)) {
          return {
            valid: false,
            error: 'Email inválido',
            sanitized
          };
        }
        break;
        
      case 'cpf':
        if (!validateCPF(sanitized.replace(/\D/g, ''))) {
          return {
            valid: false,
            error: 'CPF inválido',
            sanitized
          };
        }
        break;
        
      case 'cnpj':
        if (!validateCNPJ(sanitized.replace(/\D/g, ''))) {
          return {
            valid: false,
            error: 'CNPJ inválido',
            sanitized
          };
        }
        break;
        
      case 'phone':
        if (!validatePhone(sanitized)) {
          return {
            valid: false,
            error: 'Telefone inválido',
            sanitized
          };
        }
        break;
        
      case 'currency':
        if (!validateCurrency(sanitized)) {
          return {
            valid: false,
            error: 'Valor monetário inválido',
            sanitized
          };
        }
        break;
        
      case 'password':
        const pwdResult = validatePassword(sanitized);
        if (!pwdResult.valid) {
          return {
            valid: false,
            error: pwdResult.errors[0],
            sanitized
          };
        }
        break;
    }
    
    // Custom pattern check
    if (rules.pattern && !rules.pattern.test(sanitized)) {
      return {
        valid: false,
        error: 'Formato inválido',
        sanitized
      };
    }
    
    // Custom validation
    if (rules.custom) {
      const customResult = rules.custom(sanitized);
      if (!customResult.valid) {
        return {
          valid: false,
          error: customResult.error || 'Validação personalizada falhou',
          sanitized
        };
      }
    }
    
    return { valid: true, error: null, sanitized };
  }, [rules]);

  const handleChange = useCallback((newValue: string) => {
    setValue(newValue);
    
    if (touched) {
      const result = validate(newValue);
      setError(result.error);
    }
  }, [touched, validate]);

  const handleBlur = useCallback(() => {
    setTouched(true);
    const result = validate(value);
    setError(result.error);
  }, [value, validate]);

  const reset = useCallback(() => {
    setValue('');
    setError(null);
    setTouched(false);
  }, []);

  const validateNow = useCallback((): ValidationResult => {
    setTouched(true);
    const result = validate(value);
    setError(result.error);
    return result;
  }, [value, validate]);

  return {
    value,
    error,
    touched,
    isValid: error === null && touched,
    setValue: handleChange,
    onBlur: handleBlur,
    validate: validateNow,
    reset,
  };
}

// Batch validation utility
export function validateForm(fields: Record<string, { value: string; rules: ValidationRule }>): {
  valid: boolean;
  errors: Record<string, string>;
} {
  const errors: Record<string, string> = {};
  let valid = true;
  
  for (const [fieldName, field] of Object.entries(fields)) {
    const sanitized = sanitizeInput(field.value);
    
    if (checkDangerousPatterns(field.value)) {
      errors[fieldName] = 'Conteúdo não permitido';
      valid = false;
      continue;
    }
    
    if (field.rules.required && !sanitized) {
      errors[fieldName] = 'Campo obrigatório';
      valid = false;
      continue;
    }
    
    // Add more validation as needed based on rules
  }
  
  return { valid, errors };
}
