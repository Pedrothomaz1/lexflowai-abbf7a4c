import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Upload, UserPlus, Rocket } from "lucide-react";
import { Link } from "react-router-dom";

export function EmptyOnboardingState() {
  return (
    <Card className="p-12 text-center bg-gradient-to-br from-primary/5 to-transparent border-primary/20">
      <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-5">
        <Rocket className="h-7 w-7 text-primary" />
      </div>
      <h2 className="text-xl font-semibold tracking-tight">Bem-vindo ao LexFlow</h2>
      <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
        Seu painel ficará vivo assim que você começar a operar contratos. Comece por aqui:
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl mx-auto mt-8">
        <Button variant="outline" className="h-auto py-4 flex-col gap-2" asChild>
          <Link to="/contratos?novo=true">
            <FileText className="h-5 w-5" />
            <span className="text-sm font-medium">Criar primeiro contrato</span>
          </Link>
        </Button>
        <Button variant="outline" className="h-auto py-4 flex-col gap-2" asChild>
          <Link to="/contratos?importar=true">
            <Upload className="h-5 w-5" />
            <span className="text-sm font-medium">Importar planilha</span>
          </Link>
        </Button>
        <Button variant="outline" className="h-auto py-4 flex-col gap-2" asChild>
          <Link to="/organization-members">
            <UserPlus className="h-5 w-5" />
            <span className="text-sm font-medium">Convidar equipe</span>
          </Link>
        </Button>
      </div>
    </Card>
  );
}
