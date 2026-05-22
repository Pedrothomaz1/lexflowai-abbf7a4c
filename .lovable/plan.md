# Plano: Auto-preenchimento via CNPJ em todos os cadastros

A consulta de CNPJ já funciona no cadastro de Fornecedores (`useCnpjVerification` + edge function `consultar-cnpj` usando ReceitaWS). Esta entrega leva o mesmo comportamento para os demais cadastros e para a criação inline de fornecedor dentro do fluxo de contrato.

## O que será entregue

### 1. CNPJ auto-preenche em todos os formulários

Adicionar o mesmo padrão "digita CNPJ → busca → preenche nome/endereço/telefone/e-mail" em:

- **Cadastro de Franquia** (`FranquiaForm.tsx`) — hoje pede CNPJ manualmente.
- **Criação inline de Fornecedor dentro de Contrato** (`InlineFornecedorForm`) — hoje exige digitar tudo na hora.
- **Cadastro de Organização** (formulário de signup / `OrganizationSettings`) — o cliente novo digita o CNPJ da própria empresa e o nome/endereço vêm prontos.
- **Cadastro de Cliente (Super Admin → Nova Organização)** — você digita o CNPJ do cliente que comprou e o sistema já preenche.

Comportamento padrão (igual ao fornecedor):
- Usuário digita 14 dígitos → 500ms de debounce → chama edge function.
- Mostra spinner ao lado do campo.
- Se ReceitaWS retornar OK: preenche nome, fantasia, endereço (logradouro, número, bairro, cidade, UF, CEP), telefone, e-mail. Campos ficam editáveis caso o usuário queira ajustar.
- Se der erro: mostra toast amigável "CNPJ não encontrado, preencha manualmente". Não trava o formulário.
- Cache: cada CNPJ consultado fica salvo na tabela `cnpj_verifications` (já existe) por 30 dias para evitar bater de novo na ReceitaWS.

### 2. Componente reutilizável `CnpjAutoFillInput`

Criar um único componente em `src/components/ui/cnpj-autofill-input.tsx` que encapsula: input com máscara + busca automática + callback `onDataFetched(data)`. Os 4 formulários acima passam a usar esse componente, eliminando código duplicado.

### 3. CPF — validação local apenas

Para campos de CPF (cadastro de fornecedor pessoa física, contraparte, responsável), manter o componente atual `DocumentInput` com validação de dígito verificador. **Não** integrar API paga agora. Adicionar pequena nota no campo: "Preencha manualmente — CPF não pode ser consultado por API gratuita."

Quando você quiser ativar Serpro (R$/consulta) no futuro, basta criar uma edge function `consultar-cpf` análoga e plugar no mesmo padrão.

### 4. Limite de uso da ReceitaWS

ReceitaWS gratuita = 3 consultas/minuto por IP. Para evitar bloqueio quando vários clientes consultarem ao mesmo tempo:
- Edge function já trata HTTP 429 e devolve mensagem amigável.
- Cache de 30 dias na tabela `cnpj_verifications` reduz drasticamente o nº de chamadas reais.
- Se virar gargalo no futuro, troca para **BrasilAPI** (também gratuita, mesma resposta, sem limite agressivo) com 1 linha de mudança na edge function.

## Detalhes técnicos

### Arquivos novos
- `src/components/ui/cnpj-autofill-input.tsx` — componente reutilizável.

### Arquivos alterados
- `src/components/Franquias/FranquiaForm.tsx` — substituir input de CNPJ pelo novo componente.
- `src/components/Fornecedores/InlineFornecedorForm.tsx` — idem.
- `src/pages/OrganizationSettings.tsx` — idem no campo de CNPJ da própria organização.
- `src/pages/SuperAdmin/OrganizacoesTab.tsx` — no diálogo "Nova Organização Cliente".
- (Opcional) Refatorar `FornecedorForm.tsx` para usar o mesmo componente, eliminando duplicação.

### Sem mudanças
- Edge function `consultar-cnpj` — já funciona e está em produção.
- Tabela `cnpj_verifications` — já existe e já cacheia.
- Hook `useCnpjVerification` — vira base do novo componente.

### Sem mudanças de banco
Nenhuma migration nesta entrega.

## Fora de escopo
- Integração de API paga de CPF (fica documentada para o futuro).
- Migração para Supabase próprio (respondida em chat — só fazer quando houver motivo concreto).
- Painel Super Admin reforçado e fluxo de boas-vindas por e-mail (plano anterior, fica em standby até você decidir a ordem).

## Estimativa
~30 min de implementação. 1 commit.
