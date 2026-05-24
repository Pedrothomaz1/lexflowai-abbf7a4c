# Causa-raiz

O wizard fez upload do `.docx` para o storage (`contratos-documentos`), mas o `INSERT` foi feito em uma tabela **inexistente** chamada `contract_documents`. A chamada usa `.then(() => null)`, então o erro é silenciosamente engolido. A edge function `analisar-contrato-ia` e o card "Documento Principal" também leem de `contract_documents`. Resultado: o arquivo existe no bucket, mas nada no banco aponta para ele — por isso o botão "Analisar contrato" não acha texto e o "Ver Documento" mostra "Nenhum documento anexado".

A tabela correta no projeto é **`contract_attachments`** com colunas: `contrato_id`, `organization_id`, `uploaded_by`, `nome_arquivo`, `arquivo_url` (= path no bucket), `tamanho_bytes`, `mime_type`, `tipo_documento`, `is_original`, `versao`.

# Correções

### 1. `src/components/contracts/NovoContratoWizard.tsx`
Trocar o insert para `contract_attachments` com as colunas corretas, incluindo `organization_id`, `is_original=true`, `tipo_documento='contrato_original'`, e **aguardar o `await`** (sem `.then(() => null)`) para que falhas apareçam em toast.

### 2. `supabase/functions/analisar-contrato-ia/index.ts`
Buscar o documento em `contract_attachments` (campo `arquivo_url` = path) em vez de `contract_documents`. Preferir `is_original=true` e cair no mais recente caso não exista. Manter a extração via `mammoth`/`pdf-parse` como já está.

### 3. `src/pages/ContratoDetalhes.tsx`
A função `fetchMainDocument` também consulta `contract_documents`. Trocar para `contract_attachments` (`select nome_arquivo, arquivo_url … order by is_original desc, created_at desc limit 1`) e ajustar o estado para usar `arquivo_url` como path no `createSignedUrl`.

### 4. Backfill do contrato atual (4bb536a0…)
Inserir manualmente em `contract_attachments` o registro do arquivo já enviado (`5bdf7138-…/1779635866709.docx`) para que a análise funcione sem precisar reenviar.

# Fora do escopo
- Não mexer no fluxo de múltiplos anexos da aba lateral (já usa `contract_attachments`).
- Não mexer no `extrair-dados-pdf` (que extrai metadados no momento do upload, e está funcionando — vide logs).
- Não criar a tabela `contract_documents`: ela é um vestígio. Removemos as referências.

# Resultado esperado
Após o fix + backfill: o botão "Ver Documento" abre o `.docx` original, e "Analisar contrato" envia o texto extraído para a IA, gravando o resultado em `contract_analysis` e renderizando o card de análise na coluna principal.
