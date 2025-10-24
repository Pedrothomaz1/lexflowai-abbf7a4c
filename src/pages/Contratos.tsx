import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

const Contratos = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Contratos</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie todos os seus contratos
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Novo Contrato
        </Button>
      </div>

      <Card className="card-elevated">
        <CardHeader>
          <CardTitle>Lista de Contratos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            Nenhum contrato cadastrado
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Contratos;
