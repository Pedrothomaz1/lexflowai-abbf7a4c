import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import {
  formatCPF,
  formatCNPJ,
  validateCPF,
  validateCNPJ,
  cleanDocument,
} from "@/utils/documentValidation";

export interface DocumentInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "type"> {
  documentType: "cpf" | "cnpj";
  value: string;
  onChange: (value: string, isValid: boolean) => void;
  showValidation?: boolean;
}

const DocumentInput = React.forwardRef<HTMLInputElement, DocumentInputProps>(
  ({ className, documentType, value, onChange, showValidation = true, ...props }, ref) => {
    const [validationState, setValidationState] = React.useState<
      "idle" | "valid" | "invalid" | "incomplete"
    >("idle");

    const expectedLength = documentType === "cpf" ? 11 : 14;
    const formattedLength = documentType === "cpf" ? 14 : 18; // Com pontuação
    const placeholder = documentType === "cpf" ? "000.000.000-00" : "00.000.000/0000-00";
    const label = documentType === "cpf" ? "CPF" : "CNPJ";

    const formatFn = documentType === "cpf" ? formatCPF : formatCNPJ;
    const validateFn = documentType === "cpf" ? validateCPF : validateCNPJ;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value;
      const formatted = formatFn(inputValue);
      const cleaned = cleanDocument(formatted);

      // Atualiza estado de validação
      if (cleaned.length === 0) {
        setValidationState("idle");
        onChange(formatted, false);
      } else if (cleaned.length < expectedLength) {
        setValidationState("incomplete");
        onChange(formatted, false);
      } else if (cleaned.length === expectedLength) {
        const isValid = validateFn(formatted);
        setValidationState(isValid ? "valid" : "invalid");
        onChange(formatted, isValid);
      }
    };

    // Valida valor inicial
    React.useEffect(() => {
      if (value) {
        const cleaned = cleanDocument(value);
        if (cleaned.length === expectedLength) {
          const isValid = validateFn(value);
          setValidationState(isValid ? "valid" : "invalid");
        } else if (cleaned.length > 0) {
          setValidationState("incomplete");
        }
      }
    }, []);

    const getValidationIcon = () => {
      if (!showValidation || validationState === "idle") return null;

      switch (validationState) {
        case "valid":
          return <CheckCircle2 className="h-4 w-4 text-green-500" />;
        case "invalid":
          return <XCircle className="h-4 w-4 text-destructive" />;
        case "incomplete":
          return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
        default:
          return null;
      }
    };

    const getValidationMessage = () => {
      if (!showValidation) return null;

      switch (validationState) {
        case "valid":
          return (
            <p className="text-xs text-green-500 mt-1">
              {label} válido ✓
            </p>
          );
        case "invalid":
          return (
            <p className="text-xs text-destructive mt-1">
              {label} inválido (dígitos verificadores incorretos)
            </p>
          );
        case "incomplete":
          return (
            <p className="text-xs text-muted-foreground mt-1">
              {label} incompleto ({cleanDocument(value).length}/{expectedLength} dígitos)
            </p>
          );
        default:
          return null;
      }
    };

    return (
      <div className="relative w-full">
        <div className="relative">
          <Input
            ref={ref}
            type="text"
            inputMode="numeric"
            value={value}
            onChange={handleChange}
            placeholder={placeholder}
            maxLength={formattedLength}
            className={cn(
              "pr-10",
              validationState === "valid" && "border-green-500 focus-visible:ring-green-500/20",
              validationState === "invalid" && "border-destructive focus-visible:ring-destructive/20",
              className
            )}
            {...props}
          />
          {showValidation && validationState !== "idle" && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
              {getValidationIcon()}
            </div>
          )}
        </div>
        {getValidationMessage()}
      </div>
    );
  }
);

DocumentInput.displayName = "DocumentInput";

export { DocumentInput };
