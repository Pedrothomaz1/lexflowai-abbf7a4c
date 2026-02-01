import { 
  FileText, 
  Users, 
  Bell, 
  Settings, 
  Shield, 
  BarChart3, 
  Workflow, 
  UserPlus 
} from "lucide-react";

export type FAQCategory = 
  | "primeiros-passos" 
  | "contratos" 
  | "alertas" 
  | "relatorios" 
  | "seguranca" 
  | "administracao";

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: FAQCategory;
  relatedLink?: string;
}

export interface GuideItem {
  id: string;
  title: string;
  description: string;
  duration: string;
  category: string;
  link: string;
  icon: typeof FileText;
}

export const categoryLabels: Record<FAQCategory, string> = {
  "primeiros-passos": "Primeiros Passos",
  "contratos": "Contratos",
  "alertas": "Alertas",
  "relatorios": "Relatórios",
  "seguranca": "Segurança",
  "administracao": "Administração",
};

export const faqItems: FAQItem[] = [
  // Primeiros Passos
  {
    id: "pp-1",
    question: "Como criar meu primeiro contrato?",
    answer: "Acesse o menu **Contratos** e clique em **Novo Contrato**. Preencha os dados básicos como título, fornecedor, datas de início e fim, e valor. Você também pode selecionar um modelo pré-configurado para agilizar o preenchimento. Após salvar, o sistema ativará alertas automáticos de vencimento.",
    category: "primeiros-passos",
    relatedLink: "/contratos?novo=true",
  },
  {
    id: "pp-2",
    question: "Como adicionar um fornecedor?",
    answer: "Vá em **Base > Fornecedores** e clique em **Novo Fornecedor**. Informe o CNPJ ou CPF, razão social e dados de contato. O sistema validará o documento automaticamente. Você pode adicionar informações bancárias e categorias de serviço para facilitar a gestão.",
    category: "primeiros-passos",
    relatedLink: "/fornecedores",
  },
  {
    id: "pp-3",
    question: "Como configurar meu perfil?",
    answer: "Acesse **Configurações > Preferências** no menu lateral. Nessa página você pode atualizar seu nome, foto de perfil, telefone e configurações de notificação. Também é possível ativar a autenticação de dois fatores para maior segurança.",
    category: "primeiros-passos",
    relatedLink: "/settings",
  },
  // Contratos
  {
    id: "ct-1",
    question: "Como funciona o fluxo de aprovação?",
    answer: "Os contratos passam por níveis de aprovação configuráveis. Em **Automação > Fluxos de Aprovação**, você define quem aprova em cada nível (por valor, tipo de contrato ou departamento). Cada aprovador recebe uma notificação e pode aprovar, rejeitar ou solicitar alterações. O contrato só avança quando todos os níveis aprovarem.",
    category: "contratos",
    relatedLink: "/workflows",
  },
  {
    id: "ct-2",
    question: "Como anexar documentos a um contrato?",
    answer: "Na página de detalhes do contrato, vá até a aba **Anexos**. Clique em **Adicionar Anexo** ou arraste os arquivos diretamente para a área indicada. São aceitos PDFs, imagens e documentos do Office. Cada anexo fica versionado no histórico do contrato.",
    category: "contratos",
    relatedLink: "/contratos",
  },
  {
    id: "ct-3",
    question: "Como usar modelos de contrato?",
    answer: "Ao criar um novo contrato, você pode selecionar um modelo na lista. Os modelos contêm campos pré-preenchidos e cláusulas padrão. Você pode criar seus próprios modelos em **Base > Modelos de Contrato**, definindo campos variáveis que serão preenchidos automaticamente.",
    category: "contratos",
    relatedLink: "/templates",
  },
  {
    id: "ct-4",
    question: "Como acompanhar o histórico de alterações de um contrato?",
    answer: "Na página de detalhes do contrato, acesse a aba **Histórico**. Lá você verá todas as alterações realizadas, quem fez, quando e os valores antes/depois. Isso garante rastreabilidade completa de cada modificação.",
    category: "contratos",
  },
  // Alertas
  {
    id: "al-1",
    question: "Como configurar alertas de vencimento?",
    answer: "Acesse **Alertas e Prazos** no menu principal. Defina com quantos dias de antecedência você deseja ser notificado (ex: 30, 15 e 7 dias antes). Escolha os canais de notificação: e-mail, notificação no sistema ou WhatsApp (se configurado). Os alertas são gerados automaticamente para todos os contratos.",
    category: "alertas",
    relatedLink: "/alertas",
  },
  {
    id: "al-2",
    question: "Quais canais de notificação posso usar?",
    answer: "O sistema suporta três canais: **E-mail** (sempre disponível), **Notificação no sistema** (aparece no sino do cabeçalho) e **WhatsApp** (requer configuração prévia da integração). Você pode ativar múltiplos canais simultaneamente em **Configurações > Notificações**.",
    category: "alertas",
    relatedLink: "/notification-settings",
  },
  {
    id: "al-3",
    question: "Como desativar alertas para um contrato específico?",
    answer: "Na página de detalhes do contrato, acesse a seção de alertas e desative as notificações individualmente. Isso é útil para contratos que você já decidiu não renovar ou que estão em fase de encerramento.",
    category: "alertas",
  },
  // Relatórios
  {
    id: "rl-1",
    question: "Como exportar relatórios em PDF?",
    answer: "Em **Governança > Relatórios**, aplique os filtros desejados (período, status, fornecedor, etc.). Visualize os dados na tela e clique em **Exportar PDF**. O documento gerado inclui gráficos, tabelas e um resumo executivo. Você também pode exportar para Excel se preferir.",
    category: "relatorios",
    relatedLink: "/relatorios",
  },
  {
    id: "rl-2",
    question: "Quais relatórios estão disponíveis?",
    answer: "O sistema oferece relatórios de: contratos por status, vencimentos próximos, gastos por fornecedor, tempo médio de aprovação, histórico de renovações e análise de riscos. Todos podem ser filtrados e exportados.",
    category: "relatorios",
    relatedLink: "/relatorios",
  },
  // Segurança
  {
    id: "sg-1",
    question: "Como ativar autenticação de dois fatores?",
    answer: "Acesse **Configurações > Preferências** e clique em **Configurar 2FA**. Escaneie o QR code com um aplicativo autenticador (Google Authenticator, Authy, etc.). Digite o código gerado para confirmar. A partir de então, você precisará do código ao fazer login.",
    category: "seguranca",
    relatedLink: "/settings/2fa",
  },
  {
    id: "sg-2",
    question: "Como gerenciar sessões ativas?",
    answer: "Em **Configurações > Preferências**, veja a seção **Sessões Ativas**. Lá você encontra todos os dispositivos conectados à sua conta, com informações de localização e último acesso. Você pode encerrar sessões remotamente se identificar algo suspeito.",
    category: "seguranca",
    relatedLink: "/settings",
  },
  {
    id: "sg-3",
    question: "O que fazer se esqueci minha senha?",
    answer: "Na tela de login, clique em **Esqueci minha senha**. Digite seu e-mail cadastrado e você receberá um link para redefinição. O link expira em 24 horas. Se não receber o e-mail, verifique a pasta de spam ou entre em contato com o suporte.",
    category: "seguranca",
  },
  // Administração
  {
    id: "ad-1",
    question: "Como convidar novos usuários?",
    answer: "Acesse **Configurações > Membros** e clique em **Convidar Membro**. Informe o e-mail da pessoa e selecione o perfil de acesso (Membro, Administrador ou Proprietário). O convidado receberá um e-mail com link para criar a conta e acessar a organização.",
    category: "administracao",
    relatedLink: "/organization/members",
  },
  {
    id: "ad-2",
    question: "Como definir permissões de acesso?",
    answer: "Ao convidar um usuário, escolha o perfil: **Membro** (acesso básico), **Administrador** (gerencia usuários e configurações) ou **Proprietário** (controle total). Você pode alterar o perfil depois em **Membros**, clicando no usuário.",
    category: "administracao",
    relatedLink: "/organization/members",
  },
  {
    id: "ad-3",
    question: "Como remover um usuário da organização?",
    answer: "Em **Configurações > Membros**, encontre o usuário e clique em **Desativar**. O usuário perderá acesso imediatamente, mas seus dados e histórico de ações serão preservados para auditoria.",
    category: "administracao",
    relatedLink: "/organization/members",
  },
];

export const guideItems: GuideItem[] = [
  {
    id: "g-1",
    title: "Criar seu primeiro contrato",
    description: "Passo a passo para cadastrar e acompanhar um contrato no sistema",
    duration: "5 min",
    category: "Contratos",
    link: "/contratos?novo=true",
    icon: FileText,
  },
  {
    id: "g-2",
    title: "Configurar alertas",
    description: "Como nunca perder um prazo importante com notificações automáticas",
    duration: "3 min",
    category: "Alertas",
    link: "/alertas",
    icon: Bell,
  },
  {
    id: "g-3",
    title: "Adicionar fornecedor",
    description: "Cadastre parceiros comerciais rapidamente e com validação automática",
    duration: "2 min",
    category: "Base",
    link: "/fornecedores",
    icon: Users,
  },
  {
    id: "g-4",
    title: "Configurar fluxo de aprovação",
    description: "Monte seu processo de aprovação em níveis de forma simples",
    duration: "4 min",
    category: "Automação",
    link: "/workflows",
    icon: Workflow,
  },
  {
    id: "g-5",
    title: "Gerar relatório de vencimentos",
    description: "Exporte lista de contratos a vencer com filtros personalizados",
    duration: "3 min",
    category: "Relatórios",
    link: "/relatorios",
    icon: BarChart3,
  },
  {
    id: "g-6",
    title: "Ativar 2FA",
    description: "Proteja sua conta com verificação em duas etapas",
    duration: "2 min",
    category: "Segurança",
    link: "/settings/2fa",
    icon: Shield,
  },
  {
    id: "g-7",
    title: "Convidar equipe",
    description: "Adicione membros à sua organização e defina permissões",
    duration: "2 min",
    category: "Administração",
    link: "/organization/members",
    icon: UserPlus,
  },
];

export const guideCategories = ["Todos", "Contratos", "Alertas", "Base", "Automação", "Relatórios", "Segurança", "Administração"];
