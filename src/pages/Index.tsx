import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Scale, Bell, BarChart3, Users, CheckCircle, Clock, ShieldOff, ArrowRight } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: Bell,
      title: "Nunca perca um prazo",
      description: "Alertas automáticos antes que vencimentos virem problemas",
    },
    {
      icon: BarChart3,
      title: "Veja os riscos antes",
      description: "Dashboard preventivo com visão clara do que precisa de atenção",
    },
    {
      icon: Users,
      title: "Tudo em um lugar",
      description: "Centralize contratos, fornecedores e obrigações em uma plataforma",
    },
    {
      icon: ShieldOff,
      title: "Controle sem jurídico",
      description: "Autonomia para gestores acompanharem contratos do dia a dia",
    },
  ];

  const highlights = [
    {
      icon: Bell,
      text: "Alertas antes do vencimento",
    },
    {
      icon: BarChart3,
      text: "Dashboard de riscos em tempo real",
    },
    {
      icon: CheckCircle,
      text: "Sem depender do jurídico",
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
          <h1 className="text-5xl md:text-6xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary-glow">
            Controle seus contratos. Nunca mais perca um prazo.
          </h1>
          <p className="text-xl text-muted-foreground mb-6 max-w-2xl mx-auto">
            Centralize contratos, acompanhe vencimentos e receba alertas antes que vire problema.
          </p>
          
          {/* Feature Highlights */}
          <div className="flex flex-wrap justify-center gap-6 mb-8">
            {highlights.map((highlight, index) => {
              const Icon = highlight.icon;
              return (
                <div key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Icon className="h-5 w-5 text-primary" />
                  <span>{highlight.text}</span>
                </div>
              );
            })}
          </div>

          {/* CTAs */}
          <div className="flex gap-4 justify-center">
            <Button 
              size="lg" 
              onClick={() => navigate("/auth")} 
              className="btn-cta gap-2 shadow-lg hover:shadow-xl transition-all"
            >
              Começar agora
              <ArrowRight className="h-5 w-5" />
            </Button>
            <Button size="lg" variant="outline">
              Ver como funciona
            </Button>
          </div>
        </section>

        <section className="py-20">
          <h2 className="text-3xl font-bold text-center mb-4">
            Gestão preventiva de contratos
          </h2>
          <p className="text-center text-muted-foreground mb-12 max-w-xl mx-auto">
            Feito para gestores que querem controle sem complicação
          </p>
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

        {/* Social Proof / Value Proposition */}
        <section className="py-16 text-center">
          <div className="max-w-3xl mx-auto bg-card/50 border border-border rounded-2xl p-8">
            <Clock className="h-12 w-12 text-primary mx-auto mb-4" />
            <h3 className="text-2xl font-semibold mb-3">
              O sistema que avisa antes do problema acontecer
            </h3>
            <p className="text-muted-foreground">
              Não perca mais prazos, dinheiro ou controle. Com LexFlow, você sabe exatamente 
              o que precisa de atenção e quando agir.
            </p>
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
