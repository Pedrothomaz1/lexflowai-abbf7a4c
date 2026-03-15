/* eslint-disable @typescript-eslint/no-explicit-any */
import { vi } from 'vitest';

/**
 * Fixtures para testes de ComplianceLGPD.tsx
 * Inclui:
 * - Data export utilities (LGPD Art. 18)
 * - Data retention policy enforcement
 * - User deletion (anonymization & complete removal)
 * - Consent tracking (LGPD Art. 8)
 * - Audit logging (immutable)
 * - Compliance verification
 */

// ============================================================
// DATA EXPORT UTILITIES (LGPD Art. 18)
// ============================================================

/**
 * Exporta todos dados do usuário em formato portável (JSON)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const exportUserData = (
  userId: string,
  userData: Record<string, any>
): { success: boolean; data?: any; error?: string } => {
  if (!userId || !userData) {
    return {
      success: false,
      error: 'User ID and data required',
    };
  }

  try {
    const exportData = {
      userId,
      profile: {
        name: userData.name,
        email: userData.email,
        phone: userData.phone,
        createdAt: userData.createdAt,
      },
      contracts: userData.contracts || [],
      requisitions: userData.requisitions || [],
      activityLogs: userData.activityLogs || [],
      consentRecords: userData.consentRecords || [],
      exportedAt: new Date().toISOString(),
    };

    // Validar JSON
    JSON.stringify(exportData);

    return {
      success: true,
      data: exportData,
    };
  } catch (error) {
    return {
      success: false,
      error: `Export failed: ${error}`,
    };
  }
};

/**
 * Valida se export contém todos campos obrigatórios (LGPD compliance)
 */
export const validateExportCompleteness = (
  exportData: Record<string, any>
): { valid: boolean; missingFields: string[] } => {
  const requiredFields = ['userId', 'profile', 'contracts', 'requisitions', 'activityLogs'];
  const missingFields = requiredFields.filter((field) => !exportData[field]);

  return {
    valid: missingFields.length === 0,
    missingFields,
  };
};

/**
 * Verifica se PII está não-redacted no export
 */
export const verifyPIIInExport = (
  exportData: Record<string, any>
): { compliant: boolean; redactedFields: string[] } => {
  const redactedFields: string[] = [];

  if (!exportData.profile?.email || exportData.profile.email.includes('***')) {
    redactedFields.push('email');
  }
  if (!exportData.profile?.name || exportData.profile.name.includes('***')) {
    redactedFields.push('name');
  }
  if (!exportData.profile?.phone || exportData.profile.phone.includes('***')) {
    redactedFields.push('phone');
  }

  return {
    compliant: redactedFields.length === 0,
    redactedFields,
  };
};

// ============================================================
// DATA RETENTION POLICY ENFORCEMENT
// ============================================================

export const RETENTION_POLICIES = {
  activityLogs: 365, // 1 year
  contracts: Infinity, // Forever (business requirement)
  requisitions: 730, // 2 years
  consent_logs: Infinity, // Forever (legal requirement)
} as const;

/**
 * Determina se dado deve ser deletado baseado em policy
 */
export const isDataExpired = (
  dataType: string,
  createdDate: Date
): boolean => {
  const retentionDays = RETENTION_POLICIES[dataType as keyof typeof RETENTION_POLICIES];
  if (!retentionDays || retentionDays === Infinity) {
    return false;
  }

  const expiryDate = new Date(createdDate);
  expiryDate.setDate(expiryDate.getDate() + retentionDays);

  return new Date() > expiryDate;
};

/**
 * Simula enforcement de retention policy (deletion de dados antigos)
 */
export const enforceRetentionPolicy = (
  dataType: string,
  dataAge: number
): { deleted: boolean; reason?: string } => {
  const retentionDays = RETENTION_POLICIES[dataType as keyof typeof RETENTION_POLICIES];

  if (!retentionDays) {
    return { deleted: false, reason: 'Unknown data type' };
  }

  if (retentionDays === Infinity) {
    return { deleted: false, reason: 'Data retention is indefinite' };
  }

  if (dataAge > retentionDays) {
    return { deleted: true };
  }

  return { deleted: false, reason: 'Data age within retention period' };
};

// ============================================================
// USER DELETION (LGPD Art. 5 - direito do esquecimento)
// ============================================================

export const DELETION_TYPES = {
  ANONYMIZE: 'anonymize', // Keep contracts, anonymize PII
  FULL_DELETE: 'full_delete', // Remove everything except audit logs
} as const;

/**
 * Anonimiza dados do usuário (não completa deleção)
 */
export const anonymizeUserData = (
  userId: string,
  userData: Record<string, any>
): { success: boolean; anonymized?: Record<string, any>; error?: string } => {
  if (!userId || !userData || typeof userData !== 'object') {
    return { success: false, error: 'User ID and data required' };
  }

  try {
    const anonymized: any = {
      ...userData,
      profile: {
        ...(userData.profile || {}),
        name: 'Usuário Deletado',
        email: `deleted-${hashEmail(userData.profile?.email || 'unknown')}`,
        phone: null,
      },
      // Contratos permanecem com dados anônimos
      contracts: (userData.contracts || []).map((c: any) => ({
        ...c,
        requesterName: 'Usuário Anônimo',
      })),
    };

    return { success: true, anonymized };
  } catch (error) {
    return { success: false, error: `Anonymization failed: ${error}` };
  }
};

/**
 * Deleta completamente dados do usuário (exceto audit logs)
 */
export const fullDeleteUserData = (
  userId: string
): { success: boolean; deletedFields: string[]; error?: string } => {
  if (!userId) {
    return { success: false, error: 'User ID required' };
  }

  try {
    const deletedFields = ['profile', 'contracts', 'requisitions', 'activityLogs'];

    return { success: true, deletedFields };
  } catch (error) {
    return { success: false, error: `Full deletion failed: ${error}` };
  }
};

/**
 * Helper: hash email para anonymization
 */
const hashEmail = (email: string): string => {
  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    hash = (hash << 5) - hash + email.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).slice(0, 8);
};

// ============================================================
// CONSENT TRACKING (LGPD Art. 8)
// ============================================================

/**
 * Registra consent com timestamp
 */
export const recordConsent = (
  userId: string,
  consentType: string
): { success: boolean; record?: Record<string, any>; error?: string } => {
  if (!userId || !consentType) {
    return { success: false, error: 'User ID and consent type required' };
  }

  try {
    const record = {
      userId,
      consentType,
      granted: true,
      timestamp: new Date().toISOString(),
      ipAddress: '0.0.0.0', // Would be real in production
    };

    return { success: true, record };
  } catch (error) {
    return { success: false, error: `Consent recording failed: ${error}` };
  }
};

/**
 * Revoga consent (cria novo record, não deleta anterior)
 */
export const revokeConsent = (
  userId: string,
  consentType: string
): { success: boolean; record?: Record<string, any>; error?: string } => {
  if (!userId || !consentType) {
    return { success: false, error: 'User ID and consent type required' };
  }

  try {
    const record = {
      userId,
      consentType,
      granted: false,
      timestamp: new Date().toISOString(),
      action: 'revoked',
    };

    return { success: true, record };
  } catch (error) {
    return { success: false, error: `Consent revocation failed: ${error}` };
  }
};

// ============================================================
// AUDIT LOGGING (IMMUTABLE)
// ============================================================

/**
 * Cria audit log entry (imutável)
 */
let auditLogCounter = 0;
export const createAuditLogEntry = (
  action: string,
  userId: string,
  details: Record<string, any>
): { success: boolean; entry?: Record<string, any>; error?: string } => {
  if (!action || !userId) {
    return { success: false, error: 'Action and user ID required' };
  }

  try {
    auditLogCounter++;
    const entry = {
      id: `audit-${Date.now()}-${auditLogCounter}-${Math.random().toString(36).slice(2, 9)}`,
      action,
      user_id: userId,
      timestamp: new Date().toISOString(),
      details,
      immutable: true,
    };

    return { success: true, entry };
  } catch (error) {
    return { success: false, error: `Audit log creation failed: ${error}` };
  }
};

/**
 * Tenta deletar audit log (deve falhar — immutable)
 */
export const deleteAuditLogEntry = (
  entryId: string
): { success: boolean; error?: string } => {
  return {
    success: false,
    error: 'Audit logs são imutáveis e não podem ser deletados',
  };
};

/**
 * Recupera audit log de uma ação específica
 */
export const getAuditLog = (
  action: string
): { found: boolean; entries: Record<string, any>[]; error?: string } => {
  if (!action) {
    return { found: false, entries: [], error: 'Action required' };
  }

  // Em produção, buscaria do BD
  return { found: true, entries: [] };
};

// ============================================================
// ERROR HANDLING
// ============================================================

/**
 * Notifica usuário de falha na exportação
 */
export const notifyExportFailure = (
  userId: string,
  reason: string
): { sent: boolean; timestamp: Date } => {
  return {
    sent: true,
    timestamp: new Date(),
  };
};

/**
 * Log de falha de retention (para alerting)
 */
export const logRetentionFailure = (
  dataType: string,
  error: string
): { logged: boolean; timestamp: Date } => {
  return {
    logged: true,
    timestamp: new Date(),
  };
};

// ============================================================
// TEST DATA FIXTURES
// ============================================================

export const complianceTestData = {
  userFullData: {
    userId: 'user-lgpd-001',
    name: 'João Silva',
    email: 'joao@example.com',
    phone: '+55 11 98765-4321',
    createdAt: new Date('2024-01-01'),
    contracts: [
      {
        id: 'contract-1',
        description: 'Contrato A',
        value: 10000,
      },
    ],
    requisitions: [
      {
        id: 'req-1',
        description: 'Requisição A',
        value: 5000,
      },
    ],
    activityLogs: [
      {
        timestamp: new Date('2026-03-01'),
        action: 'login',
      },
    ],
    consentRecords: [
      {
        type: 'marketing',
        granted: true,
        timestamp: new Date('2024-01-15'),
      },
    ],
  },

  userMinimalData: {
    userId: 'user-lgpd-002',
    name: 'Maria Santos',
    email: 'maria@example.com',
  },

  incompleteUserData: {
    userId: 'user-lgpd-003',
    // Missing contracts, requisitions, etc
  },

  expiredActivityLog: {
    dataType: 'activityLogs',
    createdDate: new Date('2024-01-01'), // > 1 year old
    ageInDays: 400,
  },

  recentActivityLog: {
    dataType: 'activityLogs',
    createdDate: new Date('2026-02-01'), // < 1 year old
    ageInDays: 42,
  },

  consentLog: {
    userId: 'user-lgpd-001',
    consentType: 'data_processing',
    timestamp: new Date(),
  },
};

// ============================================================
// COMPLIANCE TEST CASES
// ============================================================

export const exportTests = {
  completeExport: {
    userId: 'user-001',
    hasProfile: true,
    hasContracts: true,
    hasRequisitions: true,
    hasPII: true,
  },

  incompleteExport: {
    userId: 'user-002',
    hasProfile: true,
    hasContracts: false, // Missing
    hasRequisitions: false, // Missing
  },

  piiExport: {
    userId: 'user-003',
    emailIncluded: true,
    nameIncluded: true,
    phoneIncluded: true,
    redacted: false,
  },

  jsonValidation: {
    isValidJSON: true,
    parseable: true,
    rfc7158Compliant: true,
  },
};

export const retentionTests = {
  activityLogRetention: {
    dataType: 'activityLogs',
    retentionDays: 365,
    policyEnforced: true,
  },

  contractRetention: {
    dataType: 'contracts',
    retentionDays: Infinity,
    policyEnforced: false, // Never delete
  },

  requisitionRetention: {
    dataType: 'requisitions',
    retentionDays: 730,
    policyEnforced: true,
  },

  auditLogRetention: {
    dataType: 'consent_logs',
    retentionDays: Infinity,
    immutable: true,
  },
};

export const deletionTests = {
  anonymization: {
    type: 'anonymize',
    nameBecomesAnonymous: true,
    emailHashed: true,
    contractsPreserved: true,
  },

  fullDeletion: {
    type: 'full_delete',
    profileDeleted: true,
    contractsDeleted: true,
    auditLogsPreserved: true,
  },
};

export const consentTests = {
  grantConsent: {
    userId: 'user-001',
    consentType: 'marketing',
    granted: true,
    timestampPresent: true,
  },

  revokeConsent: {
    userId: 'user-001',
    consentType: 'data_processing',
    granted: false,
    revokeTimestampPresent: true,
  },

  multipleConsents: {
    consentTypes: ['marketing', 'data_processing', 'analytics'],
    allTracked: true,
  },
};

export const auditTests = {
  exportAudit: {
    action: 'data_export',
    tracked: true,
    immutable: true,
  },

  deletionAudit: {
    action: 'user_deletion',
    tracked: true,
    timestampPresent: true,
  },

  consentAudit: {
    action: 'consent_revocation',
    tracked: true,
  },
};

export const errorScenarios = {
  exportError: {
    type: 'EXPORT_ERROR',
    message: 'Falha ao exportar dados do usuário',
  },

  retentionError: {
    type: 'RETENTION_ERROR',
    message: 'Falha ao aplicar política de retenção',
  },

  deletionError: {
    type: 'DELETION_ERROR',
    message: 'Falha ao deletar dados do usuário',
  },

  auditError: {
    type: 'AUDIT_ERROR',
    message: 'Falha ao registrar ação de compliance',
  },

  consentError: {
    type: 'CONSENT_ERROR',
    message: 'Falha ao registrar consentimento',
  },
};

// ============================================================
// COMPLIANCE CONSTANTS
// ============================================================

export const LGPD_ARTICLES = {
  ART_5: 'Princípios: legalidade, finalidade, necessidade, livre acesso',
  ART_6: 'Bases legais para tratamento de dados',
  ART_8: 'Consentimento do titular',
  ART_18: 'Direito de acesso (data export)',
  ART_19: 'Direito de retificação',
  ART_20: 'Direito de exclusão (direito ao esquecimento)',
} as const;

export const COMPLIANCE_CHECKLIST = [
  '✅ Data export completo (Art. 18) — data_export implemented',
  '✅ Formato portável (JSON)',
  '✅ PII não-redacted',
  '✅ Retention policy enforced — enforceRetentionPolicy logic',
  '✅ User anonymization works',
  '✅ Full deletion works',
  '✅ Consent tracking — recordConsent implemented',
  '✅ Audit logs imutáveis',
];

// ============================================================
// MOCK FACTORIES
// ============================================================

export const createMockComplianceService = () => ({
  exportUserData: vi.fn().mockResolvedValue({ success: true, data: {} }),
  deleteUserData: vi.fn().mockResolvedValue({ success: true }),
  recordConsent: vi.fn().mockResolvedValue({ success: true, record: {} }),
  getAuditLog: vi.fn().mockResolvedValue({ entries: [] }),
});

export const createMockAuditLogService = () => ({
  create: vi.fn().mockResolvedValue({ success: true, entry: {} }),
  read: vi.fn().mockResolvedValue({ entries: [] }),
  delete: vi.fn().mockRejectedValue(new Error('Audit logs immutable')),
  list: vi.fn().mockResolvedValue({ entries: [] }),
});

export const createMockNotificationService = () => ({
  notifyExportFailure: vi.fn().mockResolvedValue({ sent: true }),
  notifyDeletionComplete: vi.fn().mockResolvedValue({ sent: true }),
});
