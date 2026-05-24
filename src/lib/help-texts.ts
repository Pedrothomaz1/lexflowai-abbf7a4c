/**
 * Textos de ajuda centralizados para tooltips contextuais
 * Estilo: Gestor-first, orientado a decisão, sem juridiquês
 */

export const helpTexts = {
  // ==================== DASHBOARD ====================
  dashboard: {
    contratosAtivos: "Contratos que precisam de acompanhamento. Veja quais exigem ação.",
    valorTotal: "Valor total sob gestão. Use para dimensionar impacto no orçamento.",
    vencendo30Dias: "Vencem em breve. Revise e decida: renovar, renegociar ou encerrar.",
    riscosAltos: "Requerem atenção. Revise antes que virem problema.",
    fornecedores: "Seus parceiros comerciais. Base para análises de concentração.",
    valorMedio: "Valor médio por contrato. Indica o porte típico das negociações.",
    aprovacoesPendentes: "Aguardando decisão. Atrasos podem impactar prazos de projetos.",
    tempoMedioAprovacao: "Dias para aprovar. Meta: até 5 dias. Acima disso, revise o fluxo.",
    slaAprovacoes: "Aprovações no prazo. Meta: 80%. Abaixo indica gargalos.",
    taxaRenovacao: "Contratos renovados. Meta: 70%. Indica satisfação com parceiros.",
    topFornecedores: "Maiores parceiros por valor. Use para negociar melhores condições.",
    evolucaoContratos: "Tendência de novos contratos. Ajuda a prever demanda.",
    valorMensal: "Fluxo financeiro mensal. Essencial para planejamento.",
    tiposContrato: "Mix de contratos por tipo. Identifica dependências.",
    analiseRiscos: "Mapa de riscos. Priorize contratos críticos na revisão.",
    proximosVencimentos: "Agenda de vencimentos. Antecipe negociações, evite gaps.",
    conformidadeGeral: "Contratos em conformidade. Abaixo de 90% requer atenção.",
  },

  // ==================== CONTRATOS ====================
  contratos: {
    filtroStatus: "Filtre por status: Rascunho, Em Aprovação, Vigente ou Encerrado.",
    filtroTipo: "Filtre por tipo: Serviços, Fornecimento, Locação, NDA ou Parceria.",
    filtroFornecedor: "Filtre por fornecedor específico.",
    filtroValor: "Filtre por faixa de valor.",
    filtroVigencia: "Filtre por período de início ou término.",
    importarXlsx: "Importe múltiplos contratos de planilha. Baixe o modelo para ver o formato.",
    exportarPdf: "Exporte a lista para PDF com os filtros aplicados.",
    novoContrato: "Crie um novo contrato informando os dados básicos.",
    vistaLista: "Visualize em tabela com colunas ordenáveis.",
    vistaKanban: "Visualize em quadro. Arraste para alterar status.",
    vistaCalendario: "Visualize obrigações e vencimentos no calendário.",
    numeroContrato: "Identificador único. Gerado automaticamente.",
  },

  // ==================== FORNECEDORES ====================
  fornecedores: {
    cnpj: "CNPJ obrigatório para empresas. Formato: 00.000.000/0000-00.",
    cpf: "CPF obrigatório para autônomos. Formato: 000.000.000-00.",
    tipoPessoa: "Empresa (PJ) ou autônomo (PF).",
    categorias: "Categorize por tipo de serviço para facilitar buscas.",
    documentos: "Anexe contratos sociais, certidões, etc.",
    dadosBancarios: "Dados para pagamento: banco, agência, conta e PIX.",
    contato: "Pessoa de contato principal no fornecedor.",
  },

  // ==================== FRANQUIAS ====================
  franquias: {
    statusContrato: "Status atual do contrato de franquia.",
    statusVigencia: "Indica se o contrato está dentro do prazo.",
    renovacao: "Se a franqueada aceitou renovar.",
    consultora: "Se a consultora foi notificada sobre vencimento.",
    novoContrato: "Se o novo contrato foi enviado para assinatura.",
    contratoAssinado: "Se o novo contrato já foi assinado.",
    notaFiscal: "Número e data da nota fiscal de renovação.",
  },

  // ==================== WORKFLOWS ====================
  workflows: {
    niveis: "Configure até 3 níveis de aprovação em sequência.",
    aprovacaoParalela: "Se ativado, todos do nível podem aprovar simultaneamente.",
    tipoContrato: "Para quais tipos este fluxo será aplicado.",
    aprovadores: "Usuários que podem aprovar neste nível.",
    statusPendente: "Aguardando aprovação. Clique para revisar.",
    statusAprovado: "Aprovado por todos os níveis.",
    statusRejeitado: "Rejeitado. Veja os comentários para entender.",
  },

  // ==================== OBRIGAÇÕES ====================
  obrigacoes: {
    tipo: "Tipo: Pagamento, Entrega, Renovação ou Notificação.",
    responsavel: "Quem deve cumprir esta obrigação.",
    status: "Status: Pendente, Em Andamento, Concluída ou Atrasada.",
    valor: "Valor financeiro, se aplicável.",
    dataVencimento: "Data limite para cumprimento.",
  },

  // ==================== ALERTAS ====================
  alertas: {
    tipoAlerta: "Tipo: Vencimento, Obrigação, Risco ou Renovação.",
    diasAntecedencia: "Quantos dias antes o alerta será enviado.",
    canaisNotificacao: "Canais: E-mail, WhatsApp ou Sistema.",
    destinatarios: "Quem receberá este alerta.",
  },

  // ==================== SEGURANÇA ====================
  seguranca: {
    twoFactor: "Autenticação em dois fatores. Adiciona código temporário ao login.",
    auditoria: "Registro de ações: quem fez, quando e o quê.",
    sessoes: "Gerencie sessões ativas e encerre suspeitas.",
    senha: "Mínimo 8 caracteres com maiúsculas, minúsculas e números.",
    permissoes: "Defina o que cada perfil pode acessar e modificar.",
    lgpd: "Configurações de conformidade com proteção de dados.",
  },

  // ==================== CONFIGURAÇÕES ====================
  configuracoes: {
    perfil: "Atualize nome, email, telefone e foto.",
    notificacoes: "Configure quais alertas receber e por qual canal.",
    assinatura: "Configure integração com assinatura eletrônica.",
    integracoes: "Gerencie conexões com ERP, CRM, etc.",
    backup: "Configure backups automáticos e retenção de dados.",
  },

  // ==================== RELATÓRIOS ====================
  relatorios: {
    tipoRelatorio: "Tipo: Contratos, Fornecedores, Obrigações, etc.",
    periodo: "Período de análise do relatório.",
    agendamento: "Configure envio automático por e-mail.",
    formato: "Formato: PDF, Excel ou CSV.",
    filtros: "Aplique filtros para refinar os dados.",
  },

  // ==================== SERVIÇOS ====================
  servicos: {
    especificacao: "Tipo de serviço conforme especificações cadastradas.",
    validade: "Data de vencimento do serviço ou certificado.",
    fornecedor: "Empresa responsável pela execução.",
    historico: "Registro de execuções anteriores.",
  },

  // ==================== UNIDADES ====================
  unidades: {
    codigo: "Código interno para identificação rápida.",
    responsavel: "Gestor responsável pela unidade.",
    contratos: "Quantidade de contratos vinculados.",
  },

  // ==================== TEMPLATES ====================
  templates: {
    camposVariaveis: "Use {{nome_campo}} para criar campos dinâmicos.",
    tipoTemplate: "Tipo de contrato para qual este modelo será sugerido.",
    preview: "Visualize como o contrato ficará com os campos preenchidos.",
  },

  // ==================== CUSTOS ====================
  custos: {
    comparativoIA: "Compare custos entre modelos de IA para análise.",
    economia: "Economia gerada pela otimização de processos.",
    projecao: "Projeção de custos para os próximos meses.",
  },
} as const;

export type HelpTextKey = keyof typeof helpTexts;
