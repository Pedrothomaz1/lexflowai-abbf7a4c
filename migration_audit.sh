#!/bin/bash
echo "=== MIGRATION AUDIT === $(date)"
echo

# 1. Listar migrations locais
echo "1. MIGRATIONS LOCAIS:"
ls -1 supabase/migrations/ | grep "20260308" | sort
echo

# 2. Contar migrations totais
echo "2. TOTAL DE MIGRATIONS: $(ls -1 supabase/migrations/ | wc -l)"
echo

# 3. Últimas 5 migrations
echo "3. ÚLTIMAS 5 MIGRATIONS:"
ls -1t supabase/migrations/ | head -5
echo

# 4. Verificar se tabelas estão referenciadas em code
echo "4. REFERÊNCIAS EM CÓDIGO:"
echo "- notifications table:"
grep -r "notifications" src/ --include="*.ts" --include="*.tsx" | head -3
