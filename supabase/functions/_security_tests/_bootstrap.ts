// Idempotent bootstrap for the security regression suite.
// Creates two organizations, three users, role assignments, and a seed
// contract / supplier / storage object per org.
// All inserted rows carry metadata.secqa_seed = true so teardown is safe.
import { serviceClient, EMAILS, ORG_A_NAME, ORG_B_NAME, TEST_PASSWORD, SEED_TAG, type Persona } from "./_clients.ts";

export interface SeedState {
  orgA: string;
  orgB: string;
  users: Record<Persona, string>;
  contracts: { orgA: string; orgB: string };
  suppliers: { orgA: string; orgB: string };
  storage: { orgA: string; orgB: string };
}

let cached: SeedState | null = null;

async function ensureUser(email: string): Promise<string> {
  const svc = serviceClient();
  // List + filter (admin listUsers paginates; small project, page 1 is enough for our 3 users)
  const { data: list } = await svc.auth.admin.listUsers({ page: 1, perPage: 200 });
  const existing = list.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (existing) {
    // Make sure the password matches (re-set is a no-op if already correct, cheap insurance).
    await svc.auth.admin.updateUserById(existing.id, { password: TEST_PASSWORD, email_confirm: true });
    return existing.id;
  }
  const { data, error } = await svc.auth.admin.createUser({
    email,
    password: TEST_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: email.split("@")[0], [SEED_TAG]: true },
  });
  if (error || !data.user) throw new Error(`createUser(${email}) failed: ${error?.message}`);
  return data.user.id;
}

async function ensureOrg(name: string): Promise<string> {
  const svc = serviceClient();
  const { data: existing } = await svc.from("organizations").select("id").eq("nome", name).maybeSingle();
  if (existing) return existing.id;
  const { data, error } = await svc.from("organizations").insert({ nome: name, slug: name.toLowerCase().replace(/\s+/g, "-") }).select("id").single();
  if (error) throw new Error(`ensureOrg(${name}) failed: ${error.message}`);
  return data.id;
}

async function ensureMember(userId: string, orgId: string, roleInOrg: "owner" | "admin" | "member") {
  const svc = serviceClient();
  await svc.from("organization_members").upsert({
    user_id: userId,
    organization_id: orgId,
    role_in_org: roleInOrg,
    is_active: true,
    joined_at: new Date().toISOString(),
  }, { onConflict: "user_id,organization_id" });
}

async function ensureRole(userId: string, orgId: string, role: "administrador" | "analista_juridico" | "consultoria_juridica") {
  const svc = serviceClient();
  await svc.from("user_roles").upsert(
    { user_id: userId, organization_id: orgId, role },
    { onConflict: "user_id,role" },
  );
}

async function ensureContract(orgId: string, createdBy: string): Promise<string> {
  const svc = serviceClient();
  const numero = `SECQA-${orgId.slice(0, 8)}`;
  const { data: existing } = await svc.from("contratos").select("id").eq("numero_contrato", numero).maybeSingle();
  if (existing) return existing.id;
  const { data, error } = await svc.from("contratos").insert({
    organization_id: orgId,
    created_by: createdBy,
    numero_contrato: numero,
    titulo: `[secqa] contrato ${orgId.slice(0, 6)}`,
    tipo: "outro",
    status: "rascunho",
    metadata: { [SEED_TAG]: true },
  }).select("id").single();
  if (error) throw new Error(`ensureContract failed: ${error.message}`);
  return data.id;
}

async function ensureSupplier(orgId: string, createdBy: string): Promise<string> {
  const svc = serviceClient();
  const nome = `[secqa] fornecedor ${orgId.slice(0, 6)}`;
  const { data: existing } = await svc.from("fornecedores").select("id").eq("nome", nome).maybeSingle();
  if (existing) return existing.id;
  const { data, error } = await svc.from("fornecedores").insert({
    organization_id: orgId,
    created_by: createdBy,
    nome,
    notas: SEED_TAG,
  }).select("id").single();
  if (error) throw new Error(`ensureSupplier failed: ${error.message}`);
  return data.id;
}

async function ensureStorageObject(orgId: string): Promise<string> {
  const svc = serviceClient();
  const path = `${orgId}/secqa-seed.txt`;
  const body = new Blob([`secqa seed for ${orgId} @ ${new Date().toISOString()}`], { type: "text/plain" });
  await svc.storage.from("contratos-documentos").upload(path, body, { upsert: true, contentType: "text/plain" });
  return path;
}

export async function bootstrap(): Promise<SeedState> {
  if (cached) return cached;

  const [orgA, orgB] = await Promise.all([ensureOrg(ORG_A_NAME), ensureOrg(ORG_B_NAME)]);

  const users = {
    adminA: await ensureUser(EMAILS.adminA),
    analistaA: await ensureUser(EMAILS.analistaA),
    adminB: await ensureUser(EMAILS.adminB),
  } as Record<Persona, string>;

  await Promise.all([
    ensureMember(users.adminA, orgA, "admin"),
    ensureMember(users.analistaA, orgA, "member"),
    ensureMember(users.adminB, orgB, "admin"),
  ]);

  await Promise.all([
    ensureRole(users.adminA, orgA, "administrador"),
    ensureRole(users.analistaA, orgA, "analista_juridico"),
    ensureRole(users.adminB, orgB, "administrador"),
  ]);

  const [contractA, contractB, supplierA, supplierB, storageA, storageB] = await Promise.all([
    ensureContract(orgA, users.adminA),
    ensureContract(orgB, users.adminB),
    ensureSupplier(orgA, users.adminA),
    ensureSupplier(orgB, users.adminB),
    ensureStorageObject(orgA),
    ensureStorageObject(orgB),
  ]);

  cached = {
    orgA,
    orgB,
    users,
    contracts: { orgA: contractA, orgB: contractB },
    suppliers: { orgA: supplierA, orgB: supplierB },
    storage: { orgA: storageA, orgB: storageB },
  };
  return cached;
}
