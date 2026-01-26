
## Plano: Corrigir Visibilidade dos Módulos para Administrador

---

## Problema Identificado

Seu usuário administrador está com `modulo_padrao = 'contratos'` no banco de dados. A lógica do sistema está correta, mas:

1. O valor não foi configurado como `'ambos'`
2. A página de Usuários não possui campo para configurar o módulo padrão

---

## Solução

### 1. Atualizar Banco de Dados (Imediato)

Definir seu usuário como `modulo_padrao = 'ambos'`:

```sql
UPDATE user_roles 
SET modulo_padrao = 'ambos' 
WHERE user_id = 'b6b35ada-b410-4c40-97c4-5f947c866b89';
```

### 2. Atualizar Página de Usuários

Adicionar coluna "Módulo" na tabela com seletor para configurar o módulo padrão de cada usuário:

| Usuário | E-mail | Perfil Atual | Módulo | Alterar Perfil |
|---------|--------|--------------|--------|----------------|
| Pedro   | pedro@... | Administrador | **Ambos** | [Select] |

**Opções do seletor de módulo:**
- Contratos
- Serviços  
- Ambos

### 3. Atualizar Seção "Sobre os Perfis"

Adicionar explicação sobre os módulos disponíveis.

---

## Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/pages/Usuarios.tsx` | Adicionar coluna e seletor de módulo, função `handleModuloChange` |

---

## Resultado Esperado

Após a implementação:
- Administradores com `modulo_padrao = 'ambos'` verão o botão "Trocar Módulo" na sidebar
- Ao fazer login, serão direcionados para a tela de seleção de módulo
- Poderão alternar entre Contratos e Serviços a qualquer momento
