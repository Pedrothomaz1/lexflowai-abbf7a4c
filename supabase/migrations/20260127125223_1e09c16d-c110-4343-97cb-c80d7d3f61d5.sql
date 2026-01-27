-- =====================================================
-- CORREÇÃO DE POLÍTICAS RLS - EXIGIR AUTENTICAÇÃO
-- =====================================================

-- 1. FORNECEDORES
DROP POLICY IF EXISTS "Users can view all fornecedores" ON fornecedores;
CREATE POLICY "Authenticated users can view fornecedores"
ON fornecedores FOR SELECT TO authenticated
USING (auth.uid() IS NOT NULL);

-- 2. CONTRATOS
DROP POLICY IF EXISTS "Users can view all contratos" ON contratos;
CREATE POLICY "Authenticated users can view contratos"
ON contratos FOR SELECT TO authenticated
USING (auth.uid() IS NOT NULL);

-- 3. CONTRACT_ANALYSIS
DROP POLICY IF EXISTS "Users can view all analysis" ON contract_analysis;
CREATE POLICY "Authenticated users can view analysis"
ON contract_analysis FOR SELECT TO authenticated
USING (auth.uid() IS NOT NULL);

-- 4. CONTRACT_ALERTS
DROP POLICY IF EXISTS "Users can view all alerts" ON contract_alerts;
CREATE POLICY "Authenticated users can view alerts"
ON contract_alerts FOR SELECT TO authenticated
USING (auth.uid() IS NOT NULL);

-- 5. CONTRACT_HISTORY
DROP POLICY IF EXISTS "Users can view contract history" ON contract_history;
CREATE POLICY "Authenticated users can view contract history"
ON contract_history FOR SELECT TO authenticated
USING (auth.uid() IS NOT NULL);

-- 6. CONTRACT_TEMPLATES
DROP POLICY IF EXISTS "Users can view all templates" ON contract_templates;
CREATE POLICY "Authenticated users can view templates"
ON contract_templates FOR SELECT TO authenticated
USING (auth.uid() IS NOT NULL);

-- 7. CONTRACT_VERSIONS
DROP POLICY IF EXISTS "Users can view contract versions" ON contract_versions;
CREATE POLICY "Authenticated users can view contract versions"
ON contract_versions FOR SELECT TO authenticated
USING (auth.uid() IS NOT NULL);

-- 8. CONTRACT_OBLIGATIONS
DROP POLICY IF EXISTS "Users can view all obligations" ON contract_obligations;
CREATE POLICY "Authenticated users can view obligations"
ON contract_obligations FOR SELECT TO authenticated
USING (auth.uid() IS NOT NULL);

-- 9. CONTRACT_ATTACHMENTS
DROP POLICY IF EXISTS "Users can view all attachments" ON contract_attachments;
CREATE POLICY "Authenticated users can view attachments"
ON contract_attachments FOR SELECT TO authenticated
USING (auth.uid() IS NOT NULL);

-- 10. CONTRACT_SIGNATURES
DROP POLICY IF EXISTS "Usuários podem visualizar assinaturas" ON contract_signatures;
CREATE POLICY "Authenticated users can view signatures"
ON contract_signatures FOR SELECT TO authenticated
USING (auth.uid() IS NOT NULL);

-- 11. NEGOTIATION_METRICS
DROP POLICY IF EXISTS "Users can view all negotiation metrics" ON negotiation_metrics;
CREATE POLICY "Authenticated users can view negotiation metrics"
ON negotiation_metrics FOR SELECT TO authenticated
USING (auth.uid() IS NOT NULL);

-- 12. UNIDADES
DROP POLICY IF EXISTS "Users can view all unidades" ON unidades;
CREATE POLICY "Authenticated users can view unidades"
ON unidades FOR SELECT TO authenticated
USING (auth.uid() IS NOT NULL);

-- 13. ESPECIFICACOES_SERVICO
DROP POLICY IF EXISTS "Users can view all especificacoes" ON especificacoes_servico;
CREATE POLICY "Authenticated users can view especificacoes"
ON especificacoes_servico FOR SELECT TO authenticated
USING (auth.uid() IS NOT NULL);

-- 14. SERVICOS_PERIODICOS
DROP POLICY IF EXISTS "Users can view all servicos" ON servicos_periodicos;
CREATE POLICY "Authenticated users can view servicos"
ON servicos_periodicos FOR SELECT TO authenticated
USING (auth.uid() IS NOT NULL);

-- 15. SERVICO_HISTORICO
DROP POLICY IF EXISTS "Users can view all historico" ON servico_historico;
CREATE POLICY "Authenticated users can view historico"
ON servico_historico FOR SELECT TO authenticated
USING (auth.uid() IS NOT NULL);

-- 16. FORNECEDOR_CATEGORIAS_SERVICO
DROP POLICY IF EXISTS "View fornecedor categories" ON fornecedor_categorias_servico;
CREATE POLICY "Authenticated users can view fornecedor categories"
ON fornecedor_categorias_servico FOR SELECT TO authenticated
USING (auth.uid() IS NOT NULL);

-- 17. FORNECEDOR_ANEXOS
DROP POLICY IF EXISTS "View fornecedor attachments" ON fornecedor_anexos;
CREATE POLICY "Authenticated users can view fornecedor attachments"
ON fornecedor_anexos FOR SELECT TO authenticated
USING (auth.uid() IS NOT NULL);

-- 18. SOLICITACOES_COMPRAS
DROP POLICY IF EXISTS "Users can view all solicitacoes" ON solicitacoes_compras;
CREATE POLICY "Authenticated users can view solicitacoes"
ON solicitacoes_compras FOR SELECT TO authenticated
USING (auth.uid() IS NOT NULL);

-- 19. APPROVAL_WORKFLOWS
DROP POLICY IF EXISTS "Users can view workflows" ON approval_workflows;
CREATE POLICY "Authenticated users can view workflows"
ON approval_workflows FOR SELECT TO authenticated
USING (auth.uid() IS NOT NULL);

-- 20. DATA_RETENTION_POLICIES
DROP POLICY IF EXISTS "Users can view retention policies" ON data_retention_policies;
CREATE POLICY "Authenticated users can view retention policies"
ON data_retention_policies FOR SELECT TO authenticated
USING (auth.uid() IS NOT NULL);