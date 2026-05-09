// Regression: storage policies on contratos-documentos enforce per-org isolation
// even for high-privilege roles (admin of a different org).
import { assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { bootstrap } from "./_bootstrap.ts";
import { anonClient, signInAs } , requireEnv from "./_clients.ts";
import { requireEnv } from "./_clients.ts";

const BUCKET = "contratos-documentos";

Deno.test("storage: admin of Org A can read own org file", async (t) => {
  if (!requireEnv(t)) return;
  const seed = await bootstrap();
  const a = await signInAs("adminA");
  const { data, error } = await a.client.storage.from(BUCKET).download(seed.storage.orgA);
  assert(!error, `expected success, got ${error?.message}`);
  assert(data, "expected blob");
});

Deno.test("storage: admin of Org B cannot read Org A file (cross-org)", async (t) => {
  if (!requireEnv(t)) return;
  const seed = await bootstrap();
  const b = await signInAs("adminB");
  const { data, error } = await b.client.storage.from(BUCKET).download(seed.storage.orgA);
  assert(error || !data, "Org B admin MUST NOT download Org A storage object");
});

Deno.test("storage: admin of Org B cannot list Org A folder", async (t) => {
  if (!requireEnv(t)) return;
  const seed = await bootstrap();
  const b = await signInAs("adminB");
  const { data, error } = await b.client.storage.from(BUCKET).list(seed.orgA);
  // Either the call errors, or it returns no entries from Org A's folder.
  assert(error || (Array.isArray(data) && data.length === 0), "Org B admin should not see Org A files");
});

Deno.test("storage: cross-org upload is rejected", async (t) => {
  if (!requireEnv(t)) return;
  const seed = await bootstrap();
  const a = await signInAs("adminA");
  const path = `${seed.orgB}/secqa-attack-${Date.now()}.txt`;
  const { error } = await a.client.storage.from(BUCKET).upload(path, new Blob(["x"], { type: "text/plain" }));
  assert(error, "Org A user MUST NOT be able to upload into Org B folder");
});

Deno.test("storage: anonymous cannot read avatars/* (legacy public path closed)", async (t) => {
  if (!requireEnv(t)) return;
  const anon = anonClient();
  const { data, error } = await anon.storage.from(BUCKET).list("avatars");
  assert(error || (Array.isArray(data) && data.length === 0), "anon MUST NOT list avatars/");
});
