
CREATE OR REPLACE FUNCTION public.create_contract_version()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  changes jsonb := '[]'::jsonb;
BEGIN
  IF OLD.titulo IS DISTINCT FROM NEW.titulo THEN
    changes := changes || jsonb_build_object('campo', 'titulo', 'anterior', OLD.titulo, 'novo', NEW.titulo);
  END IF;
  
  IF OLD.descricao IS DISTINCT FROM NEW.descricao THEN
    changes := changes || jsonb_build_object('campo', 'descricao', 'anterior', OLD.descricao, 'novo', NEW.descricao);
  END IF;
  
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    changes := changes || jsonb_build_object('campo', 'status', 'anterior', OLD.status::text, 'novo', NEW.status::text);
  END IF;
  
  IF OLD.valor_total IS DISTINCT FROM NEW.valor_total THEN
    changes := changes || jsonb_build_object('campo', 'valor_total', 'anterior', OLD.valor_total::text, 'novo', NEW.valor_total::text);
  END IF;
  
  IF OLD.data_inicio IS DISTINCT FROM NEW.data_inicio THEN
    changes := changes || jsonb_build_object('campo', 'data_inicio', 'anterior', OLD.data_inicio::text, 'novo', NEW.data_inicio::text);
  END IF;
  
  IF OLD.data_fim IS DISTINCT FROM NEW.data_fim THEN
    changes := changes || jsonb_build_object('campo', 'data_fim', 'anterior', OLD.data_fim::text, 'novo', NEW.data_fim::text);
  END IF;
  
  IF OLD.fornecedor_id IS DISTINCT FROM NEW.fornecedor_id THEN
    changes := changes || jsonb_build_object('campo', 'fornecedor_id', 'anterior', OLD.fornecedor_id::text, 'novo', NEW.fornecedor_id::text);
  END IF;
  
  IF OLD.observacoes IS DISTINCT FROM NEW.observacoes THEN
    changes := changes || jsonb_build_object('campo', 'observacoes', 'anterior', OLD.observacoes, 'novo', NEW.observacoes);
  END IF;

  IF jsonb_array_length(changes) > 0 THEN
    INSERT INTO public.contract_versions (
      contrato_id,
      versao,
      snapshot,
      alteracoes,
      created_by,
      organization_id
    ) VALUES (
      NEW.id,
      NEW.versao,
      jsonb_build_object(
        'titulo', OLD.titulo,
        'descricao', OLD.descricao,
        'status', OLD.status,
        'tipo', OLD.tipo,
        'valor_total', OLD.valor_total,
        'moeda', OLD.moeda,
        'data_inicio', OLD.data_inicio,
        'data_fim', OLD.data_fim,
        'data_assinatura', OLD.data_assinatura,
        'fornecedor_id', OLD.fornecedor_id,
        'observacoes', OLD.observacoes,
        'tags', OLD.tags,
        'arquivo_url', OLD.arquivo_url
      ),
      changes,
      auth.uid(),
      NEW.organization_id
    );
  END IF;
  
  RETURN NEW;
END;
$function$;
