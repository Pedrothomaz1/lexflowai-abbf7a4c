import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Loader2, Send, Mail, DollarSign, Building, FileText, CreditCard, X, Plus, Trash2, CalendarIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

const financeNotificationSchema = z.object({
  emailFinanceiro: z.string()
    .trim()
    .min(1, "Email é obrigatório")
    .email("Email inválido")
    .max(255, "Email muito longo"),
  emailsAdicionais: z.string()
    .max(500, "Limite de 500 caracteres")
    .optional(),
  observacoes: z.string()
    .max(1000, "Limite de 1000 caracteres")
    .optional(),
});

type FormData = z.infer<typeof financeNotificationSchema>;

interface ContratoData {
  id: string;
  numero_contrato: string;
  titulo: string;
  valor_total: number | null;
  data_inicio: string | null;
  data_fim: string | null;
  fornecedor?: {
    nome: string;
    cnpj: string | null;
    banco: string | null;
    agencia: string | null;
    conta: string | null;
    pix: string | null;
    titular_conta: string | null;
  } | null;
}

interface ServicoData {
  id: string;
  valor_estimado: number | null;
  data_validade: string;
  especificacao?: {
    nome: string;
  } | null;
  unidade?: {
    nome: string;
  } | null;
  fornecedor?: {
    nome: string;
    cnpj: string | null;
    banco: string | null;
    agencia: string | null;
    conta: string | null;
    pix: string | null;
    titular_conta: string | null;
  } | null;
}

interface Obrigacao {
  id: string;
  titulo: string;
  data_vencimento: string;
  valor: number | null;
  status: string | null;
}

interface ParcelaManual {
  id: string;
  titulo: string;
  data_vencimento: Date | null;
  valor: string;
}

interface FinanceNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  contratoId?: string;
  servicoId?: string;
  tipo: "contrato" | "servico";
}

export function FinanceNotificationModal({
  isOpen,
  onClose,
  contratoId,
  servicoId,
  tipo,
}: FinanceNotificationModalProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [contratoData, setContratoData] = useState<ContratoData | null>(null);
  const [servicoData, setServicoData] = useState<ServicoData | null>(null);
  const [obrigacoes, setObrigacoes] = useState<Obrigacao[]>([]);
  const [parcelasManuais, setParcelasManuais] = useState<ParcelaManual[]>([]);

  const form = useForm<FormData>({
    resolver: zodResolver(financeNotificationSchema),
    defaultValues: {
      emailFinanceiro: "",
      emailsAdicionais: "",
      observacoes: "",
    },
  });

  useEffect(() => {
    if (isOpen) {
      if (tipo === "contrato" && contratoId) {
        fetchContratoData();
      } else if (tipo === "servico" && servicoId) {
        fetchServicoData();
      }
      // Reset parcelas manuais when modal opens
      setParcelasManuais([]);
    }
  }, [isOpen, contratoId, servicoId, tipo]);

  const fetchContratoData = async () => {
    if (!contratoId) return;
    setIsLoading(true);

    try {
      // Fetch contrato with fornecedor
      const { data: contrato, error: contratoError } = await supabase
        .from("contratos")
        .select(`
          id,
          numero_contrato,
          titulo,
          valor_total,
          data_inicio,
          data_fim,
          fornecedor_id
        `)
        .eq("id", contratoId)
        .maybeSingle();

      if (contratoError) throw contratoError;

      if (contrato?.fornecedor_id) {
        const { data: fornecedor } = await supabase
          .from("fornecedores")
          .select("nome, cnpj, banco, agencia, conta, pix, titular_conta")
          .eq("id", contrato.fornecedor_id)
          .maybeSingle();

        setContratoData({
          ...contrato,
          fornecedor: fornecedor || null,
        });
      } else {
        setContratoData({ ...contrato, fornecedor: null });
      }

      // Fetch obrigacoes com valor
      const { data: obrigacoesData } = await supabase
        .from("contract_obligations")
        .select("id, titulo, data_vencimento, valor, status")
        .eq("contrato_id", contratoId)
        .not("valor", "is", null)
        .order("data_vencimento", { ascending: true });

      setObrigacoes(obrigacoesData || []);
    } catch (error: any) {
      console.error("Erro ao buscar dados do contrato:", error);
      toast({
        variant: "destructive",
        title: "Erro ao carregar dados",
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchServicoData = async () => {
    if (!servicoId) return;
    setIsLoading(true);

    try {
      const { data: servico, error } = await supabase
        .from("servicos_periodicos")
        .select(`
          id,
          valor_estimado,
          data_validade,
          especificacao_id,
          unidade_id,
          fornecedor_preferencial_id
        `)
        .eq("id", servicoId)
        .maybeSingle();

      if (error) throw error;

      let servicoEnriquecido: ServicoData = {
        ...servico,
        especificacao: null,
        unidade: null,
        fornecedor: null,
      };

      if (servico?.especificacao_id) {
        const { data: especificacao } = await supabase
          .from("especificacoes_servico")
          .select("nome")
          .eq("id", servico.especificacao_id)
          .maybeSingle();
        servicoEnriquecido.especificacao = especificacao;
      }

      if (servico?.unidade_id) {
        const { data: unidade } = await supabase
          .from("unidades")
          .select("nome")
          .eq("id", servico.unidade_id)
          .maybeSingle();
        servicoEnriquecido.unidade = unidade;
      }

      if (servico?.fornecedor_preferencial_id) {
        const { data: fornecedor } = await supabase
          .from("fornecedores")
          .select("nome, cnpj, banco, agencia, conta, pix, titular_conta")
          .eq("id", servico.fornecedor_preferencial_id)
          .maybeSingle();
        servicoEnriquecido.fornecedor = fornecedor;
      }

      setServicoData(servicoEnriquecido);
    } catch (error: any) {
      console.error("Erro ao buscar dados do serviço:", error);
      toast({
        variant: "destructive",
        title: "Erro ao carregar dados",
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (value: number | null) => {
    if (value === null) return "N/A";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "N/A";
    return format(new Date(dateStr), "dd/MM/yyyy", { locale: ptBR });
  };

  const addParcela = () => {
    const novaParcela: ParcelaManual = {
      id: crypto.randomUUID(),
      titulo: `Parcela ${parcelasManuais.length + 1}`,
      data_vencimento: null,
      valor: "",
    };
    setParcelasManuais([...parcelasManuais, novaParcela]);
  };

  const updateParcela = (id: string, field: keyof ParcelaManual, value: any) => {
    setParcelasManuais(prev => 
      prev.map(p => p.id === id ? { ...p, [field]: value } : p)
    );
  };

  const removeParcela = (id: string) => {
    setParcelasManuais(prev => prev.filter(p => p.id !== id));
  };

  const parseCurrencyInput = (value: string): number => {
    // Remove R$, dots (thousands separator), and replace comma with dot for decimal
    const cleaned = value.replace(/[R$\s.]/g, "").replace(",", ".");
    return parseFloat(cleaned) || 0;
  };

  const onSubmit = async (data: FormData) => {
    setIsSending(true);

    try {
      // Combine existing obrigacoes with manual parcelas
      const todasParcelas = [
        ...obrigacoes.map(o => ({
          titulo: o.titulo,
          data_vencimento: o.data_vencimento,
          valor: o.valor,
          status: o.status,
        })),
        ...parcelasManuais
          .filter(p => p.data_vencimento && p.valor)
          .map(p => ({
            titulo: p.titulo,
            data_vencimento: p.data_vencimento ? format(p.data_vencimento, "yyyy-MM-dd") : null,
            valor: parseCurrencyInput(p.valor),
            status: "pendente",
          })),
      ];

      const { data: response, error } = await supabase.functions.invoke(
        "enviar-notificacao-financeiro",
        {
          body: {
            tipo,
            contratoId: tipo === "contrato" ? contratoId : null,
            servicoId: tipo === "servico" ? servicoId : null,
            emailFinanceiro: data.emailFinanceiro,
            emailsAdicionais: data.emailsAdicionais || "",
            observacoes: data.observacoes || "",
            parcelasAdicionais: todasParcelas,
          },
        }
      );

      if (error) throw error;

      if (response.success) {
        toast({
          title: "Notificação enviada!",
          description: "O financeiro foi notificado com sucesso.",
        });
        form.reset();
        setParcelasManuais([]);
        onClose();
      } else {
        throw new Error(response.error || "Erro ao enviar notificação");
      }
    } catch (error: any) {
      console.error("Erro ao enviar notificação:", error);
      toast({
        variant: "destructive",
        title: "Erro ao enviar",
        description: error.message,
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleClose = () => {
    form.reset();
    setParcelasManuais([]);
    onClose();
  };

  const fornecedor = tipo === "contrato" ? contratoData?.fornecedor : servicoData?.fornecedor;
  const hasBankData = fornecedor?.banco || fornecedor?.agencia || fornecedor?.conta || fornecedor?.pix;
  const todasParcelasExibir = [...obrigacoes, ...parcelasManuais.filter(p => p.data_vencimento && p.valor).map(p => ({
    id: p.id,
    titulo: p.titulo,
    data_vencimento: p.data_vencimento ? format(p.data_vencimento, "yyyy-MM-dd") : "",
    valor: parseCurrencyInput(p.valor),
    status: "pendente",
  }))];

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            Enviar Notificação ao Financeiro
          </DialogTitle>
          <DialogDescription>
            Preencha o email do financeiro para enviar as informações de pagamento.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Email Fields */}
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="emailFinanceiro"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email do Financeiro *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="financeiro@empresa.com.br"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="emailsAdicionais"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Emails Adicionais (separados por vírgula)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="compras@empresa.com, gestor@empresa.com"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Separator />

              {/* Contract/Service Summary */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <FileText className="h-4 w-4" />
                  {tipo === "contrato" ? "Resumo do Contrato" : "Resumo do Serviço"}
                </div>

                {tipo === "contrato" && contratoData && (
                  <div className="grid grid-cols-2 gap-4 text-sm bg-muted/50 p-4 rounded-lg">
                    <div>
                      <span className="text-muted-foreground">Número:</span>
                      <p className="font-medium">{contratoData.numero_contrato}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Título:</span>
                      <p className="font-medium">{contratoData.titulo}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Fornecedor:</span>
                      <p className="font-medium">{contratoData.fornecedor?.nome || "N/A"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Valor Total:</span>
                      <p className="font-medium text-primary">{formatCurrency(contratoData.valor_total)}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Vigência:</span>
                      <p className="font-medium">
                        {formatDate(contratoData.data_inicio)} a {formatDate(contratoData.data_fim)}
                      </p>
                    </div>
                    {contratoData.fornecedor?.cnpj && (
                      <div>
                        <span className="text-muted-foreground">CNPJ:</span>
                        <p className="font-medium">{contratoData.fornecedor.cnpj}</p>
                      </div>
                    )}
                  </div>
                )}

                {tipo === "servico" && servicoData && (
                  <div className="grid grid-cols-2 gap-4 text-sm bg-muted/50 p-4 rounded-lg">
                    <div>
                      <span className="text-muted-foreground">Serviço:</span>
                      <p className="font-medium">{servicoData.especificacao?.nome || "N/A"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Unidade:</span>
                      <p className="font-medium">{servicoData.unidade?.nome || "N/A"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Fornecedor:</span>
                      <p className="font-medium">{servicoData.fornecedor?.nome || "N/A"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Valor Estimado:</span>
                      <p className="font-medium text-primary">{formatCurrency(servicoData.valor_estimado)}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Próximo Vencimento:</span>
                      <p className="font-medium">{formatDate(servicoData.data_validade)}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Parcelas Section */}
              {tipo === "contrato" && (
                <>
                  <Separator />
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <DollarSign className="h-4 w-4" />
                        Parcelas / Cronograma de Pagamentos
                      </div>
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        onClick={addParcela}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Adicionar Parcela
                      </Button>
                    </div>

                    {/* Manual Parcelas Input */}
                    {parcelasManuais.length > 0 && (
                      <div className="space-y-3 p-4 bg-muted/30 rounded-lg border border-dashed">
                        <p className="text-xs text-muted-foreground">Parcelas a adicionar no email:</p>
                        {parcelasManuais.map((parcela, index) => (
                          <div key={parcela.id} className="flex items-center gap-3">
                            <Input
                              placeholder="Descrição"
                              value={parcela.titulo}
                              onChange={(e) => updateParcela(parcela.id, "titulo", e.target.value)}
                              className="flex-1"
                            />
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    "w-[140px] justify-start text-left font-normal",
                                    !parcela.data_vencimento && "text-muted-foreground"
                                  )}
                                >
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {parcela.data_vencimento 
                                    ? format(parcela.data_vencimento, "dd/MM/yyyy")
                                    : "Vencimento"
                                  }
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={parcela.data_vencimento || undefined}
                                  onSelect={(date) => updateParcela(parcela.id, "data_vencimento", date)}
                                  initialFocus
                                  locale={ptBR}
                                />
                              </PopoverContent>
                            </Popover>
                            <Input
                              placeholder="R$ 0,00"
                              value={parcela.valor}
                              onChange={(e) => updateParcela(parcela.id, "valor", e.target.value)}
                              className="w-[120px]"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeParcela(parcela.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Existing Obrigacoes */}
                    {obrigacoes.length > 0 && (
                      <div className="rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Parcela</TableHead>
                              <TableHead>Vencimento</TableHead>
                              <TableHead>Valor</TableHead>
                              <TableHead>Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {obrigacoes.map((obrigacao, index) => (
                              <TableRow key={obrigacao.id}>
                                <TableCell className="font-medium">
                                  {index + 1}/{obrigacoes.length} - {obrigacao.titulo}
                                </TableCell>
                                <TableCell>{formatDate(obrigacao.data_vencimento)}</TableCell>
                                <TableCell>{formatCurrency(obrigacao.valor)}</TableCell>
                                <TableCell>
                                  <Badge variant={obrigacao.status === "pendente" ? "outline" : "secondary"}>
                                    {obrigacao.status || "pendente"}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}

                    {obrigacoes.length === 0 && parcelasManuais.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Nenhuma parcela cadastrada. Clique em "Adicionar Parcela" para informar os valores.
                      </p>
                    )}
                  </div>
                </>
              )}

              {/* Bank Data */}
              {hasBankData && (
                <>
                  <Separator />
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <CreditCard className="h-4 w-4" />
                      Dados para Pagamento
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm bg-muted/50 p-4 rounded-lg">
                      {fornecedor?.banco && (
                        <div>
                          <span className="text-muted-foreground">Banco:</span>
                          <p className="font-medium">{fornecedor.banco}</p>
                        </div>
                      )}
                      {fornecedor?.agencia && (
                        <div>
                          <span className="text-muted-foreground">Agência:</span>
                          <p className="font-medium">{fornecedor.agencia}</p>
                        </div>
                      )}
                      {fornecedor?.conta && (
                        <div>
                          <span className="text-muted-foreground">Conta:</span>
                          <p className="font-medium">{fornecedor.conta}</p>
                        </div>
                      )}
                      {fornecedor?.pix && (
                        <div>
                          <span className="text-muted-foreground">PIX:</span>
                          <p className="font-medium">{fornecedor.pix}</p>
                        </div>
                      )}
                      {fornecedor?.titular_conta && (
                        <div className="col-span-2">
                          <span className="text-muted-foreground">Titular:</span>
                          <p className="font-medium">{fornecedor.titular_conta}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

              <Separator />

              {/* Observacoes */}
              <FormField
                control={form.control}
                name="observacoes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observações Adicionais</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Adicione observações que devem constar no email..."
                        className="min-h-[80px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter className="gap-2">
                <Button type="button" variant="outline" onClick={handleClose}>
                  <X className="h-4 w-4 mr-2" />
                  Pular
                </Button>
                <Button type="submit" disabled={isSending}>
                  {isSending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Enviar ao Financeiro
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
