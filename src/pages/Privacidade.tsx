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
  BookOpen,
} from "lucide-react";

const Privacidade = () => {
  const sections = [
    { id: "dados-tratados", title: "Dados Tratados", icon: Database },
    { id: "papeis", title: "Papéis das Partes", icon: Users },
    { id: "finalidades", title: "Finalidades", icon: Target },
    { id: "dados-sensiveis", title: "Dados Sensíveis", icon: Shield },
    { id: "compartilhamento", title: "Compartilhamento", icon: Users },
    { id: "armazenamento", title: "Armazenamento", icon: Server },
    { id: "seguranca", title: "Segurança", icon: Shield },
    { id: "direitos", title: "Direitos do Titular", icon: UserCheck },
    { id: "contato", title: "Contato LGPD", icon: Mail },
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
            <span className="text-2xl font-bold">LexFlow AI</span>
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
                <h1 className="text-3xl font-bold">Política de Privacidade e Proteção de Dados Pessoais</h1>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                <Badge variant="secondary" className="gap-1">
                  <Clock className="h-3 w-3" />
                  Versão 1.0
                </Badge>
                <Badge variant="outline" className="gap-1">
                  Atualizado em 01/02/2026
                </Badge>
              </div>
              <p className="mt-4 text-muted-foreground">
                A LEXFLOW AI atua em conformidade com a Lei nº 13.709/2018 (LGPD) e respeita a 
                privacidade e a proteção dos dados pessoais tratados em sua plataforma SaaS de 
                Inteligência Artificial jurídica.
              </p>
            </div>

            <div className="space-y-8">
              {/* 1. Dados Pessoais Tratados */}
              <section id="dados-tratados">
                <Card className="card-elevated">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Database className="h-5 w-5 text-primary" />
                      1. Dados Pessoais Tratados
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Podem ser tratados:
                    </p>
                    <ul className="space-y-2">
                      {[
                        "Nome, e-mail profissional e dados de autenticação",
                        "Dados técnicos (IP, logs, dispositivo)",
                        "Dados pessoais de terceiros inseridos pelo cliente",
                      ].map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <span className="text-primary font-medium">•</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </section>

              {/* 2. Papéis das Partes */}
              <section id="papeis">
                <Card className="card-elevated">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-primary" />
                      2. Papéis das Partes
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="p-4 rounded-lg border border-border">
                      <Badge className="mb-2">Controlador de Dados</Badge>
                      <p className="text-sm text-muted-foreground">
                        O cliente atua como CONTROLADOR DE DADOS.
                      </p>
                    </div>
                    <div className="p-4 rounded-lg border border-border">
                      <Badge variant="secondary" className="mb-2">Operadora</Badge>
                      <p className="text-sm text-muted-foreground">
                        A LEXFLOW AI atua como OPERADORA, tratando os dados exclusivamente 
                        para execução do contrato.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </section>

              {/* 3. Finalidades */}
              <section id="finalidades">
                <Card className="card-elevated">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="h-5 w-5 text-primary" />
                      3. Finalidades
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      Os dados são tratados para:
                    </p>
                    <div className="grid gap-3">
                      {[
                        { title: "Operação da plataforma", desc: "Funcionamento dos serviços contratados" },
                        { title: "Suporte técnico", desc: "Atendimento e resolução de problemas" },
                        { title: "Segurança da informação", desc: "Proteção contra acessos não autorizados" },
                        { title: "Cumprimento de obrigações legais", desc: "Atendimento a requisitos regulatórios" },
                        { title: "Funcionamento das funcionalidades de IA", desc: "Processamento para análise e sugestões" },
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

              {/* 4. Dados Sensíveis */}
              <section id="dados-sensiveis">
                <Card className="card-elevated">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="h-5 w-5 text-primary" />
                      4. Dados Sensíveis
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      A LEXFLOW AI não realiza tratamento intencional de dados pessoais sensíveis.
                    </p>
                    <div className="p-4 rounded-lg bg-amber-100 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-700">
                      <p className="text-sm font-medium text-amber-700 dark:text-amber-300">
                        ⚠️ A eventual inserção ocorre sob responsabilidade exclusiva do cliente.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </section>

              {/* 5. Compartilhamento */}
              <section id="compartilhamento">
                <Card className="card-elevated">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-primary" />
                      5. Compartilhamento
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Os dados poderão ser compartilhados apenas:
                    </p>
                    <ul className="space-y-3">
                      <li className="flex items-start gap-3">
                        <Server className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="font-medium text-sm">Fornecedores de infraestrutura tecnológica</p>
                          <p className="text-sm text-muted-foreground">
                            Para hospedagem e operação da plataforma.
                          </p>
                        </div>
                      </li>
                      <li className="flex items-start gap-3">
                        <FileCheck className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="font-medium text-sm">Obrigação legal ou ordem judicial</p>
                          <p className="text-sm text-muted-foreground">
                            Quando exigido por lei ou determinação judicial.
                          </p>
                        </div>
                      </li>
                    </ul>
                  </CardContent>
                </Card>
              </section>

              {/* 6. Armazenamento e Retenção */}
              <section id="armazenamento">
                <Card className="card-elevated">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Server className="h-5 w-5 text-primary" />
                      6. Armazenamento e Retenção
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      Os dados são armazenados:
                    </p>
                    <ul className="space-y-2">
                      {[
                        "Durante a vigência contratual",
                        "Pelo prazo necessário às finalidades",
                        "Conforme exigido por lei",
                      ].map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <span className="text-primary font-medium">•</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </section>

              {/* 7. Segurança */}
              <section id="seguranca">
                <Card className="card-elevated">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="h-5 w-5 text-primary" />
                      7. Segurança
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      São adotadas medidas técnicas e administrativas adequadas, nos termos 
                      do art. 46 da LGPD.
                    </p>
                    <Separator className="my-4" />
                    <div className="grid md:grid-cols-2 gap-4">
                      {[
                        { title: "Criptografia em Trânsito", desc: "HTTPS/TLS em todas as comunicações" },
                        { title: "Controle de Acesso (RLS)", desc: "Políticas de segurança a nível de linha" },
                        { title: "Autenticação Segura", desc: "OAuth 2.0 e autenticação multifator" },
                        { title: "Logs de Auditoria", desc: "Registro completo de ações" },
                      ].map((item, i) => (
                        <div key={i} className="p-4 rounded-lg bg-muted/50 border border-border">
                          <p className="font-medium text-sm">{item.title}</p>
                          <p className="text-xs text-muted-foreground">{item.desc}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </section>

              {/* 8. Direitos do Titular */}
              <section id="direitos">
                <Card className="card-elevated">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <UserCheck className="h-5 w-5 text-primary" />
                      8. Direitos do Titular
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      São garantidos os direitos previstos no art. 18 da LGPD:
                    </p>
                    <Separator className="my-4" />
                    <div className="grid sm:grid-cols-2 gap-3">
                      {[
                        "Confirmação da existência de tratamento",
                        "Acesso aos dados",
                        "Correção de dados incompletos ou desatualizados",
                        "Anonimização, bloqueio ou eliminação",
                        "Portabilidade dos dados",
                        "Eliminação de dados tratados com consentimento",
                        "Informação sobre compartilhamento",
                        "Revogação do consentimento",
                      ].map((right, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span className="text-primary">✓</span>
                          {right}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </section>

              {/* 9. Contato LGPD */}
              <section id="contato">
                <Card className="card-elevated">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Mail className="h-5 w-5 text-primary" />
                      9. Contato LGPD
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      Para exercer seus direitos ou esclarecer dúvidas sobre o tratamento 
                      de dados pessoais:
                    </p>
                    <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                      <p className="text-sm font-medium text-primary flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        📧 privacidade@lexflowai.com.br
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </section>

              {/* 10. Legislação Aplicável */}
              <section>
                <Card className="card-elevated">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileCheck className="h-5 w-5 text-primary" />
                      10. Legislação Aplicável
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Lei nº 13.709/2018 (LGPD).
                    </p>
                  </CardContent>
                </Card>
              </section>

              {/* Base Legal LGPD */}
              <section>
                <Card className="card-elevated border-primary/20">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-primary">
                      <BookOpen className="h-5 w-5" />
                      📚 Base Legal LGPD
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Capítulos I a IV – Arts. 5º, 6º, 7º, 18, 39, 42 e 46
                    </p>
                  </CardContent>
                </Card>
              </section>
            </div>

            {/* Navigation Footer */}
            <div className="mt-12 pt-8 border-t border-border">
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <p className="text-sm text-muted-foreground">
                  Dúvidas? Entre em contato pelo{" "}
                  <a href="mailto:privacidade@lexflowai.com.br" className="text-primary hover:underline">
                    privacidade@lexflowai.com.br
                  </a>
                </p>
                <div className="flex gap-4">
                  <Button variant="outline" asChild>
                    <Link to="/termos">Termos de Uso</Link>
                  </Button>
                  <Button asChild>
                    <Link to="/auth">Acessar Plataforma</Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Privacidade;
