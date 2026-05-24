// Tests for registrar-aceite-lgpd JWT enforcement.
// Run via supabase--test_edge_functions.
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  ANON_KEY,
  SUPABASE_URL,
  callFn,
  requireEnv,
  serviceClient,
  signInAs,
} from "../_security_tests/_clients.ts";

const FN = "registrar-aceite-lgpd";

Deno.test("registrar-aceite-lgpd rejects request without Authorization header", async (t) => {
  if (!requireEnv(t)) return;
  const res = await callFn(FN, {
    method: "POST",
    body: JSON.stringify({ user_id: "00000000-0000-0000-0000-000000000999" }),
  });
  const body = await res.text();
  assertEquals(res.status, 401, `expected 401, got ${res.status}: ${body}`);
});

Deno.test("registrar-aceite-lgpd rejects request with invalid bearer token", async (t) => {
  if (!requireEnv(t)) return;
  const res = await callFn(FN, {
    method: "POST",
    headers: { Authorization: "Bearer not-a-valid-jwt" },
    body: JSON.stringify({ user_id: "00000000-0000-0000-0000-000000000999" }),
  });
  const body = await res.text();
  assertEquals(res.status, 401, `expected 401, got ${res.status}: ${body}`);
});

Deno.test("registrar-aceite-lgpd ignores client-supplied user_id and uses JWT sub", async (t) => {
  if (!requireEnv(t)) return;
  const { userId, accessToken } = await signInAs("analistaA");
  const forgedUserId = "00000000-0000-0000-0000-000000000999";

  const res = await callFn(FN, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, apikey: ANON_KEY },
    body: JSON.stringify({
      user_id: forgedUserId,
      versao_termos: "test-1.0",
      versao_privacidade: "test-1.0",
    }),
  });
  const json = await res.json();
  assertEquals(res.status, 200, `expected 200, got ${res.status}: ${JSON.stringify(json)}`);

  // Verify in DB that the inserted log carries the JWT-derived user_id, not the forged one.
  const svc = serviceClient();
  const { data, error } = await svc
    .from("compliance_logs")
    .select("id, user_id")
    .eq("id", json.log_id)
    .maybeSingle();
  if (error) throw error;
  assertEquals(data?.user_id, userId, "compliance log must record JWT user_id, not body user_id");
  assertEquals(data?.user_id === forgedUserId, false);

  // Cleanup
  await svc.from("compliance_logs").delete().eq("id", json.log_id);
});
