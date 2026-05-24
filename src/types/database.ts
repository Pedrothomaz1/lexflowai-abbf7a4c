/**
 * Database Type Definitions for Supabase
 *
 * This file contains type definitions auto-generated from Supabase database schema.
 * To regenerate types with actual schema:
 *
 * 1. Install Supabase CLI:
 *    npm install -g supabase
 *
 * 2. Generate types from your Supabase project:
 *    supabase gen types typescript --project-id YOUR_PROJECT_ID --schema public > src/types/database.ts
 *
 * 3. Or use the Supabase dashboard:
 *    Settings > API > Generate TypeScript types
 *
 * The types below are a template structure. Replace with actual generated types.
 */

export interface Database {
  public: {
    Tables: {
      contratos: {
        Row: {
          id: string;
          organization_id: string;
          titulo: string;
          descricao: string | null;
          status: 'ativo' | 'vencido' | 'renovacao' | 'cancelado';
          data_criacao: string;
          data_vencimento: string;
          valor: number | null;
          fornecedor_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          titulo: string;
          descricao?: string | null;
          status?: 'ativo' | 'vencido' | 'renovacao' | 'cancelado';
          data_criacao?: string;
          data_vencimento: string;
          valor?: number | null;
          fornecedor_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          titulo?: string;
          descricao?: string | null;
          status?: 'ativo' | 'vencido' | 'renovacao' | 'cancelado';
          data_criacao?: string;
          data_vencimento?: string;
          valor?: number | null;
          fornecedor_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      fornecedores: {
        Row: {
          id: string;
          organization_id: string;
          nome: string;
          email: string | null;
          telefone: string | null;
          cnpj: string | null;
          ativo: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          nome: string;
          email?: string | null;
          telefone?: string | null;
          cnpj?: string | null;
          ativo?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          nome?: string;
          email?: string | null;
          telefone?: string | null;
          cnpj?: string | null;
          ativo?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      franquias: {
        Row: {
          id: string;
          organization_id: string;
          nome: string;
          localizacao: string | null;
          status: 'ativa' | 'inativa' | 'suspensa';
          data_abertura: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          nome: string;
          localizacao?: string | null;
          status?: 'ativa' | 'inativa' | 'suspensa';
          data_abertura?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          nome?: string;
          localizacao?: string | null;
          status?: 'ativa' | 'inativa' | 'suspensa';
          data_abertura?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      status_contrato: 'ativo' | 'vencido' | 'renovacao' | 'cancelado';
      status_franquia: 'ativa' | 'inativa' | 'suspensa';
    };
  };
}
