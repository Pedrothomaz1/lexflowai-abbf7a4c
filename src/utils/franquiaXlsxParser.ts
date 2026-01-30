import * as XLSX from "xlsx";

export interface FranquiaImportData {
  nome_completo: string;
  cnpj: string | null;
  regime_tributario: string | null;
  status_contrato: string;
  data_assinatura: string | null;
  data_termino: string | null;
  status_vigencia: string;
  consultora_informada: boolean;
  renovacao_aceita: boolean;
  novo_contrato_enviado: boolean;
  contrato_novo_assinado: boolean;
  data_emissao_nf: string | null;
  numero_nf: string | null;
  observacoes: string | null;
}

export interface FranquiaImportResult {
  data: FranquiaImportData;
  status: "valid" | "warning" | "error";
  errors: string[];
  warnings: string[];
  rowIndex: number;
}

// Converte Sim/Não ou equivalentes para boolean
function parseBoolean(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  const str = String(value).toLowerCase().trim();
  return ["sim", "yes", "s", "y", "1", "true", "x"].includes(str);
}

// Converte data do Excel para string ISO
function parseExcelDate(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  
  // Se for número (serial date do Excel)
  if (typeof value === "number") {
    const date = XLSX.SSF.parse_date_code(value);
    if (date) {
      const year = date.y;
      const month = String(date.m).padStart(2, "0");
      const day = String(date.d).padStart(2, "0");
      return `${year}-${month}-${day}`;
    }
  }
  
  // Se for string
  const str = String(value).trim();
  
  // Tenta formato DD/MM/YYYY
  const brMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (brMatch) {
    const [, day, month, year] = brMatch;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }
  
  // Tenta formato YYYY-MM-DD
  const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    return str;
  }
  
  return null;
}

// Normaliza status de contrato
function normalizeStatusContrato(value: unknown): string {
  if (!value) return "pendente_assinatura";
  const str = String(value).toLowerCase().trim();
  
  if (str.includes("assinado") && !str.includes("pendente")) return "assinado";
  if (str.includes("vigente")) return "vigente";
  if (str.includes("vencido")) return "vencido";
  if (str.includes("encerrado") || str.includes("cancelado")) return "encerrado";
  if (str.includes("pendente")) return "pendente_assinatura";
  
  return "pendente_assinatura";
}

// Normaliza status de vigência
function normalizeStatusVigencia(value: unknown): string {
  if (!value) return "ativo";
  const str = String(value).toLowerCase().trim();
  
  if (str.includes("ativo") || str.includes("ativa")) return "ativo";
  if (str.includes("próximo") || str.includes("proximo") || str.includes("vencer")) return "proximo_vencer";
  if (str.includes("vencido") || str.includes("vencida")) return "vencido";
  if (str.includes("renovado") || str.includes("renovada")) return "renovado";
  
  return "ativo";
}

// Limpa e formata CNPJ
function formatCNPJ(value: unknown): string | null {
  if (!value) return null;
  const str = String(value).replace(/\D/g, "");
  if (str.length === 0) return null;
  if (str.length !== 14) return str; // Retorna como está se não tiver 14 dígitos
  return str.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
}

// Encontra coluna por múltiplos nomes possíveis
function findColumn(headers: string[], possibleNames: string[]): number {
  for (const name of possibleNames) {
    const index = headers.findIndex(h => 
      h.toLowerCase().trim().includes(name.toLowerCase())
    );
    if (index !== -1) return index;
  }
  return -1;
}

export function parseFranquiasXLSX(file: ArrayBuffer): FranquiaImportResult[] {
  const workbook = XLSX.read(file, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  
  // Converte para array de arrays
  const rawData = XLSX.utils.sheet_to_json<unknown[]>(worksheet, { header: 1 });
  
  if (rawData.length < 2) {
    return [];
  }
  
  // Primeira linha são os headers
  const headers = (rawData[0] as unknown[]).map(h => String(h || "").trim());
  
  // Mapeia colunas
  const colMap = {
    nome: findColumn(headers, ["nome completo", "nome", "razão social", "razao social", "franqueada"]),
    cnpj: findColumn(headers, ["cnpj", "documento"]),
    regime: findColumn(headers, ["regime tributário", "regime tributario", "regime"]),
    statusContrato: findColumn(headers, ["status assinatura", "status contrato", "assinatura"]),
    dataAssinatura: findColumn(headers, ["data de assinatura", "data assinatura", "assinatura em"]),
    dataTermino: findColumn(headers, ["data término", "data termino", "término", "termino", "vencimento"]),
    statusVigencia: findColumn(headers, ["status de vigência", "status vigência", "vigência", "vigencia"]),
    consultoraInformada: findColumn(headers, ["consultora informada"]),
    renovacaoAceita: findColumn(headers, ["renovação aceita", "renovacao aceita"]),
    novoContratoEnviado: findColumn(headers, ["novo contrato enviado", "contrato enviado"]),
    contratoNovoAssinado: findColumn(headers, ["contrato novo assinado", "novo assinado"]),
    numeroNF: findColumn(headers, ["n° da nf", "numero nf", "nf", "nota fiscal"]),
    dataEmissaoNF: findColumn(headers, ["data da emissão", "data emissão", "emissão nf"]),
    observacoes: findColumn(headers, ["observação", "observacao", "observações", "obs", "notas"]),
  };
  
  const results: FranquiaImportResult[] = [];
  
  // Processa cada linha (começando da segunda)
  for (let i = 1; i < rawData.length; i++) {
    const row = rawData[i] as unknown[];
    if (!row || row.length === 0) continue;
    
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Extrai nome (obrigatório)
    const nome = colMap.nome >= 0 ? String(row[colMap.nome] || "").trim() : "";
    if (!nome) {
      errors.push("Nome é obrigatório");
    }
    
    // Extrai CNPJ
    const cnpj = colMap.cnpj >= 0 ? formatCNPJ(row[colMap.cnpj]) : null;
    if (cnpj && cnpj.replace(/\D/g, "").length !== 14) {
      warnings.push("CNPJ com formato inválido");
    }
    
    // Extrai datas
    const dataAssinatura = colMap.dataAssinatura >= 0 ? parseExcelDate(row[colMap.dataAssinatura]) : null;
    const dataTermino = colMap.dataTermino >= 0 ? parseExcelDate(row[colMap.dataTermino]) : null;
    const dataEmissaoNF = colMap.dataEmissaoNF >= 0 ? parseExcelDate(row[colMap.dataEmissaoNF]) : null;
    
    // Valida datas
    if (dataAssinatura && dataTermino && dataAssinatura > dataTermino) {
      warnings.push("Data de assinatura posterior à data de término");
    }
    
    const data: FranquiaImportData = {
      nome_completo: nome,
      cnpj,
      regime_tributario: colMap.regime >= 0 ? String(row[colMap.regime] || "").trim() || null : null,
      status_contrato: normalizeStatusContrato(colMap.statusContrato >= 0 ? row[colMap.statusContrato] : null),
      data_assinatura: dataAssinatura,
      data_termino: dataTermino,
      status_vigencia: normalizeStatusVigencia(colMap.statusVigencia >= 0 ? row[colMap.statusVigencia] : null),
      consultora_informada: colMap.consultoraInformada >= 0 ? parseBoolean(row[colMap.consultoraInformada]) : false,
      renovacao_aceita: colMap.renovacaoAceita >= 0 ? parseBoolean(row[colMap.renovacaoAceita]) : false,
      novo_contrato_enviado: colMap.novoContratoEnviado >= 0 ? parseBoolean(row[colMap.novoContratoEnviado]) : false,
      contrato_novo_assinado: colMap.contratoNovoAssinado >= 0 ? parseBoolean(row[colMap.contratoNovoAssinado]) : false,
      data_emissao_nf: dataEmissaoNF,
      numero_nf: colMap.numeroNF >= 0 ? String(row[colMap.numeroNF] || "").trim() || null : null,
      observacoes: colMap.observacoes >= 0 ? String(row[colMap.observacoes] || "").trim() || null : null,
    };
    
    results.push({
      data,
      status: errors.length > 0 ? "error" : warnings.length > 0 ? "warning" : "valid",
      errors,
      warnings,
      rowIndex: i + 1, // +1 para corresponder ao número da linha no Excel
    });
  }
  
  return results;
}

export function generateFranquiasTemplate(): ArrayBuffer {
  const headers = [
    "Nome Completo",
    "CNPJ",
    "Regime Tributário",
    "Status assinatura do contrato",
    "Data de assinatura do contrato",
    "Data Término",
    "STATUS DE VIGÊNCIA",
    "Consultora informada sobre vencimento?",
    "Renovação aceita?",
    "Novo contrato enviado?",
    "Contrato NOVO assinado?",
    "N° da NF",
    "Data da Emissão",
    "Observação"
  ];
  
  const exampleRow = [
    "Franquia Exemplo LTDA",
    "12.345.678/0001-99",
    "Simples Nacional",
    "Assinado",
    "01/01/2024",
    "31/12/2024",
    "Ativo",
    "Sim",
    "Sim",
    "Não",
    "Não",
    "12345",
    "15/01/2024",
    "Observações sobre a franquia"
  ];
  
  const worksheet = XLSX.utils.aoa_to_sheet([headers, exampleRow]);
  
  // Define larguras das colunas
  worksheet["!cols"] = headers.map(() => ({ wch: 25 }));
  
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Franquias");
  
  return XLSX.write(workbook, { type: "array", bookType: "xlsx" });
}
