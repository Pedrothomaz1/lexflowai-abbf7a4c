// Constantes do produto (spec LexFlow V1)
export const AREAS = [
  "Jurídico",
  "Compras",
  "Comercial",
  "RH",
  "Financeiro",
  "Operações",
  "Marketing",
  "Fábrica",
  "Diretoria",
  "Vendas",
] as const;

export const PRIORIDADES = ["baixa", "media", "alta", "critica"] as const;

export const TIPO_CONTRATO_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "prestacao_servicos", label: "Prestação de Serviços" },
  { value: "fornecimento", label: "Fornecimento" },
  { value: "locacao", label: "Locação" },
  { value: "confidencialidade", label: "Confidencialidade (NDA)" },
  { value: "parceria", label: "Parceria" },
  { value: "outro", label: "Outro" },
];

// SLA padrão (em dias) por urgência — quando data_necessidade não informada
export const SLA_DIAS_POR_URGENCIA: Record<string, number> = {
  critica: 2,
  alta: 5,
  media: 10,
  baixa: 20,
};

// Tipos de obrigação (spec V2) — usados em contract_obligations.tipo
export const TIPO_OBRIGACAO_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "pagamento", label: "Pagamento" },
  { value: "entrega", label: "Entrega" },
  { value: "renovacao", label: "Renovação" },
  { value: "reajuste", label: "Reajuste" },
  { value: "aviso_previo", label: "Aviso prévio" },
  { value: "compliance", label: "Compliance" },
  { value: "comunicacao", label: "Comunicação" },
  { value: "relatorio", label: "Relatório" },
  { value: "notificacao", label: "Notificação" },
];

