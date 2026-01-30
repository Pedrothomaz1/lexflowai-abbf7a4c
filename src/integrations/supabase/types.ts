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
      approval_workflows: {
        Row: {
          aprovacao_paralela: boolean | null
          created_at: string
          id: string
          is_active: boolean | null
          niveis: Json
          nome: string
          tipo_contrato: Database["public"]["Enums"]["contract_type"]
        }
        Insert: {
          aprovacao_paralela?: boolean | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          niveis: Json
          nome: string
          tipo_contrato: Database["public"]["Enums"]["contract_type"]
        }
        Update: {
          aprovacao_paralela?: boolean | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          niveis?: Json
          nome?: string
          tipo_contrato?: Database["public"]["Enums"]["contract_type"]
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          acao: string
          approved_by: string | null
          created_at: string
          dados_anteriores: Json | null
          dados_novos: Json | null
          entidade: string
          entidade_id: string | null
          event_category: string | null
          id: string
          ip_address: string | null
          metadata: Json | null
          requires_review: boolean | null
          risk_level: string | null
          session_id: string | null
          success: boolean | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          acao: string
          approved_by?: string | null
          created_at?: string
          dados_anteriores?: Json | null
          dados_novos?: Json | null
          entidade: string
          entidade_id?: string | null
          event_category?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          requires_review?: boolean | null
          risk_level?: string | null
          session_id?: string | null
          success?: boolean | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          acao?: string
          approved_by?: string | null
          created_at?: string
          dados_anteriores?: Json | null
          dados_novos?: Json | null
          entidade?: string
          entidade_id?: string | null
          event_category?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          requires_review?: boolean | null
          risk_level?: string | null
          session_id?: string | null
          success?: boolean | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      compliance_logs: {
        Row: {
          base_legal: string | null
          created_at: string
          dados_afetados: Json | null
          entidade: string
          entidade_id: string | null
          id: string
          ip_address: string | null
          justificativa: string | null
          tipo_evento: string
          user_id: string | null
        }
        Insert: {
          base_legal?: string | null
          created_at?: string
          dados_afetados?: Json | null
          entidade: string
          entidade_id?: string | null
          id?: string
          ip_address?: string | null
          justificativa?: string | null
          tipo_evento: string
          user_id?: string | null
        }
        Update: {
          base_legal?: string | null
          created_at?: string
          dados_afetados?: Json | null
          entidade?: string
          entidade_id?: string | null
          id?: string
          ip_address?: string | null
          justificativa?: string | null
          tipo_evento?: string
          user_id?: string | null
        }
        Relationships: []
      }
      contract_alerts: {
        Row: {
          contrato_id: string | null
          created_at: string
          data_alerta: string
          data_envio: string | null
          dias_antecedencia: number | null
          email_enviado: boolean | null
          email_enviado_em: string | null
          enviado: boolean | null
          id: string
          mensagem: string | null
          tipo_alerta: string
          titulo: string
          usuarios_notificados: string[] | null
        }
        Insert: {
          contrato_id?: string | null
          created_at?: string
          data_alerta: string
          data_envio?: string | null
          dias_antecedencia?: number | null
          email_enviado?: boolean | null
          email_enviado_em?: string | null
          enviado?: boolean | null
          id?: string
          mensagem?: string | null
          tipo_alerta: string
          titulo: string
          usuarios_notificados?: string[] | null
        }
        Update: {
          contrato_id?: string | null
          created_at?: string
          data_alerta?: string
          data_envio?: string | null
          dias_antecedencia?: number | null
          email_enviado?: boolean | null
          email_enviado_em?: string | null
          enviado?: boolean | null
          id?: string
          mensagem?: string | null
          tipo_alerta?: string
          titulo?: string
          usuarios_notificados?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_alerts_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_analysis: {
        Row: {
          analisado_em: string
          analisado_por: string | null
          clausulas_importantes: Json | null
          contrato_id: string | null
          id: string
          riscos_identificados: Json | null
          score_risco: number | null
          sugestoes_melhoria: Json | null
        }
        Insert: {
          analisado_em?: string
          analisado_por?: string | null
          clausulas_importantes?: Json | null
          contrato_id?: string | null
          id?: string
          riscos_identificados?: Json | null
          score_risco?: number | null
          sugestoes_melhoria?: Json | null
        }
        Update: {
          analisado_em?: string
          analisado_por?: string | null
          clausulas_importantes?: Json | null
          contrato_id?: string | null
          id?: string
          riscos_identificados?: Json | null
          score_risco?: number | null
          sugestoes_melhoria?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_analysis_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
        ]
      }
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
      contract_attachments: {
        Row: {
          arquivo_url: string
          contrato_id: string | null
          created_at: string
          id: string
          mime_type: string | null
          nome_arquivo: string
          tamanho_bytes: number | null
          tipo_documento: string | null
          uploaded_by: string | null
        }
        Insert: {
          arquivo_url: string
          contrato_id?: string | null
          created_at?: string
          id?: string
          mime_type?: string | null
          nome_arquivo: string
          tamanho_bytes?: number | null
          tipo_documento?: string | null
          uploaded_by?: string | null
        }
        Update: {
          arquivo_url?: string
          contrato_id?: string | null
          created_at?: string
          id?: string
          mime_type?: string | null
          nome_arquivo?: string
          tamanho_bytes?: number | null
          tipo_documento?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_attachments_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_comments: {
        Row: {
          conteudo: string
          contrato_id: string
          created_at: string
          id: string
          parent_id: string | null
          secao: string | null
          status: string
          tipo: string
          updated_at: string
          user_id: string
        }
        Insert: {
          conteudo: string
          contrato_id: string
          created_at?: string
          id?: string
          parent_id?: string | null
          secao?: string | null
          status?: string
          tipo?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          conteudo?: string
          contrato_id?: string
          created_at?: string
          id?: string
          parent_id?: string | null
          secao?: string | null
          status?: string
          tipo?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_comments_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "contract_comments"
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
      contract_obligations: {
        Row: {
          concluido_em: string | null
          contrato_id: string | null
          created_at: string
          data_vencimento: string
          descricao: string | null
          id: string
          responsavel_id: string | null
          status: string | null
          tipo: string | null
          titulo: string
          valor: number | null
        }
        Insert: {
          concluido_em?: string | null
          contrato_id?: string | null
          created_at?: string
          data_vencimento: string
          descricao?: string | null
          id?: string
          responsavel_id?: string | null
          status?: string | null
          tipo?: string | null
          titulo: string
          valor?: number | null
        }
        Update: {
          concluido_em?: string | null
          contrato_id?: string | null
          created_at?: string
          data_vencimento?: string
          descricao?: string | null
          id?: string
          responsavel_id?: string | null
          status?: string | null
          tipo?: string | null
          titulo?: string
          valor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_obligations_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_redlines: {
        Row: {
          alteracoes: Json | null
          conteudo_marcado: string
          conteudo_original: string
          contrato_id: string
          created_at: string
          created_by: string | null
          id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          versao: number
        }
        Insert: {
          alteracoes?: Json | null
          conteudo_marcado: string
          conteudo_original: string
          contrato_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          versao?: number
        }
        Update: {
          alteracoes?: Json | null
          conteudo_marcado?: string
          conteudo_original?: string
          contrato_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          versao?: number
        }
        Relationships: [
          {
            foreignKeyName: "contract_redlines_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_signatures: {
        Row: {
          completed_at: string | null
          contrato_id: string
          created_at: string
          created_by: string | null
          document_url: string | null
          external_id: string
          id: string
          metadata: Json | null
          provider: string
          sent_at: string | null
          signed_document_url: string | null
          signers: Json
          status: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          contrato_id: string
          created_at?: string
          created_by?: string | null
          document_url?: string | null
          external_id: string
          id?: string
          metadata?: Json | null
          provider: string
          sent_at?: string | null
          signed_document_url?: string | null
          signers?: Json
          status?: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          contrato_id?: string
          created_at?: string
          created_by?: string | null
          document_url?: string | null
          external_id?: string
          id?: string
          metadata?: Json | null
          provider?: string
          sent_at?: string | null
          signed_document_url?: string | null
          signers?: Json
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_signatures_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_templates: {
        Row: {
          campos_variaveis: Json | null
          conteudo_template: string
          created_at: string
          created_by: string | null
          descricao: string | null
          id: string
          is_active: boolean | null
          nome: string
          tipo: Database["public"]["Enums"]["contract_type"]
          updated_at: string
        }
        Insert: {
          campos_variaveis?: Json | null
          conteudo_template: string
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          id?: string
          is_active?: boolean | null
          nome: string
          tipo: Database["public"]["Enums"]["contract_type"]
          updated_at?: string
        }
        Update: {
          campos_variaveis?: Json | null
          conteudo_template?: string
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          id?: string
          is_active?: boolean | null
          nome?: string
          tipo?: Database["public"]["Enums"]["contract_type"]
          updated_at?: string
        }
        Relationships: []
      }
      contract_versions: {
        Row: {
          alteracoes: Json | null
          contrato_id: string
          created_at: string
          created_by: string | null
          id: string
          motivo: string | null
          snapshot: Json
          versao: number
        }
        Insert: {
          alteracoes?: Json | null
          contrato_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          motivo?: string | null
          snapshot: Json
          versao: number
        }
        Update: {
          alteracoes?: Json | null
          contrato_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          motivo?: string | null
          snapshot?: Json
          versao?: number
        }
        Relationships: [
          {
            foreignKeyName: "contract_versions_contrato_id_fkey"
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
      data_retention_policies: {
        Row: {
          acao_pos_retencao: string
          base_legal: string | null
          created_at: string
          created_by: string | null
          descricao: string | null
          entidade: string
          id: string
          is_active: boolean | null
          nome: string
          periodo_retencao_meses: number
          ultima_execucao: string | null
        }
        Insert: {
          acao_pos_retencao?: string
          base_legal?: string | null
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          entidade: string
          id?: string
          is_active?: boolean | null
          nome: string
          periodo_retencao_meses?: number
          ultima_execucao?: string | null
        }
        Update: {
          acao_pos_retencao?: string
          base_legal?: string | null
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          entidade?: string
          id?: string
          is_active?: boolean | null
          nome?: string
          periodo_retencao_meses?: number
          ultima_execucao?: string | null
        }
        Relationships: []
      }
      especificacoes_servico: {
        Row: {
          categoria: string
          created_at: string | null
          created_by: string | null
          descricao: string | null
          dias_alerta_padrao: number | null
          id: string
          is_active: boolean | null
          nome: string
          orgao_regulador: string | null
          requer_certificado: boolean | null
          updated_at: string | null
          validade_padrao_meses: number | null
        }
        Insert: {
          categoria: string
          created_at?: string | null
          created_by?: string | null
          descricao?: string | null
          dias_alerta_padrao?: number | null
          id?: string
          is_active?: boolean | null
          nome: string
          orgao_regulador?: string | null
          requer_certificado?: boolean | null
          updated_at?: string | null
          validade_padrao_meses?: number | null
        }
        Update: {
          categoria?: string
          created_at?: string | null
          created_by?: string | null
          descricao?: string | null
          dias_alerta_padrao?: number | null
          id?: string
          is_active?: boolean | null
          nome?: string
          orgao_regulador?: string | null
          requer_certificado?: boolean | null
          updated_at?: string | null
          validade_padrao_meses?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "especificacoes_servico_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      fornecedor_anexos: {
        Row: {
          arquivo_url: string
          created_at: string | null
          fornecedor_id: string
          id: string
          nome_arquivo: string
          tamanho_bytes: number | null
          tipo_documento: string | null
          uploaded_by: string | null
        }
        Insert: {
          arquivo_url: string
          created_at?: string | null
          fornecedor_id: string
          id?: string
          nome_arquivo: string
          tamanho_bytes?: number | null
          tipo_documento?: string | null
          uploaded_by?: string | null
        }
        Update: {
          arquivo_url?: string
          created_at?: string | null
          fornecedor_id?: string
          id?: string
          nome_arquivo?: string
          tamanho_bytes?: number | null
          tipo_documento?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fornecedor_anexos_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
        ]
      }
      fornecedor_categorias_servico: {
        Row: {
          categoria: string
          created_at: string | null
          fornecedor_id: string
          id: string
        }
        Insert: {
          categoria: string
          created_at?: string | null
          fornecedor_id: string
          id?: string
        }
        Update: {
          categoria?: string
          created_at?: string | null
          fornecedor_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fornecedor_categorias_servico_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
        ]
      }
      fornecedores: {
        Row: {
          agencia: string | null
          banco: string | null
          cep: string | null
          cidade: string | null
          cnpj: string | null
          conta: string | null
          contato_cargo: string | null
          contato_email: string | null
          contato_nome: string | null
          contato_telefone: string | null
          cpf: string | null
          created_at: string
          created_by: string | null
          documentos: Json | null
          email: string | null
          endereco: string | null
          estado: string | null
          id: string
          inscricao_estadual: string | null
          inscricao_municipal: string | null
          is_active: boolean | null
          nome: string
          notas: string | null
          pix: string | null
          porte_empresa: string | null
          telefone: string | null
          tipo_pessoa: string | null
          titular_conta: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          agencia?: string | null
          banco?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          conta?: string | null
          contato_cargo?: string | null
          contato_email?: string | null
          contato_nome?: string | null
          contato_telefone?: string | null
          cpf?: string | null
          created_at?: string
          created_by?: string | null
          documentos?: Json | null
          email?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          inscricao_estadual?: string | null
          inscricao_municipal?: string | null
          is_active?: boolean | null
          nome: string
          notas?: string | null
          pix?: string | null
          porte_empresa?: string | null
          telefone?: string | null
          tipo_pessoa?: string | null
          titular_conta?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          agencia?: string | null
          banco?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          conta?: string | null
          contato_cargo?: string | null
          contato_email?: string | null
          contato_nome?: string | null
          contato_telefone?: string | null
          cpf?: string | null
          created_at?: string
          created_by?: string | null
          documentos?: Json | null
          email?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          inscricao_estadual?: string | null
          inscricao_municipal?: string | null
          is_active?: boolean | null
          nome?: string
          notas?: string | null
          pix?: string | null
          porte_empresa?: string | null
          telefone?: string | null
          tipo_pessoa?: string | null
          titular_conta?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      integracao_config: {
        Row: {
          created_at: string | null
          headers_customizados: Json | null
          id: string
          is_active: boolean | null
          mapeamento_campos: Json | null
          nome: string
          status_ultimo_teste: string | null
          tipo: string
          tipo_autenticacao: string | null
          ultimo_teste: string | null
          updated_at: string | null
          url_api: string | null
        }
        Insert: {
          created_at?: string | null
          headers_customizados?: Json | null
          id?: string
          is_active?: boolean | null
          mapeamento_campos?: Json | null
          nome: string
          status_ultimo_teste?: string | null
          tipo: string
          tipo_autenticacao?: string | null
          ultimo_teste?: string | null
          updated_at?: string | null
          url_api?: string | null
        }
        Update: {
          created_at?: string | null
          headers_customizados?: Json | null
          id?: string
          is_active?: boolean | null
          mapeamento_campos?: Json | null
          nome?: string
          status_ultimo_teste?: string | null
          tipo?: string
          tipo_autenticacao?: string | null
          ultimo_teste?: string | null
          updated_at?: string | null
          url_api?: string | null
        }
        Relationships: []
      }
      login_attempts: {
        Row: {
          created_at: string | null
          email: string | null
          failure_reason: string | null
          id: string
          ip_address: unknown
          success: boolean | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          failure_reason?: string | null
          id?: string
          ip_address?: unknown
          success?: boolean | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          failure_reason?: string | null
          id?: string
          ip_address?: unknown
          success?: boolean | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      mfa_requirements: {
        Row: {
          created_at: string | null
          grace_period_days: number | null
          id: string
          is_required: boolean | null
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          grace_period_days?: number | null
          id?: string
          is_required?: boolean | null
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          grace_period_days?: number | null
          id?: string
          is_required?: boolean | null
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
        }
        Relationships: []
      }
      negotiation_metrics: {
        Row: {
          contrato_id: string | null
          created_at: string
          created_by: string | null
          data_fim_negociacao: string | null
          data_inicio_negociacao: string | null
          economia_percentual: number | null
          id: string
          notas: string | null
          numero_revisoes: number | null
          partes_envolvidas: Json | null
          principais_pontos_negociados: Json | null
          resultado: string | null
          satisfacao_partes: number | null
          tempo_por_etapa: Json | null
          tempo_total_dias: number | null
          updated_at: string
          valor_final: number | null
          valor_inicial: number | null
        }
        Insert: {
          contrato_id?: string | null
          created_at?: string
          created_by?: string | null
          data_fim_negociacao?: string | null
          data_inicio_negociacao?: string | null
          economia_percentual?: number | null
          id?: string
          notas?: string | null
          numero_revisoes?: number | null
          partes_envolvidas?: Json | null
          principais_pontos_negociados?: Json | null
          resultado?: string | null
          satisfacao_partes?: number | null
          tempo_por_etapa?: Json | null
          tempo_total_dias?: number | null
          updated_at?: string
          valor_final?: number | null
          valor_inicial?: number | null
        }
        Update: {
          contrato_id?: string | null
          created_at?: string
          created_by?: string | null
          data_fim_negociacao?: string | null
          data_inicio_negociacao?: string | null
          economia_percentual?: number | null
          id?: string
          notas?: string | null
          numero_revisoes?: number | null
          partes_envolvidas?: Json | null
          principais_pontos_negociados?: Json | null
          resultado?: string | null
          satisfacao_partes?: number | null
          tempo_por_etapa?: Json | null
          tempo_total_dias?: number | null
          updated_at?: string
          valor_final?: number | null
          valor_inicial?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "negotiation_metrics_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          alert_types: string[]
          created_at: string
          email_enabled: boolean
          frequency: Database["public"]["Enums"]["notification_frequency"]
          id: string
          updated_at: string
          user_id: string
          whatsapp_enabled: boolean
        }
        Insert: {
          alert_types?: string[]
          created_at?: string
          email_enabled?: boolean
          frequency?: Database["public"]["Enums"]["notification_frequency"]
          id?: string
          updated_at?: string
          user_id: string
          whatsapp_enabled?: boolean
        }
        Update: {
          alert_types?: string[]
          created_at?: string
          email_enabled?: boolean
          frequency?: Database["public"]["Enums"]["notification_frequency"]
          id?: string
          updated_at?: string
          user_id?: string
          whatsapp_enabled?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          category: string
          created_at: string | null
          description: string | null
          id: string
          name: string
        }
        Insert: {
          category: string
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
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
      rate_limits: {
        Row: {
          count: number | null
          created_at: string | null
          endpoint_key: string
          id: string
          ip_address: unknown
          user_id: string | null
          window_start: string | null
        }
        Insert: {
          count?: number | null
          created_at?: string | null
          endpoint_key: string
          id?: string
          ip_address?: unknown
          user_id?: string | null
          window_start?: string | null
        }
        Update: {
          count?: number | null
          created_at?: string | null
          endpoint_key?: string
          id?: string
          ip_address?: unknown
          user_id?: string | null
          window_start?: string | null
        }
        Relationships: []
      }
      report_configurations: {
        Row: {
          agendamento: string | null
          colunas: Json | null
          created_at: string
          created_by: string | null
          descricao: string | null
          destinatarios: string[] | null
          filtros: Json | null
          id: string
          is_public: boolean | null
          nome: string
          ordenacao: Json | null
          tipo_relatorio: string
          updated_at: string
          visualizacao: string | null
        }
        Insert: {
          agendamento?: string | null
          colunas?: Json | null
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          destinatarios?: string[] | null
          filtros?: Json | null
          id?: string
          is_public?: boolean | null
          nome: string
          ordenacao?: Json | null
          tipo_relatorio?: string
          updated_at?: string
          visualizacao?: string | null
        }
        Update: {
          agendamento?: string | null
          colunas?: Json | null
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          destinatarios?: string[] | null
          filtros?: Json | null
          id?: string
          is_public?: boolean | null
          nome?: string
          ordenacao?: Json | null
          tipo_relatorio?: string
          updated_at?: string
          visualizacao?: string | null
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          created_at: string | null
          id: string
          permission_id: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          created_at?: string | null
          id?: string
          permission_id: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          created_at?: string | null
          id?: string
          permission_id?: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
        ]
      }
      security_alerts: {
        Row: {
          assigned_to: string | null
          created_at: string | null
          details: Json | null
          event_id: string | null
          id: string
          resolution_notes: string | null
          resolved_at: string | null
          rule_id: string
          rule_name: string
          severity: string
          status: string | null
          timestamp: string | null
          user_id: string | null
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string | null
          details?: Json | null
          event_id?: string | null
          id?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          rule_id: string
          rule_name: string
          severity: string
          status?: string | null
          timestamp?: string | null
          user_id?: string | null
        }
        Update: {
          assigned_to?: string | null
          created_at?: string | null
          details?: Json | null
          event_id?: string | null
          id?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          rule_id?: string
          rule_name?: string
          severity?: string
          status?: string | null
          timestamp?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "security_alerts_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "audit_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      servico_historico: {
        Row: {
          anexos: Json | null
          created_at: string | null
          data_execucao: string
          executado_por: string | null
          fornecedor_id: string | null
          fotos: Json | null
          id: string
          numero_nota_fiscal: string | null
          observacoes: string | null
          proxima_validade: string | null
          servico_id: string
          tipo_acao: string
          valor: number | null
        }
        Insert: {
          anexos?: Json | null
          created_at?: string | null
          data_execucao: string
          executado_por?: string | null
          fornecedor_id?: string | null
          fotos?: Json | null
          id?: string
          numero_nota_fiscal?: string | null
          observacoes?: string | null
          proxima_validade?: string | null
          servico_id: string
          tipo_acao: string
          valor?: number | null
        }
        Update: {
          anexos?: Json | null
          created_at?: string | null
          data_execucao?: string
          executado_por?: string | null
          fornecedor_id?: string | null
          fotos?: Json | null
          id?: string
          numero_nota_fiscal?: string | null
          observacoes?: string | null
          proxima_validade?: string | null
          servico_id?: string
          tipo_acao?: string
          valor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "servico_historico_executado_por_fkey"
            columns: ["executado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "servico_historico_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "servico_historico_servico_id_fkey"
            columns: ["servico_id"]
            isOneToOne: false
            referencedRelation: "servicos_periodicos"
            referencedColumns: ["id"]
          },
        ]
      }
      servicos_periodicos: {
        Row: {
          created_at: string | null
          created_by: string | null
          data_alerta: string
          data_ultima_troca: string
          data_validade: string
          dias_antecedencia_alerta: number | null
          especificacao_id: string
          fornecedor_preferencial_id: string | null
          id: string
          itens_detalhados: string | null
          localizacao_fisica: string | null
          observacoes: string | null
          prioridade: string | null
          quantidade: number | null
          responsavel_id: string | null
          status: string | null
          tags: string[] | null
          unidade_id: string
          updated_at: string | null
          validade_meses: number
          valor_estimado: number | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          data_alerta: string
          data_ultima_troca: string
          data_validade: string
          dias_antecedencia_alerta?: number | null
          especificacao_id: string
          fornecedor_preferencial_id?: string | null
          id?: string
          itens_detalhados?: string | null
          localizacao_fisica?: string | null
          observacoes?: string | null
          prioridade?: string | null
          quantidade?: number | null
          responsavel_id?: string | null
          status?: string | null
          tags?: string[] | null
          unidade_id: string
          updated_at?: string | null
          validade_meses: number
          valor_estimado?: number | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          data_alerta?: string
          data_ultima_troca?: string
          data_validade?: string
          dias_antecedencia_alerta?: number | null
          especificacao_id?: string
          fornecedor_preferencial_id?: string | null
          id?: string
          itens_detalhados?: string | null
          localizacao_fisica?: string | null
          observacoes?: string | null
          prioridade?: string | null
          quantidade?: number | null
          responsavel_id?: string | null
          status?: string | null
          tags?: string[] | null
          unidade_id?: string
          updated_at?: string | null
          validade_meses?: number
          valor_estimado?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "servicos_periodicos_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "servicos_periodicos_especificacao_id_fkey"
            columns: ["especificacao_id"]
            isOneToOne: false
            referencedRelation: "especificacoes_servico"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "servicos_periodicos_fornecedor_preferencial_id_fkey"
            columns: ["fornecedor_preferencial_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "servicos_periodicos_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "servicos_periodicos_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
        ]
      }
      sod_approvals: {
        Row: {
          amount: number | null
          approver_id: string | null
          created_at: string | null
          creator_id: string
          decided_at: string | null
          entity_id: string
          entity_type: string
          id: string
          notes: string | null
          status: string | null
          threshold_rule: string | null
        }
        Insert: {
          amount?: number | null
          approver_id?: string | null
          created_at?: string | null
          creator_id: string
          decided_at?: string | null
          entity_id: string
          entity_type: string
          id?: string
          notes?: string | null
          status?: string | null
          threshold_rule?: string | null
        }
        Update: {
          amount?: number | null
          approver_id?: string | null
          created_at?: string | null
          creator_id?: string
          decided_at?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          notes?: string | null
          status?: string | null
          threshold_rule?: string | null
        }
        Relationships: []
      }
      solicitacoes_compras: {
        Row: {
          codigo_solicitacao: string | null
          confirmado_em: string | null
          created_at: string | null
          enviado_em: string | null
          erro_mensagem: string | null
          id: string
          payload_enviado: Json | null
          resposta_api: Json | null
          servico_id: string
          status_envio: string | null
          tentativas: number | null
        }
        Insert: {
          codigo_solicitacao?: string | null
          confirmado_em?: string | null
          created_at?: string | null
          enviado_em?: string | null
          erro_mensagem?: string | null
          id?: string
          payload_enviado?: Json | null
          resposta_api?: Json | null
          servico_id: string
          status_envio?: string | null
          tentativas?: number | null
        }
        Update: {
          codigo_solicitacao?: string | null
          confirmado_em?: string | null
          created_at?: string | null
          enviado_em?: string | null
          erro_mensagem?: string | null
          id?: string
          payload_enviado?: Json | null
          resposta_api?: Json | null
          servico_id?: string
          status_envio?: string | null
          tentativas?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "solicitacoes_compras_servico_id_fkey"
            columns: ["servico_id"]
            isOneToOne: false
            referencedRelation: "servicos_periodicos"
            referencedColumns: ["id"]
          },
        ]
      }
      unidades: {
        Row: {
          cep: string | null
          cidade: string | null
          created_at: string | null
          created_by: string | null
          email_contato: string | null
          endereco: string | null
          estado: string | null
          id: string
          is_active: boolean | null
          nome: string
          responsavel_id: string | null
          telefone: string | null
          tipo: string | null
          updated_at: string | null
        }
        Insert: {
          cep?: string | null
          cidade?: string | null
          created_at?: string | null
          created_by?: string | null
          email_contato?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          is_active?: boolean | null
          nome: string
          responsavel_id?: string | null
          telefone?: string | null
          tipo?: string | null
          updated_at?: string | null
        }
        Update: {
          cep?: string | null
          cidade?: string | null
          created_at?: string | null
          created_by?: string | null
          email_contato?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          is_active?: boolean | null
          nome?: string
          responsavel_id?: string | null
          telefone?: string | null
          tipo?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "unidades_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unidades_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_2fa_settings: {
        Row: {
          backup_codes: string[] | null
          created_at: string
          id: string
          is_enabled: boolean
          totp_secret: string | null
          updated_at: string
          user_id: string
          verified_at: string | null
        }
        Insert: {
          backup_codes?: string[] | null
          created_at?: string
          id?: string
          is_enabled?: boolean
          totp_secret?: string | null
          updated_at?: string
          user_id: string
          verified_at?: string | null
        }
        Update: {
          backup_codes?: string[] | null
          created_at?: string
          id?: string
          is_enabled?: boolean
          totp_secret?: string | null
          updated_at?: string
          user_id?: string
          verified_at?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          modulo_padrao: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          modulo_padrao?: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          modulo_padrao?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      uso_sistema: {
        Row: {
          contrato_id: string | null
          created_at: string | null
          custo_total: number | null
          custo_unitario: number | null
          id: string
          metadata: Json | null
          quantidade: number | null
          recurso: string
          servico_id: string | null
          tipo: string
          user_id: string | null
        }
        Insert: {
          contrato_id?: string | null
          created_at?: string | null
          custo_total?: number | null
          custo_unitario?: number | null
          id?: string
          metadata?: Json | null
          quantidade?: number | null
          recurso: string
          servico_id?: string | null
          tipo: string
          user_id?: string | null
        }
        Update: {
          contrato_id?: string | null
          created_at?: string | null
          custo_total?: number | null
          custo_unitario?: number | null
          id?: string
          metadata?: Json | null
          quantidade?: number | null
          recurso?: string
          servico_id?: string | null
          tipo?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "uso_sistema_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "uso_sistema_servico_id_fkey"
            columns: ["servico_id"]
            isOneToOne: false
            referencedRelation: "servicos_periodicos"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cleanup_old_rate_limits: { Args: never; Returns: undefined }
      gdpr_delete_user: { Args: { user_uuid: string }; Returns: Json }
      has_any_role: {
        Args: {
          _roles: Database["public"]["Enums"]["app_role"][]
          _user_id: string
        }
        Returns: boolean
      }
      has_permission: {
        Args: { _permission: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      is_login_blocked: {
        Args: {
          _email: string
          _max_attempts?: number
          _window_minutes?: number
        }
        Returns: boolean
      }
      is_mfa_required_for_user: { Args: { _user_id: string }; Returns: boolean }
      mask_pii: {
        Args: { field_type?: string; value: string }
        Returns: string
      }
      record_login_attempt: {
        Args: {
          _email: string
          _failure_reason?: string
          _ip_address?: unknown
          _success: boolean
          _user_agent?: string
          _user_id?: string
        }
        Returns: string
      }
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
      extended_role:
        | "system_admin"
        | "financeiro_senior"
        | "financeiro_junior"
        | "compras_manager"
        | "compras_analyst"
        | "cobranca"
        | "rh_manager"
        | "rh_analyst"
        | "auditor"
        | "executive"
        | "readonly"
        | "analista_juridico"
        | "consultoria_juridica"
        | "administrador"
      notification_frequency: "immediate" | "daily" | "weekly"
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
      extended_role: [
        "system_admin",
        "financeiro_senior",
        "financeiro_junior",
        "compras_manager",
        "compras_analyst",
        "cobranca",
        "rh_manager",
        "rh_analyst",
        "auditor",
        "executive",
        "readonly",
        "analista_juridico",
        "consultoria_juridica",
        "administrador",
      ],
      notification_frequency: ["immediate", "daily", "weekly"],
    },
  },
} as const
