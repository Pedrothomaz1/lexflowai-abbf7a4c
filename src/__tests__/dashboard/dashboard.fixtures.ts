import { vi } from 'vitest';

/**
 * Fixtures para testes de Dashboard.tsx
 * Inclui:
 * - KPI calculation utilities (NCG, DIO, DSO, DPO, MBL)
 * - Mock data para contratos e requisições
 * - React Query mock factories
 * - Realtime subscription mocks
 */

// ============================================================
// KPI CALCULATION UTILITIES
// ============================================================

/**
 * NCG (Necessidade de Capital de Giro)
 * Fórmula: (DIO + DSO - DPO) × valor médio diário
 */
export const calculateNCG = (
  dio: number,
  dso: number,
  dpo: number,
  dailyAverageValue: number
): number => {
  return (dio + dso - dpo) * dailyAverageValue;
};

/**
 * DIO (Days Inventory Outstanding)
 * Dias médios em inventário
 */
export const calculateDIO = (
  createdAt: Date,
  deliveredAt: Date
): number => {
  const diffTime = Math.abs(deliveredAt.getTime() - createdAt.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

/**
 * DSO (Days Sales Outstanding)
 * Dias médios para receber após faturamento
 */
export const calculateDSO = (
  billedAt: Date,
  receivedAt: Date
): number => {
  const diffTime = Math.abs(receivedAt.getTime() - billedAt.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

/**
 * DPO (Days Payable Outstanding)
 * Dias médios para pagar fornecedores
 */
export const calculateDPO = (
  purchasedAt: Date,
  paidAt: Date
): number => {
  const diffTime = Math.abs(paidAt.getTime() - purchasedAt.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

/**
 * MBL (Margem Bruta Líquida)
 * Fórmula: (receita - custos) / receita
 */
export const calculateMBL = (revenue: number, costs: number): number => {
  if (revenue === 0) return 0;
  return (revenue - costs) / revenue;
};

// ============================================================
// TEST DATA FIXTURES
// ============================================================

export const kpiTestData = {
  // Contrato típico com DIO, DSO, DPO conhecidos
  contractWithKPIs: {
    id: 'contract-001',
    description: 'Fornecimento de componentes eletrônicos',
    value: 50000,
    createdAt: new Date('2026-01-01'),
    deliveredAt: new Date('2026-01-15'),
    billedAt: new Date('2026-01-15'),
    receivedAt: new Date('2026-02-15'),
    purchasedAt: new Date('2026-01-01'),
    paidAt: new Date('2026-01-31'),
  },

  // Requisição com custos para MBL
  requisitionWithCosts: {
    id: 'req-001',
    description: 'Serviço de consultoria',
    revenue: 100000,
    costs: 40000,
    status: 'approved',
    createdAt: new Date('2026-03-01'),
  },

  // KPI calculados esperados
  expectedKPIs: {
    dio: 14, // 15 dias
    dso: 31, // 31 dias
    dpo: 30, // 30 dias
    mbl: 0.6, // (100k - 40k) / 100k = 60%
    ncg: 1500, // (14 + 31 - 30) × 50 = 15 × 50 = 750 (exemplo simplificado)
  },

  // Dados de múltiplos contratos
  multipleContracts: [
    {
      id: 'contract-001',
      status: 'vigente',
      value: 50000,
      vencimento: new Date('2026-06-01'),
    },
    {
      id: 'contract-002',
      status: 'vigente',
      value: 75000,
      vencimento: new Date('2026-05-01'),
    },
    {
      id: 'contract-003',
      status: 'expirado',
      value: 30000,
      vencimento: new Date('2025-12-01'),
    },
  ],

  // Dados de requisições para pagination/filtering
  requisitions: Array.from({ length: 50 }, (_, i) => ({
    id: `req-${String(i + 1).padStart(3, '0')}`,
    description: `Requisição ${i + 1}`,
    value: 10000 + i * 1000,
    status: ['pending', 'approved', 'completed'][i % 3],
    createdAt: new Date(2026, 0, 1 + i),
  })),

  // Cenários de dados incompletos
  incompleteData: {
    missingCosts: {
      revenue: 100000,
      costs: undefined,
    },
    missingDates: {
      createdAt: null,
      deliveredAt: new Date('2026-01-15'),
    },
  },
};

// ============================================================
// REACT QUERY MOCKS
// ============================================================

export const createMockQueryClient = () => ({
  prefetchQuery: vi.fn().mockResolvedValue(undefined),
  setQueryData: vi.fn(),
  getQueryData: vi.fn(),
  invalidateQueries: vi.fn(),
});

export const createMockUseQuery = () =>
  vi.fn().mockReturnValue({
    data: kpiTestData.requisitions,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  });

export const createMockUseInfiniteQuery = () =>
  vi.fn().mockReturnValue({
    data: {
      pages: [kpiTestData.requisitions.slice(0, 10)],
    },
    hasNextPage: true,
    fetchNextPage: vi.fn(),
    isLoading: false,
  });

// ============================================================
// REALTIME MOCKS
// ============================================================

export const createMockRealtimeSubscription = () => ({
  on: vi.fn(),
  subscribe: vi.fn(),
  unsubscribe: vi.fn(),
});

export const createMockRealtimeClient = () => ({
  channel: vi.fn().mockReturnValue(createMockRealtimeSubscription()),
  removeChannel: vi.fn(),
});

// ============================================================
// RECHARTS MOCKS
// ============================================================

export const createMockRechartsChart = () => ({
  render: vi.fn(),
  update: vi.fn(),
});

// ============================================================
// STATE MANAGEMENT TEST DATA
// ============================================================

export const stateManagementTests = {
  // Filter test cases
  filterTests: {
    byStatus: {
      input: { status: 'vigente' },
      expected: 2, // 2 vigentes de 3 contratos
    },
    byValue: {
      input: { minValue: 50000, maxValue: 100000 },
      expected: 2, // contracts 50k e 75k
    },
  },

  // Sort test cases
  sortTests: {
    byDate: {
      input: { sortBy: 'vencimento', order: 'DESC' },
      firstId: 'contract-002', // 2026-05-01 é mais próximo (vence primeiro)
    },
    byValue: {
      input: { sortBy: 'value', order: 'DESC' },
      firstId: 'contract-002', // R$ 75k é maior
    },
  },

  // Pagination test cases
  paginationTests: {
    pageSize: 10,
    totalItems: 50,
    expectedPages: 5,
    page2Items: { start: 11, end: 20 },
  },
};

// ============================================================
// REALTIME EVENT MOCKS
// ============================================================

export const realtimeEventMocks = {
  contractInserted: {
    eventType: 'INSERT',
    new: {
      id: 'contract-new',
      value: 100000,
      status: 'vigente',
      createdAt: new Date('2026-03-15'),
    },
  },
  contractUpdated: {
    eventType: 'UPDATE',
    new: {
      id: 'contract-001',
      value: 55000, // Valor alterado
    },
    old: {
      id: 'contract-001',
      value: 50000,
    },
  },
};

// ============================================================
// ERROR SCENARIO FIXTURES
// ============================================================

export const errorScenarios = {
  networkError: {
    type: 'NETWORK_ERROR',
    message: 'Failed to connect to Realtime',
  },
  disconnection: {
    type: 'DISCONNECT',
    reason: 'Connection lost',
  },
  queryError: {
    type: 'QUERY_ERROR',
    message: 'Failed to fetch data',
  },
};
