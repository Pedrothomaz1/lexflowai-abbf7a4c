// Regression: RLS policies on critical tables (contratos, fornecedores, audit_logs).
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { bootstrap } from "./_bootstrap.ts";
import { signInAs } , requireEnv from "./_clients.ts";
import { requireEnv } from "./_clients.ts";

Deno.test("contratos: admin of Org B sees no Org A contracts", async (t) => {
  if (!requireEnv(t)) return;
  const seed = await bootstrap();
  const b = await signInAs("adminB");
  const { data, error } = await b.client.from("contratos").select("id, organization_id");
  assert(!error, error?.message);
  assert(Array.isArray(data));
  assert(data!.every((c) => c.organization_id === seed.orgB), "leaked rows from another org");
});

Deno.test("contratos: insert with foreign organization_id is blocked", async (t) => {
  if (!requireEnv(t)) return;
  const seed = await bootstrap();
  const a = await signInAs("adminA");
  const { error } = await a.client.from("contratos").insert({
    organization_id: seed.orgB, // attack: pretend to write into Org B
    created_by: a.userId,
    numero_contrato: `SECQA-ATK-${Date.now()}`,
    titulo: "[secqa] cross-org attack",
    tipo: "outro",
    status: "rascunho",
  });
  assert(error, "RLS must reject cross-org insert");
});

Deno.test("audit_logs: non-admin cannot read", async (t) => {
  if (!requireEnv(t)) return;
  await bootstrap();
  const analista = await signInAs("analistaA");
  const { data, error } = await analista.client.from("audit_logs").select("id").limit(5);
  // Either denied or empty due to admin-only SELECT policy
  assert(error || (Array.isArray(data) && data.length === 0), "non-admin must not read audit_logs");
});

Deno.test("fornecedores: cross-org select returns zero", async (t) => {
  if (!requireEnv(t)) return;
  const seed = await bootstrap();
  const b = await signInAs("adminB");
  const { data, error } = await b.client.from("fornecedores").select("id, organization_id").eq("organization_id", seed.orgA);
  assert(!error, error?.message);
  assertEquals(data?.length ?? -1, 0);
});

Deno.test("contratos update with insufficient role yields no row (silent RLS)", async (t) => {
  if (!requireEnv(t)) return;
  const seed = await bootstrap();
  const analista = await signInAs("analistaA");
  // analista_juridico can only update own draft contracts; the seeded contract
  // was created by adminA, so this update should match zero rows.
  const { data, error } = await analista.client
    .from("contratos")
    .update({ observacoes: "secqa-attempt" })
    .eq("id", seed.contracts.orgA)
    .select()
    .maybeSingle();
  assert(!error, error?.message);
  assertEquals(data, null, "RLS should silently filter the update");
});
