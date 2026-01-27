import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Scale, FileText, Users, BarChart3, Shield } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: FileText,
      title: "Gestão Completa",
      description: "Gerencie contratos desde a criação até o encerramento",
    },
    {
      icon: Users,
      title: "Controle de Fornecedores",
      description: "Cadastro e histórico completo de parceiros",
    },
    {
      icon: BarChart3,
      title: "Dashboards Executivos",
      description: "Indicadores em tempo real e relatórios detalhados",
    },
    {
      icon: Shield,
      title: "Segurança e Compliance",
      description: "Auditoria completa e conformidade com LGPD",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center">
              <Scale className="h-6 w-6 text-primary-foreground" />
            </div>
            <span className="text-2xl font-bold">LexFlow</span>
          </div>
          <Button onClick={() => navigate("/auth")} variant="default">
            Entrar
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-6">
        <section className="py-20 text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary-glow">
            Gestão de Contratos Inteligente
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Automatize seu ciclo de vida contratual com fluxos de aprovação, assinatura eletrônica e análise jurídica com IA
          </p>
          <div className="flex gap-4 justify-center">
            <Button size="lg" onClick={() => navigate("/auth")} className="gap-2">
              Começar Agora
            </Button>
            <Button size="lg" variant="outline">
              Saiba Mais
            </Button>
          </div>
        </section>

        <section className="py-20">
          <h2 className="text-3xl font-bold text-center mb-12">
            Recursos Principais
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={index}
                  className="card-elevated p-6 transition-smooth hover:shadow-lg hover:-translate-y-1"
                >
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container mx-auto px-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            © 2026 LexFlow. Todos os direitos reservados.
          </p>
          <div className="flex gap-4">
            <Link
              to="/privacidade"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Política de Privacidade
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
