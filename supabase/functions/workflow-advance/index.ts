// Avança um workflow_run com regras condicionais + notificações.
// Body: {
//   run_id: string,
//   decisao: 'aprovado'|'rejeitado'|'pulado'|'devolvido',
//   comentario?: string,
//   target_stage_ordem?: number,  // drag-and-drop OU etapa-alvo da devolução
//   motivo?: string               // obrigatório (>=10 chars) quando decisao='devolvido'
// }
// Validações de negócio retornam HTTP 200 + { ok:false, error }.
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
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: cErr } = await supabase.auth.getClaims(token);
    if (cErr || !claims?.claims) return json(401, { error: "Unauthorized" });
    const userId = claims.claims.sub as string;

    const body = await req.json().catch(() => ({}));
    const { run_id, decisao, comentario, target_stage_ordem, motivo } = body ?? {};
    if (!run_id || !["aprovado", "rejeitado", "pulado", "devolvido"].includes(decisao)) {
      return json(200, { ok: false, error: "run_id e decisao válida obrigatórios" });
    }
    if (decisao === "devolvido" && (!motivo || String(motivo).trim().length < 10)) {
      return json(200, { ok: false, error: "Motivo da devolução é obrigatório (mínimo 10 caracteres)" });
    }

    // Busca run via RLS
    const { data: run, error: runErr } = await supabase
      .from("workflow_runs")
      .select("id, organization_id, workflow_definition_id, contrato_id, current_stage_ordem, status")
      .eq("id", run_id)
      .maybeSingle();
    if (runErr || !run) return json(200, { ok: false, error: "Workflow run não encontrado" });
    if (run.status !== "em_andamento") {
      return json(200, { ok: false, error: `Workflow já está ${run.status}` });
    }

    const nowIso = new Date().toISOString();
    const novoStatusEtapa = decisao === "aprovado" ? "aprovado"
      : decisao === "rejeitado" ? "rejeitado"
      : decisao === "devolvido" ? "devolvido"
      : "pulado";

    // Marca etapa atual (RLS)
    const { data: stageAtual, error: sErr } = await supabase
      .from("workflow_run_stages")
      .update({
        status: novoStatusEtapa,
        decisao,
        comentario: decisao === "devolvido" ? (motivo as string) : (comentario ?? null),
        executado_por: userId,
        executado_em: nowIso,
      })
      .eq("workflow_run_id", run.id)
      .eq("ordem", run.current_stage_ordem)
      .eq("status", "pendente")
      .select("id, stage_id")
      .maybeSingle();
    if (sErr) return json(200, { ok: false, error: sErr.message });
    if (!stageAtual) return json(200, { ok: false, error: "Nenhuma etapa pendente nessa ordem" });

    // Devolvido → reabre etapa anterior (ou target_stage_ordem) sem encerrar o run
    if (decisao === "devolvido") {
      const alvoOrdem = typeof target_stage_ordem === "number"
        ? target_stage_ordem
        : Math.max(1, run.current_stage_ordem - 1);

      const { data: alvoStage } = await supabase
        .from("workflow_stages")
        .select("id, ordem, sla_horas, nome")
        .eq("workflow_definition_id", run.workflow_definition_id)
        .eq("ordem", alvoOrdem)
        .maybeSingle();
      if (!alvoStage) {
        return json(200, { ok: false, error: `Etapa de ordem ${alvoOrdem} não existe` });
      }

      const dueAlvo = alvoStage.sla_horas
        ? new Date(Date.now() + alvoStage.sla_horas * 3600_000).toISOString()
        : null;

      const { error: insErr } = await supabase.from("workflow_run_stages").insert({
        organization_id: run.organization_id,
        workflow_run_id: run.id,
        stage_id: alvoStage.id,
        ordem: alvoStage.ordem,
        status: "pendente",
        due_at: dueAlvo,
        regra_aplicada: false,
      });
      if (insErr) return json(200, { ok: false, error: insErr.message });

      await supabase.from("workflow_runs").update({
        current_stage_ordem: alvoStage.ordem,
      }).eq("id", run.id);

      // Se voltou para o início, recoloca o contrato em cadastro
      if (run.contrato_id && alvoStage.ordem === 1) {
        await admin.from("contratos").update({
          intake_status: "em_cadastro",
        }).eq("id", run.contrato_id);
      }

      // Registra a devolução como comentário vinculado à etapa devolvida
      if (run.contrato_id) {
        await admin.from("contract_comments").insert({
          contrato_id: run.contrato_id,
          organization_id: run.organization_id,
          user_id: userId,
          tipo: "devolucao",
          conteudo: motivo as string,
          status: "aberto",
          workflow_run_stage_id: stageAtual.id,
          secao: "workflow",
        });

        await admin.rpc("notify_org_members", {
          _org_id: run.organization_id,
          _tipo: "workflow",
          _titulo: `Devolvido: ${alvoStage.nome}`,
          _mensagem: motivo as string,
          _referencia_id: run.contrato_id,
          _referencia_tipo: "contrato",
        });
      }

      return json(200, {
        ok: true,
        status: "em_andamento",
        decisao: "devolvido",
        current_stage_ordem: alvoStage.ordem,
      });
    }

    // Rejeitado → encerra
    if (decisao === "rejeitado") {
      await supabase.from("workflow_runs").update({
        status: "rejeitado", concluido_em: nowIso,
      }).eq("id", run.id);

      if (run.contrato_id) {
        await admin.from("notifications").insert({
          organization_id: run.organization_id,
          user_id: userId,
          tipo: "workflow",
          titulo: "Workflow rejeitado",
          mensagem: comentario || "Sem comentário",
          referencia_id: run.contrato_id,
          referencia_tipo: "contrato",
        });
      }
      return json(200, { ok: true, status: "rejeitado", concluido: true });
    }

    // Avaliar regras condicionais para decidir próxima ordem
    let proximaOrdem: number | null = null;
    let regraAplicada = false;

    if (typeof target_stage_ordem === "number") {
      proximaOrdem = target_stage_ordem; // drag-and-drop manual
    } else if (run.contrato_id) {
      const { data: jump } = await admin.rpc("evaluate_stage_rules", {
        _stage_id: stageAtual.stage_id,
        _contrato_id: run.contrato_id,
      });
      if (typeof jump === "number") {
        proximaOrdem = jump;
        regraAplicada = true;
      }
    }
    if (proximaOrdem === null) {
      proximaOrdem = run.current_stage_ordem + 1;
    }

    const { data: proxStage } = await supabase
      .from("workflow_stages")
      .select("id, ordem, sla_horas, nome, aprovador_user_id, aprovador_role")
      .eq("workflow_definition_id", run.workflow_definition_id)
      .eq("ordem", proximaOrdem)
      .maybeSingle();

    if (!proxStage) {
      // Conclui
      await supabase.from("workflow_runs").update({
        status: "concluido", concluido_em: nowIso,
      }).eq("id", run.id);

      // Atualiza status do contrato
      if (run.contrato_id) {
        await admin.from("contratos").update({ status: "aprovado" }).eq("id", run.contrato_id);
        await admin.rpc("notify_org_members", {
          _org_id: run.organization_id,
          _tipo: "workflow",
          _titulo: "Workflow concluído",
          _mensagem: "Todas as etapas foram aprovadas.",
          _referencia_id: run.contrato_id,
          _referencia_tipo: "contrato",
        });
      }
      return json(200, { ok: true, status: "concluido", concluido: true, regra_aplicada: regraAplicada });
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
      regra_aplicada: regraAplicada,
    });
    if (insErr) return json(200, { ok: false, error: insErr.message });

    await supabase.from("workflow_runs").update({
      current_stage_ordem: proxStage.ordem,
    }).eq("id", run.id);

    // Notifica próxima etapa
    if (run.contrato_id) {
      await admin.rpc("notify_org_members", {
        _org_id: run.organization_id,
        _tipo: "workflow",
        _titulo: `Nova etapa: ${proxStage.nome}`,
        _mensagem: regraAplicada
          ? "Etapa definida por regra condicional."
          : "Aguardando aprovação.",
        _referencia_id: run.contrato_id,
        _referencia_tipo: "contrato",
      });
    }

    return json(200, {
      ok: true,
      status: "em_andamento",
      current_stage_ordem: proxStage.ordem,
      regra_aplicada: regraAplicada,
    });
  } catch (e) {
    return json(200, { ok: false, error: (e as Error).message });
  }
});
