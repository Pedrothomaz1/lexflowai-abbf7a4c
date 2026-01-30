/**
 * Textos de ajuda centralizados para tooltips contextuais
 * Fácil manutenção: todos os textos em um único lugar
 */

export const helpTexts = {
  // ==================== DASHBOARD ====================
  dashboard: {
    contratosAtivos: "Total de contratos com status 'Vigente'. Clique para ver a lista filtrada.",
    valorTotal: "Soma dos valores de todos os contratos ativos. Considera apenas contratos vigentes.",
    vencendo30Dias: "Contratos que vencem nos próximos 30 dias. Requer atenção para renovação ou encerramento.",
    riscosAltos: "Contratos com score de risco igual ou superior a 7. Avaliados pela análise de IA.",
    fornecedores: "Total de fornecedores cadastrados no sistema.",
    valorMedio: "Média do valor por contrato ativo.",
    aprovacoesPendentes: "Contratos aguardando aprovação no workflow. Clique para gerenciar.",
    tempoMedioAprovacao: "Média de dias para aprovar um contrato. Meta: até 5 dias.",
    slaAprovacoes: "Percentual de aprovações concluídas dentro do prazo de 5 dias. Meta: 80%.",
    taxaRenovacao: "Percentual de contratos renovados após o vencimento. Meta: 70%.",
    topFornecedores: "Ranking dos fornecedores por valor total de contratos.",
    evolucaoContratos: "Quantidade de novos contratos criados por mês.",
    valorMensal: "Valor total de contratos criados por mês (em milhares).",
    tiposContrato: "Distribuição dos contratos por tipo (Serviços, Fornecimento, etc).",
    analiseRiscos: "Distribuição dos contratos por nível de risco identificado pela IA.",
    proximosVencimentos: "Contratos que vencem nos próximos 90 dias, ordenados por data.",
  },

  // ==================== CONTRATOS ====================
  contratos: {
    filtroStatus: "Filtre contratos por status: Rascunho, Em Aprovação, Vigente, Encerrado, etc.",
    filtroTipo: "Filtre por tipo: Prestação de Serviços, Fornecimento, Locação, NDA ou Parceria.",
    filtroFornecedor: "Filtre contratos por fornecedor específico.",
    filtroValor: "Filtre por faixa de valor do contrato.",
    filtroVigencia: "Filtre por período de início ou término do contrato.",
    importarXlsx: "Importe múltiplos contratos de uma planilha Excel. Baixe o modelo para ver o formato esperado.",
    exportarPdf: "Exporte a lista de contratos para PDF com os filtros aplicados.",
    novoContrato: "Crie um novo contrato manualmente informando os dados básicos.",
    vistaLista: "Visualize contratos em formato de tabela com colunas ordenáveis.",
    vistaKanban: "Visualize contratos em quadro Kanban, organizados por status. Arraste para alterar.",
    vistaCalendario: "Visualize obrigações e vencimentos em formato de calendário mensal.",
    numeroContrato: "Identificador único do contrato. Gerado automaticamente no formato CT-ANO-SEQUENCIAL.",
  },

  // ==================== FORNECEDORES ====================
  fornecedores: {
    cnpj: "CNPJ é obrigatório para pessoas jurídicas. Formato: 00.000.000/0000-00.",
    cpf: "CPF é obrigatório para pessoas físicas. Formato: 000.000.000-00.",
    tipoPessoa: "Selecione Pessoa Jurídica para empresas ou Pessoa Física para autônomos.",
    categorias: "Categorize fornecedores por tipo de serviço para facilitar a busca e relatórios.",
    documentos: "Anexe documentos do fornecedor: contratos sociais, certidões, etc.",
    dadosBancarios: "Dados para pagamento: banco, agência, conta e PIX.",
    contato: "Pessoa de contato principal no fornecedor.",
  },

  // ==================== FRANQUIAS ====================
  franquias: {
    statusContrato: "Status atual do contrato de franquia.",
    statusVigencia: "Indica se o contrato está dentro do prazo de vigência.",
    renovacao: "Indica se a franqueada aceitou a proposta de renovação.",
    consultora: "Indica se a consultora responsável foi notificada sobre o vencimento.",
    novoContrato: "Indica se o novo contrato foi enviado para assinatura.",
    contratoAssinado: "Indica se o novo contrato já foi assinado pela franqueada.",
    notaFiscal: "Número e data da nota fiscal de renovação.",
  },

  // ==================== WORKFLOWS ====================
  workflows: {
    niveis: "Configure até 3 níveis de aprovação em sequência. Cada nível pode ter um ou mais aprovadores.",
    aprovacaoParalela: "Se ativado, todos os aprovadores de um nível podem aprovar simultaneamente.",
    tipoContrato: "Selecione para quais tipos de contrato este workflow será aplicado.",
    aprovadores: "Usuários que podem aprovar contratos neste nível do workflow.",
    statusPendente: "Contrato aguardando aprovação. Clique para revisar e aprovar/rejeitar.",
    statusAprovado: "Contrato aprovado por todos os níveis do workflow.",
    statusRejeitado: "Contrato rejeitado. Veja os comentários para entender o motivo.",
  },

  // ==================== OBRIGAÇÕES ====================
  obrigacoes: {
    tipo: "Tipo da obrigação: Pagamento, Entrega, Renovação, Notificação, etc.",
    responsavel: "Usuário responsável por cumprir esta obrigação.",
    status: "Status atual: Pendente, Em Andamento, Concluída ou Atrasada.",
    valor: "Valor financeiro associado à obrigação, se aplicável.",
    dataVencimento: "Data limite para cumprimento da obrigação.",
  },

  // ==================== ALERTAS ====================
  alertas: {
    tipoAlerta: "Tipo de alerta: Vencimento, Obrigação, Risco, Renovação, etc.",
    diasAntecedencia: "Com quantos dias de antecedência o alerta deve ser enviado.",
    canaisNotificacao: "Canais para envio: E-mail, WhatsApp ou Sistema.",
    destinatarios: "Usuários que receberão este alerta.",
  },

  // ==================== SEGURANÇA ====================
  seguranca: {
    twoFactor: "Autenticação em dois fatores (2FA) adiciona uma camada extra de segurança usando um código temporário.",
    auditoria: "Registro detalhado de todas as ações realizadas no sistema: quem, quando e o quê.",
    sessoes: "Gerencie suas sessões ativas e encerre sessões suspeitas.",
    senha: "Sua senha deve ter no mínimo 8 caracteres, incluindo maiúsculas, minúsculas e números.",
    permissoes: "Defina o que cada perfil de usuário pode acessar e modificar no sistema.",
    lgpd: "Configurações de conformidade com a Lei Geral de Proteção de Dados.",
  },

  // ==================== CONFIGURAÇÕES ====================
  configuracoes: {
    perfil: "Atualize suas informações pessoais: nome, email, telefone e foto.",
    notificacoes: "Configure quais alertas deseja receber e por qual canal.",
    assinatura: "Configure a integração com serviços de assinatura eletrônica.",
    integracoes: "Gerencie integrações com sistemas externos: ERP, CRM, etc.",
    backup: "Configure backups automáticos e política de retenção de dados.",
  },

  // ==================== RELATÓRIOS ====================
  relatorios: {
    tipoRelatorio: "Selecione o tipo de relatório: Contratos, Fornecedores, Obrigações, etc.",
    periodo: "Defina o período de análise do relatório.",
    agendamento: "Configure envio automático do relatório por e-mail.",
    formato: "Escolha o formato de exportação: PDF, Excel ou CSV.",
    filtros: "Aplique filtros para refinar os dados do relatório.",
  },

  // ==================== SERVIÇOS ====================
  servicos: {
    especificacao: "Tipo de serviço conforme tabela de especificações cadastradas.",
    validade: "Data de vencimento do serviço/certificado.",
    fornecedor: "Empresa responsável pela execução do serviço.",
    historico: "Registro de todas as execuções anteriores deste serviço.",
  },

  // ==================== UNIDADES ====================
  unidades: {
    codigo: "Código interno da unidade para identificação rápida.",
    responsavel: "Gestor responsável pela unidade.",
    contratos: "Quantidade de contratos vinculados a esta unidade.",
  },

  // ==================== TEMPLATES ====================
  templates: {
    camposVariaveis: "Use {{nome_campo}} para criar campos que serão preenchidos ao usar o template.",
    tipoTemplate: "Tipo de contrato para o qual este template será sugerido.",
    preview: "Visualize como o contrato ficará com os campos preenchidos.",
  },

  // ==================== CUSTOS ====================
  custos: {
    comparativoIA: "Compare custos entre diferentes modelos de IA para análise de contratos.",
    economia: "Economia gerada pela otimização de processos e negociações.",
    projecao: "Projeção de custos para os próximos meses baseada no histórico.",
  },
} as const;

export type HelpTextKey = keyof typeof helpTexts;
