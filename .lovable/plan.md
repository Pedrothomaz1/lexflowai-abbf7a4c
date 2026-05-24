## Problema

No card **Ações → Documento Principal** da página de detalhe do contrato existe um campo de upload que aparece sempre que `contratos.arquivo_url` está vazio. Como o wizard de criação salva o arquivo em `contract_documents` (e não em `contratos.arquivo_url`), esse upload aparece duplicado: o usuário já enviou o documento ao criar o contrato, mas a tela pede de novo. Pior: o arquivo enviado por esse segundo campo não é o mesmo usado pela análise IA (que agora puxa de `contract_documents`).

## Solução

Tratar `contract_documents` como fonte única do documento principal, e remover o input de upload desse card.

### Comportamento novo do card "Documento Principal"

- Buscar o documento mais recente de `contract_documents` para o contrato (mesmo critério usado pela edge `analisar-contrato-ia`).
- Se existir: botão **"Ver Documento"** abre o arquivo via URL assinada do bucket `contratos-documentos` (privado).
- Se não existir: estado vazio discreto — "Nenhum documento anexado" + link para a seção de anexos já existente (Multi Attachments), sem campo de upload aqui.
- Manter o fallback antigo de `contrato.arquivo_url` apenas como compatibilidade para contratos legados que ainda usem essa coluna.

### O que removo

- `handleFileUpload` e o `<Input type="file">` desse bloco específico (o upload continua disponível no wizard de criação e na área de anexos do contrato).

### Detalhes técnicos

- Arquivo: `src/pages/ContratoDetalhes.tsx`.
- Adicionar um fetch (no `useEffect` que já carrega o contrato) para `contract_documents` ordenado por `created_at desc limit 1`.
- Gerar URL assinada via `supabase.storage.from("contratos-documentos").createSignedUrl(file_path, 300)` ao clicar em "Ver Documento" (padrão de signed URL já usado no projeto).
- Remover imports não utilizados (`Input` se não for usado em outro lugar do arquivo, estado `uploading`, etc.).
- Nada de mudança de schema ou edge function — `analisar-contrato-ia` já lê de `contract_documents`.

## Fora de escopo

- Não mexer no wizard de criação.
- Não mexer na seção de múltiplos anexos do contrato.
- Não migrar dados antigos de `contratos.arquivo_url`.
