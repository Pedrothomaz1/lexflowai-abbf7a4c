// Regression: edge functions reject unauthenticated / cross-tenant calls.
// Each test pins the exact attack vector that produced a security finding.
import { assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { bootstrap } from "./_bootstrap.ts";
import { callFn, signInAs } from "./_clients.ts";
import { requireEnv } from "./_clients.ts";

async function readBody(r: Response) {
  try { return await r.text(); } catch { return ""; }
}

Deno.test("rate-limiter requires JWT", async (t) => {
  if (!requireEnv(t)) return;
  const r = await callFn("rate-limiter", { method: "POST", body: JSON.stringify({ endpoint: "x" }) });
  await readBody(r);
  assert([401, 403].includes(r.status), `expected 401/403, got ${r.status}`);
});

Deno.test("rate-limiter ignores attacker-supplied userRole", async (t) => {
  if (!requireEnv(t)) return;
  await bootstrap();
  const a = await signInAs("analistaA");
  const r = await callFn("rate-limiter", {
    method: "POST",
    headers: { authorization: `Bearer ${a.accessToken}` },
    body: JSON.stringify({ endpoint: "secqa", userRole: "administrador", userId: "00000000-0000-0000-0000-000000000000" }),
  });
  const body = await readBody(r);
  assert(r.status < 500, `5xx unexpected: ${r.status} ${body}`);
  // The function must resolve role server-side; body should not echo administrator multiplier.
  assert(!body.includes('"multiplier":2.5'), "rate-limiter must not honor client-supplied role");
});

Deno.test("security-alert-handler requires JWT", async (t) => {
  if (!requireEnv(t)) return;
  const r = await callFn("security-alert-handler", { method: "POST", body: JSON.stringify({ alert_id: "x", action: "dismiss" }) });
  await readBody(r);
  assert([401, 403].includes(r.status), `expected 401/403, got ${r.status}`);
});

Deno.test("security-alert-handler rejects non-admin", async (t) => {
  if (!requireEnv(t)) return;
  await bootstrap();
  const analista = await signInAs("analistaA");
  const r = await callFn("security-alert-handler", {
    method: "POST",
    headers: { authorization: `Bearer ${analista.accessToken}` },
    body: JSON.stringify({ alert_id: "00000000-0000-0000-0000-000000000000", action: "dismiss" }),
  });
  await readBody(r);
  assert([401, 403, 404].includes(r.status), `non-admin should be denied, got ${r.status}`);
});

Deno.test("enviar-notificacao-whatsapp rejects fake bearer", async (t) => {
  if (!requireEnv(t)) return;
  const r = await callFn("enviar-notificacao-whatsapp", {
    method: "POST",
    headers: { authorization: "Bearer fake-token" },
    body: JSON.stringify({ contratoId: "x" }),
  });
  await readBody(r);
  assert([401, 403].includes(r.status), `expected 401/403, got ${r.status}`);
});

Deno.test("anomaly-detector requires CRON_SECRET bearer", async (t) => {
  if (!requireEnv(t)) return;
  const r = await callFn("anomaly-detector", { method: "POST" });
  await readBody(r);
  assert([401, 403, 500].includes(r.status), `expected 401/403/500, got ${r.status}`);
});

Deno.test("analisar-contrato denies cross-org fileUrl", async (t) => {
  if (!requireEnv(t)) return;
  const seed = await bootstrap();
  const a = await signInAs("adminA");
  const r = await callFn("analisar-contrato", {
    method: "POST",
    headers: { authorization: `Bearer ${a.accessToken}` },
    body: JSON.stringify({ fileUrl: seed.storage.orgB, contratoId: seed.contracts.orgB }),
  });
  await readBody(r);
  assert([401, 403].includes(r.status), `cross-org file access should be 401/403, got ${r.status}`);
});

Deno.test("extrair-dados-pdf denies cross-org fileUrl", async (t) => {
  if (!requireEnv(t)) return;
  const seed = await bootstrap();
  const a = await signInAs("adminA");
  const r = await callFn("extrair-dados-pdf", {
    method: "POST",
    headers: { authorization: `Bearer ${a.accessToken}` },
    body: JSON.stringify({ fileUrl: seed.storage.orgB }),
  });
  await readBody(r);
  assert([401, 403].includes(r.status), `cross-org file access should be 401/403, got ${r.status}`);
});

Deno.test("consultar-cnpj returns generic error message", async (t) => {
  if (!requireEnv(t)) return;
  await bootstrap();
  const a = await signInAs("adminA");
  const r = await callFn("consultar-cnpj", {
    method: "POST",
    headers: { authorization: `Bearer ${a.accessToken}` },
    body: JSON.stringify({ cnpj: "00000000000000" }), // invalid → forces error path
  });
  const body = await readBody(r);
  // Must not leak internal error strings
  assert(!/ECONNREFUSED|stack|at \w+ \(/i.test(body), `stack/internal leak detected: ${body}`);
});
