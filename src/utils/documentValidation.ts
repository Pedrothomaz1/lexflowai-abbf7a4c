/**
 * Utilitário de validação e formatação de documentos brasileiros (CPF/CNPJ)
 * Implementa validação com dígitos verificadores conforme algoritmo oficial
 */

/**
 * Remove todos os caracteres não numéricos de uma string
 */
export function cleanDocument(value: string): string {
  return value.replace(/\D/g, '');
}

/**
 * Valida CPF com algoritmo de dígitos verificadores
 * @param cpf - CPF com ou sem formatação
 * @returns true se válido, false caso contrário
 */
export function validateCPF(cpf: string): boolean {
  const cleaned = cleanDocument(cpf);

  // Deve ter exatamente 11 dígitos
  if (cleaned.length !== 11) return false;

  // Rejeita CPFs com todos os dígitos iguais (ex: 111.111.111-11)
  if (/^(\d)\1{10}$/.test(cleaned)) return false;

  // Cálculo do primeiro dígito verificador
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleaned[i]) * (10 - i);
  }
  let remainder = (sum * 10) % 11;
  const digit1 = remainder === 10 || remainder === 11 ? 0 : remainder;

  // Verifica primeiro dígito
  if (digit1 !== parseInt(cleaned[9])) return false;

  // Cálculo do segundo dígito verificador
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleaned[i]) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  const digit2 = remainder === 10 || remainder === 11 ? 0 : remainder;

  // Verifica segundo dígito
  return digit2 === parseInt(cleaned[10]);
}

/**
 * Valida CNPJ com algoritmo de dígitos verificadores
 * @param cnpj - CNPJ com ou sem formatação
 * @returns true se válido, false caso contrário
 */
export function validateCNPJ(cnpj: string): boolean {
  const cleaned = cleanDocument(cnpj);

  // Deve ter exatamente 14 dígitos
  if (cleaned.length !== 14) return false;

  // Rejeita CNPJs com todos os dígitos iguais
  if (/^(\d)\1{13}$/.test(cleaned)) return false;

  // Pesos para cálculo do primeiro dígito verificador
  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  // Pesos para cálculo do segundo dígito verificador
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

  // Cálculo do primeiro dígito verificador
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(cleaned[i]) * weights1[i];
  }
  let remainder = sum % 11;
  const digit1 = remainder < 2 ? 0 : 11 - remainder;

  // Verifica primeiro dígito
  if (digit1 !== parseInt(cleaned[12])) return false;

  // Cálculo do segundo dígito verificador
  sum = 0;
  for (let i = 0; i < 13; i++) {
    sum += parseInt(cleaned[i]) * weights2[i];
  }
  remainder = sum % 11;
  const digit2 = remainder < 2 ? 0 : 11 - remainder;

  // Verifica segundo dígito
  return digit2 === parseInt(cleaned[13]);
}

/**
 * Formata CPF: 000.000.000-00
 * @param value - CPF com ou sem formatação
 * @returns CPF formatado
 */
export function formatCPF(value: string): string {
  const cleaned = cleanDocument(value).slice(0, 11);

  if (cleaned.length <= 3) return cleaned;
  if (cleaned.length <= 6) return `${cleaned.slice(0, 3)}.${cleaned.slice(3)}`;
  if (cleaned.length <= 9) return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6)}`;
  return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6, 9)}-${cleaned.slice(9)}`;
}

/**
 * Formata CNPJ: 00.000.000/0000-00
 * @param value - CNPJ com ou sem formatação
 * @returns CNPJ formatado
 */
export function formatCNPJ(value: string): string {
  const cleaned = cleanDocument(value).slice(0, 14);

  if (cleaned.length <= 2) return cleaned;
  if (cleaned.length <= 5) return `${cleaned.slice(0, 2)}.${cleaned.slice(2)}`;
  if (cleaned.length <= 8) return `${cleaned.slice(0, 2)}.${cleaned.slice(2, 5)}.${cleaned.slice(5)}`;
  if (cleaned.length <= 12) return `${cleaned.slice(0, 2)}.${cleaned.slice(2, 5)}.${cleaned.slice(5, 8)}/${cleaned.slice(8)}`;
  return `${cleaned.slice(0, 2)}.${cleaned.slice(2, 5)}.${cleaned.slice(5, 8)}/${cleaned.slice(8, 12)}-${cleaned.slice(12)}`;
}

/**
 * Detecta automaticamente o tipo de documento baseado no tamanho
 * @param value - Documento com ou sem formatação
 * @returns 'cpf', 'cnpj' ou 'invalid'
 */
export function detectDocumentType(value: string): 'cpf' | 'cnpj' | 'invalid' {
  const cleaned = cleanDocument(value);
  if (cleaned.length === 11) return 'cpf';
  if (cleaned.length === 14) return 'cnpj';
  return 'invalid';
}

/**
 * Valida documento automaticamente detectando o tipo
 * @param value - CPF ou CNPJ com ou sem formatação
 * @returns objeto com resultado da validação
 */
export function validateDocument(value: string): {
  valid: boolean;
  type: 'cpf' | 'cnpj' | 'invalid';
  formatted: string;
  error?: string;
} {
  if (!value || cleanDocument(value).length === 0) {
    return { valid: false, type: 'invalid', formatted: '', error: 'Documento não informado' };
  }

  const type = detectDocumentType(value);

  if (type === 'invalid') {
    const length = cleanDocument(value).length;
    if (length < 11) {
      return { valid: false, type: 'invalid', formatted: value, error: 'Documento incompleto' };
    }
    return { valid: false, type: 'invalid', formatted: value, error: 'Documento com formato inválido' };
  }

  const isValid = type === 'cpf' ? validateCPF(value) : validateCNPJ(value);
  const formatted = type === 'cpf' ? formatCPF(value) : formatCNPJ(value);

  if (!isValid) {
    return {
      valid: false,
      type,
      formatted,
      error: `${type.toUpperCase()} inválido (dígitos verificadores incorretos)`
    };
  }

  return { valid: true, type, formatted };
}

/**
 * Formata documento automaticamente detectando o tipo
 * @param value - CPF ou CNPJ
 * @returns Documento formatado
 */
export function formatDocument(value: string): string {
  const type = detectDocumentType(value);
  if (type === 'cpf') return formatCPF(value);
  if (type === 'cnpj') return formatCNPJ(value);
  
  // Se não conseguiu detectar, tenta formatar baseado no tamanho atual
  const cleaned = cleanDocument(value);
  if (cleaned.length <= 11) return formatCPF(value);
  return formatCNPJ(value);
}
