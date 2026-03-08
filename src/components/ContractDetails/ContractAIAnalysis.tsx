import { Badge } from "@/components/ui/badge";
import {
  AnimatedCard,
  AnimatedCardContent,
  AnimatedCardHeader,
} from "@/components/ui/animated-card";
import { Brain, AlertTriangle, FileText, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";

interface AnaliseData {
  analisado_em: string;
  score_risco?: number | null;
  riscos_identificados?: Array<{ tipo: string; descricao: string; gravidade: string }>;
  clausulas_importantes?: Array<{ titulo: string; descricao: string; atencao?: string }>;
  sugestoes_melhoria?: string[];
}

interface ContractAIAnalysisProps {
  analise: AnaliseData;
}

export function ContractAIAnalysis({ analise }: ContractAIAnalysisProps) {
  return (
    <AnimatedCard className="border-primary/20">
      <AnimatedCardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            <div>
              <h3 className="text-lg font-semibold">Análise com IA</h3>
              <p className="text-xs text-muted-foreground">
                {new Date(analise.analisado_em).toLocaleString("pt-BR")}
              </p>
            </div>
          </div>
          {analise.score_risco !== null && analise.score_risco !== undefined && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <Badge
                variant={
                  analise.score_risco >= 7 ? "destructive" : analise.score_risco >= 4 ? "outline" : "default"
                }
                className="text-base px-4 py-1.5"
              >
                Score: {Number(analise.score_risco).toFixed(1)}/10
              </Badge>
            </motion.div>
          )}
        </div>
      </AnimatedCardHeader>
      <AnimatedCardContent className="space-y-6">
        {analise.riscos_identificados && analise.riscos_identificados.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              Riscos Identificados
            </h4>
            <div className="space-y-2">
              {analise.riscos_identificados.map((risco, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="p-3 rounded-lg border border-destructive/20 bg-destructive/5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{risco.tipo}</p>
                      <p className="text-sm text-muted-foreground mt-1">{risco.descricao}</p>
                    </div>
                    <Badge variant="destructive" className="shrink-0">{risco.gravidade}</Badge>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {analise.clausulas_importantes && analise.clausulas_importantes.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              Cláusulas Importantes
            </h4>
            <div className="space-y-2">
              {analise.clausulas_importantes.map((clausula, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="p-3 rounded-lg border bg-muted/30"
                >
                  <p className="font-medium text-sm">{clausula.titulo}</p>
                  <p className="text-sm text-muted-foreground mt-1">{clausula.descricao}</p>
                  {clausula.atencao && (
                    <p className="text-sm text-warning mt-2 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      {clausula.atencao}
                    </p>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {analise.sugestoes_melhoria && analise.sugestoes_melhoria.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-success" />
              Sugestões de Melhoria
            </h4>
            <ul className="space-y-2">
              {analise.sugestoes_melhoria.map((sugestao, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.1 }}
                  className="text-sm text-muted-foreground flex items-start gap-2"
                >
                  <CheckCircle2 className="h-4 w-4 text-success mt-0.5 shrink-0" />
                  <span>{sugestao}</span>
                </motion.li>
              ))}
            </ul>
          </div>
        )}
      </AnimatedCardContent>
    </AnimatedCard>
  );
}
