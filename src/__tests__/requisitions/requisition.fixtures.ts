/* eslint-disable @typescript-eslint/no-explicit-any */
import { vi } from 'vitest';

/**
 * Fixtures para testes de Requisições.tsx
 * Inclui:
 * - Requisition creation utilities
 * - Approval routing logic
 * - Status transitions
 * - Budget validation
 * - Notification mocking
 * - Test data for all requisition states
 */

// ============================================================
// REQUISITION CREATION UTILITIES
// ============================================================

/**
 * Valida campos obrigatórios de requisição
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const validateRequisitionFields = (
  fields: Record<string, any>
): { valid: boolean; errors: Record<string, string> } => {
  const errors: Record<string, string> = {};

  if (!fields.description || fields.description.trim() === '') {
    errors.description = 'Descrição obrigatória';
  }
  if (!fields.value || fields.value <= 0) {
    errors.value = 'Valor deve ser positivo';
  }
  if (!fields.department || fields.department.trim() === '') {
    errors.department = 'Departamento obrigatório';
  }
  if (!fields.requester || fields.requester.trim() === '') {
    errors.requester = 'Solicitante obrigatório';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
};

/**
 * Cria nova requisição com dados validados
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const createRequisition = (
  data: Record<string, any>
): { success: boolean; requisition?: any; error?: string } => {
  const validation = validateRequisitionFields(data);
  if (!validation.valid) {
    return {
      success: false,
      error: `Validation failed: ${Object.values(validation.errors).join(', ')}`,
    };
  }

  return {
    success: true,
    requisition: {
      id: `req-${Date.now()}`,
      ...data,
      createdAt: new Date(),
      status: 'draft',
    },
  };
};

// ============================================================
// APPROVAL ROUTING LOGIC
// ============================================================

export const DEPARTMENTS = {
  IT: 'it',
  HR: 'hr',
  FINANCE: 'finance',
  OPERATIONS: 'operations',
  MARKETING: 'marketing',
} as const;

export const APPROVAL_THRESHOLDS = {
  ANALYST_MAX: 5000, // Analyst can approve up to R$ 5k
  MANAGER_MAX: 50000, // Manager up to R$ 50k
  DIRECTOR_MAX: 500000, // Director up to R$ 500k
  UNLIMITED: Infinity, // Admin unlimited
} as const;

/**
 * Define approval routing baseado em valor e departamento
 */
export const getApprovalRoute = (
  value: number,
  department: string
): { approver: string; level: string } => {
  // By department
  const deptRouting: Record<string, { approver: string; level: string }> = {
    [DEPARTMENTS.IT]: {
      approver: 'IT Manager',
      level: 'manager',
    },
    [DEPARTMENTS.HR]: {
      approver: 'HR Manager',
      level: 'manager',
    },
    [DEPARTMENTS.FINANCE]: {
      approver: 'Finance Director',
      level: 'director',
    },
    [DEPARTMENTS.OPERATIONS]: {
      approver: 'Ops Manager',
      level: 'manager',
    },
    [DEPARTMENTS.MARKETING]: {
      approver: 'Marketing Director',
      level: 'director',
    },
  };

  const deptRoute = deptRouting[department] || { approver: 'Manager', level: 'manager' };

  // By value threshold
  if (value <= APPROVAL_THRESHOLDS.ANALYST_MAX) {
    return { approver: 'Analyst', level: 'analyst' };
  } else if (value <= APPROVAL_THRESHOLDS.MANAGER_MAX) {
    return { approver: deptRoute.approver, level: 'manager' };
  } else if (value <= APPROVAL_THRESHOLDS.DIRECTOR_MAX) {
    return { approver: 'Director', level: 'director' };
  }

  return { approver: 'CFO', level: 'admin' };
};

/**
 * Submete requisição para aprovação com routing automático
 */
export const submitForApproval = (
  requisitionId: string,
  value: number,
  department: string
): { success: boolean; route: { approver: string; level: string }; error?: string } => {
  if (!requisitionId || value <= 0 || !department) {
    return {
      success: false,
      route: { approver: '', level: '' },
      error: 'Invalid requisition data',
    };
  }

  const route = getApprovalRoute(value, department);
  return {
    success: true,
    route,
  };
};

// ============================================================
// STATUS TRANSITIONS
// ============================================================

export const REQUISITION_STATES = {
  DRAFT: 'draft',
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  DELIVERED: 'delivered',
} as const;

/**
 * Define transições válidas entre estados
 */
export const isValidRequisitionTransition = (
  currentState: string,
  nextState: string
): boolean => {
  const validTransitions: Record<string, string[]> = {
    [REQUISITION_STATES.DRAFT]: [REQUISITION_STATES.PENDING],
    [REQUISITION_STATES.PENDING]: [
      REQUISITION_STATES.APPROVED,
      REQUISITION_STATES.REJECTED,
      REQUISITION_STATES.DRAFT,
    ],
    [REQUISITION_STATES.APPROVED]: [REQUISITION_STATES.DELIVERED],
    [REQUISITION_STATES.REJECTED]: [REQUISITION_STATES.DRAFT],
    [REQUISITION_STATES.DELIVERED]: [],
  };

  return validTransitions[currentState]?.includes(nextState) ?? false;
};

/**
 * Aplica transição se válida
 */
export const applyRequisitionTransition = (
  currentState: string,
  nextState: string
): { success: boolean; state: string; error?: string } => {
  if (isValidRequisitionTransition(currentState, nextState)) {
    return { success: true, state: nextState };
  }
  return {
    success: false,
    state: currentState,
    error: `Transição inválida: ${currentState} → ${nextState}`,
  };
};

// ============================================================
// BUDGET VALIDATION
// ============================================================

export const BUDGET_LIMITS = {
  MONTHLY: 100000,
  QUARTERLY: 300000,
  ANNUAL: 1000000,
} as const;

/**
 * Valida se requisição não excede budget
 */
export const validateBudget = (
  requisitionValue: number,
  budgetAvailable: number
): { valid: boolean; message?: string } => {
  if (requisitionValue > budgetAvailable) {
    return {
      valid: false,
      message: `Requisição (R$ ${requisitionValue}) excede budget disponível (R$ ${budgetAvailable})`,
    };
  }
  return { valid: true };
};

/**
 * Rastreia uso de budget
 */
export const trackBudgetUsage = (
  initialBudget: number,
  usedAmount: number
): { remaining: number; percentageUsed: number } => {
  const remaining = initialBudget - usedAmount;
  const percentageUsed = (usedAmount / initialBudget) * 100;

  return {
    remaining,
    percentageUsed,
  };
};

// ============================================================
// NOTIFICATION SERVICE
// ============================================================

/**
 * Simula envio de notificação
 */
export const sendNotification = (
  requisitionId: string,
  event: 'submitted' | 'approved' | 'rejected',
  approver: string
): { sent: boolean; timestamp: Date; message: string } => {
  const messages: Record<string, string> = {
    submitted: `Requisição ${requisitionId} enviada para ${approver}`,
    approved: `Requisição ${requisitionId} aprovada por ${approver}`,
    rejected: `Requisição ${requisitionId} rejeitada por ${approver}`,
  };

  return {
    sent: true,
    timestamp: new Date(),
    message: messages[event] || 'Notificação enviada',
  };
};

// ============================================================
// TEST DATA FIXTURES
// ============================================================

export const requisitionTestData = {
  // Requisição válida em rascunho
  validDraftRequisition: {
    id: 'req-draft-001',
    description: 'Notebook para desenvolvimento',
    value: 3500,
    department: DEPARTMENTS.IT,
    requester: 'João Silva',
    status: REQUISITION_STATES.DRAFT,
    budget: 50000,
    createdAt: new Date('2026-03-15'),
  },

  // Requisição em aprovação
  requisitionPending: {
    id: 'req-pending-001',
    description: 'Servidor de banco de dados',
    value: 45000,
    department: DEPARTMENTS.IT,
    requester: 'Maria Santos',
    status: REQUISITION_STATES.PENDING,
    budget: 100000,
    submittedAt: new Date('2026-03-14'),
  },

  // Requisição aprovada
  approvedRequisition: {
    id: 'req-approved-001',
    description: 'Licensa Adobe Creative Cloud',
    value: 12000,
    department: DEPARTMENTS.MARKETING,
    requester: 'Carlos Costa',
    status: REQUISITION_STATES.APPROVED,
    budget: 50000,
    approvedBy: 'Marketing Director',
    approvalDate: new Date('2026-03-13'),
  },

  // Requisição rejeitada
  rejectedRequisition: {
    id: 'req-rejected-001',
    description: 'Equipamento luxuoso fora do escopo',
    value: 25000,
    department: DEPARTMENTS.OPERATIONS,
    requester: 'Ana Paula',
    status: REQUISITION_STATES.REJECTED,
    budget: 50000,
    rejectedBy: 'Manager',
    rejectionReason: 'Fora do orçamento',
  },

  // Requisição entregue
  deliveredRequisition: {
    id: 'req-delivered-001',
    description: 'Software de automação',
    value: 8000,
    department: DEPARTMENTS.OPERATIONS,
    requester: 'Pedro Oliveira',
    status: REQUISITION_STATES.DELIVERED,
    budget: 50000,
    deliveredAt: new Date('2026-03-10'),
  },

  // Requisição com dados inválidos
  invalidRequisition: {
    description: '', // Vazio
    value: -5000, // Negativo
    department: '', // Vazio
    requester: '', // Vazio
  },

  // Múltiplas requisições para filtro/sort
  multipleRequisitions: [
    {
      id: 'req-001',
      description: 'Computador',
      value: 5000,
      status: REQUISITION_STATES.DRAFT,
      department: DEPARTMENTS.IT,
    },
    {
      id: 'req-002',
      description: 'Monitor 4K',
      value: 2000,
      status: REQUISITION_STATES.PENDING,
      department: DEPARTMENTS.IT,
    },
    {
      id: 'req-003',
      description: 'Teclado mecânico',
      value: 500,
      status: REQUISITION_STATES.APPROVED,
      department: DEPARTMENTS.IT,
    },
  ],
};

// ============================================================
// APPROVAL ROUTING TEST CASES
// ============================================================

export const approvalRoutingTests = {
  // Low value → Analyst
  lowValueRoute: {
    value: 3000,
    department: DEPARTMENTS.IT,
    expectedApprover: 'Analyst',
    expectedLevel: 'analyst',
  },

  // Medium value → Manager
  mediumValueRoute: {
    value: 25000,
    department: DEPARTMENTS.IT,
    expectedApprover: 'IT Manager',
    expectedLevel: 'manager',
  },

  // High value → Director
  highValueRoute: {
    value: 100000,
    department: DEPARTMENTS.IT,
    expectedApprover: 'Director',
    expectedLevel: 'director',
  },

  // Very high value → CFO
  veryHighValueRoute: {
    value: 750000,
    department: DEPARTMENTS.IT,
    expectedApprover: 'CFO',
    expectedLevel: 'admin',
  },

  // Department-specific routing
  itDepartmentRoute: {
    value: 30000,
    department: DEPARTMENTS.IT,
    expectedApprover: 'IT Manager',
  },

  hrDepartmentRoute: {
    value: 30000,
    department: DEPARTMENTS.HR,
    expectedApprover: 'HR Manager',
  },

  financeDepartmentRoute: {
    value: 30000,
    department: DEPARTMENTS.FINANCE,
    expectedApprover: 'Finance Director',
  },
};

// ============================================================
// STATUS TRANSITION TESTS
// ============================================================

export const requisitionTransitionTests = {
  draftToPending: {
    from: REQUISITION_STATES.DRAFT,
    to: REQUISITION_STATES.PENDING,
    valid: true,
  },

  pendingToApproved: {
    from: REQUISITION_STATES.PENDING,
    to: REQUISITION_STATES.APPROVED,
    valid: true,
  },

  pendingToRejected: {
    from: REQUISITION_STATES.PENDING,
    to: REQUISITION_STATES.REJECTED,
    valid: true,
  },

  approvedToDelivered: {
    from: REQUISITION_STATES.APPROVED,
    to: REQUISITION_STATES.DELIVERED,
    valid: true,
  },

  rejectedToDraft: {
    from: REQUISITION_STATES.REJECTED,
    to: REQUISITION_STATES.DRAFT,
    valid: true,
  },

  invalidDraftToApproved: {
    from: REQUISITION_STATES.DRAFT,
    to: REQUISITION_STATES.APPROVED,
    valid: false,
  },

  invalidDeliveredToAny: {
    from: REQUISITION_STATES.DELIVERED,
    to: REQUISITION_STATES.PENDING,
    valid: false,
  },
};

// ============================================================
// BUDGET VALIDATION TESTS
// ============================================================

export const budgetTests = {
  withinBudget: {
    requisitionValue: 30000,
    budgetAvailable: 50000,
    valid: true,
  },

  exceedsBudget: {
    requisitionValue: 60000,
    budgetAvailable: 50000,
    valid: false,
  },

  exactBudget: {
    requisitionValue: 50000,
    budgetAvailable: 50000,
    valid: true,
  },

  budgetTracking: {
    initialBudget: 100000,
    usedAmount: 40000,
    expectedRemaining: 60000,
    expectedPercentageUsed: 40,
  },
};

// ============================================================
// NOTIFICATION TESTS
// ============================================================

export const notificationTests = {
  submittedEvent: {
    requisitionId: 'req-001',
    event: 'submitted' as const,
    approver: 'IT Manager',
    shouldContain: 'enviada',
  },

  approvedEvent: {
    requisitionId: 'req-002',
    event: 'approved' as const,
    approver: 'Director',
    shouldContain: 'aprovada',
  },

  rejectedEvent: {
    requisitionId: 'req-003',
    event: 'rejected' as const,
    approver: 'Manager',
    shouldContain: 'rejeitada',
  },
};

// ============================================================
// ERROR SCENARIO FIXTURES
// ============================================================

export const errorScenarios = {
  routingError: {
    type: 'ROUTING_ERROR',
    message: 'Falha ao determinar rota de aprovação',
  },

  notificationError: {
    type: 'NOTIFICATION_ERROR',
    message: 'Falha ao enviar notificação',
  },

  budgetError: {
    type: 'BUDGET_ERROR',
    message: 'Requisição excede budget disponível',
  },

  validationError: {
    type: 'VALIDATION_ERROR',
    message: 'Campos obrigatórios faltando',
  },

  transitionError: {
    type: 'TRANSITION_ERROR',
    message: 'Transição de estado inválida',
  },
};

// ============================================================
// MOCK FACTORIES
// ============================================================

export const createMockNotificationService = () => ({
  send: vi.fn().mockResolvedValue({ sent: true, timestamp: new Date() }),
  sendApprovalNotification: vi.fn().mockResolvedValue({ sent: true }),
});

export const createMockSupabaseRequisitionClient = () => ({
  from: vi.fn().mockReturnValue({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: requisitionTestData.validDraftRequisition,
          error: null,
        }),
      }),
    }),
    update: vi.fn().mockResolvedValue({
      data: { id: 'req-001' },
      error: null,
    }),
    insert: vi.fn().mockResolvedValue({
      data: { id: 'req-new' },
      error: null,
    }),
  }),
});

export const createMockUseRouter = () => ({
  push: vi.fn(),
  pathname: '/requisitions/req-001',
  query: { id: 'req-001' },
});
