import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Calendar,
  CheckCircle2,
  Circle,
  Clock,
  CalendarDays,
  CalendarRange,
  CalendarClock,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AuditTask {
  id: string;
  name: string;
  description: string;
  completed?: boolean;
}

interface AuditPeriod {
  period: "daily" | "weekly" | "monthly" | "quarterly" | "annually";
  title: string;
  icon: React.ReactNode;
  color: string;
  tasks: AuditTask[];
}

const auditSchedule: AuditPeriod[] = [
  {
    period: "daily",
    title: "Diário",
    icon: <Clock className="h-4 w-4" />,
    color: "text-blue-500",
    tasks: [
      {
        id: "d1",
        name: "Revisar alertas críticos",
        description: "Verificar todos os alertas de segurança críticos abertos",
      },
      {
        id: "d2",
        name: "Verificar métricas de saúde",
        description: "Checar dashboard de métricas do sistema",
      },
    ],
  },
  {
    period: "weekly",
    title: "Semanal",
    icon: <CalendarDays className="h-4 w-4" />,
    color: "text-green-500",
    tasks: [
      {
        id: "w1",
        name: "Revisar permissões de usuários",
        description: "Verificar adições/remoções de permissões da semana",
      },
      {
        id: "w2",
        name: "Analisar tendências de segurança",
        description: "Identificar padrões nos logs de auditoria",
      },
    ],
  },
  {
    period: "monthly",
    title: "Mensal",
    icon: <Calendar className="h-4 w-4" />,
    color: "text-purple-500",
    tasks: [
      {
        id: "m1",
        name: "Revisão completa de audit logs",
        description: "Análise amostral dos logs do mês",
      },
      {
        id: "m2",
        name: "Atualizar rate limits",
        description: "Ajustar limites conforme uso observado",
      },
      {
        id: "m3",
        name: "Revisar regras de anomalia",
        description: "Atualizar thresholds de detecção",
      },
    ],
  },
  {
    period: "quarterly",
    title: "Trimestral",
    icon: <CalendarRange className="h-4 w-4" />,
    color: "text-orange-500",
    tasks: [
      {
        id: "q1",
        name: "Penetration testing",
        description: "Executar testes de invasão externos",
      },
      {
        id: "q2",
        name: "Revisão de direitos de acesso",
        description: "Auditar permissões de todos os usuários",
      },
      {
        id: "q3",
        name: "Atualização de políticas",
        description: "Revisar e atualizar políticas de segurança",
      },
      {
        id: "q4",
        name: "Refresh de treinamento",
        description: "Atualizar equipe sobre novas ameaças",
      },
    ],
  },
  {
    period: "annually",
    title: "Anual",
    icon: <CalendarClock className="h-4 w-4" />,
    color: "text-red-500",
    tasks: [
      {
        id: "a1",
        name: "Avaliação completa de segurança",
        description: "Assessment abrangente de toda infraestrutura",
      },
      {
        id: "a2",
        name: "Auditoria de compliance (LGPD)",
        description: "Verificação de conformidade regulatória",
      },
      {
        id: "a3",
        name: "Teste de disaster recovery",
        description: "Simular recuperação de desastres",
      },
      {
        id: "a4",
        name: "Planejamento de roadmap",
        description: "Definir roadmap de segurança do próximo ano",
      },
    ],
  },
];

export function AuditSchedule() {
  const [completedTasks, setCompletedTasks] = useState<Set<string>>(new Set());

  const toggleTask = (taskId: string) => {
    setCompletedTasks((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  };

  const getCompletionForPeriod = (tasks: AuditTask[]) => {
    const completed = tasks.filter((t) => completedTasks.has(t.id)).length;
    return { completed, total: tasks.length };
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-muted-foreground" />
          <h3 className="text-lg font-semibold">Cronograma de Auditorias</h3>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCompletedTasks(new Set())}
        >
          Resetar Checklist
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {auditSchedule.map((period) => {
          const { completed, total } = getCompletionForPeriod(period.tasks);
          const isComplete = completed === total;

          return (
            <Card
              key={period.period}
              className={cn(
                "transition-all",
                isComplete && "border-green-500/50 bg-green-500/5"
              )}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={period.color}>{period.icon}</span>
                    <CardTitle className="text-base">{period.title}</CardTitle>
                  </div>
                  <Badge
                    variant={isComplete ? "default" : "secondary"}
                    className={cn(isComplete && "bg-green-500")}
                  >
                    {completed}/{total}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {period.tasks.map((task) => {
                    const isCompleted = completedTasks.has(task.id);
                    return (
                      <div
                        key={task.id}
                        className={cn(
                          "flex items-start gap-3 p-2 rounded-lg transition-colors cursor-pointer hover:bg-muted/50",
                          isCompleted && "bg-green-500/10"
                        )}
                        onClick={() => toggleTask(task.id)}
                      >
                        <Checkbox
                          checked={isCompleted}
                          onCheckedChange={() => toggleTask(task.id)}
                          className="mt-0.5"
                        />
                        <div className="space-y-0.5 flex-1">
                          <p
                            className={cn(
                              "text-sm font-medium",
                              isCompleted && "line-through text-muted-foreground"
                            )}
                          >
                            {task.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {task.description}
                          </p>
                        </div>
                        {isCompleted && (
                          <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Summary Card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Resumo de Compliance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-5">
            {auditSchedule.map((period) => {
              const { completed, total } = getCompletionForPeriod(period.tasks);
              const percentage = Math.round((completed / total) * 100);
              return (
                <div key={period.period} className="text-center">
                  <div
                    className={cn(
                      "text-2xl font-bold",
                      percentage === 100 ? "text-green-500" : period.color
                    )}
                  >
                    {percentage}%
                  </div>
                  <p className="text-xs text-muted-foreground">{period.title}</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
