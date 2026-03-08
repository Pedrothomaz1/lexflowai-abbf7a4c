

## Plano: Multiplos Anexos na Criacao de Contrato + Correcao do Botao de Analise IA

---

### Problema 1: Upload de apenas 1 anexo na criacao de contrato

Atualmente, o formulario de "Novo Contrato" em `Contratos.tsx` aceita apenas um arquivo (`uploadedFile` e um unico `<Input type="file">`). Os arquivos sao enviados ao Storage mas nao sao inseridos na tabela `contract_attachments` apos a criacao do contrato.

**Solucao:**
- Trocar `uploadedFile: File | null` para `uploadedFiles: File[]` (array)
- Adicionar `multiple` ao input de arquivo para permitir selecao de varios arquivos
- Exibir lista de arquivos selecionados com opcao de remover individualmente
- Apos criar o contrato com sucesso, fazer upload de todos os arquivos para o Storage e inserir cada um na tabela `contract_attachments` com o `contrato_id` recem-criado

### Problema 2: Botao mostra "Reanalisar" em contrato novo

Em `ContratoDetalhes.tsx`, linha 805, o botao usa `analise ? "Reanalisar" : "Analisar Contrato"`. Quando o usuario navega de um contrato (que ja tem analise) para outro contrato novo, o estado `analise` pode ficar com o valor antigo ate o `fetchAnalise` completar, causando o texto errado momentaneamente.

**Solucao:**
- Resetar `analise` para `null` e `showAnalise` para `false` no inicio do `useEffect` que depende de `[id]`, antes de chamar os fetchers
- Isso garante que ao abrir qualquer contrato, o botao comeca sempre como "Analisar Contrato" ate que a busca confirme que existe analise previa

---

### Detalhes Tecnicos

**Arquivo: `src/pages/Contratos.tsx`**

1. Mudar estado:
   - `uploadedFile: File | null` -> `uploadedFiles: File[]` (inicializa `[]`)
2. Atualizar `handleFileUpload`:
   - Aceitar `e.target.files` como lista e concatenar ao array `uploadedFiles`
   - Nao fazer upload imediato ao Storage (apenas coleta os arquivos)
3. Atualizar o input:
   - Adicionar atributo `multiple`
   - Renderizar lista de arquivos com botao X para remover
4. Atualizar `handleSubmit`:
   - Apos o `insert` do contrato, obter o `id` retornado
   - Para cada arquivo em `uploadedFiles`, fazer upload ao Storage e inserir na tabela `contract_attachments`
   - Ajustar o insert para usar `.select()` e obter o ID do contrato criado
5. Limpar `uploadedFiles` ao fechar dialog

**Arquivo: `src/pages/ContratoDetalhes.tsx`**

1. No `useEffect` que depende de `[id]` (linha 117-130):
   - Adicionar `setAnalise(null)` e `setShowAnalise(false)` antes de chamar `fetchContrato()` / `fetchAnalise()`
   - Isso forca o reset do estado ao trocar de contrato

---

### Arquivos Modificados

| Arquivo | Mudanca |
|---|---|
| `src/pages/Contratos.tsx` | Upload multiplo de anexos na criacao, salvar em `contract_attachments` |
| `src/pages/ContratoDetalhes.tsx` | Reset de `analise` ao trocar de contrato |

