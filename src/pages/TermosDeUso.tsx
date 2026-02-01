import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Scale,
  FileText,
  Users,
  Brain,
  AlertTriangle,
  Copyright,
  Shield,
  Clock,
  Gavel,
  ArrowLeft,
  BookOpen,
} from "lucide-react";

const TermosDeUso = () => {
  const sections = [
    { id: "objeto", title: "Objeto", icon: FileText },
    { id: "perfil-uso", title: "Perfil de Uso", icon: Users },
    { id: "uso-ia", title: "Uso da IA", icon: Brain },
    { id: "responsabilidades", title: "Responsabilidades", icon: AlertTriangle },
    { id: "propriedade", title: "Propriedade Intelectual", icon: Copyright },
    { id: "protecao-dados", title: "Proteção de Dados", icon: Shield },
    { id: "limitacao", title: "Limitação de Responsabilidade", icon: AlertTriangle },
    { id: "vigencia", title: "Vigência", icon: Clock },
    { id: "legislacao", title: "Legislação Aplicável", icon: Gavel },
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
                <BookOpen className="h-8 w-8 text-primary" />
                <h1 className="text-3xl font-bold">Termos de Uso</h1>
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
                Termos de Uso da Plataforma LEXFLOW AI - Software como Serviço (SaaS) 
                voltado ao apoio à atividade jurídica com uso de Inteligência Artificial.
              </p>
            </div>

            <div className="space-y-8">
              {/* 1. Objeto */}
              <section id="objeto">
                <Card className="card-elevated">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-primary" />
                      1. Objeto
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      A LEXFLOW AI disponibiliza uma plataforma de Software como Serviço (SaaS) 
                      voltada ao apoio à atividade jurídica, com uso de Inteligência Artificial 
                      como ferramenta auxiliar, destinada exclusivamente a empresas e profissionais.
                    </p>
                  </CardContent>
                </Card>
              </section>

              {/* 2. Perfil de Uso */}
              <section id="perfil-uso">
                <Card className="card-elevated">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-primary" />
                      2. Perfil de Uso
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      A plataforma é destinada a uso corporativo (B2B). O usuário declara 
                      possuir capacidade técnica e jurídica para utilizar a plataforma no 
                      exercício de suas atividades profissionais.
                    </p>
                  </CardContent>
                </Card>
              </section>

              {/* 3. Uso da Inteligência Artificial */}
              <section id="uso-ia">
                <Card className="card-elevated">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Brain className="h-5 w-5 text-primary" />
                      3. Uso da Inteligência Artificial
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      A Inteligência Artificial disponibilizada na plataforma:
                    </p>
                    <ul className="space-y-2">
                      {[
                        "Atua exclusivamente como ferramenta de apoio informacional",
                        "Não emite parecer jurídico",
                        "Não substitui análise humana",
                        "Não realiza decisões automatizadas com efeitos jurídicos",
                      ].map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <span className="text-primary font-medium">•</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                    <div className="p-4 rounded-lg bg-amber-100 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-700">
                      <p className="text-sm font-medium text-amber-700 dark:text-amber-300">
                        ⚠️ O usuário é integralmente responsável pela validação e utilização 
                        das informações geradas.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </section>

              {/* 4. Responsabilidades do Usuário */}
              <section id="responsabilidades">
                <Card className="card-elevated">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-primary" />
                      4. Responsabilidades do Usuário
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      O usuário compromete-se a:
                    </p>
                    <ul className="space-y-2">
                      {[
                        "Utilizar a plataforma de forma lícita",
                        "Garantir base legal para todos os dados pessoais inseridos",
                        "Não utilizar a plataforma para fins ilegais ou abusivos",
                      ].map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <span className="text-primary font-medium">✓</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </section>

              {/* 5. Propriedade Intelectual */}
              <section id="propriedade">
                <Card className="card-elevated">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Copyright className="h-5 w-5 text-primary" />
                      5. Propriedade Intelectual
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Todos os direitos sobre a plataforma, código-fonte, funcionalidades, 
                      modelos e marca pertencem exclusivamente à LEXFLOW AI.
                    </p>
                  </CardContent>
                </Card>
              </section>

              {/* 6. Proteção de Dados */}
              <section id="protecao-dados">
                <Card className="card-elevated">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="h-5 w-5 text-primary" />
                      6. Proteção de Dados
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      O tratamento de dados pessoais observará a{" "}
                      <Link to="/privacidade" className="text-primary underline hover:no-underline">
                        Política de Privacidade
                      </Link>
                      , parte integrante destes Termos, em conformidade com a 
                      Lei nº 13.709/2018 (LGPD).
                    </p>
                  </CardContent>
                </Card>
              </section>

              {/* 7. Limitação de Responsabilidade */}
              <section id="limitacao">
                <Card className="card-elevated">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-primary" />
                      7. Limitação de Responsabilidade
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      A LEXFLOW AI não se responsabiliza por:
                    </p>
                    <ul className="space-y-2">
                      {[
                        "Decisões tomadas com base exclusiva nas informações da plataforma",
                        "Dados inseridos pelo usuário",
                        "Danos decorrentes do uso indevido da plataforma",
                      ].map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <span className="text-destructive font-medium">×</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </section>

              {/* 8. Vigência e Encerramento */}
              <section id="vigencia">
                <Card className="card-elevated">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="h-5 w-5 text-primary" />
                      8. Vigência e Encerramento
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Estes Termos vigoram enquanto o usuário utilizar a plataforma.
                    </p>
                  </CardContent>
                </Card>
              </section>

              {/* 9. Legislação Aplicável */}
              <section id="legislacao">
                <Card className="card-elevated">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Gavel className="h-5 w-5 text-primary" />
                      9. Legislação Aplicável
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Legislação brasileira.
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Foro da comarca da sede da LEXFLOW AI.
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
                      Capítulo II – Arts. 6º, 7º, 20 e 42
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
                  <a href="mailto:contato@lexflowai.com.br" className="text-primary hover:underline">
                    contato@lexflowai.com.br
                  </a>
                </p>
                <div className="flex gap-4">
                  <Button variant="outline" asChild>
                    <Link to="/privacidade">Política de Privacidade</Link>
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

export default TermosDeUso;
