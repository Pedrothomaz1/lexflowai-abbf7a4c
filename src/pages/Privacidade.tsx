import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Scale,
  Database,
  Target,
  FileCheck,
  Users,
  Server,
  Shield,
  UserCheck,
  Mail,
  ArrowLeft,
  Clock,
} from "lucide-react";

const Privacidade = () => {
  const sections = [
    { id: "dados-coletados", title: "Dados Coletados", icon: Database },
    { id: "finalidade", title: "Finalidade", icon: Target },
    { id: "base-legal", title: "Base Legal", icon: FileCheck },
    { id: "compartilhamento", title: "Compartilhamento", icon: Users },
    { id: "armazenamento", title: "Armazenamento", icon: Server },
    { id: "seguranca", title: "Segurança", icon: Shield },
    { id: "direitos", title: "Direitos do Titular", icon: UserCheck },
    { id: "contato", title: "Contato", icon: Mail },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center">
              <Scale className="h-6 w-6 text-primary-foreground" />
            </div>
            <span className="text-2xl font-bold">LexFlow</span>
          </Link>
          <Button variant="ghost" asChild>
            <Link to="/" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Link>
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-6 py-12">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar - Table of Contents */}
          <aside className="lg:w-64 shrink-0">
            <div className="lg:sticky lg:top-24">
              <Card className="card-elevated">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Navegação
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <ScrollArea className="h-auto">
                    <nav className="space-y-1">
                      {sections.map((section) => (
                        <a
                          key={section.id}
                          href={`#${section.id}`}
                          className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-muted transition-colors"
                        >
                          <section.icon className="h-4 w-4 text-muted-foreground" />
                          {section.title}
                        </a>
                      ))}
                    </nav>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </aside>

          {/* Main Content */}
          <div className="flex-1 max-w-3xl">
            {/* Title Section */}
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-4">
                <Shield className="h-8 w-8 text-primary" />
                <h1 className="text-3xl font-bold">Política de Privacidade</h1>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <Badge variant="secondary" className="gap-1">
                  <Clock className="h-3 w-3" />
                  Atualizado em 27/01/2026
                </Badge>
                <span>Controlador: Veridiana Quirino / LexFlow</span>
              </div>
              <p className="mt-4 text-muted-foreground">
                Esta Política de Privacidade descreve como coletamos, usamos,
                armazenamos e protegemos seus dados pessoais em conformidade com a
                Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018).
              </p>
            </div>

            <div className="space-y-8">
              {/* 1. Dados Coletados */}
              <section id="dados-coletados">
                <Card className="card-elevated">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Database className="h-5 w-5 text-primary" />
                      1. Dados Coletados
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">Dados de Cadastro</h4>
                      <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                        <li>Nome completo</li>
                        <li>Endereço de e-mail</li>
                        <li>Telefone</li>
                        <li>Departamento/Cargo</li>
                      </ul>
                    </div>
                    <Separator />
                    <div>
                      <h4 className="font-medium mb-2">Dados de Perfil</h4>
                      <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                        <li>Foto de avatar (opcional)</li>
                        <li>Preferências de notificação</li>
                      </ul>
                    </div>
                    <Separator />
                    <div>
                      <h4 className="font-medium mb-2">Dados de Uso</h4>
                      <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                        <li>Endereço IP</li>
                        <li>Navegador e sistema operacional (user agent)</li>
                        <li>Logs de acesso e auditoria</li>
                        <li>Data e hora de ações realizadas</li>
                      </ul>
                    </div>
                    <Separator />
                    <div>
                      <h4 className="font-medium mb-2">Dados de Fornecedores</h4>
                      <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                        <li>CNPJ ou CPF</li>
                        <li>Razão social/Nome</li>
                        <li>Dados bancários (banco, agência, conta, PIX)</li>
                        <li>Endereço comercial</li>
                        <li>Dados de contato</li>
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              </section>

              {/* 2. Finalidade */}
              <section id="finalidade">
                <Card className="card-elevated">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="h-5 w-5 text-primary" />
                      2. Finalidade do Tratamento
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-3">
                      {[
                        {
                          title: "Identificação e Autenticação",
                          desc: "Verificar a identidade dos usuários e controlar o acesso ao sistema",
                        },
                        {
                          title: "Gestão de Contratos",
                          desc: "Administrar o ciclo de vida dos contratos, prazos e renovações",
                        },
                        {
                          title: "Gestão de Fornecedores",
                          desc: "Manter cadastro atualizado e histórico de relacionamento",
                        },
                        {
                          title: "Comunicação",
                          desc: "Enviar notificações por e-mail e WhatsApp sobre alertas e vencimentos",
                        },
                        {
                          title: "Auditoria e Compliance",
                          desc: "Registrar ações para fins de rastreabilidade e conformidade legal",
                        },
                        {
                          title: "Melhoria do Serviço",
                          desc: "Analisar uso do sistema para aprimorar funcionalidades",
                        },
                      ].map((item, i) => (
                        <div key={i} className="p-3 rounded-lg bg-muted/50">
                          <p className="font-medium text-sm">{item.title}</p>
                          <p className="text-sm text-muted-foreground">{item.desc}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </section>

              {/* 3. Base Legal */}
              <section id="base-legal">
                <Card className="card-elevated">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileCheck className="h-5 w-5 text-primary" />
                      3. Base Legal (Art. 7º da LGPD)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="p-4 rounded-lg border border-border">
                        <Badge className="mb-2">Execução de Contrato</Badge>
                        <p className="text-sm text-muted-foreground">
                          Tratamento necessário para a gestão contratual e prestação dos
                          serviços contratados.
                        </p>
                      </div>
                      <div className="p-4 rounded-lg border border-border">
                        <Badge variant="secondary" className="mb-2">Consentimento</Badge>
                        <p className="text-sm text-muted-foreground">
                          Para comunicações de marketing e funcionalidades opcionais que
                          requerem autorização expressa.
                        </p>
                      </div>
                      <div className="p-4 rounded-lg border border-border">
                        <Badge variant="secondary" className="mb-2">Obrigação Legal</Badge>
                        <p className="text-sm text-muted-foreground">
                          Cumprimento de exigências legais, como retenção de documentos
                          fiscais e logs de auditoria.
                        </p>
                      </div>
                      <div className="p-4 rounded-lg border border-border">
                        <Badge variant="secondary" className="mb-2">Interesse Legítimo</Badge>
                        <p className="text-sm text-muted-foreground">
                          Segurança do sistema, prevenção a fraudes e melhoria contínua
                          dos serviços.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </section>

              {/* 4. Compartilhamento */}
              <section id="compartilhamento">
                <Card className="card-elevated">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-primary" />
                      4. Compartilhamento de Dados
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Seus dados podem ser compartilhados com os seguintes terceiros,
                      sempre com medidas de proteção adequadas:
                    </p>
                    <ul className="space-y-3">
                      <li className="flex items-start gap-3">
                        <Server className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="font-medium text-sm">Provedor de Infraestrutura</p>
                          <p className="text-sm text-muted-foreground">
                            Lovable Cloud para hospedagem segura do sistema e banco de dados.
                          </p>
                        </div>
                      </li>
                      <li className="flex items-start gap-3">
                        <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="font-medium text-sm">Serviços de Comunicação</p>
                          <p className="text-sm text-muted-foreground">
                            Provedores de e-mail e WhatsApp para envio de notificações (quando configurados).
                          </p>
                        </div>
                      </li>
                      <li className="flex items-start gap-3">
                        <FileCheck className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="font-medium text-sm">Assinatura Eletrônica</p>
                          <p className="text-sm text-muted-foreground">
                            Integrações com provedores de assinatura digital (quando habilitadas).
                          </p>
                        </div>
                      </li>
                    </ul>
                    <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                      <p className="text-sm font-medium text-primary">
                        ✓ Não vendemos, alugamos ou comercializamos seus dados pessoais com terceiros.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </section>

              {/* 5. Armazenamento */}
              <section id="armazenamento">
                <Card className="card-elevated">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Server className="h-5 w-5 text-primary" />
                      5. Armazenamento e Retenção
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">Local de Armazenamento</h4>
                      <p className="text-sm text-muted-foreground">
                        Os dados são armazenados em servidores seguros fornecidos pelo
                        Lovable Cloud, com infraestrutura distribuída geograficamente.
                      </p>
                    </div>
                    <Separator />
                    <div>
                      <h4 className="font-medium mb-2">Períodos de Retenção</h4>
                      <ul className="space-y-2">
                        <li className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Dados de conta ativa</span>
                          <span className="font-medium">Enquanto a conta existir</span>
                        </li>
                        <li className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Contratos encerrados</span>
                          <span className="font-medium">Mínimo 5 anos</span>
                        </li>
                        <li className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Documentos fiscais</span>
                          <span className="font-medium">Conforme legislação tributária</span>
                        </li>
                        <li className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Logs de auditoria</span>
                          <span className="font-medium">Conforme política configurada</span>
                        </li>
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              </section>

              {/* 6. Segurança */}
              <section id="seguranca">
                <Card className="card-elevated">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="h-5 w-5 text-primary" />
                      6. Medidas de Segurança
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-2 gap-4">
                      {[
                        {
                          title: "Criptografia em Trânsito",
                          desc: "Todas as comunicações são protegidas por HTTPS/TLS",
                        },
                        {
                          title: "Controle de Acesso (RLS)",
                          desc: "Políticas de segurança a nível de linha no banco de dados",
                        },
                        {
                          title: "Autenticação Segura",
                          desc: "Suporte a OAuth 2.0 e autenticação multifator",
                        },
                        {
                          title: "Logs de Auditoria",
                          desc: "Registro completo de todas as ações para rastreabilidade",
                        },
                      ].map((item, i) => (
                        <div key={i} className="p-4 rounded-lg bg-muted/50 border border-border">
                          <p className="font-medium text-sm">{item.title}</p>
                          <p className="text-sm text-muted-foreground mt-1">{item.desc}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </section>

              {/* 7. Direitos do Titular */}
              <section id="direitos">
                <Card className="card-elevated">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <UserCheck className="h-5 w-5 text-primary" />
                      7. Direitos do Titular (Art. 18 da LGPD)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Você possui os seguintes direitos sobre seus dados pessoais:
                    </p>
                    <div className="grid gap-2">
                      {[
                        "Confirmação da existência de tratamento",
                        "Acesso aos dados pessoais",
                        "Correção de dados incompletos, inexatos ou desatualizados",
                        "Anonimização, bloqueio ou eliminação de dados desnecessários",
                        "Portabilidade dos dados a outro fornecedor",
                        "Eliminação dos dados tratados com consentimento",
                        "Informação sobre compartilhamento com terceiros",
                        "Revogação do consentimento a qualquer momento",
                      ].map((right, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <div className="h-2 w-2 rounded-full bg-primary" />
                          <span>{right}</span>
                        </div>
                      ))}
                    </div>
                    <Separator />
                    <div className="p-4 rounded-lg bg-muted/50">
                      <p className="font-medium text-sm mb-2">Como exercer seus direitos:</p>
                      <p className="text-sm text-muted-foreground">
                        Acesse a página de <strong>Compliance LGPD</strong> no menu do sistema
                        ou entre em contato conosco através do canal indicado abaixo.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </section>

              {/* 8. Contato */}
              <section id="contato">
                <Card className="card-elevated border-primary/20">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Mail className="h-5 w-5 text-primary" />
                      8. Contato do Encarregado (DPO)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Para dúvidas, solicitações ou exercício de direitos relacionados
                      à privacidade, entre em contato:
                    </p>
                    <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                      <p className="font-medium">Encarregado de Proteção de Dados</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Veridiana Quirino
                      </p>
                      <a
                        href="mailto:privacidade@lexflow.com.br"
                        className="text-sm text-primary hover:underline mt-2 inline-block"
                      >
                        privacidade@lexflow.com.br
                      </a>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Responderemos sua solicitação em até 15 dias úteis, conforme
                      previsto na legislação.
                    </p>
                  </CardContent>
                </Card>
              </section>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-8 mt-12">
        <div className="container mx-auto px-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            © 2026 LexFlow. Todos os direitos reservados.
          </p>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/">Voltar ao início</Link>
          </Button>
        </div>
      </footer>
    </div>
  );
};

export default Privacidade;
