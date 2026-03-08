import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Link2, ShoppingCart, Loader2, TestTube, Check, AlertCircle } from "lucide-react";

interface IntegracaoConfig {
  id: string;
  tipo: string;
  nome: string;
  url_api: string | null;
  tipo_autenticacao: string | null;
  headers_customizados: Record<string, string> | null;
  is_active: boolean;
  ultimo_teste: string | null;
  status_ultimo_teste: string | null;
}

interface IntegracaoForm {
  url_api: string;
  tipo_autenticacao: string;
  is_active: boolean;
}

interface SettingsIntegracaoCardProps {
  loadingIntegracao: boolean;
  integracaoConfig: IntegracaoConfig | null;
  integracaoForm: IntegracaoForm;
  onIntegracaoFormChange: (form: IntegracaoForm) => void;
  savingIntegracao: boolean;
  testingIntegracao: boolean;
  onSave: () => void;
  onTest: () => void;
}

export function SettingsIntegracaoCard({
  loadingIntegracao,
  integracaoConfig,
  integracaoForm,
  onIntegracaoFormChange,
  savingIntegracao,
  testingIntegracao,
  onSave,
  onTest,
}: SettingsIntegracaoCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Link2 className="h-5 w-5" />
          Integrações
        </CardTitle>
        <CardDescription>Configure integrações com sistemas externos</CardDescription>
      </CardHeader>
      <CardContent>
        {loadingIntegracao ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="sistema-compras">
              <AccordionTrigger>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <ShoppingCart className="h-5 w-5 text-primary" />
                  </div>
                  <div className="text-left">
                    <div className="font-medium">Sistema de Compras</div>
                    <div className="text-xs text-muted-foreground">
                      Envio automático de solicitações quando serviços entrarem em alerta
                    </div>
                  </div>
                  {integracaoConfig?.is_active && (
                    <Badge variant="default" className="ml-2 bg-success">
                      Ativo
                    </Badge>
                  )}
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-4 space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <Label>Integração Ativa</Label>
                      <p className="text-sm text-muted-foreground">
                        Habilita o envio automático para o sistema de compras
                      </p>
                    </div>
                    <Switch
                      checked={integracaoForm.is_active}
                      onCheckedChange={(v) => onIntegracaoFormChange({ ...integracaoForm, is_active: v })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="url_api">URL da API</Label>
                    <Input
                      id="url_api"
                      value={integracaoForm.url_api}
                      onChange={(e) => onIntegracaoFormChange({ ...integracaoForm, url_api: e.target.value })}
                      placeholder="https://api.seuserp.com.br/solicitacao-compra"
                    />
                    <p className="text-xs text-muted-foreground">
                      Endpoint que receberá as solicitações de compra via POST
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tipo_auth">Tipo de Autenticação</Label>
                    <Select
                      value={integracaoForm.tipo_autenticacao}
                      onValueChange={(v) => onIntegracaoFormChange({ ...integracaoForm, tipo_autenticacao: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="api_key">API Key (Header X-API-Key)</SelectItem>
                        <SelectItem value="bearer">Bearer Token</SelectItem>
                        <SelectItem value="basic_auth">Basic Auth</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      A chave de autenticação deve ser configurada como secret no backend
                    </p>
                  </div>

                  {integracaoConfig?.ultimo_teste && (
                    <div className="rounded-lg border p-3 bg-muted/50">
                      <div className="flex items-center gap-2 text-sm">
                        {integracaoConfig.status_ultimo_teste === "success" ? (
                          <Check className="h-4 w-4 text-success" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-destructive" />
                        )}
                        <span>
                          Último teste:{" "}
                          {new Date(integracaoConfig.ultimo_teste).toLocaleString("pt-BR")}
                        </span>
                        <Badge
                          variant={integracaoConfig.status_ultimo_teste === "success" ? "default" : "destructive"}
                          className={integracaoConfig.status_ultimo_teste === "success" ? "bg-success" : ""}
                        >
                          {integracaoConfig.status_ultimo_teste === "success" ? "Sucesso" : "Falha"}
                        </Badge>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={onTest}
                      disabled={testingIntegracao || !integracaoForm.url_api}
                    >
                      {testingIntegracao ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <TestTube className="h-4 w-4 mr-2" />
                      )}
                      Testar Conexão
                    </Button>
                    <Button onClick={onSave} disabled={savingIntegracao}>
                      {savingIntegracao ? "Salvando..." : "Salvar Configuração"}
                    </Button>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        )}
      </CardContent>
    </Card>
  );
}
