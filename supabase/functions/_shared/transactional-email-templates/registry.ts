/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'

export interface TemplateEntry {
  component: React.ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  to?: string
  displayName?: string
  previewData?: Record<string, any>
}

import { template as contractExpiryAlert } from './contract-expiry-alert.tsx'
import { template as organizationInvite } from './organization-invite.tsx'
import { template as contractStatusAlert } from './contract-status-alert.tsx'
import { template as financeContractReport } from './finance-contract-report.tsx'
import { template as financeServiceRenewal } from './finance-service-renewal.tsx'
import { template as counterpartyPortalAccess } from './counterparty-portal-access.tsx'
import { template as billingAlertInternal } from './billing-alert-internal.tsx'
import { template as leadInternalNotification } from './lead-internal-notification.tsx'
import { template as leadConfirmation } from './lead-confirmation.tsx'
import { template as supplierCnpjStatusChange } from './supplier-cnpj-status-change.tsx'
import { template as clientAccountReady } from './client-account-ready.tsx'
import { template as onboardingStep } from './onboarding-step.tsx'

export const TEMPLATES: Record<string, TemplateEntry> = {
  'contract-expiry-alert': contractExpiryAlert,
  'organization-invite': organizationInvite,
  'contract-status-alert': contractStatusAlert,
  'finance-contract-report': financeContractReport,
  'finance-service-renewal': financeServiceRenewal,
  'counterparty-portal-access': counterpartyPortalAccess,
  'billing-alert-internal': billingAlertInternal,
  'lead-internal-notification': leadInternalNotification,
  'lead-confirmation': leadConfirmation,
  'supplier-cnpj-status-change': supplierCnpjStatusChange,
  'client-account-ready': clientAccountReady,
  'onboarding-step': onboardingStep,
}
