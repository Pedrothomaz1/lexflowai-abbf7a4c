// Server-side security regression runner.
// Requires Authorization: Bearer <admin user JWT>. Runs the regression checks
// using SUPABASE_SERVICE_ROLE_KEY (always available inside edge runtime) and
// SECQA_PASSWORD (configured as a project secret), then returns a JSON report.
//
// Invoke: POST /functions/v1/security-regression-runner
//
// This complements supabase/functions/_security_tests/* (which require local
// env vars to run via Deno test).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const PASSWORD = Deno.env.get("SECQA_PASSWORD") ?? "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ORG_A_NAME = "SECQA Org A";
const ORG_B_NAME = "SECQA Org B";
const SEED_TAG = "secqa_seed";
const EMAILS = {
  adminA: "secqa-admin-a@secqa.test",
  analistaA: "secqa-analista-a@secqa.test",
  adminB: "secqa-admin-b@secqa.test",
} as const;

interface Result { name: string; pass: boolean; detail?: string }

const svc = () => createClient(SUPABASE_URL, SERVICE, { auth: { persistSession: false, autoRefreshToken: false } });
const anon = () => createClient(SUPABASE_URL, ANON, { auth: { persistSession: false, autoRefreshToken: false } });

async function ensureUser(email: string): Promise<string> {
  const s = svc();
  const { data: list } = await s.auth.admin.listUsers({ page: 1, perPage: 200 });
  const existing = list.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (existing) {
    await s.auth.admin.updateUserById(existing.id, { password: PASSWORD, email_confirm: true });
    return existing.id;
  }
  const { data, error } = await s.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true });
  if (error || !data.user) throw new Error(`createUser ${email}: ${error?.message}`);
  return data.user.id;
}

async function ensureOrg(name: string): Promise<string> {
  const s = svc();
  const { data: existing } = await s.from("organizations").select("id").eq("nome", name).maybeSingle();
  if (existing) return existing.id;
  const { data, error } = await s.from("organizations").insert({ nome: name, slug: name.toLowerCase().replace(/\s+/g, "-") }).select("id").single();
  if (error) throw new Error(`ensureOrg ${name}: ${error.message}`);
  return data.id;
}

async function ensureMember(userId: string, orgId: string, role: "admin" | "member") {
  await svc().from("organization_members").upsert({
    user_id: userId, organization_id: orgId, role_in_org: role, is_active: true, joined_at: new Date().toISOString(),
  }, { onConflict: "user_id,organization_id" });
}

async function ensureRole(userId: string, orgId: string, role: "administrador" | "analista_juridico") {
  await svc().from("user_roles").upsert({ user_id: userId, organization_id: orgId, role }, { onConflict: "user_id,role" });
}

async function ensureContract(orgId: string, createdBy: string): Promise<string> {
  const s = svc();
  const numero = `SECQA-${orgId.slice(0, 8)}`;
  const { data: existing } = await s.from("contratos").select("id").eq("numero_contrato", numero).maybeSingle();
  if (existing) return existing.id;
  const { data, error } = await s.from("contratos").insert({
    organization_id: orgId, created_by: createdBy, numero_contrato: numero,
    titulo: `[secqa] contrato ${orgId.slice(0, 6)}`, tipo: "outro", status: "rascunho",
    metadata: { [SEED_TAG]: true },
  }).select("id").single();
  if (error) throw new Error(`ensureContract: ${error.message}`);
  return data.id;
}

async function ensureStorage(orgId: string): Promise<string> {
  const path = `${orgId}/secqa-seed.txt`;
  await svc().storage.from("contratos-documentos").upload(path, new Blob([`secqa ${orgId}`], { type: "text/plain" }), { upsert: true, contentType: "text/plain" });
  return path;
}

async function signIn(email: string) {
  const c = anon();
  const { data, error } = await c.auth.signInWithPassword({ email, password: PASSWORD });
  if (error || !data.session) throw new Error(`signIn ${email}: ${error?.message}`);
  return { client: c, userId: data.user!.id, accessToken: data.session.access_token };
}

async function callFn(path: string, init: RequestInit = {}): Promise<Response> {
  return await fetch(`${SUPABASE_URL}/functions/v1/${path}`, {
    ...init,
    headers: { "content-type": "application/json", apikey: ANON, ...(init.headers ?? {}) },
  });
}

async function runChecks(): Promise<Result[]> {
  const results: Result[] = [];
  const wrap = async (name: string, fn: () => Promise<void | string>) => {
    try { const d = await fn(); results.push({ name, pass: true, detail: typeof d === "string" ? d : undefined }); }
    catch (e) { results.push({ name, pass: false, detail: (e as Error).message }); }
  };

  // ---- bootstrap (seed) ----
  const [orgA, orgB] = await Promise.all([ensureOrg(ORG_A_NAME), ensureOrg(ORG_B_NAME)]);
  const adminA = await ensureUser(EMAILS.adminA);
  const analistaA = await ensureUser(EMAILS.analistaA);
  const adminB = await ensureUser(EMAILS.adminB);
  await Promise.all([
    ensureMember(adminA, orgA, "admin"), ensureMember(analistaA, orgA, "member"), ensureMember(adminB, orgB, "admin"),
    ensureRole(adminA, orgA, "administrador"), ensureRole(analistaA, orgA, "analista_juridico"), ensureRole(adminB, orgB, "administrador"),
  ]);
  const contratoA = await ensureContract(orgA, adminA);
  const storageA = await ensureStorage(orgA);
  const storageB = await ensureStorage(orgB);

  const sA = await signIn(EMAILS.adminA);
  const sAnalista = await signIn(EMAILS.analistaA);
  const sB = await signIn(EMAILS.adminB);

  // ---- RLS: tables ----
  await wrap("tables: Org B sees no Org A contracts", async () => {
    const { data, error } = await sB.client.from("contratos").select("id, organization_id");
    if (error) throw error;
    if (!data!.every((c: any) => c.organization_id === orgB)) throw new Error("leak");
  });
  await wrap("tables: cross-org INSERT blocked", async () => {
    const { error } = await sA.client.from("contratos").insert({
      organization_id: orgB, created_by: sA.userId, numero_contrato: `SECQA-ATK-${Date.now()}`,
      titulo: "[secqa] attack", tipo: "outro", status: "rascunho",
    });
    if (!error) throw new Error("RLS allowed cross-org insert");
  });
  await wrap("tables: non-admin cannot read audit_logs", async () => {
    const { data, error } = await sAnalista.client.from("audit_logs").select("id").limit(1);
    if (!error && data && data.length > 0) throw new Error("audit_logs leaked to non-admin");
  });
  await wrap("tables: silent RLS on insufficient-role UPDATE", async () => {
    const { data, error } = await sAnalista.client.from("contratos").update({ observacoes: "secqa" })
      .eq("id", contratoA).select().maybeSingle();
    if (error) throw error;
    if (data) throw new Error("update should affect 0 rows");
  });

  // ---- Storage ----
  await wrap("storage: admin Org A reads own file", async () => {
    const { data, error } = await sA.client.storage.from("contratos-documentos").download(storageA);
    if (error || !data) throw new Error(error?.message ?? "no blob");
  });
  await wrap("storage: admin Org B CANNOT download Org A file", async () => {
    const { data, error } = await sB.client.storage.from("contratos-documentos").download(storageA);
    if (!error && data) throw new Error("cross-org download succeeded");
  });
  await wrap("storage: admin Org B cannot list Org A folder", async () => {
    const { data, error } = await sB.client.storage.from("contratos-documentos").list(orgA);
    if (!error && data && data.length > 0) throw new Error("Org A files visible to Org B");
  });
  await wrap("storage: cross-org upload rejected", async () => {
    const { error } = await sA.client.storage.from("contratos-documentos")
      .upload(`${orgB}/atk-${Date.now()}.txt`, new Blob(["x"]));
    if (!error) throw new Error("upload should fail");
  });
  await wrap("storage: anon cannot list avatars/", async () => {
    const { data, error } = await anon().storage.from("contratos-documentos").list("avatars");
    if (!error && data && data.length > 0) throw new Error("avatars/ public");
  });

  // ---- role_permissions: locked down to service_role only ----
  await wrap("role_permissions: authenticated can SELECT", async () => {
    const { error } = await sA.client.from("role_permissions").select("role").limit(1);
    if (error) throw new Error(`SELECT denied: ${error.message}`);
  });
  await wrap("role_permissions: admin INSERT blocked", async () => {
    const { data: anyPerm } = await svc().from("permissions").select("id").limit(1).maybeSingle();
    if (!anyPerm) return; // nothing to test against
    const { error } = await sA.client.from("role_permissions").insert({
      role: "administrador", permission_id: anyPerm.id,
    });
    if (!error) throw new Error("RLS allowed admin INSERT into role_permissions");
  });
  await wrap("role_permissions: admin UPDATE blocked", async () => {
    const { data, error } = await sA.client.from("role_permissions")
      .update({ role: "administrador" }).neq("role", "__never__").select().maybeSingle();
    if (!error && data) throw new Error("RLS allowed admin UPDATE on role_permissions");
  });
  await wrap("role_permissions: admin DELETE blocked", async () => {
    const { data, error } = await sA.client.from("role_permissions")
      .delete().neq("role", "__never__").select().maybeSingle();
    if (!error && data) throw new Error("RLS allowed admin DELETE on role_permissions");
  });

  // ---- notifications: client INSERT bloqueado (criadas só via trigger server-side) ----
  await wrap("notifications: client self-insert blocked (server-side only)", async () => {
    const { error } = await sAnalista.client.from("notifications").insert({
      organization_id: orgA, user_id: sAnalista.userId, tipo: "geral",
      titulo: `secqa-self-${Date.now()}`, mensagem: "x",
    });
    if (!error) throw new Error("RLS allowed client-side notification insert (deve ser server-only)");
  });

  await wrap("notifications: cross-user INSERT blocked (same org)", async () => {
    const { error } = await sAnalista.client.from("notifications").insert({
      organization_id: orgA, user_id: adminA, tipo: "geral",
      titulo: `secqa-xuser-${Date.now()}`, mensagem: "x",
    });
    if (!error) throw new Error("RLS allowed insert with foreign user_id");
  });
  await wrap("notifications: cross-org INSERT blocked", async () => {
    const { error } = await sAnalista.client.from("notifications").insert({
      organization_id: orgB, user_id: sAnalista.userId, tipo: "geral",
      titulo: `secqa-xorg-${Date.now()}`, mensagem: "x",
    });
    if (!error) throw new Error("RLS allowed cross-org notification insert");
  });

  // ---- Realtime ----
  await wrap("realtime: anon does NOT receive postgres_changes events", async () => {
    const c = anon();
    const got: any[] = [];
    const ch = c.channel("secqa-anon-notif")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications" }, (p) => got.push(p.new));
    await new Promise((r) => { ch.subscribe(() => {}); setTimeout(r, 1500); });
    const probe = `secqa-anon-${Date.now()}`;
    await svc().from("notifications").insert({
      organization_id: orgA, user_id: analistaA, tipo: "geral", titulo: probe, mensagem: "x",
    });
    await new Promise((r) => setTimeout(r, 2500));
    await c.removeChannel(ch);
    if (got.some((n: any) => n.titulo === probe)) throw new Error("anon received authenticated insert event");
  });
  await wrap("realtime: notification stays in source org", async () => {
    const got: { a: any[]; b: any[] } = { a: [], b: [] };
    const chA = sAnalista.client.channel(`secqa-rt-a-${Date.now()}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications" }, (p) => got.a.push(p.new));
    const chB = sB.client.channel(`secqa-rt-b-${Date.now()}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications" }, (p) => got.b.push(p.new));
    await Promise.all([
      new Promise((r, j) => {
        const t = setTimeout(() => j(new Error("chA subscribe timeout")), 8000);
        chA.subscribe((s) => { if (s === "SUBSCRIBED") { clearTimeout(t); r(null); } });
      }),
      new Promise((r, j) => {
        const t = setTimeout(() => j(new Error("chB subscribe timeout")), 8000);
        chB.subscribe((s) => { if (s === "SUBSCRIBED") { clearTimeout(t); r(null); } });
      }),
    ]);
    // Pequena folga após SUBSCRIBED para o broker registrar o filtro RLS
    await new Promise((r) => setTimeout(r, 800));
    const probe = `secqa-rt-${Date.now()}`;
    await svc().from("notifications").insert({
      organization_id: orgA, user_id: analistaA, tipo: "geral", titulo: probe, mensagem: "x",
    });
    // Poll até 8s pelo evento em A
    const deadline = Date.now() + 8000;
    while (Date.now() < deadline && !got.a.some((n: any) => n.titulo === probe)) {
      await new Promise((r) => setTimeout(r, 250));
    }
    // Folga adicional para garantir que B também teria recebido se fosse vazar
    await new Promise((r) => setTimeout(r, 1000));
    await Promise.all([sAnalista.client.removeChannel(chA), sB.client.removeChannel(chB)]);
    if (!got.a.some((n: any) => n.titulo === probe)) throw new Error("Org A subscriber missed event");
    if (got.b.some((n: any) => n.titulo === probe)) throw new Error("Org B subscriber received Org A event!");
  });


  // ---- Edge functions auth ----
  const checkStatus = async (name: string, path: string, init: RequestInit, allowed: number[]) => {
    await wrap(name, async () => {
      const r = await callFn(path, init);
      try { await r.text(); } catch { /* ignore */ }
      if (!allowed.includes(r.status)) throw new Error(`status=${r.status}`);
    });
  };
  await checkStatus("edge: rate-limiter requires JWT", "rate-limiter", { method: "POST", body: JSON.stringify({ endpoint: "x" }) }, [401, 403]);
  await checkStatus("edge: security-alert-handler requires JWT", "security-alert-handler", { method: "POST", body: JSON.stringify({ alert_id: "x", action: "dismiss" }) }, [401, 403]);
  await checkStatus("edge: security-alert-handler denies non-admin", "security-alert-handler", {
    method: "POST",
    headers: { authorization: `Bearer ${sAnalista.accessToken}` },
    body: JSON.stringify({ alert_id: "00000000-0000-0000-0000-000000000000", action: "dismiss" }),
  }, [401, 403, 404]);
  await checkStatus("edge: whatsapp rejects fake bearer", "enviar-notificacao-whatsapp", {
    method: "POST", headers: { authorization: "Bearer fake" }, body: JSON.stringify({ contratoId: "x" }),
  }, [401, 403]);
  await checkStatus("edge: anomaly-detector requires CRON_SECRET", "anomaly-detector", { method: "POST" }, [401, 403, 500]);
  await checkStatus("edge: analisar-contrato denies cross-org file", "analisar-contrato", {
    method: "POST", headers: { authorization: `Bearer ${sA.accessToken}` },
    body: JSON.stringify({ fileUrl: storageB, contratoId: contratoA }),
  }, [401, 403]);
  await checkStatus("edge: extrair-dados-pdf denies cross-org file", "extrair-dados-pdf", {
    method: "POST", headers: { authorization: `Bearer ${sA.accessToken}` }, body: JSON.stringify({ fileUrl: storageB }),
  }, [401, 403]);
  await wrap("edge: consultar-cnpj returns generic error", async () => {
    const r = await callFn("consultar-cnpj", {
      method: "POST", headers: { authorization: `Bearer ${sA.accessToken}` },
      body: JSON.stringify({ cnpj: "00000000000000" }),
    });
    const body = await r.text();
    if (/ECONNREFUSED|stack|at \w+ \(/i.test(body)) throw new Error(`leak: ${body.slice(0, 200)}`);
  });

  return results;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });

  // Authentication: caller must be an admin in their org.
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "content-type": "application/json" } });
  }
  const token = authHeader.replace("Bearer ", "");
  const { data: userData, error: userErr } = await svc().auth.getUser(token);
  if (userErr || !userData?.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "content-type": "application/json" } });
  }
  const { data: roleRow } = await svc().from("user_roles").select("role").eq("user_id", userData.user.id).eq("role", "administrador").maybeSingle();
  if (!roleRow) {
    return new Response(JSON.stringify({ error: "Admin role required" }), { status: 403, headers: { ...corsHeaders, "content-type": "application/json" } });
  }

  if (!PASSWORD) {
    return new Response(JSON.stringify({ error: "SECQA_PASSWORD not configured" }), { status: 500, headers: { ...corsHeaders, "content-type": "application/json" } });
  }

  const startedAt = new Date().toISOString();
  let results: Result[] = [];
  try {
    results = await runChecks();
  } catch (e) {
    return new Response(JSON.stringify({ error: "runner crashed", detail: (e as Error).message, results }), {
      status: 500, headers: { ...corsHeaders, "content-type": "application/json" },
    });
  }
  const summary = {
    started_at: startedAt,
    finished_at: new Date().toISOString(),
    total: results.length,
    passed: results.filter((r) => r.pass).length,
    failed: results.filter((r) => !r.pass).length,
    results,
  };
  return new Response(JSON.stringify(summary, null, 2), {
    status: summary.failed === 0 ? 200 : 207,
    headers: { ...corsHeaders, "content-type": "application/json" },
  });
});
