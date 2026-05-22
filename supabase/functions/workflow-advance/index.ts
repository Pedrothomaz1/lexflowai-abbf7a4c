// Avança ou finaliza um workflow_run.
// Input: { run_id: string, decisao: 'aprovado'|'rejeitado'|'pulado', comentario?: string }
// Marca a etapa atual com a decisão; se aprovado/pulado, cria a próxima etapa; se rejeitado, encerra o run.
// Quando não há próxima etapa, conclui o run.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json(401, { error: "Unauthorized" });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: cErr } = await supabase.auth.getClaims(token);
    if (cErr || !claims?.claims) return json(401, { error: "Unauthorized" });
    const userId = claims.claims.sub as string;

    const body = await req.json().catch(() => ({}));
    const { run_id, decisao, comentario } = body ?? {};
    if (!run_id || !["aprovado", "rejeitado", "pulado"].includes(decisao)) {
      return json(200, { ok: false, error: "run_id e decisao válida obrigatórios" });
    }

    // Busca run (RLS garante org)
    const { data: run, error: runErr } = await supabase
      .from("workflow_runs")
      .select("id, organization_id, workflow_definition_id, current_stage_ordem, status")
      .eq("id", run_id)
      .maybeSingle();
    if (runErr || !run) return json(200, { ok: false, error: "Workflow run não encontrado" });
    if (run.status !== "em_andamento") {
      return json(200, { ok: false, error: `Workflow já está ${run.status}` });
    }

    // Marca etapa atual
    const nowIso = new Date().toISOString();
    const novoStatusEtapa = decisao === "aprovado" ? "aprovado"
      : decisao === "rejeitado" ? "rejeitado" : "pulado";

    const { data: stageAtual, error: sErr } = await supabase
      .from("workflow_run_stages")
      .update({
        status: novoStatusEtapa,
        decisao,
        comentario: comentario ?? null,
        executado_por: userId,
        executado_em: nowIso,
      })
      .eq("workflow_run_id", run.id)
      .eq("ordem", run.current_stage_ordem)
      .eq("status", "pendente")
      .select()
      .maybeSingle();
    if (sErr) return json(200, { ok: false, error: sErr.message });
    if (!stageAtual) return json(200, { ok: false, error: "Nenhuma etapa pendente nessa ordem" });

    // Se rejeitado → encerra
    if (decisao === "rejeitado") {
      await supabase.from("workflow_runs").update({
        status: "rejeitado",
        concluido_em: nowIso,
      }).eq("id", run.id);
      return json(200, { ok: true, status: "rejeitado", concluido: true });
    }

    // Busca próxima stage da definição
    const proximaOrdem = run.current_stage_ordem + 1;
    const { data: proxStage } = await supabase
      .from("workflow_stages")
      .select("id, ordem, sla_horas, aprovador_user_id")
      .eq("workflow_definition_id", run.workflow_definition_id)
      .eq("ordem", proximaOrdem)
      .maybeSingle();

    if (!proxStage) {
      // Sem próxima → conclui run
      await supabase.from("workflow_runs").update({
        status: "concluido",
        concluido_em: nowIso,
      }).eq("id", run.id);
      return json(200, { ok: true, status: "concluido", concluido: true });
    }

    // Cria nova run_stage pendente
    const due = proxStage.sla_horas
      ? new Date(Date.now() + proxStage.sla_horas * 3600_000).toISOString()
      : null;

    const { error: insErr } = await supabase.from("workflow_run_stages").insert({
      organization_id: run.organization_id,
      workflow_run_id: run.id,
      stage_id: proxStage.id,
      ordem: proxStage.ordem,
      status: "pendente",
      due_at: due,
    });
    if (insErr) return json(200, { ok: false, error: insErr.message });

    await supabase.from("workflow_runs").update({
      current_stage_ordem: proxStage.ordem,
    }).eq("id", run.id);

    return json(200, {
      ok: true,
      status: "em_andamento",
      current_stage_ordem: proxStage.ordem,
    });
  } catch (e) {
    return json(200, { ok: false, error: (e as Error).message });
  }
});
