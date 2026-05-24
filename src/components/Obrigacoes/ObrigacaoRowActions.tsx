import { useState } from "react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Upload, RefreshCw, TrendingUp, Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { EvidenciaUploadDialog } from "./EvidenciaUploadDialog";
import { IniciarRenovacaoDialog } from "./IniciarRenovacaoDialog";
import { RegistrarReajusteDialog } from "./RegistrarReajusteDialog";

interface Props {
  obrigacaoId: string;
  obrigacaoTitulo: string;
  contratoId: string | null;
  contratoTitulo?: string;
  onRefresh?: () => void;
}

export function ObrigacaoRowActions({ obrigacaoId, obrigacaoTitulo, contratoId, contratoTitulo, onRefresh }: Props) {
  const navigate = useNavigate();
  const [evidOpen, setEvidOpen] = useState(false);
  const [renOpen, setRenOpen] = useState(false);
  const [reaOpen, setReaOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem onClick={() => setEvidOpen(true)}>
            <Upload className="h-4 w-4 mr-2" /> Anexar evidência
          </DropdownMenuItem>
          {contratoId && (
            <>
              <DropdownMenuItem onClick={() => setRenOpen(true)}>
                <RefreshCw className="h-4 w-4 mr-2" /> Iniciar renovação
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setReaOpen(true)}>
                <TrendingUp className="h-4 w-4 mr-2" /> Registrar reajuste
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate(`/contratos/${contratoId}`)}>
                <Eye className="h-4 w-4 mr-2" /> Abrir contrato
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <EvidenciaUploadDialog
        open={evidOpen}
        onOpenChange={setEvidOpen}
        obrigacaoId={obrigacaoId}
        obrigacaoTitulo={obrigacaoTitulo}
        onSuccess={onRefresh}
      />
      {contratoId && (
        <>
          <IniciarRenovacaoDialog
            open={renOpen}
            onOpenChange={setRenOpen}
            contratoId={contratoId}
            contratoTitulo={contratoTitulo ?? obrigacaoTitulo}
            onSuccess={onRefresh}
          />
          <RegistrarReajusteDialog
            open={reaOpen}
            onOpenChange={setReaOpen}
            contratoId={contratoId}
            contratoTitulo={contratoTitulo ?? obrigacaoTitulo}
            onSuccess={onRefresh}
          />
        </>
      )}
    </>
  );
}
