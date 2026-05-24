# Guia — 10 Testes Manuais Críticos (Go/No-Go)

> Tempo estimado total: **30–45 min**. Execute em ambiente de **produção** logado como admin de uma org de teste (`SECQA Org A`). Para cada teste: execute → tire screenshot → salve em `docs/test-evidence/<id>-<slug>.png` → registre `passed`/`failed` na aba **/security → Pré-Venda**.

---

## 1.1 · Login com credenciais válidas
**Como executar:**
1. Acesse `https://lexflowai.com.br/auth`
2. Faça login com `qa-admin-orga@lexflow.test` / senha válida
3. Confirme redirecionamento para `/dashboard`
**Aprovado se:** sessão criada, dashboard carrega sem erro, JWT presente em `localStorage` (DevTools → Application → Local Storage).
**Evidência:** screenshot do dashboard logado + aba Local Storage.

---

## 1.2 · Bloqueio após 5 tentativas falhas
**Como executar:**
1. Em janela anônima, vá para `/auth`
2. Digite `qa-admin-orga@lexflow.test` + senha **errada** 5x consecutivas
3. Na 6ª tentativa, observe a mensagem
**Aprovado se:** 6ª tentativa retorna "Conta temporariamente bloqueada" (não "senha incorreta").
**Evidência:** screenshot da mensagem de bloqueio.

---

## 1.4 · Reset de senha
**Como executar:**
1. `/auth` → "Esqueci minha senha" → informe email QA
2. Abra o email recebido, clique no link
3. Defina nova senha (≥12 chars com complexidade)
4. **Tente reusar o mesmo link** uma 2ª vez
**Aprovado se:** 1ª vez funciona, 2ª vez mostra "link expirado/inválido". Link expira em 1h.
**Evidência:** screenshot do reset OK + screenshot do link inválido.

---

## 1.6 · Logout invalida sessão
**Como executar:**
1. Logado, abra DevTools → Application → copie o `access_token` do storage
2. Clique em **Sair** (header → menu do usuário)
3. Em terminal: `curl -H "Authorization: Bearer <TOKEN_COPIADO>" https://dxllojjazxizuylbmezc.supabase.co/auth/v1/user -H "apikey: <ANON_KEY>"`
**Aprovado se:** curl retorna 401 com `{"message":"invalid JWT"}` ou similar.
**Evidência:** screenshot do terminal com 401.

---

## 2.5 · IDOR em rotas de detalhe
**Como executar:**
1. Logado como **admin Org A**, copie o ID de um contrato da Org A (ex.: `/contratos/<id-A>`)
2. Em outra aba, logue como **admin Org B**
3. Cole manualmente `/contratos/<id-A>` na URL da Org B
**Aprovado se:** página mostra 404/403 ou estado vazio — nunca o conteúdo do contrato da Org A.
**Evidência:** screenshot da Org B tentando acessar `<id-A>`.

---

## 3.1 · Storage privado exige signed URL
**Como executar:**
1. Em um contrato da Org A, anexe um PDF
2. Abra o anexo (deve gerar URL `?token=...` com expiração curta)
3. Copie a URL **sem** o token (ex.: `https://.../object/contratos-documentos/...pdf`)
4. Cole em aba anônima
**Aprovado se:** URL sem token retorna 403/400. URL com token funciona.
**Evidência:** screenshot dos dois resultados lado a lado.

---

## 3.2 · Realtime scoped por tenant
**Como executar:**
1. Logado como Org B, abra DevTools → Console
2. Cole: `supabase.channel('public:contratos').on('postgres_changes',{event:'*',schema:'public',table:'contratos'},p=>console.log('LEAK?',p)).subscribe()`
3. Em outra sessão (Org A), edite um contrato qualquer
**Aprovado se:** console da Org B **não** recebe nenhum payload do contrato Org A.
**Evidência:** screenshot do console Org B vazio após edição na A.

---

## 3.9 · Export respeita tenant
**Como executar:**
1. Logado como Org A, vá em **Relatórios** → Exportar (CSV/PDF)
2. Abra o arquivo gerado
3. Grep por nomes/CNPJs conhecidos da Org B
**Aprovado se:** 0 ocorrências de dados da Org B no export.
**Evidência:** screenshot do export aberto + busca vazia.

---

## 5.6 · DPA disponível
**Como executar:**
1. Verificar existência de `docs/legal/DPA.md` no repositório
2. Confirmar link público em `/privacidade` ou rodapé
**Aprovado se:** documento existe e está acessível ao cliente.
**Evidência:** screenshot do doc + URL pública.

---

## 7.2 · Canal de disclosure público
**Como executar:**
1. Verificar `SECURITY.md` na raiz do repo
2. Verificar email `security@lexflowai.com.br` ativo (enviar teste)
3. Verificar menção de SLA de resposta (ex.: 5 dias úteis)
**Aprovado se:** canal documentado + email responde + SLA explícito.
**Evidência:** screenshot do `SECURITY.md` + reply do email.

---

## Após concluir

1. Atualize cada linha na aba **/security → Pré-Venda** com status real
2. Rode no SQL editor:
   ```sql
   SELECT test_id, status FROM pre_launch_test_runs
   WHERE test_id IN ('1.1','1.2','1.4','1.6','2.5','3.1','3.2','3.9','5.6','7.2')
   ORDER BY test_id;
   ```
3. Se 10/10 = `passed` → **🟢 Go**. Caso contrário, abrir ticket de correção e re-rodar.
