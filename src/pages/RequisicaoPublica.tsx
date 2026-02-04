import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CheckCircle2, Send, FileText, AlertTriangle, Copy, Check, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { supabase } from "@/integrations/supabase/client";
import logoLexFlowIcon from "@/assets/logo-lexflow-icon.png";

const requisicaoSchema = z.object({
  solicitante_nome: z.string().min(3, "Nome deve ter no mínimo 3 caracteres").max(100),
  solicitante_email: z.string().email("Email inválido").max(255),
  solicitante_telefone: z.string().max(20).optional(),
  departamento: z.string().min(1, "Departamento é obrigatório").max(100),
  tipo_contrato: z.enum(["prestacao_servicos", "fornecimento", "locacao", "confidencialidade", "parceria", "outro"]),
  titulo: z.string().min(5, "Título deve ter no mínimo 5 caracteres").max(200),
  descricao: z.string().min(20, "Descrição deve ter no mínimo 20 caracteres").max(5000),
  justificativa: z.string().max(2000).optional(),
  valor_estimado: z.coerce.number().min(0).optional().nullable(),
  urgencia: z.enum(["baixa", "media", "alta", "critica"]),
  data_necessidade: z.string().optional(),
  fornecedor_sugerido: z.string().max(200).optional(),
  honeypot: z.string().optional(),
});

type RequisicaoFormData = z.infer<typeof requisicaoSchema>;

const tiposContrato = [
  { value: "prestacao_servicos", label: "Prestação de Serviços" },
  { value: "fornecimento", label: "Fornecimento" },
  { value: "locacao", label: "Locação" },
  { value: "confidencialidade", label: "Confidencialidade (NDA)" },
  { value: "parceria", label: "Parceria" },
  { value: "outro", label: "Outro" },
];

const urgencias = [
  { value: "baixa", label: "Baixa", description: "Pode aguardar algumas semanas" },
  { value: "media", label: "Média", description: "Necessário em até 2 semanas" },
  { value: "alta", label: "Alta", description: "Necessário em até 1 semana" },
  { value: "critica", label: "Crítica", description: "Urgente - necessário imediatamente" },
];

const departamentos = [
  "Administrativo",
  "Comercial",
  "Compras",
  "Financeiro",
  "Jurídico",
  "Marketing",
  "Operações",
  "RH",
  "TI",
  "Outro",
];

export default function RequisicaoPublica() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const form = useForm<RequisicaoFormData>({
    resolver: zodResolver(requisicaoSchema),
    defaultValues: {
      solicitante_nome: "",
      solicitante_email: "",
      solicitante_telefone: "",
      departamento: "",
      tipo_contrato: "outro",
      titulo: "",
      descricao: "",
      justificativa: "",
      valor_estimado: null,
      urgencia: "media",
      data_necessidade: "",
      fornecedor_sugerido: "",
      honeypot: "",
    },
  });

  const onSubmit = async (data: RequisicaoFormData) => {
    setIsSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(null);

    try {
      const { data: response, error } = await supabase.functions.invoke("processar-requisicao-contrato", {
        body: data,
      });

      if (error) throw error;

      if (response.success) {
        setSubmitSuccess(response.numero_requisicao);
        form.reset();
      } else {
        throw new Error(response.error || "Erro ao enviar requisição");
      }
    } catch (error: any) {
      console.error("Error submitting request:", error);
      setSubmitError(error.message || "Erro ao enviar requisição. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyToClipboard = async () => {
    if (submitSuccess) {
      await navigator.clipboard.writeText(submitSuccess);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (submitSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#384E46] to-[#7F9C90] flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl text-green-600">Requisição Enviada!</CardTitle>
            <CardDescription>
              Sua solicitação foi recebida com sucesso e será analisada pela equipe jurídica.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-muted p-4">
              <p className="text-sm text-muted-foreground mb-1">Número do Protocolo</p>
              <div className="flex items-center justify-center gap-2">
                <p className="text-2xl font-bold text-foreground">{submitSuccess}</p>
                <Button variant="ghost" size="icon" onClick={copyToClipboard}>
                  {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Importante</AlertTitle>
              <AlertDescription>
                Guarde este número de protocolo para acompanhamento da sua solicitação.
              </AlertDescription>
            </Alert>
            <Button
              className="w-full"
              onClick={() => {
                setSubmitSuccess(null);
                form.reset();
              }}
            >
              Enviar Nova Requisição
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#384E46] to-[#7F9C90]">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-10 space-y-6">
          {/* Logo Container with Glassmorphism */}
          <div className="flex justify-center">
            <div className="h-20 w-20 rounded-2xl bg-white/15 flex items-center justify-center backdrop-blur-sm border border-white/20 shadow-xl">
              <img src={logoLexFlowIcon} alt="LexFlow" className="h-12 w-12 object-contain" />
            </div>
          </div>

          {/* Main Title */}
          <div className="space-y-1">
            <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight drop-shadow-sm">
              LexFlow
            </h1>
            <p className="text-lg text-white/80">
              Sistema de Gestão de Contratos
            </p>
          </div>

          {/* Department Badge */}
          <div className="flex justify-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 border border-white/30 backdrop-blur-sm">
              <Scale className="h-4 w-4 text-white" />
              <span className="text-sm font-medium text-white">
                Departamento Jurídico
              </span>
            </div>
          </div>

          {/* Subtitle and Description */}
          <div className="space-y-2">
            <h2 className="text-2xl md:text-3xl font-semibold text-white">
              Formulário de Requisição
            </h2>
            <p className="text-white/70 max-w-2xl mx-auto leading-relaxed">
              Solicite a elaboração ou análise de contratos pela equipe jurídica.
            </p>
          </div>

          {/* Decorative Separator */}
          <div className="w-32 h-1 mx-auto rounded-full bg-gradient-to-r from-transparent via-white/50 to-transparent" />
        </div>

        {/* Form Card */}
        <Card className="max-w-3xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Nova Requisição
            </CardTitle>
            <CardDescription>
              Preencha os campos abaixo com as informações da sua solicitação.
              Campos marcados com * são obrigatórios.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Honeypot field (hidden) */}
                <input
                  type="text"
                  {...form.register("honeypot")}
                  className="hidden"
                  tabIndex={-1}
                  autoComplete="off"
                />

                {/* Dados do Solicitante */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg border-b pb-2">Dados do Solicitante</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="solicitante_nome"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome Completo *</FormLabel>
                          <FormControl>
                            <Input placeholder="Seu nome completo" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="solicitante_email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email *</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="seu.email@empresa.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="solicitante_telefone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Telefone</FormLabel>
                          <FormControl>
                            <Input placeholder="(11) 99999-9999" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="departamento"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Departamento *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione o departamento" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {departamentos.map((dept) => (
                                <SelectItem key={dept} value={dept}>
                                  {dept}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Dados do Contrato */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg border-b pb-2">Dados do Contrato</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="tipo_contrato"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tipo de Contrato *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione o tipo" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {tiposContrato.map((tipo) => (
                                <SelectItem key={tipo.value} value={tipo.value}>
                                  {tipo.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="urgencia"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Urgência *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione a urgência" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {urgencias.map((urg) => (
                                <SelectItem key={urg.value} value={urg.value}>
                                  <div>
                                    <span className="font-medium">{urg.label}</span>
                                    <span className="text-xs text-muted-foreground ml-2">
                                      ({urg.description})
                                    </span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="titulo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Título / Assunto *</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Ex: Contrato de Prestação de Serviços de TI" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="descricao"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Descrição Detalhada *</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Descreva detalhadamente a necessidade do contrato, incluindo escopo, partes envolvidas, prazos esperados, etc."
                            className="min-h-[120px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="justificativa"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Justificativa</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Explique por que este contrato é necessário para a empresa"
                            className="min-h-[80px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Informações Adicionais */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg border-b pb-2">Informações Adicionais</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="valor_estimado"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Valor Estimado (R$)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="0,00"
                              {...field}
                              value={field.value ?? ""}
                              onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="data_necessidade"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Data de Necessidade</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="fornecedor_sugerido"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>Fornecedor Sugerido</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Nome do fornecedor ou empresa, se houver preferência"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {submitError && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Erro</AlertTitle>
                    <AlertDescription>{submitError}</AlertDescription>
                  </Alert>
                )}

                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <span className="animate-spin mr-2">⏳</span>
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Enviar Requisição
                    </>
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-8 text-white/50 text-sm">
          <p>© 2025 LexFlow - Sistema de Gestão de Contratos</p>
          <p className="mt-1">
            Dúvidas? Entre em contato com o departamento jurídico.
          </p>
        </div>
      </div>
    </div>
  );
}
