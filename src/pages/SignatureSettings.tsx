import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { FileSignature, Info, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function SignatureSettings() {
  const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/signature-webhook`;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Configuração de Assinaturas Eletrônicas</h1>
        <p className="text-muted-foreground mt-2">
          Configure seus provedores de assinatura digital
        </p>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>URL do Webhook</AlertTitle>
        <AlertDescription>
          <p className="mb-2">Configure este webhook nos seus provedores de assinatura:</p>
          <div className="flex items-center gap-2 mt-2">
            <code className="flex-1 bg-muted p-2 rounded text-xs break-all">{webhookUrl}</code>
            <Button size="sm" variant="outline" onClick={() => copyToClipboard(webhookUrl)}>
              Copiar
            </Button>
          </div>
        </AlertDescription>
      </Alert>

      <div className="grid gap-6 md:grid-cols-2">
        {/* DocuSign */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileSignature className="h-5 w-5" />
                <CardTitle>DocuSign</CardTitle>
              </div>
              <Badge>Popular</Badge>
            </div>
            <CardDescription>
              Líder global em assinatura eletrônica
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-semibold text-sm">Como configurar:</h4>
              <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                <li>Crie uma conta no DocuSign</li>
                <li>Vá em Settings → Connect → Custom</li>
                <li>Crie um novo webhook endpoint</li>
                <li>Cole a URL do webhook acima</li>
                <li>Selecione os eventos desejados:
                  <ul className="list-disc list-inside ml-6 mt-1">
                    <li>Envelope Sent</li>
                    <li>Envelope Delivered</li>
                    <li>Envelope Completed</li>
                    <li>Envelope Declined</li>
                    <li>Envelope Voided</li>
                  </ul>
                </li>
                <li>Adicione o header: <code className="text-xs">x-signature-provider: docusign</code></li>
              </ol>
            </div>
            <Separator />
            <Button variant="outline" className="w-full" asChild>
              <a href="https://www.docusign.com" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" />
                Acessar DocuSign
              </a>
            </Button>
          </CardContent>
        </Card>

        {/* Clicksign */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileSignature className="h-5 w-5" />
                <CardTitle>Clicksign</CardTitle>
              </div>
              <Badge variant="outline">Brasil</Badge>
            </div>
            <CardDescription>
              Plataforma brasileira de assinatura digital
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-semibold text-sm">Como configurar:</h4>
              <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                <li>Acesse sua conta Clicksign</li>
                <li>Vá em Configurações → Integrações → Webhooks</li>
                <li>Clique em "Novo Webhook"</li>
                <li>Cole a URL do webhook acima</li>
                <li>Selecione os eventos:
                  <ul className="list-disc list-inside ml-6 mt-1">
                    <li>document.running (enviado)</li>
                    <li>document.signed (assinado)</li>
                    <li>document.closed (completo)</li>
                    <li>document.canceled (cancelado)</li>
                  </ul>
                </li>
                <li>Adicione o header: <code className="text-xs">x-signature-provider: clicksign</code></li>
              </ol>
            </div>
            <Separator />
            <Button variant="outline" className="w-full" asChild>
              <a href="https://www.clicksign.com" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" />
                Acessar Clicksign
              </a>
            </Button>
          </CardContent>
        </Card>

        {/* D4Sign */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileSignature className="h-5 w-5" />
                <CardTitle>D4Sign</CardTitle>
              </div>
              <Badge variant="outline">Brasil</Badge>
            </div>
            <CardDescription>
              Certificação digital ICP-Brasil
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-semibold text-sm">Como configurar:</h4>
              <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                <li>Entre em sua conta D4Sign</li>
                <li>Vá em Configurações → Webhooks</li>
                <li>Adicione um novo webhook</li>
                <li>Cole a URL do webhook acima</li>
                <li>Escolha os eventos:
                  <ul className="list-disc list-inside ml-6 mt-1">
                    <li>Aguardando Assinaturas</li>
                    <li>Assinado</li>
                    <li>Cancelado</li>
                    <li>Expirado</li>
                  </ul>
                </li>
                <li>Adicione o header: <code className="text-xs">x-signature-provider: d4sign</code></li>
              </ol>
            </div>
            <Separator />
            <Button variant="outline" className="w-full" asChild>
              <a href="https://www.d4sign.com.br" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" />
                Acessar D4Sign
              </a>
            </Button>
          </CardContent>
        </Card>

        {/* Personalizado */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileSignature className="h-5 w-5" />
              <CardTitle>Provedor Personalizado</CardTitle>
            </div>
            <CardDescription>
              Use qualquer serviço de assinatura
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-semibold text-sm">Formato do Webhook:</h4>
              <div className="bg-muted p-3 rounded text-xs">
                <pre className="overflow-x-auto">{`{
  "externalId": "ID_do_documento",
  "status": "pending|sent|viewed|signed|completed|declined|expired|cancelled",
  "signedDocumentUrl": "URL_do_documento_assinado",
  "provider": "nome_do_provedor"
}`}</pre>
              </div>
            </div>
            <Separator />
            <div className="space-y-2">
              <h4 className="font-semibold text-sm">Headers necessários:</h4>
              <code className="text-xs bg-muted p-2 rounded block">
                x-signature-provider: custom
              </code>
            </div>
          </CardContent>
        </Card>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Importante</AlertTitle>
        <AlertDescription>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li>Os webhooks recebem atualizações de status automaticamente</li>
            <li>Os contratos são marcados como "vigente" quando completamente assinados</li>
            <li>Você pode acompanhar o status em tempo real na página de cada contrato</li>
            <li>O documento assinado fica disponível para download após a conclusão</li>
          </ul>
        </AlertDescription>
      </Alert>
    </div>
  );
}
