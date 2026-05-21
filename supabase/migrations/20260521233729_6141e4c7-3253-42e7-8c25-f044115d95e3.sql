
REVOKE EXECUTE ON FUNCTION
  public.dash_kpi_contratos_ativos(date, date, contract_type[], contract_status[], uuid[], uuid[]),
  public.dash_kpi_requisicoes_abertas(date, date, text[], contract_type[]),
  public.dash_kpi_aprovacoes_pendentes(uuid[]),
  public.dash_kpi_obrigacoes_atraso(uuid[]),
  public.dash_kpi_renovacoes_30d(contract_type[], uuid[]),
  public.dash_kpi_tempo_medio_assinatura(date, date, contract_type[]),
  public.dash_pipeline_contratual(date, date, contract_type[]),
  public.dash_prazos_criticos(int),
  public.dash_contratos_risco(int),
  public.dash_demandas_por_area(date, date),
  public.dash_aprovacoes_acao(boolean, int),
  public.dash_obrigacoes_vencidas(int),
  public.dash_evolucao_temporal(text, int)
FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION
  public.dash_kpi_contratos_ativos(date, date, contract_type[], contract_status[], uuid[], uuid[]),
  public.dash_kpi_requisicoes_abertas(date, date, text[], contract_type[]),
  public.dash_kpi_aprovacoes_pendentes(uuid[]),
  public.dash_kpi_obrigacoes_atraso(uuid[]),
  public.dash_kpi_renovacoes_30d(contract_type[], uuid[]),
  public.dash_kpi_tempo_medio_assinatura(date, date, contract_type[]),
  public.dash_pipeline_contratual(date, date, contract_type[]),
  public.dash_prazos_criticos(int),
  public.dash_contratos_risco(int),
  public.dash_demandas_por_area(date, date),
  public.dash_aprovacoes_acao(boolean, int),
  public.dash_obrigacoes_vencidas(int),
  public.dash_evolucao_temporal(text, int)
TO authenticated;
