import { useNavigate } from "react-router-dom";
import { useModulo } from "@/contexts/ModuloContext";
import { Button } from "@/components/ui/button";
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/ui/motion-container";
import { FileText, Wrench, ArrowRight } from "lucide-react";
import logoVeridiana from "@/assets/logo-veridiana.png";
import { cn } from "@/lib/utils";

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

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[hsl(var(--lexflow-verde-escuro))]">
      <FadeIn>
        <div className="max-w-4xl w-full space-y-10">
          {/* Header */}
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center mb-8">
              <div className="h-16 w-16 rounded-2xl bg-[hsl(var(--lexflow-off-white)/0.1)] flex items-center justify-center backdrop-blur-sm border border-[hsl(var(--lexflow-off-white)/0.1)]">
                <img src={logoVeridiana} alt="Veridiana" className="h-10 w-10 object-contain" />
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
            {/* Card Contratos */}
            <StaggerItem>
              <button
                onClick={() => handleSelectModulo("contratos")}
                className={cn(
                  "w-full text-left rounded-2xl p-8 transition-all duration-300",
                  "bg-[hsl(var(--lexflow-off-white))] hover:bg-white",
                  "border-2 border-transparent hover:border-[hsl(var(--lexflow-verde-principal))]",
                  "hover:shadow-[0_20px_40px_-10px_rgba(56,78,70,0.25)]",
                  "hover:scale-[1.02] focus-visible:scale-[1.02]",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--lexflow-verde-principal))] focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--lexflow-verde-escuro))]",
                  "group cursor-pointer"
                )}
              >
                <div className="space-y-5">
                  <div className="h-14 w-14 rounded-xl bg-[hsl(var(--lexflow-verde-principal)/0.15)] flex items-center justify-center group-hover:bg-[hsl(var(--lexflow-verde-principal)/0.2)] transition-colors">
                    <FileText className="h-7 w-7 text-[hsl(var(--lexflow-verde-principal))]" />
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-xl font-semibold text-[hsl(var(--lexflow-verde-escuro))]">
                      Módulo Jurídico: Contratos
                    </h2>
                    <p className="text-sm text-[hsl(var(--lexflow-verde-principal))] leading-relaxed">
                      Gestão completa de minutas, assinaturas e vigências. Controle de workflows, análise de riscos e alertas automatizados.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-[hsl(var(--lexflow-verde-principal))] font-medium text-sm group-hover:gap-3 transition-all">
                    <span>Acessar Contratos</span>
                    <ArrowRight className="h-4 w-4" />
                  </div>
                </div>
              </button>
            </StaggerItem>

            {/* Card Serviços */}
            <StaggerItem>
              <button
                onClick={() => handleSelectModulo("servicos")}
                className={cn(
                  "w-full text-left rounded-2xl p-8 transition-all duration-300",
                  "bg-[hsl(var(--lexflow-off-white))] hover:bg-white",
                  "border-2 border-transparent hover:border-[hsl(var(--lexflow-mostarda))]",
                  "hover:shadow-[0_20px_40px_-10px_rgba(56,78,70,0.25)]",
                  "hover:scale-[1.02] focus-visible:scale-[1.02]",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--lexflow-mostarda))] focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--lexflow-verde-escuro))]",
                  "group cursor-pointer"
                )}
              >
                <div className="space-y-5">
                  <div className="h-14 w-14 rounded-xl bg-[hsl(var(--lexflow-mostarda)/0.15)] flex items-center justify-center group-hover:bg-[hsl(var(--lexflow-mostarda)/0.2)] transition-colors">
                    <Wrench className="h-7 w-7 text-[hsl(var(--lexflow-mostarda))]" />
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-xl font-semibold text-[hsl(var(--lexflow-verde-escuro))]">
                      Módulo Operacional: Serviços
                    </h2>
                    <p className="text-sm text-[hsl(var(--lexflow-mostarda))] leading-relaxed">
                      Controle de manutenções periódicas e conformidade operacional. Integração com sistema de compras e alertas automáticos.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-[hsl(var(--lexflow-mostarda))] font-medium text-sm group-hover:gap-3 transition-all">
                    <span>Acessar Serviços</span>
                    <ArrowRight className="h-4 w-4" />
                  </div>
                </div>
              </button>
            </StaggerItem>
          </StaggerContainer>

          {/* Footer */}
          <div className="text-center pt-6">
            <p className="text-sm text-[hsl(var(--lexflow-verde-claro)/0.5)]">
              © {new Date().getFullYear()} Veridiana Quirino • LexFlow v1.1.0
            </p>
          </div>
        </div>
      </FadeIn>
    </div>
  );
};

export default SeletorModulo;
