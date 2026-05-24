import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import {
  Lock,
  Eye,
  Download,
  Trash2,
  EyeOff,
  CheckCircle2,
  FileSearch,
  AlertTriangle,
} from "lucide-react";

interface DataSubjectRightsGridProps {
  isErasureDialogOpen: boolean;
  onErasureDialogChange: (open: boolean) => void;
  erasureLoading: boolean;
  onErasure: () => void;
  onAccessData: () => void;
  onExportData: () => void;
}

export function DataSubjectRightsGrid({
  isErasureDialogOpen,
  onErasureDialogChange,
  erasureLoading,
  onErasure,
  onAccessData,
  onExportData,
}: DataSubjectRightsGridProps) {
  return (
    <div className="space-y-4">
      <Alert>
        <Lock className="h-4 w-4" />
        <AlertTitle>Direitos dos Titulares de Dados</AlertTitle>
        <AlertDescription>
          Gerencie solicitações de acesso, portabilidade e exclusão de dados pessoais conforme LGPD.
        </AlertDescription>
      </Alert>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card
          className="card-elevated cursor-pointer hover:border-primary/50 transition-colors"
          onClick={onAccessData}
        >
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <Eye className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-medium">Direito de Acesso</h3>
                <p className="text-xs text-muted-foreground">Solicitar cópia dos dados</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          className="card-elevated cursor-pointer hover:border-primary/50 transition-colors"
          onClick={onExportData}
        >
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-amber-500/10">
                <Download className="h-6 w-6 text-amber-500" />
              </div>
              <div>
                <h3 className="font-medium">Portabilidade</h3>
                <p className="text-xs text-muted-foreground">Exportar dados em formato aberto</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Dialog open={isErasureDialogOpen} onOpenChange={onErasureDialogChange}>
          <DialogTrigger asChild>
            <Card className="card-elevated cursor-pointer hover:border-destructive/50 transition-colors">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-destructive/10">
                    <Trash2 className="h-6 w-6 text-destructive" />
                  </div>
                  <div>
                    <h3 className="font-medium">Direito de Exclusão</h3>
                    <p className="text-xs text-muted-foreground">Solicitar remoção de dados</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Solicitar Exclusão de Dados
              </DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Atenção: Ação Irreversível</AlertTitle>
                <AlertDescription>
                  Conforme LGPD Art. 18, ao solicitar a exclusão seus dados pessoais serão anonimizados.
                  Esta ação não pode ser desfeita.
                </AlertDescription>
              </Alert>
              <div className="text-sm text-muted-foreground space-y-2">
                <p><strong>Dados que serão anonimizados:</strong></p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Nome completo</li>
                  <li>E-mail</li>
                  <li>Telefone</li>
                  <li>Foto de perfil</li>
                </ul>
                <p className="mt-2"><strong>Dados mantidos para compliance:</strong></p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Registros de auditoria (marcados como anonimizados)</li>
                  <li>Contratos (por obrigação legal)</li>
                </ul>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => onErasureDialogChange(false)}>Cancelar</Button>
              <Button variant="destructive" disabled={erasureLoading} onClick={onErasure}>
                {erasureLoading ? "Processando..." : "Confirmar Exclusão"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Card className="card-elevated cursor-pointer hover:border-primary/50 transition-colors">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-purple-500/10">
                <EyeOff className="h-6 w-6 text-purple-500" />
              </div>
              <div>
                <h3 className="font-medium">Anonimização</h3>
                <p className="text-xs text-muted-foreground">Remover identificação pessoal</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-elevated cursor-pointer hover:border-primary/50 transition-colors">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-green-500/10">
                <CheckCircle2 className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <h3 className="font-medium">Consentimento</h3>
                <p className="text-xs text-muted-foreground">Gerenciar autorizações</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-elevated cursor-pointer hover:border-primary/50 transition-colors">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-blue-500/10">
                <FileSearch className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <h3 className="font-medium">Correção de Dados</h3>
                <p className="text-xs text-muted-foreground">Atualizar informações incorretas</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
