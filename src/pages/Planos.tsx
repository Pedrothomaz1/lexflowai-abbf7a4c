import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Scale, Check, ArrowRight, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { LeadDialog } from "@/components/Planos/LeadDialog";

interface PricingRow {
  plano: string;
  nome_exibicao: string;
  preco_mensal_centavos: number;
  ativo: boolean;
}

const PLAN_ORDER = ["free", "pro", "business", "enterprise"];

const PLAN_FEATURES: Record<string, { tagline: string; usuarios: string; features: string[]; highlight?: boolean; ctaLabel?: string }> = {
  free: {
    tagline: "Para começar e provar valor.",
    usuarios: "1 usuário",
    features: [
      "Até 10 contratos ativos",
      "Alertas de vencimento por e-mail",
      "Dashboard executivo básico",
      "Suporte por e-mail",
    ],
    ctaLabel: "Quero começar",
  },
  pro: {
    tagline: "Para times que decidem com agilidade.",
    usuarios: "Até 5 usuários",
    features: [
      "Contratos ilimitados",
      "Alertas multi-canal (e-mail + in-app)",
      "Análise de risco com IA",
      "Workflows de aprovação",
      "Suporte prioritário",
    ],
    highlight: true,
    ctaLabel: "Quero contratar",
  },
  business: {
    tagline: "Para operações com múltiplas áreas.",
    usuarios: "Até 30 usuários",
    features: [
      "Tudo do Pro",
      "Gestão de franquias e unidades",
      "Portal externo para fornecedores",
      "Assinatura eletrônica integrada",
      "Auditoria e LGPD completos",
    ],
    ctaLabel: "Quero contratar",
  },
  enterprise: {
    tagline: "Sob medida para grandes operações.",
    usuarios: "Usuários ilimitados",
    features: [
      "Tudo do Business",
      "SLA dedicado",
      "Integrações sob demanda",
      "Onboarding assistido",
      "Gerente de sucesso dedicado",
    ],
    ctaLabel: "Falar com vendas",
  },
};

function formatBRL(centavos: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
  }).format(centavos / 100);
}

export default function Planos() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<PricingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<{ plano: string; label: string } | undefined>();

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("plan_pricing")
        .select("plano, nome_exibicao, preco_mensal_centavos, ativo")
        .eq("ativo", true);
      const ordered = ((data as PricingRow[]) || [])
        .filter((r) => PLAN_ORDER.includes(r.plano))
        .sort((a, b) => PLAN_ORDER.indexOf(a.plano) - PLAN_ORDER.indexOf(b.plano));
      setRows(ordered);
      setLoading(false);
    })();
  }, []);

  const cheapestPaid = useMemo(() => {
    const paid = rows.filter((r) => r.preco_mensal_centavos > 0);
    return paid[0];
  }, [rows]);

  const openLead = (plano?: string, label?: string) => {
    setSelectedPlan(plano ? { plano, label: label || plano } : undefined);
    setDialogOpen(true);
  };

  const jsonLd = rows.map((r) => ({
    "@context": "https://schema.org",
    "@type": "Product",
    name: `LexFlow ${r.nome_exibicao}`,
    description: PLAN_FEATURES[r.plano]?.tagline,
    brand: { "@type": "Brand", name: "LexFlow" },
    offers: {
      "@type": "Offer",
      price: (r.preco_mensal_centavos / 100).toFixed(2),
      priceCurrency: "BRL",
      availability: "https://schema.org/InStock",
      url: "https://www.lexflowai.com.br/planos",
    },
  }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-background">
      <Helmet>
        <title>Planos e preços | LexFlow</title>
        <meta
          name="description"
          content={
            cheapestPaid
              ? `Gestão preventiva de contratos a partir de ${formatBRL(cheapestPaid.preco_mensal_centavos)}/mês. Comece grátis e evolua quando o time crescer.`
              : "Gestão preventiva de contratos para times que decidem com agilidade. Comece grátis."
          }
        />
        <link rel="canonical" href="/planos" />
        <meta property="og:title" content="Planos e preços | LexFlow" />
        <meta property="og:url" content="/planos" />
        {jsonLd.map((j, i) => (
          <script key={i} type="application/ld+json">
            {JSON.stringify(j)}
          </script>
        ))}
      </Helmet>

      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center">
              <Scale className="h-6 w-6 text-primary-foreground" />
            </div>
            <span className="text-2xl font-bold">LexFlow</span>
          </Link>
          <Button onClick={() => navigate("/auth")} variant="default">
            Entrar
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-6 py-16">
        <section className="text-center max-w-3xl mx-auto mb-14">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary-glow">
            Planos pensados para quem decide
          </h1>
          <p className="text-lg text-muted-foreground">
            Comece grátis. Evolua quando o time crescer. Sem letras miúdas.
          </p>
        </section>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {rows.map((r) => {
              const meta = PLAN_FEATURES[r.plano];
              if (!meta) return null;
              const isEnterprise = r.plano === "enterprise";
              const priceLabel = isEnterprise
                ? "Sob medida"
                : r.preco_mensal_centavos === 0
                  ? "Grátis"
                  : formatBRL(r.preco_mensal_centavos);

              return (
                <Card
                  key={r.plano}
                  className={`relative p-6 flex flex-col transition-smooth ${
                    meta.highlight ? "border-primary border-2 shadow-lg scale-[1.02]" : "hover:-translate-y-1 hover:shadow-md"
                  }`}
                >
                  {meta.highlight && (
                    <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground">
                      Mais escolhido
                    </Badge>
                  )}
                  <div className="mb-4">
                    <h3 className="text-xl font-semibold">{r.nome_exibicao}</h3>
                    <p className="text-sm text-muted-foreground mt-1 min-h-[40px]">{meta.tagline}</p>
                  </div>
                  <div className="mb-4">
                    <div className="text-3xl font-bold">{priceLabel}</div>
                    {!isEnterprise && r.preco_mensal_centavos > 0 && (
                      <div className="text-xs text-muted-foreground">/mês · {meta.usuarios}</div>
                    )}
                    {!isEnterprise && r.preco_mensal_centavos === 0 && (
                      <div className="text-xs text-muted-foreground">{meta.usuarios}</div>
                    )}
                    {isEnterprise && (
                      <div className="text-xs text-muted-foreground">{meta.usuarios}</div>
                    )}
                  </div>
                  <ul className="space-y-2 mb-6 flex-1">
                    {meta.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    variant={meta.highlight ? "default" : "outline"}
                    className="w-full"
                    onClick={() => openLead(r.plano, r.nome_exibicao)}
                  >
                    {meta.ctaLabel}
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </Card>
              );
            })}
          </section>
        )}

        <section className="max-w-3xl mx-auto mt-20 text-center bg-card/50 border border-border rounded-2xl p-8">
          <h2 className="text-2xl font-semibold mb-3">Ainda em dúvida sobre o plano ideal?</h2>
          <p className="text-muted-foreground mb-6">
            Conte seu cenário e a gente sugere o melhor encaixe — sem compromisso.
          </p>
          <Button size="lg" onClick={() => openLead()}>
            Falar com o time
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </section>

        <section className="max-w-3xl mx-auto mt-16 space-y-6">
          <h2 className="text-2xl font-semibold text-center mb-6">Perguntas frequentes</h2>
          {[
            {
              q: "Posso começar grátis?",
              a: "Sim. O plano Free libera o essencial para você cadastrar contratos e receber alertas de vencimento, sem cartão.",
            },
            {
              q: "Como funciona o pagamento?",
              a: "Hoje a contratação dos planos pagos é feita por contato direto. Após o pagamento, liberamos sua organização em horas.",
            },
            {
              q: "Posso trocar de plano depois?",
              a: "Sim, a qualquer momento. Os dados ficam preservados e o limite de usuários se ajusta automaticamente.",
            },
            {
              q: "Meus dados ficam seguros?",
              a: "Sim. Multi-tenant com isolamento estrito, criptografia em repouso, conformidade com LGPD e auditoria completa.",
            },
          ].map((f) => (
            <div key={f.q} className="border-b border-border pb-4">
              <h3 className="font-semibold mb-1">{f.q}</h3>
              <p className="text-sm text-muted-foreground">{f.a}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="border-t border-border py-8 mt-16">
        <div className="container mx-auto px-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">© 2026 LexFlow. Todos os direitos reservados.</p>
          <div className="flex gap-4">
            <Link to="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Início</Link>
            <Link to="/privacidade" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Política de Privacidade
            </Link>
          </div>
        </div>
      </footer>

      <LeadDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        planoInteresse={selectedPlan?.plano}
        planoLabel={selectedPlan?.label}
      />
    </div>
  );
}
