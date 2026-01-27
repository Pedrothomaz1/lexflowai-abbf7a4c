
# Plano: Pagina de Politica de Privacidade

## Visao Geral

Criar uma pagina publica de Politica de Privacidade acessivel em `/privacidade`, com conteudo completo sobre tratamento de dados conforme LGPD, e adicionar links para ela no footer da landing page e na pagina de autenticacao.

## Arquivos a Serem Criados/Modificados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `src/pages/Privacidade.tsx` | Criar | Nova pagina com a politica de privacidade completa |
| `src/App.tsx` | Modificar | Adicionar rota publica `/privacidade` |
| `src/pages/Index.tsx` | Modificar | Adicionar footer com link para privacidade |
| `src/pages/Auth.tsx` | Modificar | Atualizar link existente para apontar para `/privacidade` |

---

## Estrutura da Pagina de Privacidade

### Layout
- Header consistente com a landing page (logo LexFlow)
- Container centralizado com largura maxima de leitura confortavel
- Secoes organizadas com ancora para navegacao
- Footer simples com link para voltar

### Secoes do Conteudo

1. **Introducao**
   - Nome do controlador: Veridiana Quirino / LexFlow
   - Data da ultima atualizacao
   - Visao geral do compromisso com privacidade

2. **Dados Coletados**
   - Dados de cadastro: nome completo, email, telefone, departamento
   - Dados de perfil: foto de avatar
   - Dados de uso: IP, navegador (user agent), logs de acesso
   - Dados de fornecedores: CNPJ/CPF, dados bancarios, endereco

3. **Finalidade do Tratamento**
   - Identificacao e autenticacao de usuarios
   - Gestao de contratos e fornecedores
   - Comunicacao via email e WhatsApp
   - Auditoria e compliance
   - Melhoria do servico

4. **Base Legal (Art. 7 LGPD)**
   - Execucao de contrato (gestao contratual)
   - Consentimento (comunicacoes de marketing)
   - Obrigacao legal (auditoria, retencao fiscal)
   - Interesse legitimo (seguranca, prevencao a fraude)

5. **Compartilhamento de Dados**
   - Provedores de infraestrutura (Lovable Cloud)
   - Servicos de email (quando configurados)
   - Integracao com assinatura eletronica (quando habilitada)
   - Nao vendemos dados a terceiros

6. **Armazenamento e Retencao**
   - Dados armazenados em servidores seguros
   - Periodo de retencao conforme politicas configuradas
   - Contratos: minimo 5 anos apos encerramento
   - Logs de auditoria: conforme exigencia legal

7. **Medidas de Seguranca**
   - Criptografia em transito (HTTPS/TLS)
   - Controle de acesso baseado em funcao (RLS)
   - Autenticacao segura com suporte a OAuth
   - Logs de auditoria para rastreabilidade

8. **Direitos do Titular (Art. 18 LGPD)**
   - Acesso aos dados
   - Correcao de dados incompletos
   - Anonimizacao ou exclusao
   - Portabilidade
   - Revogacao de consentimento
   - Como exercer: via pagina de Compliance LGPD

9. **Contato do Encarregado (DPO)**
   - Email de contato: privacidade@lexflow.com.br (placeholder)
   - Formulario via sistema

---

## Detalhes Tecnicos

### Pagina Privacidade.tsx

```text
Componentes utilizados:
- Card, CardContent, CardHeader (para secoes)
- ScrollArea (para indice lateral em desktop)
- Button (para navegacao)
- Badge (para datas)
- Separator (entre secoes)
- Lucide icons: Shield, Database, Lock, Users, Clock, Mail, FileText
```

### Rota no App.tsx

```typescript
// Adicionar import
import Privacidade from "./pages/Privacidade";

// Adicionar rota (publica, sem ProtectedRoute)
<Route path="/privacidade" element={<Privacidade />} />
```

### Footer na Index.tsx

```text
Adicionar apos a secao de features:

<footer className="border-t border-border py-8">
  <div className="container mx-auto px-6 flex justify-between items-center">
    <p className="text-sm text-muted-foreground">
      2024 LexFlow. Todos os direitos reservados.
    </p>
    <div className="flex gap-4">
      <Link to="/privacidade" className="text-sm text-muted-foreground hover:text-foreground">
        Politica de Privacidade
      </Link>
    </div>
  </div>
</footer>
```

### Correcao na Auth.tsx

```typescript
// Linha 403-404: Mudar href="#" para Link
<Link to="/privacidade" className="underline hover:text-foreground">
  Politica de Privacidade
</Link>
```

---

## Padrao Visual

A pagina seguira o design system existente:
- Fundo: `bg-background`
- Cards: `card-elevated` com `rounded-xl`
- Tipografia: `Inter`, hierarquia com `text-2xl`, `text-lg`, `text-sm`
- Cores semanticas: `text-foreground`, `text-muted-foreground`, `bg-primary/10`
- Espacamento: `space-y-6`, `p-6`

---

## Resumo de Alteracoes

| Acao | Quantidade |
|------|------------|
| Arquivos criados | 1 |
| Arquivos modificados | 3 |
| Rotas adicionadas | 1 |
| Links adicionados | 2 (footer + auth) |
