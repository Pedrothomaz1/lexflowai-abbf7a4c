export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      contract_approvals: {
        Row: {
          aprovador_id: string | null
          comentario: string | null
          contrato_id: string
          created_at: string
          data_aprovacao: string | null
          id: string
          status: string | null
        }
        Insert: {
          aprovador_id?: string | null
          comentario?: string | null
          contrato_id: string
          created_at?: string
          data_aprovacao?: string | null
          id?: string
          status?: string | null
        }
        Update: {
          aprovador_id?: string | null
          comentario?: string | null
          contrato_id?: string
          created_at?: string
          data_aprovacao?: string | null
          id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_approvals_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_history: {
        Row: {
          alterado_em: string
          alterado_por: string | null
          campo_alterado: string
          contrato_id: string
          id: string
          valor_anterior: string | null
          valor_novo: string | null
          versao: number
        }
        Insert: {
          alterado_em?: string
          alterado_por?: string | null
          campo_alterado: string
          contrato_id: string
          id?: string
          valor_anterior?: string | null
          valor_novo?: string | null
          versao: number
        }
        Update: {
          alterado_em?: string
          alterado_por?: string | null
          campo_alterado?: string
          contrato_id?: string
          id?: string
          valor_anterior?: string | null
          valor_novo?: string | null
          versao?: number
        }
        Relationships: [
          {
            foreignKeyName: "contract_history_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
        ]
      }
      contratos: {
        Row: {
          arquivo_hash: string | null
          arquivo_url: string | null
          created_at: string
          created_by: string | null
          data_assinatura: string | null
          data_fim: string | null
          data_inicio: string | null
          descricao: string | null
          fornecedor_id: string | null
          id: string
          metadata: Json | null
          moeda: string | null
          numero_contrato: string
          observacoes: string | null
          status: Database["public"]["Enums"]["contract_status"]
          tags: string[] | null
          tipo: Database["public"]["Enums"]["contract_type"]
          titulo: string
          updated_at: string
          valor_total: number | null
          versao: number
        }
        Insert: {
          arquivo_hash?: string | null
          arquivo_url?: string | null
          created_at?: string
          created_by?: string | null
          data_assinatura?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          descricao?: string | null
          fornecedor_id?: string | null
          id?: string
          metadata?: Json | null
          moeda?: string | null
          numero_contrato: string
          observacoes?: string | null
          status?: Database["public"]["Enums"]["contract_status"]
          tags?: string[] | null
          tipo?: Database["public"]["Enums"]["contract_type"]
          titulo: string
          updated_at?: string
          valor_total?: number | null
          versao?: number
        }
        Update: {
          arquivo_hash?: string | null
          arquivo_url?: string | null
          created_at?: string
          created_by?: string | null
          data_assinatura?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          descricao?: string | null
          fornecedor_id?: string | null
          id?: string
          metadata?: Json | null
          moeda?: string | null
          numero_contrato?: string
          observacoes?: string | null
          status?: Database["public"]["Enums"]["contract_status"]
          tags?: string[] | null
          tipo?: Database["public"]["Enums"]["contract_type"]
          titulo?: string
          updated_at?: string
          valor_total?: number | null
          versao?: number
        }
        Relationships: [
          {
            foreignKeyName: "contratos_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
        ]
      }
      fornecedores: {
        Row: {
          cep: string | null
          cidade: string | null
          cnpj: string | null
          cpf: string | null
          created_at: string
          created_by: string | null
          documentos: Json | null
          email: string | null
          endereco: string | null
          estado: string | null
          id: string
          nome: string
          notas: string | null
          telefone: string | null
          tipo_pessoa: string | null
          updated_at: string
        }
        Insert: {
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          cpf?: string | null
          created_at?: string
          created_by?: string | null
          documentos?: Json | null
          email?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          nome: string
          notas?: string | null
          telefone?: string | null
          tipo_pessoa?: string | null
          updated_at?: string
        }
        Update: {
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          cpf?: string | null
          created_at?: string
          created_by?: string | null
          documentos?: Json | null
          email?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          nome?: string
          notas?: string | null
          telefone?: string | null
          tipo_pessoa?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          department: string | null
          email: string
          full_name: string
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          department?: string | null
          email: string
          full_name: string
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          department?: string | null
          email?: string
          full_name?: string
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role: "analista_juridico" | "consultoria_juridica" | "administrador"
      contract_status:
        | "rascunho"
        | "em_aprovacao"
        | "aprovado"
        | "assinado"
        | "vigente"
        | "encerrado"
        | "cancelado"
      contract_type:
        | "prestacao_servicos"
        | "fornecimento"
        | "locacao"
        | "confidencialidade"
        | "parceria"
        | "outro"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["analista_juridico", "consultoria_juridica", "administrador"],
      contract_status: [
        "rascunho",
        "em_aprovacao",
        "aprovado",
        "assinado",
        "vigente",
        "encerrado",
        "cancelado",
      ],
      contract_type: [
        "prestacao_servicos",
        "fornecimento",
        "locacao",
        "confidencialidade",
        "parceria",
        "outro",
      ],
    },
  },
} as const
