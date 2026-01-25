import { useNavigate } from "react-router-dom";
import { useModulo } from "@/contexts/ModuloContext";
import { Button } from "@/components/ui/button";
import { AnimatedCard, AnimatedCardContent } from "@/components/ui/animated-card";
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/ui/motion-container";
import { FileText, Wrench, ArrowRight } from "lucide-react";
import logoVeridiana from "@/assets/logo-veridiana.png";

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
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <FadeIn>
        <div className="max-w-3xl w-full space-y-8">
          {/* Header */}
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-3 mb-6">
              <div className="h-14 w-14 rounded-xl bg-primary flex items-center justify-center">
                <img src={logoVeridiana} alt="Veridiana" className="h-8 w-8 object-contain" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-foreground">
              Bem-vindo ao LexFlow
            </h1>
            <p className="text-muted-foreground text-lg">
              Selecione o módulo que deseja acessar
            </p>
          </div>

          {/* Module Cards */}
          <StaggerContainer className="grid gap-6 md:grid-cols-2">
            <StaggerItem>
              <AnimatedCard 
                className="cursor-pointer border-2 hover:border-primary transition-colors"
                onClick={() => handleSelectModulo("contratos")}
              >
                <AnimatedCardContent className="p-8 text-center space-y-4">
                  <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                    <FileText className="h-8 w-8 text-primary" />
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-xl font-semibold">Contratos</h2>
                    <p className="text-sm text-muted-foreground">
                      Gestão de contratos com fornecedores, terceiros e locações. 
                      Inclui alertas, análise de riscos e workflows de aprovação.
                    </p>
                  </div>
                  <Button className="w-full mt-4">
                    Acessar Contratos
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </AnimatedCardContent>
              </AnimatedCard>
            </StaggerItem>

            <StaggerItem>
              <AnimatedCard 
                className="cursor-pointer border-2 hover:border-primary transition-colors"
                onClick={() => handleSelectModulo("servicos")}
              >
                <AnimatedCardContent className="p-8 text-center space-y-4">
                  <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                    <Wrench className="h-8 w-8 text-primary" />
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-xl font-semibold">Serviços</h2>
                    <p className="text-sm text-muted-foreground">
                      Controle de serviços periódicos, manutenções e renovações. 
                      Integração com sistema de compras e alertas automáticos.
                    </p>
                  </div>
                  <Button className="w-full mt-4">
                    Acessar Serviços
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </AnimatedCardContent>
              </AnimatedCard>
            </StaggerItem>
          </StaggerContainer>

          {/* Footer */}
          <p className="text-center text-sm text-muted-foreground">
            Você pode alternar entre os módulos a qualquer momento pelo menu superior.
          </p>
        </div>
      </FadeIn>
    </div>
  );
};

export default SeletorModulo;
