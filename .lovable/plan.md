

## Plan: Add inline supplier creation within contract form

### Problem
When creating a contract, if the needed supplier doesn't exist, the user must abandon the form (losing all data), go create the supplier separately, then start over.

### Solution
Add a "+ Novo Fornecedor" button next to the supplier select in `ContratoFormDialog`. Clicking it opens an inline sub-dialog with a simplified supplier form (name, document type, CNPJ/CPF, email). On success, the new supplier is added to the list and auto-selected.

### Changes

**1. `src/components/contracts/ContratoFormDialog.tsx`**
- Add state for `showFornecedorForm` (boolean) and `creatingFornecedor` (boolean)
- Add a simplified inline fornecedor creation form (collapsible section or nested dialog) with fields: Nome, Tipo Pessoa (PF/PJ), CNPJ/CPF, Email
- On submit: insert into `fornecedores` table via Supabase, then call a new `onFornecedorCreated` callback
- Auto-select the newly created supplier in the form
- Add a `+ Novo Fornecedor` button next to the supplier Select

**2. Update props interface**
- Add `onFornecedorCreated: (fornecedor: Fornecedor) => void` prop to `ContratoFormDialogProps`

**3. `src/pages/Contratos.tsx`**
- Add `handleFornecedorCreated` function that appends the new supplier to `fornecedores` state
- Pass it as `onFornecedorCreated` prop to `ContratoFormDialog`

### Technical Details
- The inline form inserts into `fornecedores` with `organization_id` from `useOrganization()`
- Uses existing RLS policies (org members can insert)
- Validates CNPJ/CPF using existing `validateCPF`/`validateCNPJ` utils
- After insert, auto-sets `formData.fornecedor_id` to the new supplier's ID
- The sub-form appears as a collapsible card within the dialog, keeping the contract form data intact

