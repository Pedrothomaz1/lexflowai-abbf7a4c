// Regression: realtime.messages RLS + per-table RLS for postgres_changes payloads.
import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { bootstrap } from "./_bootstrap.ts";
import { anonClient, signInAs, serviceClient } , requireEnv from "./_clients.ts";
import { requireEnv } from "./_clients.ts";

Deno.test("realtime: anonymous cannot subscribe to a private channel", async (t) => {
  if (!requireEnv(t)) return;
  await bootstrap();
  const anon = anonClient();
  const channel = anon.channel("secqa-anon-probe");
  const status = await new Promise<string>((resolve) => {
    channel.subscribe((s) => resolve(s));
    setTimeout(() => resolve("TIMEOUT"), 4000);
  });
  await anon.removeChannel(channel);
  // CHANNEL_ERROR or TIMED_OUT both indicate the broker rejected/closed the subscription.
  assert(["CHANNEL_ERROR", "TIMED_OUT", "CLOSED", "TIMEOUT"].includes(status), `expected rejection, got ${status}`);
});

Deno.test("realtime: notification insert in Org A reaches Org A but not Org B", async (t) => {
  if (!requireEnv(t)) return;
  const seed = await bootstrap();
  const a = await signInAs("analistaA");
  const b = await signInAs("adminB");

  const receivedA: unknown[] = [];
  const receivedB: unknown[] = [];

  const channelA = a.client.channel("secqa-notif-a")
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications" }, (p) => receivedA.push(p.new));
  const channelB = b.client.channel("secqa-notif-b")
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications" }, (p) => receivedB.push(p.new));

  await Promise.all([
    new Promise((r) => channelA.subscribe((s) => s === "SUBSCRIBED" && r(null))),
    new Promise((r) => channelB.subscribe((s) => s === "SUBSCRIBED" && r(null))),
  ]);

  const svc = serviceClient();
  const probe = `secqa-realtime-${Date.now()}`;
  await svc.from("notifications").insert({
    organization_id: seed.orgA,
    user_id: seed.users.analistaA,
    tipo: "geral",
    titulo: probe,
    mensagem: "regression",
  });

  await new Promise((r) => setTimeout(r, 2500));
  await Promise.all([a.client.removeChannel(channelA), b.client.removeChannel(channelB)]);

  assert(receivedA.some((n: any) => n.titulo === probe), "Org A subscriber should receive notification");
  assert(!receivedB.some((n: any) => n.titulo === probe), "Org B subscriber MUST NOT receive Org A notification");
});
