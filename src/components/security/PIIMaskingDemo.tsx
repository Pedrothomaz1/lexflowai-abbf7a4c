import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Eye, EyeOff, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

// Client-side implementation of mask_pii (mirrors SQL function)
function maskPII(value: string, fieldType: string = "generic"): string {
  if (!value) return value;

  switch (fieldType) {
    case "cpf":
      // 123.456.789-10 -> ***.***.*89-10
      return value.replace(/(\d{3})\.(\d{3})\.(\d)(\d{2})-(\d{2})/, "***.***.***$3-$5");
    
    case "email":
      // joao@veri.com -> j***@veri.com
      return value.replace(/^(.).*(@.+)$/, "$1***$2");
    
    case "phone":
      // (11) 99999-8888 -> (11) ****-8888
      return value.replace(/(.+)(\d{4})$/, "****-$2");
    
    case "salary":
      return "R$ **.**0,00";
    
    default:
      // Generic: show only last 4 characters
      if (value.length > 4) {
        return "*".repeat(value.length - 4) + value.slice(-4);
      }
      return "*".repeat(value.length);
  }
}

const FIELD_TYPES = [
  { value: "cpf", label: "CPF", example: "123.456.789-10" },
  { value: "email", label: "E-mail", example: "joao.silva@empresa.com" },
  { value: "phone", label: "Telefone", example: "(11) 99999-8888" },
  { value: "salary", label: "Salário", example: "R$ 15.000,00" },
  { value: "generic", label: "Genérico", example: "ABC123XYZ" },
];

export function PIIMaskingDemo() {
  const [fieldType, setFieldType] = useState("cpf");
  const [inputValue, setInputValue] = useState(FIELD_TYPES[0].example);
  const [showOriginal, setShowOriginal] = useState(false);

  const maskedValue = maskPII(inputValue, fieldType);

  const handleFieldTypeChange = (value: string) => {
    setFieldType(value);
    const fieldConfig = FIELD_TYPES.find(f => f.value === value);
    if (fieldConfig) {
      setInputValue(fieldConfig.example);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Demonstração de Mascaramento PII
        </CardTitle>
        <CardDescription>
          Visualize como dados sensíveis são mascarados para proteção de privacidade
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Input Section */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Tipo de Campo</Label>
            <Select value={fieldType} onValueChange={handleFieldTypeChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FIELD_TYPES.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Valor Original</Label>
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Digite um valor..."
            />
          </div>
        </div>

        {/* Comparison Cards */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="bg-red-500/5 border-red-500/20">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-3">
                <Eye className="h-4 w-4 text-red-500" />
                <span className="text-sm font-medium text-red-600">Dado Original (Sensível)</span>
              </div>
              <div className="p-3 bg-background rounded-lg border font-mono text-lg">
                {showOriginal ? inputValue : "••••••••••••"}
              </div>
              <button
                onClick={() => setShowOriginal(!showOriginal)}
                className="mt-2 text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
              >
                {showOriginal ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                {showOriginal ? "Ocultar" : "Mostrar"} original
              </button>
            </CardContent>
          </Card>

          <Card className="bg-green-500/5 border-green-500/20">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-3">
                <EyeOff className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium text-green-600">Dado Mascarado (Seguro)</span>
              </div>
              <div className="p-3 bg-background rounded-lg border font-mono text-lg">
                {maskedValue}
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                Função: <code className="bg-muted px-1 rounded">mask_pii(value, '{fieldType}')</code>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Rules Table */}
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-3 font-medium">Tipo</th>
                <th className="text-left p-3 font-medium">Original</th>
                <th className="text-left p-3 font-medium">Mascarado</th>
                <th className="text-left p-3 font-medium">Regra</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t">
                <td className="p-3"><Badge variant="outline">CPF</Badge></td>
                <td className="p-3 font-mono text-xs">123.456.789-10</td>
                <td className="p-3 font-mono text-xs">***.***.*89-10</td>
                <td className="p-3 text-xs text-muted-foreground">Exibe apenas 1 dígito + sufixo</td>
              </tr>
              <tr className="border-t">
                <td className="p-3"><Badge variant="outline">E-mail</Badge></td>
                <td className="p-3 font-mono text-xs">joao@empresa.com</td>
                <td className="p-3 font-mono text-xs">j***@empresa.com</td>
                <td className="p-3 text-xs text-muted-foreground">Exibe 1ª letra + domínio</td>
              </tr>
              <tr className="border-t">
                <td className="p-3"><Badge variant="outline">Telefone</Badge></td>
                <td className="p-3 font-mono text-xs">(11) 99999-8888</td>
                <td className="p-3 font-mono text-xs">****-8888</td>
                <td className="p-3 text-xs text-muted-foreground">Exibe apenas últimos 4 dígitos</td>
              </tr>
              <tr className="border-t">
                <td className="p-3"><Badge variant="outline">Salário</Badge></td>
                <td className="p-3 font-mono text-xs">R$ 15.000,00</td>
                <td className="p-3 font-mono text-xs">R$ **.**0,00</td>
                <td className="p-3 text-xs text-muted-foreground">Formato fixo mascarado</td>
              </tr>
              <tr className="border-t">
                <td className="p-3"><Badge variant="outline">Genérico</Badge></td>
                <td className="p-3 font-mono text-xs">ABC123XYZ</td>
                <td className="p-3 font-mono text-xs">*****3XYZ</td>
                <td className="p-3 text-xs text-muted-foreground">Exibe últimos 4 caracteres</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Info Banner */}
        <div className="rounded-lg bg-primary/5 border border-primary/20 p-4">
          <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            Implementação
          </h4>
          <p className="text-xs text-muted-foreground">
            Esta função está implementada tanto no banco de dados (SQL) quanto no frontend (TypeScript).
            Use <code className="bg-muted px-1 rounded">mask_pii(value, field_type)</code> em queries 
            SQL ou relatórios para garantir que dados sensíveis nunca sejam expostos a usuários não autorizados.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
