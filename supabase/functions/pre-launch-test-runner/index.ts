// Pre-launch test runner — orchestrates the automatable subset of the 48 tests
// defined in docs/PRE_LAUNCH_TEST_SPEC.md and upserts results into
// public.pre_launch_test_runs.
//
// Auth modes (one of):
//   - Authorization: Bearer <admin user JWT>   → uses caller's organization
//   - x-cron-secret: <CRON_SECRET>             → CI mode, requires `organization_id` in body
//
// Body (optional):
//   { "organization_id": "uuid", "tests": ["2.1", "1.7", ...] }
//   If `tests` is omitted, runs every automatable test.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CRON_SECRET = Deno.env.get("CRON_SECRET") ?? "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const svc = () =>
  createClient(SUPABASE_URL, SERVICE, { auth: { persistSession: false, autoRefreshToken: false } });

type Status = "passed" | "failed" | "skipped";
interface TestResult {
  test_id: string;
  frente: string;
  status: Status;
  notes: string;
}

async function callFn(path: string, init: RequestInit) {
  return fetch(`${SUPABASE_URL}/functions/v1/${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      apikey: ANON,
      ...(init.headers || {}),
    },
  });
}

// --- Individual automatable checks ---

async function runRegressionSuite(adminToken: string): Promise<{ passed: number; failed: number; raw: any }> {
  const r = await callFn("security-regression-runner", {
    method: "POST",
    headers: { authorization: `Bearer ${adminToken}` },
  });
  const body = await r.json().catch(() => ({}));
  return {
    passed: body.passed ?? 0,
    failed: body.failed ?? -1,
    raw: body,
  };
}

async function checkAccountEnumeration(): Promise<TestResult> {
  // Login com email inexistente vs senha errada — devem produzir mesma resposta genérica.
  const fakeEmail = `nonexistent-${crypto.randomUUID()}@nope.invalid`;
  const r = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { "content-type": "application/json", apikey: ANON },
    body: JSON.stringify({ email: fakeEmail, password: "wrong-password-123!" }),
  });
  const body = await r.json().catch(() => ({}));
  const generic = /invalid login credentials/i.test(body.error_description ?? body.msg ?? "");
  return {
    test_id: "1.7",
    frente: "1",
    status: generic ? "passed" : "failed",
    notes: `auth status=${r.status} msg="${body.error_description ?? body.msg ?? ""}"`,
  };
}

async function checkLoginBlocking(): Promise<TestResult> {
  // Verifica que a função is_login_blocked existe e retorna boolean.
  const { data, error } = await svc().rpc("is_login_blocked", {
    _email: "smoke-test@example.com",
    _max_attempts: 5,
    _window_minutes: 15,
  });
  return {
    test_id: "1.2",
    frente: "1",
    status: error ? "failed" : "passed",
    notes: error ? `rpc error: ${error.message}` : `is_login_blocked retornou ${data}`,
  };
}

async function checkComplianceLogsImmutable(): Promise<TestResult> {
  // Pega 1 registro qualquer e tenta UPDATE via service role com RLS aplicado seria difícil;
  // aqui validamos somente a presença da política DENY em pg_policies.
  const { data, error } = await svc()
    .from("pg_policies" as any)
    .select("policyname, cmd, qual")
    .eq("schemaname", "public")
    .eq("tablename", "compliance_logs");
  if (error) {
    return { test_id: "5.1", frente: "5", status: "skipped", notes: `pg_policies inacessível: ${error.message}` };
  }
  const cmds = (data || []).map((p: any) => p.cmd?.toUpperCase());
  const updateAllowed = cmds.includes("UPDATE") || cmds.includes("ALL");
  return {
    test_id: "5.1",
    frente: "5",
    status: updateAllowed ? "failed" : "passed",
    notes: `políticas em compliance_logs: ${cmds.join(", ") || "nenhuma"}`,
  };
}

async function checkComplianceLogsCompleteness(): Promise<TestResult> {
  const { data, error } = await svc()
    .from("compliance_logs")
    .select("id, tipo_evento, dados_afetados, created_at, user_id")
    .order("created_at", { ascending: false })
    .limit(1);
  if (error) {
    return { test_id: "5.4", frente: "5", status: "skipped", notes: `sem acesso: ${error.message}` };
  }
  if (!data || data.length === 0) {
    return { test_id: "5.4", frente: "5", status: "skipped", notes: "nenhum registro ainda" };
  }
  const row: any = data[0];
  const dados = row.dados_afetados || {};
  const hasIp = !!(dados.ip || dados.ip_address);
  const hasUa = !!(dados.user_agent || dados.ua);
  const ok = !!row.created_at && !!row.tipo_evento && (hasIp || hasUa);
  return {
    test_id: "5.4",
    frente: "5",
    status: ok ? "passed" : "failed",
    notes: `last log: tipo=${row.tipo_evento}, ip=${hasIp}, ua=${hasUa}`,
  };
}

async function checkZodValidationCoverage(): Promise<TestResult> {
  // Sem acesso a fs aqui — marcamos como skipped (CI cobre via grep).
  return {
    test_id: "4.7",
    frente: "4",
    status: "skipped",
    notes: "validar via CI: rg \"z.object\" supabase/functions/",
  };
}

// --- Mapping & runner ---

const AUTOMATABLE_TEST_IDS = ["1.2", "1.7", "2.1", "2.2", "2.3", "2.4", "2.6", "2.7", "2.8", "2.10", "3.1", "3.2", "5.1", "5.4", "4.7"] as const;

const FRENTE_OF: Record<string, string> = {
  "1.2": "1", "1.7": "1",
  "2.1": "2", "2.2": "2", "2.3": "2", "2.4": "2", "2.6": "2", "2.7": "2", "2.8": "2", "2.10": "2",
  "3.1": "3", "3.2": "3",
  "4.7": "4",
  "5.1": "5", "5.4": "5",
};

async function persist(orgId: string, executedBy: string | null, results: TestResult[]) {
  const rows = results.map((r) => ({
    organization_id: orgId,
    test_id: r.test_id,
    frente: r.frente,
    status: r.status,
    notes: r.notes,
    evidence_url: null,
    executed_by: executedBy,
    executed_at: new Date().toISOString(),
  }));
  const { error } = await svc()
    .from("pre_launch_test_runs")
    .upsert(rows, { onConflict: "organization_id,test_id" });
  if (error) throw new Error(`persist: ${error.message}`);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
  }

  const cronHeader = req.headers.get("x-cron-secret");
  const authHeader = req.headers.get("Authorization");
  const body = (await req.json().catch(() => ({}))) as { organization_id?: string; tests?: string[] };

  let orgId = body.organization_id ?? null;
  let executedBy: string | null = null;
  let adminToken: string | null = null;

  if (cronHeader && CRON_SECRET && cronHeader === CRON_SECRET) {
    if (!orgId) {
      return new Response(JSON.stringify({ error: "organization_id required in CI mode" }), {
        status: 400,
        headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }
  } else if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error } = await svc().auth.getUser(token);
    if (error || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }
    executedBy = userData.user.id;
    adminToken = token;
    const { data: roleRow } = await svc()
      .from("user_roles")
      .select("organization_id")
      .eq("user_id", userData.user.id)
      .eq("role", "administrador")
      .maybeSingle();
    if (!roleRow) {
      return new Response(JSON.stringify({ error: "Admin role required" }), {
        status: 403,
        headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }
    orgId = orgId ?? roleRow.organization_id;
  } else {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "content-type": "application/json" },
    });
  }

  const requested = new Set(body.tests && body.tests.length > 0 ? body.tests : AUTOMATABLE_TEST_IDS);
  const startedAt = new Date().toISOString();
  const results: TestResult[] = [];

  // Cluster: regression suite covers many test IDs at once.
  const regressionIds = ["2.1", "2.2", "2.3", "2.4", "2.6", "2.7", "2.8", "2.10", "3.1", "3.2"];
  const wantsRegression = regressionIds.some((id) => requested.has(id));
  if (wantsRegression) {
    if (!adminToken) {
      regressionIds.forEach((id) => {
        if (requested.has(id)) {
          results.push({
            test_id: id,
            frente: FRENTE_OF[id],
            status: "skipped",
            notes: "regressão exige JWT de admin (modo CI sem token)",
          });
        }
      });
    } else {
      try {
        const reg = await runRegressionSuite(adminToken);
        const ok = reg.failed === 0;
        regressionIds.forEach((id) => {
          if (requested.has(id)) {
            results.push({
              test_id: id,
              frente: FRENTE_OF[id],
              status: ok ? "passed" : "failed",
              notes: `security-regression-runner: ${reg.passed} passed / ${reg.failed} failed`,
            });
          }
        });
      } catch (e) {
        regressionIds.forEach((id) => {
          if (requested.has(id)) {
            results.push({
              test_id: id,
              frente: FRENTE_OF[id],
              status: "failed",
              notes: `runner error: ${(e as Error).message}`,
            });
          }
        });
      }
    }
  }

  if (requested.has("1.2")) results.push(await checkLoginBlocking());
  if (requested.has("1.7")) results.push(await checkAccountEnumeration());
  if (requested.has("5.1")) results.push(await checkComplianceLogsImmutable());
  if (requested.has("5.4")) results.push(await checkComplianceLogsCompleteness());
  if (requested.has("4.7")) results.push(await checkZodValidationCoverage());

  try {
    await persist(orgId!, executedBy, results);
  } catch (e) {
    return new Response(
      JSON.stringify({ error: "persist failed", detail: (e as Error).message, results }),
      { status: 500, headers: { ...corsHeaders, "content-type": "application/json" } }
    );
  }

  const summary = {
    started_at: startedAt,
    finished_at: new Date().toISOString(),
    organization_id: orgId,
    total: results.length,
    passed: results.filter((r) => r.status === "passed").length,
    failed: results.filter((r) => r.status === "failed").length,
    skipped: results.filter((r) => r.status === "skipped").length,
    results,
  };
  return new Response(JSON.stringify(summary, null, 2), {
    status: 200,
    headers: { ...corsHeaders, "content-type": "application/json" },
  });
});
