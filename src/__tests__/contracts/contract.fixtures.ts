/* eslint-disable @typescript-eslint/no-explicit-any */
import { vi } from 'vitest';

/**
 * Fixtures para testes de ContratoDetalhes.tsx
 * Inclui:
 * - Form validation utilities
 * - Workflow state transition helpers
 * - Mock data para contratos em diversos estados
 * - Approval process mocks
 * - Concurrent update simulation
 */

// ============================================================
// FORM VALIDATION UTILITIES
// ============================================================

/**
 * Valida email com regex básico
 */
export const validateEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

/**
 * Valida que data_fim > data_inicio
 */
export const validateDateRange = (
  dataInicio: Date,
  dataFim: Date
): boolean => {
  return dataFim > dataInicio;
};

/**
 * Valida que valor > 0
 */
export const validateMonetaryValue = (valor: number): boolean => {
  return valor > 0;
};

/**
 * Valida campos obrigatórios
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const validateRequiredFields = (
  fields: Record<string, any>
): { valid: boolean; errors: Record<string, string> } => {
  const errors: Record<string, string> = {};

  if (!fields.descricao || fields.descricao.trim() === '') {
    errors.descricao = 'Descrição obrigatória';
  }
  if (!fields.valor || fields.valor <= 0) {
    errors.valor = 'Valor deve ser positivo';
  }
  if (!fields.dataInicio) {
    errors.dataInicio = 'Data início obrigatória';
  }
  if (!fields.dataFim) {
    errors.dataFim = 'Data fim obrigatória';
  }
  if (!fields.email || !validateEmail(fields.email)) {
    errors.email = 'Email inválido';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
};

// ============================================================
// WORKFLOW STATE TRANSITIONS
// ============================================================

export const WORKFLOW_STATES = {
  DRAFT: 'rascunho',
  PENDING_APPROVAL: 'em_aprovacao',
  APPROVED: 'aprovado',
  SIGNED: 'assinado',
  ACTIVE: 'vigente',
  EXPIRED: 'expirado',
} as const;

/**
 * Define transições válidas entre estados
 */
export const isValidTransition = (
  currentState: string,
  nextState: string
): boolean => {
  const validTransitions: Record<string, string[]> = {
    [WORKFLOW_STATES.DRAFT]: [WORKFLOW_STATES.PENDING_APPROVAL],
    [WORKFLOW_STATES.PENDING_APPROVAL]: [WORKFLOW_STATES.APPROVED, WORKFLOW_STATES.DRAFT],
    [WORKFLOW_STATES.APPROVED]: [WORKFLOW_STATES.SIGNED],
    [WORKFLOW_STATES.SIGNED]: [WORKFLOW_STATES.ACTIVE],
    [WORKFLOW_STATES.ACTIVE]: [WORKFLOW_STATES.EXPIRED],
    [WORKFLOW_STATES.EXPIRED]: [],
  };

  return validTransitions[currentState]?.includes(nextState) ?? false;
};

/**
 * Aplica transição se válida
 */
export const applyStateTransition = (
  currentState: string,
  nextState: string
): { success: boolean; state: string; error?: string } => {
  if (isValidTransition(currentState, nextState)) {
    return { success: true, state: nextState };
  }
  return {
    success: false,
    state: currentState,
    error: `Transição inválida: ${currentState} → ${nextState}`,
  };
};

// ============================================================
// APPROVAL PROCESS
// ============================================================

export const USER_ROLES = {
  ANALYST: 'analyst',
  MANAGER: 'manager',
  DIRECTOR: 'director',
  ADMIN: 'admin',
} as const;

/**
 * Determina se user pode aprovar contratos
 */
export const canApproveContract = (userRole: string): boolean => {
  const approvingRoles = [USER_ROLES.MANAGER, USER_ROLES.DIRECTOR, USER_ROLES.ADMIN];
  return approvingRoles.includes(userRole);
};

/**
 * Simula notificação de aprovação
 */
export const sendApprovalNotification = (
  contractId: string,
  approverName: string
): { sent: boolean; timestamp: Date } => {
  return {
    sent: true,
    timestamp: new Date(),
  };
};

// ============================================================
// TEST DATA FIXTURES
// ============================================================

export const contractTestData = {
  // Contrato válido em rascunho
  validDraftContract: {
    id: 'contract-draft-001',
    descricao: 'Fornecimento de componentes eletrônicos',
    email: 'supplier@example.com',
    valor: 50000,
    dataInicio: new Date('2026-03-01'),
    dataFim: new Date('2026-12-31'),
    status: WORKFLOW_STATES.DRAFT,
    createdAt: new Date('2026-03-15'),
    updatedAt: new Date('2026-03-15'),
  },

  // Contrato em aprovação
  contractPendingApproval: {
    id: 'contract-approval-001',
    descricao: 'Serviço de consultoria estratégica',
    email: 'consultant@example.com',
    valor: 100000,
    dataInicio: new Date('2026-04-01'),
    dataFim: new Date('2026-06-30'),
    status: WORKFLOW_STATES.PENDING_APPROVAL,
    createdAt: new Date('2026-03-10'),
    updatedAt: new Date('2026-03-15'),
  },

  // Contrato aprovado
  approvedContract: {
    id: 'contract-approved-001',
    descricao: 'Licença de software',
    email: 'vendor@example.com',
    valor: 25000,
    dataInicio: new Date('2026-05-01'),
    dataFim: new Date('2027-05-01'),
    status: WORKFLOW_STATES.APPROVED,
    approvedBy: 'manager-001',
    approvalDate: new Date('2026-03-14'),
    createdAt: new Date('2026-03-01'),
    updatedAt: new Date('2026-03-14'),
  },

  // Contrato vigente
  activeContract: {
    id: 'contract-active-001',
    descricao: 'Contrato de fornecimento ativo',
    email: 'supplier-active@example.com',
    valor: 75000,
    dataInicio: new Date('2025-01-01'),
    dataFim: new Date('2026-12-31'),
    status: WORKFLOW_STATES.ACTIVE,
    signedAt: new Date('2025-01-15'),
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2026-03-15'),
  },

  // Contrato com dados inválidos
  invalidContract: {
    descricao: '', // Vazio - inválido
    email: 'invalid-email', // Inválido
    valor: -5000, // Negativo - inválido
    dataInicio: new Date('2026-12-31'),
    dataFim: new Date('2026-01-01'), // Fim antes de início - inválido
  },

  // Múltiplos contratos para filtro/sort
  multipleContracts: [
    {
      id: 'contract-001',
      descricao: 'Contrato A',
      status: WORKFLOW_STATES.DRAFT,
      valor: 10000,
      dataFim: new Date('2026-12-31'),
    },
    {
      id: 'contract-002',
      descricao: 'Contrato B',
      status: WORKFLOW_STATES.ACTIVE,
      valor: 25000,
      dataFim: new Date('2026-06-30'),
    },
    {
      id: 'contract-003',
      descricao: 'Contrato C',
      status: WORKFLOW_STATES.PENDING_APPROVAL,
      valor: 50000,
      dataFim: new Date('2027-03-15'),
    },
  ],
};

// ============================================================
// FORM VALIDATION TEST CASES
// ============================================================

export const formValidationTests = {
  validEmail: 'test@example.com',
  invalidEmails: [
    'no-at-sign',
    '@nodomain',
    'spaces in@email.com',
    '',
  ],

  validDateRange: {
    dataInicio: new Date('2026-03-01'),
    dataFim: new Date('2026-12-31'),
  },

  invalidDateRanges: [
    {
      dataInicio: new Date('2026-12-31'),
      dataFim: new Date('2026-01-01'),
      reason: 'Fim antes de início',
    },
    {
      dataInicio: new Date('2026-06-15'),
      dataFim: new Date('2026-06-15'),
      reason: 'Datas iguais',
    },
  ],

  validValues: [1, 100, 1000, 1000000],
  invalidValues: [0, -1, -100, NaN],

  requiredFieldErrors: {
    descricao: 'Descrição obrigatória',
    valor: 'Valor deve ser positivo',
    dataInicio: 'Data início obrigatória',
    dataFim: 'Data fim obrigatória',
    email: 'Email inválido',
  },
};

// ============================================================
// WORKFLOW STATE TRANSITION TESTS
// ============================================================

export const workflowTransitionTests = {
  // Draft → Approval
  draftToApproval: {
    from: WORKFLOW_STATES.DRAFT,
    to: WORKFLOW_STATES.PENDING_APPROVAL,
    valid: true,
  },

  // Approval → Approved
  approvalToApproved: {
    from: WORKFLOW_STATES.PENDING_APPROVAL,
    to: WORKFLOW_STATES.APPROVED,
    valid: true,
  },

  // Approved → Signed
  approvedToSigned: {
    from: WORKFLOW_STATES.APPROVED,
    to: WORKFLOW_STATES.SIGNED,
    valid: true,
  },

  // Signed → Active
  signedToActive: {
    from: WORKFLOW_STATES.SIGNED,
    to: WORKFLOW_STATES.ACTIVE,
    valid: true,
  },

  // Invalid: Active → Draft
  invalidActiveToAny: {
    from: WORKFLOW_STATES.ACTIVE,
    to: WORKFLOW_STATES.DRAFT,
    valid: false,
  },

  // Invalid: Expired → Active (final state)
  invalidExpiredToActive: {
    from: WORKFLOW_STATES.EXPIRED,
    to: WORKFLOW_STATES.ACTIVE,
    valid: false,
  },
};

// ============================================================
// APPROVAL PROCESS TESTS
// ============================================================

export const approvalProcessTests = {
  // Role permissions
  rolePermissions: {
    [USER_ROLES.ANALYST]: {
      canApprove: false,
      reason: 'Insufficient permissions',
    },
    [USER_ROLES.MANAGER]: {
      canApprove: true,
      reason: 'Manager role allowed',
    },
    [USER_ROLES.DIRECTOR]: {
      canApprove: true,
      reason: 'Director role allowed',
    },
    [USER_ROLES.ADMIN]: {
      canApprove: true,
      reason: 'Admin role allowed',
    },
  },

  // Approval workflow
  approvalSteps: [
    {
      step: 1,
      from: WORKFLOW_STATES.DRAFT,
      to: WORKFLOW_STATES.PENDING_APPROVAL,
      action: 'Submit for approval',
    },
    {
      step: 2,
      from: WORKFLOW_STATES.PENDING_APPROVAL,
      to: WORKFLOW_STATES.APPROVED,
      action: 'Approve',
      requiredRole: USER_ROLES.MANAGER,
    },
    {
      step: 3,
      from: WORKFLOW_STATES.APPROVED,
      to: WORKFLOW_STATES.SIGNED,
      action: 'Sign contract',
    },
  ],
};

// ============================================================
// CONCURRENT UPDATE SIMULATION
// ============================================================

export const concurrentUpdateTests = {
  // Two users edit simultaneously
  scenario: {
    user1: {
      id: 'user-001',
      name: 'Alice',
      action: 'Change valor 50000 → 60000',
      saveTime: new Date('2026-03-15T10:00:00'),
    },
    user2: {
      id: 'user-002',
      name: 'Bob',
      action: 'Change dataFim to 2027-01-01',
      saveTime: new Date('2026-03-15T10:00:05'),
    },
    result: {
      conflict: true,
      winner: 'user-001', // First save wins
      loserError: 'Contrato foi alterado por outro usuário',
    },
  },

  // Last-write-wins conflict resolution
  conflictResolution: {
    strategy: 'last-write-wins',
    handlingApproach: 'Retry with fresh data',
  },
};

// ============================================================
// ERROR SCENARIO FIXTURES
// ============================================================

export const errorScenarios = {
  validationError: {
    type: 'VALIDATION_ERROR',
    message: 'Email inválido',
    field: 'email',
  },

  networkError: {
    type: 'NETWORK_ERROR',
    message: 'Falha ao conectar ao servidor',
  },

  concurrencyError: {
    type: 'CONCURRENCY_ERROR',
    message: 'Contrato foi alterado por outro usuário',
  },

  authorizationError: {
    type: 'AUTHORIZATION_ERROR',
    message: 'Você não tem permissão para aprovar este contrato',
  },

  conflictError: {
    type: 'CONFLICT_ERROR',
    message: 'Status do contrato não permite esta ação',
  },
};

// ============================================================
// MOCK FACTORIES
// ============================================================

export const createMockSupabaseClient = () => ({
  from: vi.fn().mockReturnValue({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: contractTestData.validDraftContract,
          error: null,
        }),
      }),
    }),
    update: vi.fn().mockResolvedValue({
      data: { id: 'contract-001' },
      error: null,
    }),
    insert: vi.fn().mockResolvedValue({
      data: { id: 'contract-new' },
      error: null,
    }),
  }),
  auth: {
    getSession: vi.fn().mockResolvedValue({
      data: { session: { user: { id: 'user-001', role: USER_ROLES.MANAGER } } },
      error: null,
    }),
  },
});

export const createMockUseRouter = () => ({
  push: vi.fn(),
  pathname: '/contratos/contract-001',
  query: { id: 'contract-001' },
});

export const createMockNotificationService = () => ({
  notify: vi.fn().mockResolvedValue({ success: true }),
  sendApprovalNotification: vi.fn().mockResolvedValue({ sent: true }),
});
