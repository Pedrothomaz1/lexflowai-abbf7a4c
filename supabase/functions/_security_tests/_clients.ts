// Shared Supabase clients for the security regression suite.
// Runs only inside Deno (supabase--test_edge_functions runner).
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

export const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
export const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
export const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
export const TEST_PASSWORD = Deno.env.get("SECQA_PASSWORD")!;

export const HAS_ENV = Boolean(SUPABASE_URL && ANON_KEY && SERVICE_ROLE && TEST_PASSWORD);
/** Use to skip a test when env is missing (e.g. running locally without secrets exported). */
export function requireEnv(t: { name: string }): boolean {
  if (!HAS_ENV) {
    console.warn(`[skip] ${t.name}: env not configured (SECQA_PASSWORD/SERVICE_ROLE_KEY)`);
    return false;
  }
  return true;
}

export const SEED_TAG = "secqa_seed";
export const ORG_A_NAME = "SECQA Org A";
export const ORG_B_NAME = "SECQA Org B";

export const EMAILS = {
  adminA: "secqa+admin-a@lexflowai.com.br",
  analistaA: "secqa+analista-a@lexflowai.com.br",
  adminB: "secqa+admin-b@lexflowai.com.br",
} as const;

export type Persona = keyof typeof EMAILS;

export function serviceClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function anonClient(): SupabaseClient {
  return createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Authenticated client signed in as one of the seeded personas. */
export async function signInAs(persona: Persona): Promise<{ client: SupabaseClient; userId: string; accessToken: string }> {
  const client = anonClient();
  const { data, error } = await client.auth.signInWithPassword({
    email: EMAILS[persona],
    password: TEST_PASSWORD,
  });
  if (error || !data.session) {
    throw new Error(`signInAs(${persona}) failed: ${error?.message ?? "no session"}`);
  }
  return { client, userId: data.user!.id, accessToken: data.session.access_token };
}

export async function callFn(path: string, init: RequestInit = {}): Promise<Response> {
  return await fetch(`${SUPABASE_URL}/functions/v1/${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      apikey: ANON_KEY,
      ...(init.headers ?? {}),
    },
  });
}
