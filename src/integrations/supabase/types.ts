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
      ai_extractions: {
        Row: {
          campo: string
          confianca: number | null
          contrato_id: string
          created_at: string
          created_by: string | null
          id: string
          modelo: string | null
          organization_id: string
          revisado_em: string | null
          revisado_por: string | null
          status: string
          trecho_origem: string | null
          updated_at: string
          valor_aceito: string | null
          valor_extraido: string | null
        }
        Insert: {
          campo: string
          confianca?: number | null
          contrato_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          modelo?: string | null
          organization_id: string
          revisado_em?: string | null
          revisado_por?: string | null
          status?: string
          trecho_origem?: string | null
          updated_at?: string
          valor_aceito?: string | null
          valor_extraido?: string | null
        }
        Update: {
          campo?: string
          confianca?: number | null
          contrato_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          modelo?: string | null
          organization_id?: string
          revisado_em?: string | null
          revisado_por?: string | null
          status?: string
          trecho_origem?: string | null
          updated_at?: string
          valor_aceito?: string | null
          valor_extraido?: string | null
        }
        Relationships: []
      }
      ai_risk_reviews: {
        Row: {
          clausula: string | null
          confianca: number | null
          contrato_id: string
          created_at: string
          created_by: string | null
          descricao: string | null
          id: string
          organization_id: string
          recomendacao: string | null
          revisado_em: string | null
          revisado_por: string | null
          severidade: string
          status: string
          tipo_risco: string | null
          trecho_origem: string | null
          updated_at: string
        }
        Insert: {
          clausula?: string | null
          confianca?: number | null
          contrato_id: string
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          id?: string
          organization_id: string
          recomendacao?: string | null
          revisado_em?: string | null
          revisado_por?: string | null
          severidade?: string
          status?: string
          tipo_risco?: string | null
          trecho_origem?: string | null
          updated_at?: string
        }
        Update: {
          clausula?: string | null
          confianca?: number | null
          contrato_id?: string
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          id?: string
          organization_id?: string
          recomendacao?: string | null
          revisado_em?: string | null
          revisado_por?: string | null
          severidade?: string
          status?: string
          tipo_risco?: string | null
          trecho_origem?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      approval_decisions: {
        Row: {
          aprovador_id: string
          created_at: string
          decisao: string
          id: string
          motivo: string | null
          organization_id: string
          step_id: string
        }
        Insert: {
          aprovador_id: string
          created_at?: string
          decisao: string
          id?: string
          motivo?: string | null
          organization_id: string
          step_id: string
        }
        Update: {
          aprovador_id?: string
          created_at?: string
          decisao?: string
          id?: string
          motivo?: string | null
          organization_id?: string
          step_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "approval_decisions_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "approval_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_step_approvers: {
        Row: {
          aprovador_id: string
          created_at: string
          decided_at: string | null
          id: string
          organization_id: string
          status: string
          step_id: string
        }
        Insert: {
          aprovador_id: string
          created_at?: string
          decided_at?: string | null
          id?: string
          organization_id: string
          status?: string
          step_id: string
        }
        Update: {
          aprovador_id?: string
          created_at?: string
          decided_at?: string | null
          id?: string
          organization_id?: string
          status?: string
          step_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "approval_step_approvers_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "approval_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_steps: {
        Row: {
          contrato_id: string
          created_at: string
          created_by: string | null
          due_at: string | null
          id: string
          minimo_aprovacoes: number
          modo: string
          ordem: number
          organization_id: string
          status: string
          updated_at: string
          workflow_id: string | null
        }
        Insert: {
          contrato_id: string
          created_at?: string
          created_by?: string | null
          due_at?: string | null
          id?: string
          minimo_aprovacoes?: number
          modo?: string
          ordem?: number
          organization_id: string
          status?: string
          updated_at?: string
          workflow_id?: string | null
        }
        Update: {
          contrato_id?: string
          created_at?: string
          created_by?: string | null
          due_at?: string | null
          id?: string
          minimo_aprovacoes?: number
          modo?: string
          ordem?: number
          organization_id?: string
          status?: string
          updated_at?: string
          workflow_id?: string | null
        }
        Relationships: []
      }
      approval_workflows: {
        Row: {
          aprovacao_paralela: boolean | null
          created_at: string
          id: string
          is_active: boolean | null
          niveis: Json
          nome: string
          organization_id: string
          tipo_contrato: Database["public"]["Enums"]["contract_type"]
        }
        Insert: {
          aprovacao_paralela?: boolean | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          niveis: Json
          nome: string
          organization_id: string
          tipo_contrato: Database["public"]["Enums"]["contract_type"]
        }
        Update: {
          aprovacao_paralela?: boolean | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          niveis?: Json
          nome?: string
          organization_id?: string
          tipo_contrato?: Database["public"]["Enums"]["contract_type"]
        }
        Relationships: [
          {
            foreignKeyName: "approval_workflows_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_workflows_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "super_admin_organizations_view"
            referencedColumns: ["id"]
          },
        ]
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
          organization_id: string
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
          organization_id: string
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
          organization_id?: string
          requires_review?: boolean | null
          risk_level?: string | null
          session_id?: string | null
          success?: boolean | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "super_admin_organizations_view"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_alerts_log: {
        Row: {
          data_alvo: string
          destinatarios: string[]
          detalhes: Json | null
          enviado_em: string
          id: string
          organization_id: string
          tipo: string
        }
        Insert: {
          data_alvo: string
          destinatarios?: string[]
          detalhes?: Json | null
          enviado_em?: string
          id?: string
          organization_id: string
          tipo: string
        }
        Update: {
          data_alvo?: string
          destinatarios?: string[]
          detalhes?: Json | null
          enviado_em?: string
          id?: string
          organization_id?: string
          tipo?: string
        }
        Relationships: []
      }
      cnpj_verification_log: {
        Row: {
          cnpj: string
          created_at: string
          created_by: string | null
          error_message: string | null
          fornecedor_id: string | null
          id: string
          organization_id: string
          response: Json | null
          status: string
        }
        Insert: {
          cnpj: string
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          fornecedor_id?: string | null
          id?: string
          organization_id: string
          response?: Json | null
          status: string
        }
        Update: {
          cnpj?: string
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          fornecedor_id?: string | null
          id?: string
          organization_id?: string
          response?: Json | null
          status?: string
        }
        Relationships: []
      }
      compliance_checklists: {
        Row: {
          aplicavel_tipo: Database["public"]["Enums"]["contract_type"] | null
          created_at: string
          created_by: string | null
          descricao: string | null
          id: string
          is_active: boolean
          nome: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          aplicavel_tipo?: Database["public"]["Enums"]["contract_type"] | null
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          id?: string
          is_active?: boolean
          nome: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          aplicavel_tipo?: Database["public"]["Enums"]["contract_type"] | null
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          id?: string
          is_active?: boolean
          nome?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "compliance_checklists_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_checklists_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "super_admin_organizations_view"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_items: {
        Row: {
          checklist_id: string
          codigo: string
          created_at: string
          descricao: string | null
          id: string
          obrigatorio: boolean
          ordem: number
          organization_id: string
          titulo: string
        }
        Insert: {
          checklist_id: string
          codigo: string
          created_at?: string
          descricao?: string | null
          id?: string
          obrigatorio?: boolean
          ordem?: number
          organization_id: string
          titulo: string
        }
        Update: {
          checklist_id?: string
          codigo?: string
          created_at?: string
          descricao?: string | null
          id?: string
          obrigatorio?: boolean
          ordem?: number
          organization_id?: string
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "compliance_items_checklist_id_fkey"
            columns: ["checklist_id"]
            isOneToOne: false
            referencedRelation: "compliance_checklists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "super_admin_organizations_view"
            referencedColumns: ["id"]
          },
        ]
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
          organization_id: string
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
          organization_id: string
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
          organization_id?: string
          tipo_evento?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "compliance_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "super_admin_organizations_view"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_ai_insights: {
        Row: {
          conteudo: Json
          contrato_id: string
          created_at: string
          created_by: string | null
          id: string
          model: string | null
          organization_id: string
          tipo: string
          tokens_usados: number | null
        }
        Insert: {
          conteudo: Json
          contrato_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          model?: string | null
          organization_id: string
          tipo: string
          tokens_usados?: number | null
        }
        Update: {
          conteudo?: Json
          contrato_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          model?: string | null
          organization_id?: string
          tipo?: string
          tokens_usados?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_ai_insights_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
        ]
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
          organization_id: string
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
          organization_id: string
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
          organization_id?: string
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
          {
            foreignKeyName: "contract_alerts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_alerts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "super_admin_organizations_view"
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
          organization_id: string
          payload_estruturado: Json
          riscos_identificados: Json | null
          score_risco: number | null
          skill_aplicada: string
          sugestoes_melhoria: Json | null
        }
        Insert: {
          analisado_em?: string
          analisado_por?: string | null
          clausulas_importantes?: Json | null
          contrato_id?: string | null
          id?: string
          organization_id: string
          payload_estruturado?: Json
          riscos_identificados?: Json | null
          score_risco?: number | null
          skill_aplicada?: string
          sugestoes_melhoria?: Json | null
        }
        Update: {
          analisado_em?: string
          analisado_por?: string | null
          clausulas_importantes?: Json | null
          contrato_id?: string | null
          id?: string
          organization_id?: string
          payload_estruturado?: Json
          riscos_identificados?: Json | null
          score_risco?: number | null
          skill_aplicada?: string
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
          {
            foreignKeyName: "contract_analysis_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_analysis_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "super_admin_organizations_view"
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
          organization_id: string
          status: string | null
        }
        Insert: {
          aprovador_id?: string | null
          comentario?: string | null
          contrato_id: string
          created_at?: string
          data_aprovacao?: string | null
          id?: string
          organization_id: string
          status?: string | null
        }
        Update: {
          aprovador_id?: string | null
          comentario?: string | null
          contrato_id?: string
          created_at?: string
          data_aprovacao?: string | null
          id?: string
          organization_id?: string
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
          {
            foreignKeyName: "contract_approvals_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_approvals_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "super_admin_organizations_view"
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
          is_original: boolean
          mime_type: string | null
          nome_arquivo: string
          organization_id: string
          sha256: string | null
          tamanho_bytes: number | null
          tipo_documento: string | null
          uploaded_by: string | null
          versao: number
        }
        Insert: {
          arquivo_url: string
          contrato_id?: string | null
          created_at?: string
          id?: string
          is_original?: boolean
          mime_type?: string | null
          nome_arquivo: string
          organization_id: string
          sha256?: string | null
          tamanho_bytes?: number | null
          tipo_documento?: string | null
          uploaded_by?: string | null
          versao?: number
        }
        Update: {
          arquivo_url?: string
          contrato_id?: string | null
          created_at?: string
          id?: string
          is_original?: boolean
          mime_type?: string | null
          nome_arquivo?: string
          organization_id?: string
          sha256?: string | null
          tamanho_bytes?: number | null
          tipo_documento?: string | null
          uploaded_by?: string | null
          versao?: number
        }
        Relationships: [
          {
            foreignKeyName: "contract_attachments_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_attachments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_attachments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "super_admin_organizations_view"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_checklist: {
        Row: {
          contrato_id: string
          created_at: string
          criterio: string
          id: string
          observacao: string | null
          organization_id: string
          satisfeito: boolean
          updated_at: string
          validado_em: string | null
          validado_por: string | null
        }
        Insert: {
          contrato_id: string
          created_at?: string
          criterio: string
          id?: string
          observacao?: string | null
          organization_id: string
          satisfeito?: boolean
          updated_at?: string
          validado_em?: string | null
          validado_por?: string | null
        }
        Update: {
          contrato_id?: string
          created_at?: string
          criterio?: string
          id?: string
          observacao?: string | null
          organization_id?: string
          satisfeito?: boolean
          updated_at?: string
          validado_em?: string | null
          validado_por?: string | null
        }
        Relationships: []
      }
      contract_comments: {
        Row: {
          conteudo: string
          contrato_id: string
          created_at: string
          id: string
          organization_id: string
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
          organization_id: string
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
          organization_id?: string
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
            foreignKeyName: "contract_comments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_comments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "super_admin_organizations_view"
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
      contract_compliance_status: {
        Row: {
          contrato_id: string
          created_at: string
          evidencia_url: string | null
          id: string
          item_id: string
          justificativa: string | null
          organization_id: string
          status: string
          updated_at: string
          verificado_em: string | null
          verificado_por: string | null
        }
        Insert: {
          contrato_id: string
          created_at?: string
          evidencia_url?: string | null
          id?: string
          item_id: string
          justificativa?: string | null
          organization_id: string
          status?: string
          updated_at?: string
          verificado_em?: string | null
          verificado_por?: string | null
        }
        Update: {
          contrato_id?: string
          created_at?: string
          evidencia_url?: string | null
          id?: string
          item_id?: string
          justificativa?: string | null
          organization_id?: string
          status?: string
          updated_at?: string
          verificado_em?: string | null
          verificado_por?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_compliance_status_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_compliance_status_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "compliance_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_compliance_status_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_compliance_status_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "super_admin_organizations_view"
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
          organization_id: string
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
          organization_id: string
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
          organization_id?: string
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
          {
            foreignKeyName: "contract_history_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_history_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "super_admin_organizations_view"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_negotiations: {
        Row: {
          arquivo_url: string | null
          autor_lado: string
          conteudo: string | null
          contrato_id: string
          created_at: string
          created_by: string | null
          id: string
          metadata: Json | null
          organization_id: string
          parent_id: string | null
          status: string
          tipo: string
          updated_at: string
          versao_id: string | null
        }
        Insert: {
          arquivo_url?: string | null
          autor_lado?: string
          conteudo?: string | null
          contrato_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          metadata?: Json | null
          organization_id: string
          parent_id?: string | null
          status?: string
          tipo: string
          updated_at?: string
          versao_id?: string | null
        }
        Update: {
          arquivo_url?: string | null
          autor_lado?: string
          conteudo?: string | null
          contrato_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          metadata?: Json | null
          organization_id?: string
          parent_id?: string | null
          status?: string
          tipo?: string
          updated_at?: string
          versao_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_negotiations_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_negotiations_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "contract_negotiations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_negotiations_versao_id_fkey"
            columns: ["versao_id"]
            isOneToOne: false
            referencedRelation: "contract_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_obligations: {
        Row: {
          concluido_em: string | null
          concluido_por: string | null
          contrato_id: string | null
          created_at: string
          data_vencimento: string
          descricao: string | null
          evidencia_url: string | null
          id: string
          observacao_conclusao: string | null
          organization_id: string
          responsavel_id: string | null
          responsavel_juridico_id: string | null
          status: string | null
          tipo: string | null
          titulo: string
          valor: number | null
        }
        Insert: {
          concluido_em?: string | null
          concluido_por?: string | null
          contrato_id?: string | null
          created_at?: string
          data_vencimento: string
          descricao?: string | null
          evidencia_url?: string | null
          id?: string
          observacao_conclusao?: string | null
          organization_id: string
          responsavel_id?: string | null
          responsavel_juridico_id?: string | null
          status?: string | null
          tipo?: string | null
          titulo: string
          valor?: number | null
        }
        Update: {
          concluido_em?: string | null
          concluido_por?: string | null
          contrato_id?: string | null
          created_at?: string
          data_vencimento?: string
          descricao?: string | null
          evidencia_url?: string | null
          id?: string
          observacao_conclusao?: string | null
          organization_id?: string
          responsavel_id?: string | null
          responsavel_juridico_id?: string | null
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
          {
            foreignKeyName: "contract_obligations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_obligations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "super_admin_organizations_view"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_reajustes: {
        Row: {
          contrato_id: string
          created_at: string
          created_by: string | null
          id: string
          indice: string
          observacao: string | null
          organization_id: string
          percentual: number
          valor_anterior: number | null
          valor_novo: number | null
          vigencia_inicio: string
        }
        Insert: {
          contrato_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          indice: string
          observacao?: string | null
          organization_id: string
          percentual: number
          valor_anterior?: number | null
          valor_novo?: number | null
          vigencia_inicio: string
        }
        Update: {
          contrato_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          indice?: string
          observacao?: string | null
          organization_id?: string
          percentual?: number
          valor_anterior?: number | null
          valor_novo?: number | null
          vigencia_inicio?: string
        }
        Relationships: []
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
          organization_id: string
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
          organization_id: string
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
          organization_id?: string
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
          {
            foreignKeyName: "contract_redlines_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_redlines_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "super_admin_organizations_view"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_renovacoes: {
        Row: {
          contrato_id_novo: string | null
          contrato_id_origem: string
          created_at: string
          created_by: string | null
          id: string
          observacao: string | null
          organization_id: string
          requisicao_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          contrato_id_novo?: string | null
          contrato_id_origem: string
          created_at?: string
          created_by?: string | null
          id?: string
          observacao?: string | null
          organization_id: string
          requisicao_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          contrato_id_novo?: string | null
          contrato_id_origem?: string
          created_at?: string
          created_by?: string | null
          id?: string
          observacao?: string | null
          organization_id?: string
          requisicao_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      contract_requests: {
        Row: {
          analisado_em: string | null
          analisado_por: string | null
          anexo_url: string | null
          contrato_id: string | null
          created_at: string
          data_necessidade: string | null
          departamento: string
          descricao: string
          form_version_id: string | null
          fornecedor_sugerido: string | null
          id: string
          ip_address: string | null
          justificativa: string | null
          numero_requisicao: string
          observacoes_analise: string | null
          organization_id: string | null
          respostas: Json | null
          solicitante_email: string
          solicitante_nome: string
          solicitante_telefone: string | null
          status: string
          tipo_contrato: Database["public"]["Enums"]["contract_type"]
          titulo: string
          urgencia: string
          user_agent: string | null
          valor_estimado: number | null
        }
        Insert: {
          analisado_em?: string | null
          analisado_por?: string | null
          anexo_url?: string | null
          contrato_id?: string | null
          created_at?: string
          data_necessidade?: string | null
          departamento: string
          descricao: string
          form_version_id?: string | null
          fornecedor_sugerido?: string | null
          id?: string
          ip_address?: string | null
          justificativa?: string | null
          numero_requisicao: string
          observacoes_analise?: string | null
          organization_id?: string | null
          respostas?: Json | null
          solicitante_email: string
          solicitante_nome: string
          solicitante_telefone?: string | null
          status?: string
          tipo_contrato?: Database["public"]["Enums"]["contract_type"]
          titulo: string
          urgencia?: string
          user_agent?: string | null
          valor_estimado?: number | null
        }
        Update: {
          analisado_em?: string | null
          analisado_por?: string | null
          anexo_url?: string | null
          contrato_id?: string | null
          created_at?: string
          data_necessidade?: string | null
          departamento?: string
          descricao?: string
          form_version_id?: string | null
          fornecedor_sugerido?: string | null
          id?: string
          ip_address?: string | null
          justificativa?: string | null
          numero_requisicao?: string
          observacoes_analise?: string | null
          organization_id?: string | null
          respostas?: Json | null
          solicitante_email?: string
          solicitante_nome?: string
          solicitante_telefone?: string | null
          status?: string
          tipo_contrato?: Database["public"]["Enums"]["contract_type"]
          titulo?: string
          urgencia?: string
          user_agent?: string | null
          valor_estimado?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_requests_analisado_por_fkey"
            columns: ["analisado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_requests_analisado_por_fkey"
            columns: ["analisado_por"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_requests_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_requests_form_version_id_fkey"
            columns: ["form_version_id"]
            isOneToOne: false
            referencedRelation: "request_form_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "super_admin_organizations_view"
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
          organization_id: string
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
          organization_id: string
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
          organization_id?: string
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
          {
            foreignKeyName: "contract_signatures_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_signatures_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "super_admin_organizations_view"
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
          organization_id: string
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
          organization_id: string
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
          organization_id?: string
          tipo?: Database["public"]["Enums"]["contract_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "super_admin_organizations_view"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_versions: {
        Row: {
          alteracoes: Json | null
          contrato_id: string
          created_at: string
          created_by: string | null
          id: string
          motivo: string | null
          organization_id: string
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
          organization_id: string
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
          organization_id?: string
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
          {
            foreignKeyName: "contract_versions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_versions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "super_admin_organizations_view"
            referencedColumns: ["id"]
          },
        ]
      }
      contratos: {
        Row: {
          arquivo_hash: string | null
          arquivo_url: string | null
          centro_custo: string | null
          condicao_pagamento: string | null
          created_at: string
          created_by: string | null
          dados_bancarios: Json | null
          dados_pessoais_envolvidos: boolean
          data_assinatura: string | null
          data_fim: string | null
          data_inicio: string | null
          data_renovacao: string | null
          departamento_responsavel: string | null
          descricao: string | null
          dia_vencimento: number | null
          dias_aviso_nao_renovacao: number | null
          due_diligence_concluida_em: string | null
          due_diligence_observacoes: string | null
          due_diligence_status: Database["public"]["Enums"]["due_diligence_enum"]
          email_financeiro_notificado_em: string | null
          forma_pagamento: string | null
          fornecedor_id: string | null
          id: string
          indice_reajuste: string | null
          intake_status: Database["public"]["Enums"]["intake_status_enum"]
          intermediario_envolvido: boolean
          juros_mora_pct: number | null
          metadata: Json | null
          moeda: string | null
          multa_atraso_pct: number | null
          nivel_confidencialidade:
            | Database["public"]["Enums"]["confidencialidade_enum"]
            | null
          nivel_risco: Database["public"]["Enums"]["nivel_risco_enum"] | null
          nivel_risco_manual: boolean
          numero_contrato: string
          numero_parcelas: number | null
          observacoes: string | null
          organization_id: string
          pacote_final_congelado_at: string | null
          pacote_final_hash: string | null
          pacote_final_url: string | null
          periodicidade_reajuste: string | null
          renovacao_automatica: boolean | null
          sanction_check_em: string | null
          sanction_check_status: Database["public"]["Enums"]["sanction_check_enum"]
          status: Database["public"]["Enums"]["contract_status"]
          tags: string[] | null
          terceirizacao: boolean
          tipo: Database["public"]["Enums"]["contract_type"]
          titulo: string
          unidade_id: string | null
          updated_at: string
          valor_parcela: number | null
          valor_total: number | null
          versao: number
        }
        Insert: {
          arquivo_hash?: string | null
          arquivo_url?: string | null
          centro_custo?: string | null
          condicao_pagamento?: string | null
          created_at?: string
          created_by?: string | null
          dados_bancarios?: Json | null
          dados_pessoais_envolvidos?: boolean
          data_assinatura?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          data_renovacao?: string | null
          departamento_responsavel?: string | null
          descricao?: string | null
          dia_vencimento?: number | null
          dias_aviso_nao_renovacao?: number | null
          due_diligence_concluida_em?: string | null
          due_diligence_observacoes?: string | null
          due_diligence_status?: Database["public"]["Enums"]["due_diligence_enum"]
          email_financeiro_notificado_em?: string | null
          forma_pagamento?: string | null
          fornecedor_id?: string | null
          id?: string
          indice_reajuste?: string | null
          intake_status?: Database["public"]["Enums"]["intake_status_enum"]
          intermediario_envolvido?: boolean
          juros_mora_pct?: number | null
          metadata?: Json | null
          moeda?: string | null
          multa_atraso_pct?: number | null
          nivel_confidencialidade?:
            | Database["public"]["Enums"]["confidencialidade_enum"]
            | null
          nivel_risco?: Database["public"]["Enums"]["nivel_risco_enum"] | null
          nivel_risco_manual?: boolean
          numero_contrato: string
          numero_parcelas?: number | null
          observacoes?: string | null
          organization_id: string
          pacote_final_congelado_at?: string | null
          pacote_final_hash?: string | null
          pacote_final_url?: string | null
          periodicidade_reajuste?: string | null
          renovacao_automatica?: boolean | null
          sanction_check_em?: string | null
          sanction_check_status?: Database["public"]["Enums"]["sanction_check_enum"]
          status?: Database["public"]["Enums"]["contract_status"]
          tags?: string[] | null
          terceirizacao?: boolean
          tipo?: Database["public"]["Enums"]["contract_type"]
          titulo: string
          unidade_id?: string | null
          updated_at?: string
          valor_parcela?: number | null
          valor_total?: number | null
          versao?: number
        }
        Update: {
          arquivo_hash?: string | null
          arquivo_url?: string | null
          centro_custo?: string | null
          condicao_pagamento?: string | null
          created_at?: string
          created_by?: string | null
          dados_bancarios?: Json | null
          dados_pessoais_envolvidos?: boolean
          data_assinatura?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          data_renovacao?: string | null
          departamento_responsavel?: string | null
          descricao?: string | null
          dia_vencimento?: number | null
          dias_aviso_nao_renovacao?: number | null
          due_diligence_concluida_em?: string | null
          due_diligence_observacoes?: string | null
          due_diligence_status?: Database["public"]["Enums"]["due_diligence_enum"]
          email_financeiro_notificado_em?: string | null
          forma_pagamento?: string | null
          fornecedor_id?: string | null
          id?: string
          indice_reajuste?: string | null
          intake_status?: Database["public"]["Enums"]["intake_status_enum"]
          intermediario_envolvido?: boolean
          juros_mora_pct?: number | null
          metadata?: Json | null
          moeda?: string | null
          multa_atraso_pct?: number | null
          nivel_confidencialidade?:
            | Database["public"]["Enums"]["confidencialidade_enum"]
            | null
          nivel_risco?: Database["public"]["Enums"]["nivel_risco_enum"] | null
          nivel_risco_manual?: boolean
          numero_contrato?: string
          numero_parcelas?: number | null
          observacoes?: string | null
          organization_id?: string
          pacote_final_congelado_at?: string | null
          pacote_final_hash?: string | null
          pacote_final_url?: string | null
          periodicidade_reajuste?: string | null
          renovacao_automatica?: boolean | null
          sanction_check_em?: string | null
          sanction_check_status?: Database["public"]["Enums"]["sanction_check_enum"]
          status?: Database["public"]["Enums"]["contract_status"]
          tags?: string[] | null
          terceirizacao?: boolean
          tipo?: Database["public"]["Enums"]["contract_type"]
          titulo?: string
          unidade_id?: string | null
          updated_at?: string
          valor_parcela?: number | null
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
          {
            foreignKeyName: "contratos_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "super_admin_organizations_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
        ]
      }
      dashboard_saved_views: {
        Row: {
          created_at: string
          filtros: Json
          id: string
          is_shared: boolean
          nome: string
          organization_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          filtros?: Json
          id?: string
          is_shared?: boolean
          nome: string
          organization_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          filtros?: Json
          id?: string
          is_shared?: boolean
          nome?: string
          organization_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
          organization_id: string
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
          organization_id: string
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
          organization_id?: string
          periodo_retencao_meses?: number
          ultima_execucao?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "data_retention_policies_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_retention_policies_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "super_admin_organizations_view"
            referencedColumns: ["id"]
          },
        ]
      }
      document_templates: {
        Row: {
          categoria: string | null
          created_at: string
          created_by: string | null
          current_version: number
          descricao: string | null
          id: string
          is_active: boolean
          nome: string
          organization_id: string
          tipo: Database["public"]["Enums"]["contract_type"] | null
          updated_at: string
        }
        Insert: {
          categoria?: string | null
          created_at?: string
          created_by?: string | null
          current_version?: number
          descricao?: string | null
          id?: string
          is_active?: boolean
          nome: string
          organization_id: string
          tipo?: Database["public"]["Enums"]["contract_type"] | null
          updated_at?: string
        }
        Update: {
          categoria?: string | null
          created_at?: string
          created_by?: string | null
          current_version?: number
          descricao?: string | null
          id?: string
          is_active?: boolean
          nome?: string
          organization_id?: string
          tipo?: Database["public"]["Enums"]["contract_type"] | null
          updated_at?: string
        }
        Relationships: []
      }
      enterprise_leads: {
        Row: {
          cnpj: string | null
          contacted_at: string | null
          created_at: string
          email: string
          empresa: string
          id: string
          mensagem: string | null
          nome: string
          num_usuarios_estimado: number | null
          source: string | null
          telefone: string | null
          user_id: string | null
        }
        Insert: {
          cnpj?: string | null
          contacted_at?: string | null
          created_at?: string
          email: string
          empresa: string
          id?: string
          mensagem?: string | null
          nome: string
          num_usuarios_estimado?: number | null
          source?: string | null
          telefone?: string | null
          user_id?: string | null
        }
        Update: {
          cnpj?: string | null
          contacted_at?: string | null
          created_at?: string
          email?: string
          empresa?: string
          id?: string
          mensagem?: string | null
          nome?: string
          num_usuarios_estimado?: number | null
          source?: string | null
          telefone?: string | null
          user_id?: string | null
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
          organization_id: string
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
          organization_id: string
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
          organization_id?: string
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
          {
            foreignKeyName: "especificacoes_servico_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "especificacoes_servico_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "especificacoes_servico_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "super_admin_organizations_view"
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
          organization_id: string
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
          organization_id: string
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
          organization_id?: string
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
          {
            foreignKeyName: "fornecedor_anexos_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fornecedor_anexos_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fornecedor_anexos_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "super_admin_organizations_view"
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
          organization_id: string
        }
        Insert: {
          categoria: string
          created_at?: string | null
          fornecedor_id: string
          id?: string
          organization_id: string
        }
        Update: {
          categoria?: string
          created_at?: string | null
          fornecedor_id?: string
          id?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fornecedor_categorias_servico_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fornecedor_categorias_servico_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fornecedor_categorias_servico_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fornecedor_categorias_servico_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "super_admin_organizations_view"
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
          cnpj_dados_receita: Json | null
          cnpj_situacao_data: string | null
          cnpj_status: string | null
          cnpj_verificado_em: string | null
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
          organization_id: string
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
          cnpj_dados_receita?: Json | null
          cnpj_situacao_data?: string | null
          cnpj_status?: string | null
          cnpj_verificado_em?: string | null
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
          organization_id: string
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
          cnpj_dados_receita?: Json | null
          cnpj_situacao_data?: string | null
          cnpj_status?: string | null
          cnpj_verificado_em?: string | null
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
          organization_id?: string
          pix?: string | null
          porte_empresa?: string | null
          telefone?: string | null
          tipo_pessoa?: string | null
          titular_conta?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fornecedores_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fornecedores_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "super_admin_organizations_view"
            referencedColumns: ["id"]
          },
        ]
      }
      franquias: {
        Row: {
          cnpj: string | null
          consultora_informada: boolean | null
          contrato_novo_assinado: boolean | null
          created_at: string | null
          created_by: string | null
          data_assinatura: string | null
          data_emissao_nf: string | null
          data_termino: string | null
          id: string
          nome_completo: string
          novo_contrato_enviado: boolean | null
          numero_nf: string | null
          observacoes: string | null
          organization_id: string
          regime_tributario: string | null
          renovacao_aceita: boolean | null
          responsavel_id: string | null
          status_contrato: string
          status_vigencia: string | null
          tipo_franquia: string | null
          updated_at: string | null
        }
        Insert: {
          cnpj?: string | null
          consultora_informada?: boolean | null
          contrato_novo_assinado?: boolean | null
          created_at?: string | null
          created_by?: string | null
          data_assinatura?: string | null
          data_emissao_nf?: string | null
          data_termino?: string | null
          id?: string
          nome_completo: string
          novo_contrato_enviado?: boolean | null
          numero_nf?: string | null
          observacoes?: string | null
          organization_id: string
          regime_tributario?: string | null
          renovacao_aceita?: boolean | null
          responsavel_id?: string | null
          status_contrato?: string
          status_vigencia?: string | null
          tipo_franquia?: string | null
          updated_at?: string | null
        }
        Update: {
          cnpj?: string | null
          consultora_informada?: boolean | null
          contrato_novo_assinado?: boolean | null
          created_at?: string | null
          created_by?: string | null
          data_assinatura?: string | null
          data_emissao_nf?: string | null
          data_termino?: string | null
          id?: string
          nome_completo?: string
          novo_contrato_enviado?: boolean | null
          numero_nf?: string | null
          observacoes?: string | null
          organization_id?: string
          regime_tributario?: string | null
          renovacao_aceita?: boolean | null
          responsavel_id?: string | null
          status_contrato?: string
          status_vigencia?: string | null
          tipo_franquia?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "franquias_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "franquias_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "franquias_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "franquias_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "super_admin_organizations_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "franquias_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "franquias_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      go_nogo_checklist: {
        Row: {
          created_at: string | null
          criteria_description: string | null
          criteria_name: string
          details: Json | null
          id: string
          is_automated: boolean | null
          last_check_at: string | null
          organization_id: string
          sort_order: number | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          criteria_description?: string | null
          criteria_name: string
          details?: Json | null
          id?: string
          is_automated?: boolean | null
          last_check_at?: string | null
          organization_id: string
          sort_order?: number | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          criteria_description?: string | null
          criteria_name?: string
          details?: Json | null
          id?: string
          is_automated?: boolean | null
          last_check_at?: string | null
          organization_id?: string
          sort_order?: number | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "go_nogo_checklist_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "go_nogo_checklist_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "super_admin_organizations_view"
            referencedColumns: ["id"]
          },
        ]
      }
      impersonation_logs: {
        Row: {
          created_at: string
          ended_at: string | null
          id: string
          ip: string | null
          motivo: string
          started_at: string
          super_admin_id: string
          target_organization_id: string | null
          target_organization_nome: string | null
          target_user_email: string
          target_user_id: string
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          ended_at?: string | null
          id?: string
          ip?: string | null
          motivo: string
          started_at?: string
          super_admin_id: string
          target_organization_id?: string | null
          target_organization_nome?: string | null
          target_user_email: string
          target_user_id: string
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          ended_at?: string | null
          id?: string
          ip?: string | null
          motivo?: string
          started_at?: string
          super_admin_id?: string
          target_organization_id?: string | null
          target_organization_nome?: string | null
          target_user_email?: string
          target_user_id?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      incident_playbooks: {
        Row: {
          created_at: string | null
          escalation_contacts: Json | null
          id: string
          incident_type: string
          is_active: boolean | null
          organization_id: string
          responsible_roles: string[]
          severity: string
          steps: Json
          time_to_respond_minutes: number
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          escalation_contacts?: Json | null
          id?: string
          incident_type: string
          is_active?: boolean | null
          organization_id: string
          responsible_roles: string[]
          severity: string
          steps?: Json
          time_to_respond_minutes?: number
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          escalation_contacts?: Json | null
          id?: string
          incident_type?: string
          is_active?: boolean | null
          organization_id?: string
          responsible_roles?: string[]
          severity?: string
          steps?: Json
          time_to_respond_minutes?: number
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "incident_playbooks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incident_playbooks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "super_admin_organizations_view"
            referencedColumns: ["id"]
          },
        ]
      }
      intake_legal_reviews: {
        Row: {
          contrato_id: string
          created_at: string
          decisao: string
          id: string
          nivel_risco_avaliado: Database["public"]["Enums"]["nivel_risco_enum"]
          organization_id: string
          parecer: string
          revisor_id: string
        }
        Insert: {
          contrato_id: string
          created_at?: string
          decisao: string
          id?: string
          nivel_risco_avaliado: Database["public"]["Enums"]["nivel_risco_enum"]
          organization_id: string
          parecer: string
          revisor_id: string
        }
        Update: {
          contrato_id?: string
          created_at?: string
          decisao?: string
          id?: string
          nivel_risco_avaliado?: Database["public"]["Enums"]["nivel_risco_enum"]
          organization_id?: string
          parecer?: string
          revisor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "intake_legal_reviews_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intake_legal_reviews_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intake_legal_reviews_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "super_admin_organizations_view"
            referencedColumns: ["id"]
          },
        ]
      }
      integracao_config: {
        Row: {
          created_at: string | null
          headers_customizados: Json | null
          id: string
          is_active: boolean | null
          mapeamento_campos: Json | null
          nome: string
          organization_id: string
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
          organization_id: string
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
          organization_id?: string
          status_ultimo_teste?: string | null
          tipo?: string
          tipo_autenticacao?: string | null
          ultimo_teste?: string | null
          updated_at?: string | null
          url_api?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "integracao_config_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integracao_config_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "super_admin_organizations_view"
            referencedColumns: ["id"]
          },
        ]
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
          organization_id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          grace_period_days?: number | null
          id?: string
          is_required?: boolean | null
          organization_id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          grace_period_days?: number | null
          id?: string
          is_required?: boolean | null
          organization_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mfa_requirements_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mfa_requirements_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "super_admin_organizations_view"
            referencedColumns: ["id"]
          },
        ]
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
          organization_id: string
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
          organization_id: string
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
          organization_id?: string
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
          {
            foreignKeyName: "negotiation_metrics_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "negotiation_metrics_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "super_admin_organizations_view"
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
          organization_id: string
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
          organization_id: string
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
          organization_id?: string
          updated_at?: string
          user_id?: string
          whatsapp_enabled?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_preferences_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "super_admin_organizations_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          lida: boolean
          mensagem: string | null
          organization_id: string
          referencia_id: string | null
          referencia_tipo: string | null
          tipo: string
          titulo: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          lida?: boolean
          mensagem?: string | null
          organization_id: string
          referencia_id?: string | null
          referencia_tipo?: string | null
          tipo?: string
          titulo: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          lida?: boolean
          mensagem?: string | null
          organization_id?: string
          referencia_id?: string | null
          referencia_tipo?: string | null
          tipo?: string
          titulo?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "super_admin_organizations_view"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_email_log: {
        Row: {
          email: string
          error_message: string | null
          id: string
          organization_id: string
          sent_at: string
          status: string
          step: number
          user_id: string | null
        }
        Insert: {
          email: string
          error_message?: string | null
          id?: string
          organization_id: string
          sent_at?: string
          status?: string
          step: number
          user_id?: string | null
        }
        Update: {
          email?: string
          error_message?: string | null
          id?: string
          organization_id?: string
          sent_at?: string
          status?: string
          step?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_email_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_email_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "super_admin_organizations_view"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_progress: {
        Row: {
          completed_at: string
          created_at: string
          id: string
          metadata: Json | null
          organization_id: string
          step_key: string
          user_id: string
        }
        Insert: {
          completed_at?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          organization_id: string
          step_key: string
          user_id: string
        }
        Update: {
          completed_at?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          organization_id?: string
          step_key?: string
          user_id?: string
        }
        Relationships: []
      }
      onboarding_settings: {
        Row: {
          enabled: boolean
          id: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          enabled?: boolean
          id?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          enabled?: boolean
          id?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      organization_invites: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          organization_id: string
          role_in_org: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          organization_id: string
          role_in_org?: string
          token?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          organization_id?: string
          role_in_org?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_invites_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_invites_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "super_admin_organizations_view"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          id: string
          invited_by: string | null
          is_active: boolean | null
          joined_at: string
          organization_id: string
          role_in_org: string | null
          user_id: string
        }
        Insert: {
          id?: string
          invited_by?: string | null
          is_active?: boolean | null
          joined_at?: string
          organization_id: string
          role_in_org?: string | null
          user_id: string
        }
        Update: {
          id?: string
          invited_by?: string | null
          is_active?: boolean | null
          joined_at?: string
          organization_id?: string
          role_in_org?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "super_admin_organizations_view"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          aprovada_em: string | null
          aprovada_por: string | null
          cep: string | null
          ciclo_cobranca: string
          cidade: string | null
          cnpj: string | null
          configuracoes: Json | null
          created_at: string
          created_by: string | null
          email_contato: string | null
          email_financeiro: string | null
          endereco: string | null
          estado: string | null
          id: string
          is_active: boolean | null
          logo_url: string | null
          max_usuarios: number | null
          motivo_suspensao: string | null
          nome: string
          notas_cobranca: string | null
          plano: string | null
          plano_changed_at: string | null
          proximo_vencimento: string | null
          slug: string
          status: Database["public"]["Enums"]["org_status"]
          suspensa_em: string | null
          suspensa_por: string | null
          telefone: string | null
          trial_ends_at: string | null
          ultimo_pagamento_em: string | null
          updated_at: string
          valor_mensal_centavos: number | null
        }
        Insert: {
          aprovada_em?: string | null
          aprovada_por?: string | null
          cep?: string | null
          ciclo_cobranca?: string
          cidade?: string | null
          cnpj?: string | null
          configuracoes?: Json | null
          created_at?: string
          created_by?: string | null
          email_contato?: string | null
          email_financeiro?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          max_usuarios?: number | null
          motivo_suspensao?: string | null
          nome: string
          notas_cobranca?: string | null
          plano?: string | null
          plano_changed_at?: string | null
          proximo_vencimento?: string | null
          slug: string
          status?: Database["public"]["Enums"]["org_status"]
          suspensa_em?: string | null
          suspensa_por?: string | null
          telefone?: string | null
          trial_ends_at?: string | null
          ultimo_pagamento_em?: string | null
          updated_at?: string
          valor_mensal_centavos?: number | null
        }
        Update: {
          aprovada_em?: string | null
          aprovada_por?: string | null
          cep?: string | null
          ciclo_cobranca?: string
          cidade?: string | null
          cnpj?: string | null
          configuracoes?: Json | null
          created_at?: string
          created_by?: string | null
          email_contato?: string | null
          email_financeiro?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          max_usuarios?: number | null
          motivo_suspensao?: string | null
          nome?: string
          notas_cobranca?: string | null
          plano?: string | null
          plano_changed_at?: string | null
          proximo_vencimento?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["org_status"]
          suspensa_em?: string | null
          suspensa_por?: string | null
          telefone?: string | null
          trial_ends_at?: string | null
          ultimo_pagamento_em?: string | null
          updated_at?: string
          valor_mensal_centavos?: number | null
        }
        Relationships: []
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
      plan_pricing: {
        Row: {
          ativo: boolean
          created_at: string
          nome_exibicao: string
          plano: string
          preco_mensal_centavos: number
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          nome_exibicao: string
          plano: string
          preco_mensal_centavos?: number
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          nome_exibicao?: string
          plano?: string
          preco_mensal_centavos?: number
          updated_at?: string
        }
        Relationships: []
      }
      portal_externo_eventos: {
        Row: {
          acao: string
          contrato_id: string
          created_at: string
          id: string
          ip: string | null
          metadata: Json | null
          organization_id: string
          token_id: string
          user_agent: string | null
        }
        Insert: {
          acao: string
          contrato_id: string
          created_at?: string
          id?: string
          ip?: string | null
          metadata?: Json | null
          organization_id: string
          token_id: string
          user_agent?: string | null
        }
        Update: {
          acao?: string
          contrato_id?: string
          created_at?: string
          id?: string
          ip?: string | null
          metadata?: Json | null
          organization_id?: string
          token_id?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "portal_externo_eventos_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "portal_externo_tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_externo_tokens: {
        Row: {
          access_count: number
          contraparte_email: string
          contraparte_nome: string | null
          contrato_id: string
          created_at: string
          created_by: string | null
          escopo: string
          expires_at: string
          id: string
          last_access_at: string | null
          organization_id: string
          revoked_at: string | null
          token: string
        }
        Insert: {
          access_count?: number
          contraparte_email: string
          contraparte_nome?: string | null
          contrato_id: string
          created_at?: string
          created_by?: string | null
          escopo?: string
          expires_at: string
          id?: string
          last_access_at?: string | null
          organization_id: string
          revoked_at?: string | null
          token: string
        }
        Update: {
          access_count?: number
          contraparte_email?: string
          contraparte_nome?: string | null
          contrato_id?: string
          created_at?: string
          created_by?: string | null
          escopo?: string
          expires_at?: string
          id?: string
          last_access_at?: string | null
          organization_id?: string
          revoked_at?: string | null
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "portal_externo_tokens_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
        ]
      }
      pre_launch_test_runs: {
        Row: {
          created_at: string
          evidence_url: string | null
          executed_at: string
          executed_by: string | null
          frente: string
          id: string
          notes: string | null
          organization_id: string
          status: string
          test_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          evidence_url?: string | null
          executed_at?: string
          executed_by?: string | null
          frente: string
          id?: string
          notes?: string | null
          organization_id?: string
          status?: string
          test_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          evidence_url?: string | null
          executed_at?: string
          executed_by?: string | null
          frente?: string
          id?: string
          notes?: string | null
          organization_id?: string
          status?: string
          test_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      product_events: {
        Row: {
          created_at: string
          event_name: string
          id: string
          organization_id: string
          properties: Json
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_name: string
          id?: string
          organization_id: string
          properties?: Json
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_name?: string
          id?: string
          organization_id?: string
          properties?: Json
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          cargo: string | null
          created_at: string
          departamento: string | null
          department: string | null
          email: string
          full_name: string
          id: string
          onboarding_checklist_dismissed: boolean
          onboarding_completed_at: string | null
          onboarding_skipped: boolean
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          cargo?: string | null
          created_at?: string
          departamento?: string | null
          department?: string | null
          email: string
          full_name: string
          id: string
          onboarding_checklist_dismissed?: boolean
          onboarding_completed_at?: string | null
          onboarding_skipped?: boolean
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          cargo?: string | null
          created_at?: string
          departamento?: string | null
          department?: string | null
          email?: string
          full_name?: string
          id?: string
          onboarding_checklist_dismissed?: boolean
          onboarding_completed_at?: string | null
          onboarding_skipped?: boolean
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
          organization_id: string
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
          organization_id: string
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
          organization_id?: string
          tipo_relatorio?: string
          updated_at?: string
          visualizacao?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "report_configurations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_configurations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "super_admin_organizations_view"
            referencedColumns: ["id"]
          },
        ]
      }
      request_form_versions: {
        Row: {
          changelog: string | null
          created_at: string
          created_by: string | null
          form_id: string
          id: string
          is_published: boolean
          organization_id: string
          schema_campos: Json
          versao: number
        }
        Insert: {
          changelog?: string | null
          created_at?: string
          created_by?: string | null
          form_id: string
          id?: string
          is_published?: boolean
          organization_id: string
          schema_campos?: Json
          versao: number
        }
        Update: {
          changelog?: string | null
          created_at?: string
          created_by?: string | null
          form_id?: string
          id?: string
          is_published?: boolean
          organization_id?: string
          schema_campos?: Json
          versao?: number
        }
        Relationships: [
          {
            foreignKeyName: "request_form_versions_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "request_forms"
            referencedColumns: ["id"]
          },
        ]
      }
      request_forms: {
        Row: {
          created_at: string
          created_by: string | null
          current_version: number
          descricao: string | null
          escopo_area: string | null
          escopo_tipo: Database["public"]["Enums"]["contract_type"] | null
          id: string
          is_active: boolean
          nome: string
          organization_id: string
          updated_at: string
          workflow_definition_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          current_version?: number
          descricao?: string | null
          escopo_area?: string | null
          escopo_tipo?: Database["public"]["Enums"]["contract_type"] | null
          id?: string
          is_active?: boolean
          nome: string
          organization_id: string
          updated_at?: string
          workflow_definition_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          current_version?: number
          descricao?: string | null
          escopo_area?: string | null
          escopo_tipo?: Database["public"]["Enums"]["contract_type"] | null
          id?: string
          is_active?: boolean
          nome?: string
          organization_id?: string
          updated_at?: string
          workflow_definition_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "request_forms_workflow_definition_id_fkey"
            columns: ["workflow_definition_id"]
            isOneToOne: false
            referencedRelation: "workflow_definitions"
            referencedColumns: ["id"]
          },
        ]
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
      sales_leads: {
        Row: {
          assigned_to: string | null
          cnpj: string | null
          converted_org_id: string | null
          created_at: string
          email: string
          empresa: string | null
          id: string
          mensagem: string | null
          nome: string
          notas: string | null
          plano_interesse: string | null
          status: string
          telefone: string | null
          updated_at: string
          usuarios_estimados: number | null
        }
        Insert: {
          assigned_to?: string | null
          cnpj?: string | null
          converted_org_id?: string | null
          created_at?: string
          email: string
          empresa?: string | null
          id?: string
          mensagem?: string | null
          nome: string
          notas?: string | null
          plano_interesse?: string | null
          status?: string
          telefone?: string | null
          updated_at?: string
          usuarios_estimados?: number | null
        }
        Update: {
          assigned_to?: string | null
          cnpj?: string | null
          converted_org_id?: string | null
          created_at?: string
          email?: string
          empresa?: string | null
          id?: string
          mensagem?: string | null
          nome?: string
          notas?: string | null
          plano_interesse?: string | null
          status?: string
          telefone?: string | null
          updated_at?: string
          usuarios_estimados?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_leads_converted_org_id_fkey"
            columns: ["converted_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_leads_converted_org_id_fkey"
            columns: ["converted_org_id"]
            isOneToOne: false
            referencedRelation: "super_admin_organizations_view"
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
          organization_id: string | null
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
          organization_id?: string | null
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
          organization_id?: string | null
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
          {
            foreignKeyName: "security_alerts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "security_alerts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "super_admin_organizations_view"
            referencedColumns: ["id"]
          },
        ]
      }
      security_metrics: {
        Row: {
          created_at: string | null
          id: string
          metadata: Json | null
          metric_type: string
          organization_id: string
          period_end: string
          period_start: string
          value: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          metadata?: Json | null
          metric_type: string
          organization_id: string
          period_end: string
          period_start: string
          value: number
        }
        Update: {
          created_at?: string | null
          id?: string
          metadata?: Json | null
          metric_type?: string
          organization_id?: string
          period_end?: string
          period_start?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "security_metrics_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "security_metrics_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "super_admin_organizations_view"
            referencedColumns: ["id"]
          },
        ]
      }
      security_regression_runs: {
        Row: {
          created_at: string
          duration_ms: number
          failed: number
          finished_at: string
          id: string
          passed: number
          results: Json
          started_at: string
          total: number
          triggered_by: string | null
        }
        Insert: {
          created_at?: string
          duration_ms: number
          failed: number
          finished_at: string
          id?: string
          passed: number
          results?: Json
          started_at: string
          total: number
          triggered_by?: string | null
        }
        Update: {
          created_at?: string
          duration_ms?: number
          failed?: number
          finished_at?: string
          id?: string
          passed?: number
          results?: Json
          started_at?: string
          total?: number
          triggered_by?: string | null
        }
        Relationships: []
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
          organization_id: string | null
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
          organization_id?: string | null
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
          organization_id?: string | null
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
            foreignKeyName: "servico_historico_executado_por_fkey"
            columns: ["executado_por"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
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
            foreignKeyName: "servico_historico_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "servico_historico_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "servico_historico_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "super_admin_organizations_view"
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
          organization_id: string | null
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
          organization_id?: string | null
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
          organization_id?: string | null
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
            foreignKeyName: "servicos_periodicos_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
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
            foreignKeyName: "servicos_periodicos_fornecedor_preferencial_id_fkey"
            columns: ["fornecedor_preferencial_id"]
            isOneToOne: false
            referencedRelation: "fornecedores_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "servicos_periodicos_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "servicos_periodicos_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "super_admin_organizations_view"
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
            foreignKeyName: "servicos_periodicos_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
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
      signature_envelopes: {
        Row: {
          assunto: string | null
          cancel_reason: string | null
          cancelled_at: string | null
          completed_at: string | null
          contrato_id: string
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          mensagem: string | null
          metadata: Json | null
          organization_id: string
          original_file_url: string | null
          provedor: string
          provedor_envelope_id: string | null
          sent_at: string | null
          signed_file_url: string | null
          status: Database["public"]["Enums"]["signature_envelope_status"]
          updated_at: string
        }
        Insert: {
          assunto?: string | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          completed_at?: string | null
          contrato_id: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          mensagem?: string | null
          metadata?: Json | null
          organization_id: string
          original_file_url?: string | null
          provedor?: string
          provedor_envelope_id?: string | null
          sent_at?: string | null
          signed_file_url?: string | null
          status?: Database["public"]["Enums"]["signature_envelope_status"]
          updated_at?: string
        }
        Update: {
          assunto?: string | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          completed_at?: string | null
          contrato_id?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          mensagem?: string | null
          metadata?: Json | null
          organization_id?: string
          original_file_url?: string | null
          provedor?: string
          provedor_envelope_id?: string | null
          sent_at?: string | null
          signed_file_url?: string | null
          status?: Database["public"]["Enums"]["signature_envelope_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "signature_envelopes_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
        ]
      }
      signature_events: {
        Row: {
          created_at: string
          descricao: string | null
          envelope_id: string
          id: string
          organization_id: string
          payload: Json | null
          signer_id: string | null
          tipo: string
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          envelope_id: string
          id?: string
          organization_id: string
          payload?: Json | null
          signer_id?: string | null
          tipo: string
        }
        Update: {
          created_at?: string
          descricao?: string | null
          envelope_id?: string
          id?: string
          organization_id?: string
          payload?: Json | null
          signer_id?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "signature_events_envelope_id_fkey"
            columns: ["envelope_id"]
            isOneToOne: false
            referencedRelation: "signature_envelopes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signature_events_signer_id_fkey"
            columns: ["signer_id"]
            isOneToOne: false
            referencedRelation: "signature_signers"
            referencedColumns: ["id"]
          },
        ]
      }
      signature_signers: {
        Row: {
          created_at: string
          email: string
          envelope_id: string
          geolocation: Json | null
          id: string
          ip_address: string | null
          lado: Database["public"]["Enums"]["signature_signer_lado"]
          nome: string
          ordem: number
          organization_id: string
          provedor_signer_id: string | null
          sign_url: string | null
          signed_at: string | null
          status: Database["public"]["Enums"]["signature_signer_status"]
          telefone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          envelope_id: string
          geolocation?: Json | null
          id?: string
          ip_address?: string | null
          lado?: Database["public"]["Enums"]["signature_signer_lado"]
          nome: string
          ordem?: number
          organization_id: string
          provedor_signer_id?: string | null
          sign_url?: string | null
          signed_at?: string | null
          status?: Database["public"]["Enums"]["signature_signer_status"]
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          envelope_id?: string
          geolocation?: Json | null
          id?: string
          ip_address?: string | null
          lado?: Database["public"]["Enums"]["signature_signer_lado"]
          nome?: string
          ordem?: number
          organization_id?: string
          provedor_signer_id?: string | null
          sign_url?: string | null
          signed_at?: string | null
          status?: Database["public"]["Enums"]["signature_signer_status"]
          telefone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "signature_signers_envelope_id_fkey"
            columns: ["envelope_id"]
            isOneToOne: false
            referencedRelation: "signature_envelopes"
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
          organization_id: string
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
          organization_id: string
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
          organization_id?: string
          status?: string | null
          threshold_rule?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sod_approvals_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sod_approvals_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "super_admin_organizations_view"
            referencedColumns: ["id"]
          },
        ]
      }
      solicitacoes_compras: {
        Row: {
          codigo_solicitacao: string | null
          confirmado_em: string | null
          created_at: string | null
          enviado_em: string | null
          erro_mensagem: string | null
          id: string
          organization_id: string
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
          organization_id: string
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
          organization_id?: string
          payload_enviado?: Json | null
          resposta_api?: Json | null
          servico_id?: string
          status_envio?: string | null
          tentativas?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "solicitacoes_compras_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitacoes_compras_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "super_admin_organizations_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitacoes_compras_servico_id_fkey"
            columns: ["servico_id"]
            isOneToOne: false
            referencedRelation: "servicos_periodicos"
            referencedColumns: ["id"]
          },
        ]
      }
      super_admins: {
        Row: {
          created_at: string
          created_by: string | null
          email: string
          id: string
          notes: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          email: string
          id?: string
          notes?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          email?: string
          id?: string
          notes?: string | null
          user_id?: string
        }
        Relationships: []
      }
      template_versions: {
        Row: {
          changelog: string | null
          conteudo: string
          created_at: string
          created_by: string | null
          id: string
          is_published: boolean
          organization_id: string
          template_id: string
          variaveis: Json
          versao: number
        }
        Insert: {
          changelog?: string | null
          conteudo: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_published?: boolean
          organization_id: string
          template_id: string
          variaveis?: Json
          versao: number
        }
        Update: {
          changelog?: string | null
          conteudo?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_published?: boolean
          organization_id?: string
          template_id?: string
          variaveis?: Json
          versao?: number
        }
        Relationships: [
          {
            foreignKeyName: "template_versions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "document_templates"
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
          organization_id: string
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
          organization_id: string
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
          organization_id?: string
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
            foreignKeyName: "unidades_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unidades_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unidades_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "super_admin_organizations_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unidades_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unidades_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
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
          organization_id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          modulo_padrao?: string | null
          organization_id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          modulo_padrao?: string | null
          organization_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "super_admin_organizations_view"
            referencedColumns: ["id"]
          },
        ]
      }
      user_sessions: {
        Row: {
          created_at: string | null
          device_info: Json | null
          expires_at: string
          id: string
          ip_address: unknown
          is_active: boolean | null
          last_activity: string | null
          session_token: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          device_info?: Json | null
          expires_at: string
          id?: string
          ip_address?: unknown
          is_active?: boolean | null
          last_activity?: string | null
          session_token: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          device_info?: Json | null
          expires_at?: string
          id?: string
          ip_address?: unknown
          is_active?: boolean | null
          last_activity?: string | null
          session_token?: string
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
          organization_id: string | null
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
          organization_id?: string | null
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
          organization_id?: string | null
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
      workflow_definitions: {
        Row: {
          created_at: string
          created_by: string | null
          current_version: number
          descricao: string | null
          escopo_area: string | null
          escopo_tipo: Database["public"]["Enums"]["contract_type"] | null
          escopo_valor_max: number | null
          escopo_valor_min: number | null
          id: string
          is_active: boolean
          nome: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          current_version?: number
          descricao?: string | null
          escopo_area?: string | null
          escopo_tipo?: Database["public"]["Enums"]["contract_type"] | null
          escopo_valor_max?: number | null
          escopo_valor_min?: number | null
          id?: string
          is_active?: boolean
          nome: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          current_version?: number
          descricao?: string | null
          escopo_area?: string | null
          escopo_tipo?: Database["public"]["Enums"]["contract_type"] | null
          escopo_valor_max?: number | null
          escopo_valor_min?: number | null
          id?: string
          is_active?: boolean
          nome?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      workflow_run_stages: {
        Row: {
          comentario: string | null
          created_at: string
          decisao: string | null
          due_at: string | null
          executado_em: string | null
          executado_por: string | null
          id: string
          ordem: number
          organization_id: string
          regra_aplicada: boolean
          stage_id: string
          status: string
          workflow_run_id: string
        }
        Insert: {
          comentario?: string | null
          created_at?: string
          decisao?: string | null
          due_at?: string | null
          executado_em?: string | null
          executado_por?: string | null
          id?: string
          ordem: number
          organization_id: string
          regra_aplicada?: boolean
          stage_id: string
          status?: string
          workflow_run_id: string
        }
        Update: {
          comentario?: string | null
          created_at?: string
          decisao?: string | null
          due_at?: string | null
          executado_em?: string | null
          executado_por?: string | null
          id?: string
          ordem?: number
          organization_id?: string
          regra_aplicada?: boolean
          stage_id?: string
          status?: string
          workflow_run_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_run_stages_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "workflow_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_run_stages_workflow_run_id_fkey"
            columns: ["workflow_run_id"]
            isOneToOne: false
            referencedRelation: "workflow_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_runs: {
        Row: {
          concluido_em: string | null
          contrato_id: string | null
          created_at: string
          created_by: string | null
          current_stage_ordem: number
          id: string
          iniciado_em: string
          organization_id: string
          requisicao_id: string | null
          status: string
          updated_at: string
          workflow_definition_id: string
        }
        Insert: {
          concluido_em?: string | null
          contrato_id?: string | null
          created_at?: string
          created_by?: string | null
          current_stage_ordem?: number
          id?: string
          iniciado_em?: string
          organization_id: string
          requisicao_id?: string | null
          status?: string
          updated_at?: string
          workflow_definition_id: string
        }
        Update: {
          concluido_em?: string | null
          contrato_id?: string | null
          created_at?: string
          created_by?: string | null
          current_stage_ordem?: number
          id?: string
          iniciado_em?: string
          organization_id?: string
          requisicao_id?: string | null
          status?: string
          updated_at?: string
          workflow_definition_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_runs_workflow_definition_id_fkey"
            columns: ["workflow_definition_id"]
            isOneToOne: false
            referencedRelation: "workflow_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_stages: {
        Row: {
          aprovador_role: string | null
          aprovador_user_id: string | null
          created_at: string
          id: string
          nome: string
          ordem: number
          organization_id: string
          regras: Json
          sla_horas: number | null
          tipo_acao: string
          workflow_definition_id: string
        }
        Insert: {
          aprovador_role?: string | null
          aprovador_user_id?: string | null
          created_at?: string
          id?: string
          nome: string
          ordem: number
          organization_id: string
          regras?: Json
          sla_horas?: number | null
          tipo_acao?: string
          workflow_definition_id: string
        }
        Update: {
          aprovador_role?: string | null
          aprovador_user_id?: string | null
          created_at?: string
          id?: string
          nome?: string
          ordem?: number
          organization_id?: string
          regras?: Json
          sla_horas?: number | null
          tipo_acao?: string
          workflow_definition_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_stages_workflow_definition_id_fkey"
            columns: ["workflow_definition_id"]
            isOneToOne: false
            referencedRelation: "workflow_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_tasks: {
        Row: {
          assignee_id: string | null
          contrato_id: string
          created_at: string
          due_at: string | null
          id: string
          organization_id: string
          status: string
          step_id: string | null
          titulo: string
          updated_at: string
        }
        Insert: {
          assignee_id?: string | null
          contrato_id: string
          created_at?: string
          due_at?: string | null
          id?: string
          organization_id: string
          status?: string
          step_id?: string | null
          titulo: string
          updated_at?: string
        }
        Update: {
          assignee_id?: string | null
          contrato_id?: string
          created_at?: string
          due_at?: string | null
          id?: string
          organization_id?: string
          status?: string
          step_id?: string | null
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_tasks_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "approval_steps"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      fornecedores_safe: {
        Row: {
          cidade: string | null
          cnpj: string | null
          contato_cargo: string | null
          contato_email: string | null
          contato_nome: string | null
          contato_telefone: string | null
          created_at: string | null
          email: string | null
          estado: string | null
          id: string | null
          is_active: boolean | null
          nome: string | null
          organization_id: string | null
          porte_empresa: string | null
          telefone: string | null
          tipo_pessoa: string | null
          updated_at: string | null
        }
        Insert: {
          cidade?: string | null
          cnpj?: string | null
          contato_cargo?: string | null
          contato_email?: string | null
          contato_nome?: string | null
          contato_telefone?: string | null
          created_at?: string | null
          email?: string | null
          estado?: string | null
          id?: string | null
          is_active?: boolean | null
          nome?: string | null
          organization_id?: string | null
          porte_empresa?: string | null
          telefone?: string | null
          tipo_pessoa?: string | null
          updated_at?: string | null
        }
        Update: {
          cidade?: string | null
          cnpj?: string | null
          contato_cargo?: string | null
          contato_email?: string | null
          contato_nome?: string | null
          contato_telefone?: string | null
          created_at?: string | null
          email?: string | null
          estado?: string | null
          id?: string | null
          is_active?: boolean | null
          nome?: string | null
          organization_id?: string | null
          porte_empresa?: string | null
          telefone?: string | null
          tipo_pessoa?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fornecedores_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fornecedores_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "super_admin_organizations_view"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles_safe: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          department: string | null
          email: string | null
          full_name: string | null
          id: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          department?: string | null
          email?: string | null
          full_name?: string | null
          id?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          department?: string | null
          email?: string | null
          full_name?: string | null
          id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      super_admin_organizations_view: {
        Row: {
          aprovada_em: string | null
          aprovada_por: string | null
          cnpj: string | null
          created_at: string | null
          created_by: string | null
          criador_email: string | null
          id: string | null
          motivo_suspensao: string | null
          nome: string | null
          status: Database["public"]["Enums"]["org_status"] | null
          suspensa_em: string | null
          total_membros: number | null
        }
        Insert: {
          aprovada_em?: string | null
          aprovada_por?: string | null
          cnpj?: string | null
          created_at?: string | null
          created_by?: string | null
          criador_email?: never
          id?: string | null
          motivo_suspensao?: string | null
          nome?: string | null
          status?: Database["public"]["Enums"]["org_status"] | null
          suspensa_em?: string | null
          total_membros?: never
        }
        Update: {
          aprovada_em?: string | null
          aprovada_por?: string | null
          cnpj?: string | null
          created_at?: string | null
          created_by?: string | null
          criador_email?: never
          id?: string | null
          motivo_suspensao?: string | null
          nome?: string | null
          status?: Database["public"]["Enums"]["org_status"] | null
          suspensa_em?: string | null
          total_membros?: never
        }
        Relationships: []
      }
      vw_org_members_recent: {
        Row: {
          email: string | null
          joined_at: string | null
          org_name: string | null
          organization_id: string | null
          periodo: string | null
          role_in_org: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "super_admin_organizations_view"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      accept_organization_invite: {
        Args: { invite_token: string }
        Returns: Json
      }
      approve_organization: { Args: { _org_id: string }; Returns: Json }
      belongs_to_org: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      calculate_mrr: {
        Args: never
        Returns: {
          mrr_total_centavos: number
          por_plano: Json
        }[]
      }
      check_gate1_completo: { Args: { _contrato_id: string }; Returns: Json }
      check_gate2_completo: { Args: { _contrato_id: string }; Returns: Json }
      check_pending_invite_for_user: { Args: never; Returns: Json }
      cleanup_old_rate_limits: { Args: never; Returns: undefined }
      count_active_sessions: { Args: { _user_id: string }; Returns: number }
      current_user_org: { Args: never; Returns: string }
      dash_aprovacoes_acao: {
        Args: { p_apenas_meus?: boolean; p_limite?: number }
        Returns: {
          aprovacao_id: string
          aprovador_id: string
          comentario: string
          contrato_id: string
          created_at: string
          numero_contrato: string
          titulo: string
        }[]
      }
      dash_contratos_risco: {
        Args: { p_limite?: number }
        Returns: {
          analisado_em: string
          contrato_id: string
          fornecedor_nome: string
          numero_contrato: string
          score_risco: number
          status: string
          titulo: string
        }[]
      }
      dash_demandas_por_area: {
        Args: { p_periodo_fim?: string; p_periodo_inicio?: string }
        Returns: {
          abertas: number
          departamento: string
          total: number
        }[]
      }
      dash_evolucao_temporal: {
        Args: { p_meses?: number; p_metrica?: string }
        Returns: {
          periodo: string
          valor: number
        }[]
      }
      dash_kpi_aprovacoes_pendentes: {
        Args: { p_responsavel?: string[] }
        Returns: Json
      }
      dash_kpi_contratos_ativos: {
        Args: {
          p_fornecedor?: string[]
          p_periodo_fim?: string
          p_periodo_inicio?: string
          p_responsavel?: string[]
          p_status?: Database["public"]["Enums"]["contract_status"][]
          p_tipo?: Database["public"]["Enums"]["contract_type"][]
        }
        Returns: Json
      }
      dash_kpi_obrigacoes_atraso: {
        Args: { p_responsavel?: string[] }
        Returns: Json
      }
      dash_kpi_renovacoes_30d: {
        Args: {
          p_fornecedor?: string[]
          p_tipo?: Database["public"]["Enums"]["contract_type"][]
        }
        Returns: Json
      }
      dash_kpi_requisicoes_abertas: {
        Args: {
          p_area?: string[]
          p_periodo_fim?: string
          p_periodo_inicio?: string
          p_tipo?: Database["public"]["Enums"]["contract_type"][]
        }
        Returns: Json
      }
      dash_kpi_tempo_medio_assinatura: {
        Args: {
          p_periodo_fim?: string
          p_periodo_inicio?: string
          p_tipo?: Database["public"]["Enums"]["contract_type"][]
        }
        Returns: Json
      }
      dash_obrigacoes_vencidas: {
        Args: { p_limite?: number }
        Returns: {
          contrato_id: string
          data_vencimento: string
          dias_atraso: number
          id: string
          responsavel_id: string
          status: string
          titulo: string
          valor: number
        }[]
      }
      dash_pipeline_contratual: {
        Args: {
          p_periodo_fim?: string
          p_periodo_inicio?: string
          p_tipo?: Database["public"]["Enums"]["contract_type"][]
        }
        Returns: {
          status: string
          total: number
        }[]
      }
      dash_prazos_criticos: {
        Args: { p_limite?: number }
        Returns: {
          contrato_id: string
          data_vencimento: string
          dias_restantes: number
          id: string
          status: string
          tipo_registro: string
          titulo: string
        }[]
      }
      evaluate_stage_rules: {
        Args: { _contrato_id: string; _stage_id: string }
        Returns: number
      }
      gdpr_delete_user: { Args: { user_uuid: string }; Returns: Json }
      get_user_organization_status: { Args: never; Returns: Json }
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
      is_admin_of_org: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      is_login_blocked: {
        Args: {
          _email: string
          _max_attempts?: number
          _window_minutes?: number
        }
        Returns: boolean
      }
      is_mfa_required_for_user: { Args: { _user_id: string }; Returns: boolean }
      is_org_admin: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      is_org_creator: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      is_org_owner: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      is_super_admin: { Args: { _user_id?: string }; Returns: boolean }
      job_notificar_vencimentos: { Args: never; Returns: undefined }
      list_super_admins: {
        Args: never
        Returns: {
          email: string
          full_name: string
          granted_at: string
          user_id: string
        }[]
      }
      mask_pii: {
        Args: { field_type?: string; value: string }
        Returns: string
      }
      notify_org_members: {
        Args: {
          _mensagem?: string
          _org_id: string
          _referencia_id?: string
          _referencia_tipo?: string
          _tipo: string
          _titulo: string
        }
        Returns: undefined
      }
      org_max_usuarios_for_plano: { Args: { _plano: string }; Returns: number }
      promote_super_admin_by_email: { Args: { _email: string }; Returns: Json }
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
      release_intake_to_approval: {
        Args: { _contrato_id: string }
        Returns: Json
      }
      revoke_super_admin_by_email: { Args: { _email: string }; Returns: Json }
      super_admin_update_billing: {
        Args: {
          _ciclo_cobranca?: string
          _notas_cobranca?: string
          _org_id: string
          _proximo_vencimento?: string
          _trial_ends_at?: string
          _ultimo_pagamento_em?: string
          _valor_mensal_centavos?: number
        }
        Returns: Json
      }
      suspend_organization: {
        Args: { _motivo?: string; _org_id: string }
        Returns: Json
      }
      verify_monitor_cron_secret: {
        Args: { _secret: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "analista_juridico" | "consultoria_juridica" | "administrador"
      confidencialidade_enum:
        | "publico"
        | "interno"
        | "confidencial"
        | "restrito"
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
      due_diligence_enum:
        | "nao_iniciada"
        | "em_andamento"
        | "aprovada"
        | "reprovada"
        | "dispensada"
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
      intake_status_enum:
        | "rascunho"
        | "em_preenchimento"
        | "revisao_legal"
        | "liberado"
      nivel_risco_enum: "baixo" | "medio" | "alto" | "critico"
      notification_frequency: "immediate" | "daily" | "weekly"
      org_status: "pendente_aprovacao" | "ativa" | "suspensa" | "cancelada"
      sanction_check_enum: "nao_verificado" | "limpo" | "alerta" | "bloqueado"
      signature_envelope_status:
        | "rascunho"
        | "enviado"
        | "parcialmente_assinado"
        | "concluido"
        | "recusado"
        | "cancelado"
        | "expirado"
      signature_signer_lado: "empresa" | "contraparte" | "testemunha"
      signature_signer_status:
        | "pendente"
        | "visualizado"
        | "assinado"
        | "recusado"
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
      confidencialidade_enum: [
        "publico",
        "interno",
        "confidencial",
        "restrito",
      ],
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
      due_diligence_enum: [
        "nao_iniciada",
        "em_andamento",
        "aprovada",
        "reprovada",
        "dispensada",
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
      intake_status_enum: [
        "rascunho",
        "em_preenchimento",
        "revisao_legal",
        "liberado",
      ],
      nivel_risco_enum: ["baixo", "medio", "alto", "critico"],
      notification_frequency: ["immediate", "daily", "weekly"],
      org_status: ["pendente_aprovacao", "ativa", "suspensa", "cancelada"],
      sanction_check_enum: ["nao_verificado", "limpo", "alerta", "bloqueado"],
      signature_envelope_status: [
        "rascunho",
        "enviado",
        "parcialmente_assinado",
        "concluido",
        "recusado",
        "cancelado",
        "expirado",
      ],
      signature_signer_lado: ["empresa", "contraparte", "testemunha"],
      signature_signer_status: [
        "pendente",
        "visualizado",
        "assinado",
        "recusado",
      ],
    },
  },
} as const
