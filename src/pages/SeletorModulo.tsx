import { useNavigate } from "react-router-dom";
import { useModulo } from "@/contexts/ModuloContext";
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/ui/motion-container";
import { FileText, Wrench, ArrowRight, HelpCircle } from "lucide-react";
import logoLexFlowIcon from "@/assets/logo-lexflow-icon.png";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const SeletorModulo = () => {
  const navigate = useNavigate();
  const { setModuloAtivo } = useModulo();

  const handleSelectModulo = (modulo: "contratos" | "servicos") => {
    setModuloAtivo(modulo);
    if (modulo === "contratos") {
      navigate("/dashboard");
    } else {
      navigate("/servicos");
    }
  };

  const modules = [
    {
      id: "contratos" as const,
      title: "Módulo Jurídico: Contratos",
      description: "Gestão completa de minutas, assinaturas e vigências. Controle de workflows, análise de riscos e alertas automatizados.",
      tooltip: "Gerencie contratos com fornecedores, aprovações, riscos jurídicos e conformidade. Ideal para equipes jurídicas e de compliance.",
      icon: FileText,
      accentColor: "lexflow-verde-principal",
      ctaText: "Acessar Contratos",
    },
    {
      id: "servicos" as const,
      title: "Módulo Operacional: Serviços",
      description: "Controle de manutenções periódicas e conformidade operacional. Integração com sistema de compras e alertas automáticos.",
      tooltip: "Acompanhe serviços periódicos, manutenções preventivas e renovações. Ideal para equipes de facilities e operações.",
      icon: Wrench,
      accentColor: "lexflow-mostarda",
      ctaText: "Acessar Serviços",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[hsl(var(--lexflow-verde-escuro))]">
      <FadeIn>
        <div className="max-w-4xl w-full space-y-10">
          {/* Header */}
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center mb-8">
              <div className="h-16 w-16 rounded-2xl bg-[hsl(var(--lexflow-off-white)/0.1)] flex items-center justify-center backdrop-blur-sm border border-[hsl(var(--lexflow-off-white)/0.1)]">
                <img src={logoLexFlowIcon} alt="LexFlow" className="h-10 w-10 object-contain" />
              </div>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-[hsl(var(--lexflow-off-white))] tracking-tight">
              Controle Integrado de Contratos e Manutenções
            </h1>
            <p className="text-lg text-[hsl(var(--lexflow-verde-claro))] max-w-2xl mx-auto leading-relaxed">
              Centralize a governança jurídica e operacional em um fluxo único, automatizado e livre de riscos.
            </p>
          </div>

          {/* Module Cards */}
          <StaggerContainer className="grid gap-6 md:grid-cols-2">
            {modules.map((module) => {
              const Icon = module.icon;
              const isContratos = module.id === "contratos";
              
              return (
                <StaggerItem key={module.id}>
                  <button
                    onClick={() => handleSelectModulo(module.id)}
                    className={cn(
                      "w-full text-left rounded-2xl p-8 transition-all duration-300",
                      "bg-[hsl(var(--lexflow-off-white))] hover:bg-white",
                      isContratos 
                        ? "border-2 border-transparent hover:border-[hsl(var(--lexflow-verde-principal))]"
                        : "border-2 border-transparent hover:border-[hsl(var(--lexflow-mostarda))]",
                      "hover:shadow-[0_20px_40px_-10px_rgba(56,78,70,0.25)]",
                      "hover:scale-[1.02] focus-visible:scale-[1.02]",
                      isContratos
                        ? "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--lexflow-verde-principal))] focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--lexflow-verde-escuro))]"
                        : "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--lexflow-mostarda))] focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--lexflow-verde-escuro))]",
                      "group cursor-pointer"
                    )}
                  >
                    <div className="space-y-5">
                      <div className={cn(
                        "h-14 w-14 rounded-xl flex items-center justify-center transition-colors",
                        isContratos 
                          ? "bg-[hsl(var(--lexflow-verde-principal)/0.15)] group-hover:bg-[hsl(var(--lexflow-verde-principal)/0.2)]"
                          : "bg-[hsl(var(--lexflow-mostarda)/0.15)] group-hover:bg-[hsl(var(--lexflow-mostarda)/0.2)]"
                      )}>
                        <Icon className={cn(
                          "h-7 w-7",
                          isContratos 
                            ? "text-[hsl(var(--lexflow-verde-principal))]"
                            : "text-[hsl(var(--lexflow-mostarda))]"
                        )} />
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <h2 className="text-xl font-semibold text-[hsl(var(--lexflow-verde-escuro))]">
                            {module.title}
                          </h2>
                          <Tooltip delayDuration={200}>
                            <TooltipTrigger asChild>
                              <button 
                                type="button" 
                                className="text-muted-foreground/70 hover:text-muted-foreground transition-colors"
                                onClick={(e) => e.stopPropagation()}
                                aria-label="Mais informações"
                              >
                                <HelpCircle className="h-4 w-4" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent 
                              side="top" 
                              className="max-w-[280px] text-sm"
                              sideOffset={8}
                            >
                              <p>{module.tooltip}</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <p className={cn(
                          "text-sm leading-relaxed",
                          isContratos 
                            ? "text-[hsl(var(--lexflow-verde-principal))]"
                            : "text-[hsl(var(--lexflow-mostarda))]"
                        )}>
                          {module.description}
                        </p>
                      </div>
                      <div className={cn(
                        "flex items-center gap-2 font-medium text-sm group-hover:gap-3 transition-all",
                        isContratos 
                          ? "text-[hsl(var(--lexflow-verde-principal))]"
                          : "text-[hsl(var(--lexflow-mostarda))]"
                      )}>
                        <span>{module.ctaText}</span>
                        <ArrowRight className="h-4 w-4" />
                      </div>
                    </div>
                  </button>
                </StaggerItem>
              );
            })}
          </StaggerContainer>

          {/* Footer */}
          <div className="text-center pt-6">
            <p className="text-sm text-[hsl(var(--lexflow-verde-claro)/0.5)]">
              © {new Date().getFullYear()} LexFlowAI • LexFlow v1.1.0
            </p>
          </div>
        </div>
      </FadeIn>
    </div>
  );
};

export default SeletorModulo;
