import ExcelJS from 'exceljs';
import { validateCNPJ, validateCPF, cleanDocument, detectDocumentType, formatCNPJ, formatCPF } from './documentValidation';

export interface ImportedContractRow {
  rowIndex: number;
  objeto: string;
  contratada: string;
  documento: string;
  valor: string;
  dataAssinatura: string;
  dataInicio: string;
  dataTermino: string;
  status: string;
  renovacaoAutomatica: string;
  renovarEm: string;
  observacoes: string;
  unidade: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ProcessedContract {
  rowIndex: number;
  raw: ImportedContractRow;
  parsed: {
    titulo: string;
    contratada: string;
    documento: string;
    documentoFormatado: string;
    documentoTipo: 'cpf' | 'cnpj' | 'invalid' | null;
    documentoValido: boolean;
    valor: number | null;
    dataAssinatura: string | null;
    dataInicio: string | null;
    dataFim: string | null;
    status: string;
    observacoes: string | null;
    tags: string[];
    metadata: {
      renovacaoAutomatica: boolean;
      dataRenovacao: string | null;
      importedFrom: string;
      importedAt: string;
    };
  };
  validation: ValidationResult;
  fornecedorId: string | null;
  fornecedorNome: string | null;
  createFornecedor: boolean;
}

// Mapeamento de status do Excel para o sistema
const STATUS_MAP: Record<string, string> = {
  'vence de 08 a 30 dias': 'vigente',
  'vence de 31 a 60 dias': 'vigente',
  'vence de 61 a 90 dias': 'vigente',
  'vence em mais de 90 dias': 'vigente',
  'indeterminado': 'vigente',
  'vencido': 'encerrado',
  'finalizado': 'encerrado',
  'cancelado': 'cancelado',
  'ativo': 'vigente',
  'vigente': 'vigente',
  'em aprovação': 'em_aprovacao',
  'em aprovacao': 'em_aprovacao',
  'aprovado': 'aprovado',
  'assinado': 'assinado',
  'rascunho': 'rascunho',
};

/**
 * Parse arquivo Excel e retorna array de linhas
 */
export function parseExcelFile(file: File): Promise<ImportedContractRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const buffer = e.target?.result as ArrayBuffer;
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(buffer);

        // Pega a primeira planilha
        const worksheet = workbook.worksheets[0];

        if (!worksheet || worksheet.rowCount < 2) {
          reject(new Error('Arquivo vazio ou sem dados'));
          return;
        }

        // Converte para array de arrays
        const jsonData: string[][] = [];
        worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
          const rowValues: string[] = [];
          row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
            // Pad array to include empty cells
            while (rowValues.length < colNumber - 1) {
              rowValues.push('');
            }

            let cellValue = '';
            if (cell.value !== null && cell.value !== undefined) {
              if (cell.value instanceof Date) {
                // Format date as YYYY-MM-DD
                cellValue = cell.value.toISOString().split('T')[0];
              } else if (typeof cell.value === 'object' && 'result' in cell.value) {
                // Formula cell - use the result
                cellValue = String(cell.value.result ?? '');
              } else if (typeof cell.value === 'object' && 'richText' in cell.value) {
                // Rich text - concatenate text parts
                cellValue = (cell.value.richText as Array<{text: string}>).map(rt => rt.text).join('');
              } else {
                cellValue = String(cell.value);
              }
            }
            rowValues.push(cellValue);
          });
          jsonData.push(rowValues);
        });

        if (jsonData.length < 2) {
          reject(new Error('Arquivo vazio ou sem dados'));
          return;
        }

        // Encontra os índices das colunas baseado no header
        const headerRow = jsonData[0] || [];
        const headers = headerRow.map(h =>
          h !== undefined && h !== null ? String(h).toLowerCase().trim() : ''
        );

        const columnMap = {
          objeto: findColumnIndex(headers, ['objeto contratado', 'objeto', 'titulo', 'título']),
          contratada: findColumnIndex(headers, ['contratada', 'fornecedor', 'razão social', 'razao social', 'empresa']),
          documento: findColumnIndex(headers, ['cnpj/cpf', 'cnpj', 'cpf', 'documento']),
          valor: findColumnIndex(headers, ['valor', 'valor total', 'valor contrato']),
          dataAssinatura: findColumnIndex(headers, ['data da assinatura', 'data assinatura', 'assinatura']),
          dataInicio: findColumnIndex(headers, ['data de inicio', 'data inicio', 'início', 'inicio']),
          dataTermino: findColumnIndex(headers, ['data término', 'data termino', 'término', 'termino', 'data fim', 'vencimento']),
          status: findColumnIndex(headers, ['status', 'situação', 'situacao']),
          renovacao: findColumnIndex(headers, ['renovação automática', 'renovacao automatica', 'renovação', 'renovacao']),
          renovarEm: findColumnIndex(headers, ['renovar em', 'data renovação', 'data renovacao']),
          observacoes: findColumnIndex(headers, ['observações', 'observacoes', 'obs', 'notas']),
          unidade: findColumnIndex(headers, ['unidade', 'departamento', 'setor']),
        };

        // Processa as linhas de dados
        const rows: ImportedContractRow[] = [];
        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i];
          if (!row || row.length === 0 || !row.some(cell => cell && String(cell).trim())) {
            continue; // Pula linhas vazias
          }

          rows.push({
            rowIndex: i + 1, // +1 para ser 1-indexed como no Excel
            objeto: getCellValue(row, columnMap.objeto),
            contratada: getCellValue(row, columnMap.contratada),
            documento: getCellValue(row, columnMap.documento),
            valor: getCellValue(row, columnMap.valor),
            dataAssinatura: getCellValue(row, columnMap.dataAssinatura),
            dataInicio: getCellValue(row, columnMap.dataInicio),
            dataTermino: getCellValue(row, columnMap.dataTermino),
            status: getCellValue(row, columnMap.status),
            renovacaoAutomatica: getCellValue(row, columnMap.renovacao),
            renovarEm: getCellValue(row, columnMap.renovarEm),
            observacoes: getCellValue(row, columnMap.observacoes),
            unidade: getCellValue(row, columnMap.unidade),
          });
        }

        resolve(rows);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => reject(new Error('Erro ao ler o arquivo'));
    reader.readAsArrayBuffer(file);
  });
}

function findColumnIndex(headers: string[], possibleNames: string[]): number {
  for (const name of possibleNames) {
    const index = headers.findIndex(h => h && typeof h === 'string' && h.includes(name));
    if (index !== -1) return index;
  }
  return -1;
}

function getCellValue(row: string[], index: number): string {
  if (index === -1 || !row[index]) return '';
  return String(row[index]).trim();
}

/**
 * Parse valor monetário brasileiro
 */
export function parseMonetaryValue(value: string): number | null {
  if (!value) return null;

  // Remove R$, espaços e pontos de milhar
  let cleaned = value
    .replace(/R\$\s*/gi, '')
    .replace(/\s/g, '')
    .trim();

  // Verifica se usa vírgula como decimal (formato BR)
  if (cleaned.includes(',')) {
    // Remove pontos de milhar e troca vírgula por ponto
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  }

  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

/**
 * Parse data no formato brasileiro ou ISO
 */
export function parseDate(value: string): string | null {
  if (!value) return null;

  const trimmed = value.trim().toLowerCase();

  // Verifica se é "indeterminado" ou similar
  if (trimmed === 'indeterminado' || trimmed === 'sem prazo' || trimmed === '-' || trimmed === 'n/a') {
    return null;
  }

  // Se já está no formato ISO (YYYY-MM-DD)
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.substring(0, 10);
  }

  // Formato DD/MM/YYYY
  const brMatch = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (brMatch) {
    const [, day, month, year] = brMatch;
    const fullYear = year.length === 2 ? `20${year}` : year;
    return `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  // Formato MM/DD/YYYY (Excel americano)
  const usMatch = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (usMatch) {
    const [, month, day, year] = usMatch;
    // Se o primeiro número for maior que 12, assume DD/MM/YYYY
    if (parseInt(month) > 12) {
      const fullYear = year.length === 2 ? `20${year}` : year;
      return `${fullYear}-${day.padStart(2, '0')}-${month.padStart(2, '0')}`;
    }
  }

  // Tenta parse nativo
  try {
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      return date.toISOString().substring(0, 10);
    }
  } catch {
    // Ignora erro
  }

  return null;
}

/**
 * Mapeia status do Excel para status do sistema
 */
export function mapStatus(excelStatus: string): string {
  if (!excelStatus) return 'rascunho';

  const normalized = excelStatus.toLowerCase().trim();

  // Busca match parcial
  for (const [key, value] of Object.entries(STATUS_MAP)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return value;
    }
  }

  return 'rascunho';
}

/**
 * Processa e valida uma linha importada
 */
export function processImportedRow(row: ImportedContractRow): ProcessedContract {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validação do título/objeto (obrigatório)
  const titulo = row.objeto.trim();
  if (!titulo) {
    errors.push('Objeto/Título do contrato é obrigatório');
  }

  // Validação do documento
  let documentoFormatado = '';
  let documentoTipo: 'cpf' | 'cnpj' | 'invalid' | null = null;
  let documentoValido = false;

  if (row.documento) {
    const cleaned = cleanDocument(row.documento);
    documentoTipo = detectDocumentType(cleaned);

    if (documentoTipo === 'cpf') {
      documentoValido = validateCPF(cleaned);
      documentoFormatado = formatCPF(cleaned);
      if (!documentoValido) {
        errors.push('CPF inválido (dígitos verificadores incorretos)');
      }
    } else if (documentoTipo === 'cnpj') {
      documentoValido = validateCNPJ(cleaned);
      documentoFormatado = formatCNPJ(cleaned);
      if (!documentoValido) {
        errors.push('CNPJ inválido (dígitos verificadores incorretos)');
      }
    } else if (cleaned.length > 0) {
      errors.push('Documento com formato inválido (deve ter 11 dígitos para CPF ou 14 para CNPJ)');
    }
  } else {
    // Documento é obrigatório quando há contratada
    if (row.contratada.trim()) {
      warnings.push('Documento (CNPJ/CPF) não informado para o fornecedor');
    }
  }

  // Parse do valor
  const valor = parseMonetaryValue(row.valor);
  if (row.valor && valor === null) {
    errors.push(`Valor "${row.valor}" não pôde ser convertido`);
  }

  // Parse das datas
  const dataAssinatura = parseDate(row.dataAssinatura);
  const dataInicio = parseDate(row.dataInicio);
  const dataFim = parseDate(row.dataTermino);

  if (row.dataInicio && !dataInicio) {
    warnings.push(`Data de início "${row.dataInicio}" não reconhecida`);
  }

  if (row.dataTermino && !dataFim && row.dataTermino.toLowerCase() !== 'indeterminado') {
    warnings.push(`Data de término "${row.dataTermino}" não reconhecida`);
  }

  // Mapeamento de status
  const status = mapStatus(row.status);

  // Renovação automática
  const renovacaoAutomatica = ['sim', 's', 'yes', 'y', 'true', '1', 'x'].includes(
    row.renovacaoAutomatica.toLowerCase().trim()
  );

  // Tags a partir da unidade
  const tags = row.unidade ? [row.unidade.trim()] : [];

  // Contratada
  const contratada = row.contratada.trim();
  if (!contratada) {
    warnings.push('Contratada/Fornecedor não informado');
  }

  return {
    rowIndex: row.rowIndex,
    raw: row,
    parsed: {
      titulo,
      contratada,
      documento: cleanDocument(row.documento),
      documentoFormatado,
      documentoTipo,
      documentoValido,
      valor,
      dataAssinatura,
      dataInicio,
      dataFim,
      status,
      observacoes: row.observacoes || null,
      tags,
      metadata: {
        renovacaoAutomatica,
        dataRenovacao: parseDate(row.renovarEm),
        importedFrom: 'xlsx',
        importedAt: new Date().toISOString(),
      },
    },
    validation: {
      valid: errors.length === 0,
      errors,
      warnings,
    },
    fornecedorId: null,
    fornecedorNome: contratada || null,
    createFornecedor: false,
  };
}

/**
 * Gera template de exemplo para download
 */
export async function generateExampleTemplate(): Promise<Blob> {
  const workbook = new ExcelJS.Workbook();

  // Planilha principal
  const worksheet = workbook.addWorksheet('Contratos');

  // Headers
  const headers = [
    'OBJETO CONTRATADO',
    'CONTRATADA',
    'CNPJ/CPF',
    'VALOR',
    'DATA DA ASSINATURA',
    'DATA DE INICIO',
    'DATA TÉRMINO',
    'STATUS',
    'RENOVAÇÃO AUTOMÁTICA',
    'RENOVAR EM',
    'OBSERVAÇÕES',
    'UNIDADE',
  ];

  worksheet.addRow(headers);

  // Style header row
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' }
  };

  // Example data
  const exampleData = [
    [
      'Prestação de serviços de TI',
      'Tech Solutions Ltda',
      '12.345.678/0001-90',
      'R$ 50.000,00',
      '01/01/2024',
      '01/02/2024',
      '31/12/2024',
      'Vigente',
      'Sim',
      '01/11/2024',
      'Contrato renovável anualmente',
      'TI',
    ],
    [
      'Fornecimento de materiais',
      'Distribuidora ABC',
      '98.765.432/0001-10',
      'R$ 25.000,00',
      '15/03/2024',
      '01/04/2024',
      '31/03/2025',
      'Vigente',
      'Não',
      '',
      '',
      'Compras',
    ],
    [
      'Locação de equipamentos',
      'João da Silva',
      '123.456.789-00',
      'R$ 3.500,00',
      '10/06/2024',
      '15/06/2024',
      'Indeterminado',
      'Vigente',
      'Sim',
      '',
      'Contrato por prazo indeterminado',
      'Operações',
    ],
  ];

  exampleData.forEach(row => worksheet.addRow(row));

  // Set column widths
  worksheet.columns = [
    { width: 35 }, // OBJETO CONTRATADO
    { width: 25 }, // CONTRATADA
    { width: 20 }, // CNPJ/CPF
    { width: 15 }, // VALOR
    { width: 18 }, // DATA DA ASSINATURA
    { width: 15 }, // DATA DE INICIO
    { width: 15 }, // DATA TÉRMINO
    { width: 15 }, // STATUS
    { width: 20 }, // RENOVAÇÃO AUTOMÁTICA
    { width: 15 }, // RENOVAR EM
    { width: 30 }, // OBSERVAÇÕES
    { width: 15 }, // UNIDADE
  ];

  // Adiciona aba de instruções
  const instructionsSheet = workbook.addWorksheet('Instruções');

  const instructionsData = [
    ['INSTRUÇÕES DE PREENCHIMENTO'],
    [''],
    ['Campos Obrigatórios:'],
    ['- OBJETO CONTRATADO: Título ou objeto do contrato'],
    [''],
    ['Campos Opcionais:'],
    ['- CONTRATADA: Nome do fornecedor ou contratado'],
    ['- CNPJ/CPF: Documento com ou sem formatação (será validado automaticamente)'],
    ['- VALOR: Formato R$ 1.000,00 ou 1000.00'],
    ['- DATA DA ASSINATURA: DD/MM/AAAA'],
    ['- DATA DE INICIO: DD/MM/AAAA'],
    ['- DATA TÉRMINO: DD/MM/AAAA ou "Indeterminado"'],
    ['- STATUS: Vigente, Vencido, Finalizado, Cancelado, Rascunho'],
    ['- RENOVAÇÃO AUTOMÁTICA: Sim ou Não'],
    ['- RENOVAR EM: Data para lembrete de renovação'],
    ['- OBSERVAÇÕES: Texto livre'],
    ['- UNIDADE: Será convertido em tag do contrato'],
    [''],
    ['Tipos de Contrato Válidos:'],
    ['- prestacao_servicos'],
    ['- fornecimento'],
    ['- locacao'],
    ['- confidencialidade'],
    ['- parceria'],
    ['- outro'],
  ];

  instructionsData.forEach(row => instructionsSheet.addRow(row));

  // Style first row
  const instructionHeader = instructionsSheet.getRow(1);
  instructionHeader.font = { bold: true, size: 14 };

  instructionsSheet.columns = [{ width: 60 }];

  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}
