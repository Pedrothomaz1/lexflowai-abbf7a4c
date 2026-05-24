# Aba "Revisões" unificada no Contrato

Consolidar histórico de versões, redlines e devoluções de workflow em uma única visão dentro de `ContratoDetalhes.tsx`.

## O que entra

1. **Nova aba "Revisões"** substitui/absorve abas separadas de versões e redlines existentes.
2. **Componente `ContractRevisionsTab.tsx`** com três sub-visões:
   - **Timeline** — lista cronológica unificada (desc) mesclando:
     - `contract_versions` (snapshots automáticos do trigger)
     - `contract_redlines` (se existir; senão omite)
     - Devoluções do workflow (`workflow_run_stages` com status `devolvido` + comentário motivo)
     - Marcos de status (assinado, congelado)
   - **Diff** — selecionar 2 versões e exibir lado-a-lado os campos alterados (já temos `alteracoes` jsonb na trigger).
   - **Restaurar** — admin pode reverter contrato para snapshot anterior (aplica campos do `snapshot` jsonb via UPDATE; gera nova versão automaticamente pela trigger com motivo "Restauração da v{N}").

## Regras

- **Permissão restaurar:** apenas `administrador` (via `has_role`). Bloqueado se `pacote_final_congelado_at` não for nulo (trigger `enforce_contrato_imutavel` já protege).
- **Motivo de restauração** obrigatório (mínimo 10 chars) — gravado via `SET LOCAL app.versao_motivo`.
- **Diff visual:** verde/vermelho por campo, formata datas e moeda.
- **Timeline:** ícones distintos por tipo de evento (snapshot, devolução, redline, assinatura).

## Arquivos

- **Criar:** `src/components/contracts/ContractRevisionsTab.tsx`
- **Criar:** `src/components/contracts/RevisionDiffView.tsx` (sub-componente do diff)
- **Editar:** `src/pages/ContratoDetalhes.tsx` — adicionar aba e remover/consolidar abas redundantes
- **Edge function nova:** `restore-contract-version` — recebe `{ contrato_id, versao_id, motivo }`, valida admin, faz `SET LOCAL app.versao_motivo`, aplica UPDATE com os campos do snapshot. Service role para bypass de RLS controlado.

## Banco

Nenhuma migration nova obrigatória — `contract_versions.snapshot` já contém o estado completo. Se `contract_redlines` não existir no schema, omitir essa fonte da timeline (verificar antes de implementar).

## Não entra agora

- PDF executivo (fica para próxima task se desejado)
- Comparação 3-way (apenas pares)
- Edição inline na timeline

## Ordem de implementação

1. Verificar schema de `contract_redlines` e devoluções no workflow
2. Edge function `restore-contract-version`
3. Componentes Timeline + Diff
4. Plugar aba em `ContratoDetalhes.tsx`
5. Smoke test: criar versão → restaurar → conferir nova versão

Confirma para implementar?
