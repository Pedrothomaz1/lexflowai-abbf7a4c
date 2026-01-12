import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { 
  Building2, 
  Mail, 
  Phone, 
  MapPin, 
  FileText,
  ExternalLink,
  User
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface Fornecedor {
  id: string;
  nome: string;
  tipo_pessoa: string | null;
  cnpj: string | null;
  cpf: string | null;
  email: string | null;
  telefone: string | null;
  cidade: string | null;
  estado: string | null;
  endereco: string | null;
}

interface ContractSupplierCardProps {
  fornecedorId: string | null;
}

export function ContractSupplierCard({ fornecedorId }: ContractSupplierCardProps) {
  const navigate = useNavigate();
  const [fornecedor, setFornecedor] = useState<Fornecedor | null>(null);
  const [loading, setLoading] = useState(true);
  const [contractCount, setContractCount] = useState(0);

  useEffect(() => {
    if (fornecedorId) {
      fetchFornecedor();
    } else {
      setLoading(false);
    }
  }, [fornecedorId]);

  const fetchFornecedor = async () => {
    try {
      const { data, error } = await supabase
        .from("fornecedores")
        .select("*")
        .eq("id", fornecedorId)
        .single();

      if (error) throw error;
      setFornecedor(data);

      // Count contracts for this supplier
      const { count } = await supabase
        .from("contratos")
        .select("*", { count: 'exact', head: true })
        .eq("fornecedor_id", fornecedorId);

      setContractCount(count || 0);
    } catch (error) {
      console.error("Error fetching supplier:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDocument = (fornecedor: Fornecedor) => {
    if (fornecedor.cnpj) {
      return fornecedor.cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }
    if (fornecedor.cpf) {
      return fornecedor.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }
    return null;
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-40" />
      </div>
    );
  }

  if (!fornecedor) {
    return (
      <div className="text-center py-6 text-muted-foreground">
        <Building2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">Nenhum fornecedor vinculado</p>
      </div>
    );
  }

  const document = formatDocument(fornecedor);
  const location = [fornecedor.cidade, fornecedor.estado].filter(Boolean).join(' - ');

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-4"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Building2 className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h4 className="font-medium truncate">{fornecedor.nome}</h4>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge variant="secondary" className="text-xs">
                {fornecedor.tipo_pessoa === 'PJ' ? 'Pessoa Jurídica' : 'Pessoa Física'}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {contractCount} contrato{contractCount !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="space-y-2">
        {document && (
          <InfoRow 
            icon={FileText} 
            label={fornecedor.cnpj ? 'CNPJ' : 'CPF'} 
            value={document} 
          />
        )}
        {fornecedor.email && (
          <InfoRow 
            icon={Mail} 
            label="Email" 
            value={fornecedor.email}
            href={`mailto:${fornecedor.email}`}
          />
        )}
        {fornecedor.telefone && (
          <InfoRow 
            icon={Phone} 
            label="Telefone" 
            value={fornecedor.telefone}
            href={`tel:${fornecedor.telefone}`}
          />
        )}
        {location && (
          <InfoRow 
            icon={MapPin} 
            label="Localização" 
            value={location} 
          />
        )}
      </div>

      {/* Actions */}
      <Button
        variant="outline"
        size="sm"
        className="w-full"
        onClick={() => navigate('/fornecedores')}
      >
        <ExternalLink className="h-4 w-4 mr-2" />
        Ver Todos os Fornecedores
      </Button>
    </motion.div>
  );
}

function InfoRow({ 
  icon: Icon, 
  label, 
  value,
  href,
}: { 
  icon: React.ComponentType<{ className?: string }>; 
  label: string; 
  value: string;
  href?: string;
}) {
  const content = (
    <div className="flex items-center gap-2 text-sm py-1.5">
      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
      <span className="text-muted-foreground">{label}:</span>
      <span className={cn(
        "font-medium truncate",
        href && "text-primary hover:underline"
      )}>
        {value}
      </span>
    </div>
  );

  if (href) {
    return (
      <a href={href} className="block">
        {content}
      </a>
    );
  }

  return content;
}
