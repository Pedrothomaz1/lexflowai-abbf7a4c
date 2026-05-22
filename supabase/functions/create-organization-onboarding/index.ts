import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type PlanoId = "free" | "pro" | "business" | "enterprise";

interface Payload {
  nome?: string;
  cnpj?: string | null;
  telefone?: string | null;
  cidade?: string | null;
  estado?: string | null;
  plano?: PlanoId;
  cargo?: string | null;
  departamento?: string | null;
}

const cleanCnpj = (value?: string | null) => (value || "").replace(/\D/g, "");

const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "empresa";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ ok: false, error: "Sessão expirada" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    const user = userData.user;

    if (userError || !user) {
      return new Response(JSON.stringify({ ok: false, error: "Sessão expirada" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json().catch(() => ({}))) as Payload;
    const nome = body.nome?.trim();
    const cnpj = cleanCnpj(body.cnpj) || null;
    const plano = body.plano || "free";

    if (!nome) {
      return new Response(JSON.stringify({ ok: false, error: "Informe o nome da empresa" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (cnpj && cnpj.length !== 14) {
      return new Response(JSON.stringify({ ok: false, error: "CNPJ inválido" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, supabaseServiceKey);

    const { data: activeMembership } = await admin
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .order("joined_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (activeMembership?.organization_id) {
      return new Response(
        JSON.stringify({ ok: true, organization_id: activeMembership.organization_id, reused: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let organizationId: string | null = null;

    if (cnpj) {
      const { data: existingOrg } = await admin
        .from("organizations")
        .select("id, created_by")
        .eq("cnpj", cnpj)
        .maybeSingle();

      if (existingOrg) {
        if (existingOrg.created_by !== user.id) {
          return new Response(
            JSON.stringify({ ok: false, error: "Este CNPJ já está cadastrado. Peça convite ao administrador da empresa." }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }

        organizationId = existingOrg.id;
        await admin
          .from("organizations")
          .update({
            nome,
            telefone: body.telefone || null,
            cidade: body.cidade || null,
            estado: body.estado || null,
            plano,
          })
          .eq("id", organizationId);
      }
    }

    if (!organizationId) {
      organizationId = crypto.randomUUID();
      const slug = `${slugify(nome)}-${organizationId.slice(0, 6)}`;

      // Se o criador é super-admin, a organização já entra ativa (não há ninguém acima para aprovar).
      const { data: isSuper } = await admin
        .from("super_admins")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();

      const orgPayload: Record<string, unknown> = {
        id: organizationId,
        nome,
        slug,
        cnpj,
        telefone: body.telefone || null,
        cidade: body.cidade || null,
        estado: body.estado || null,
        plano,
        created_by: user.id,
      };
      if (isSuper) {
        orgPayload.status = "ativa";
        orgPayload.aprovada_em = new Date().toISOString();
        orgPayload.aprovada_por = user.id;
      }

      const { error: orgError } = await admin.from("organizations").insert(orgPayload);

      if (orgError) {
        console.error("[create-organization-onboarding] organization insert error", orgError);
        const message = orgError.code === "23505"
          ? "Este CNPJ já está cadastrado. Peça convite ao administrador da empresa."
          : orgError.message;
        return new Response(JSON.stringify({ ok: false, error: message }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const { error: memberError } = await admin
      .from("organization_members")
      .upsert(
        {
          organization_id: organizationId,
          user_id: user.id,
          role_in_org: "owner",
          is_active: true,
        },
        { onConflict: "organization_id,user_id" },
      );

    if (memberError) {
      console.error("[create-organization-onboarding] member upsert error", memberError);
      return new Response(JSON.stringify({ ok: false, error: memberError.message }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error: roleError } = await admin
      .from("user_roles")
      .upsert(
        {
          user_id: user.id,
          role: "administrador",
          organization_id: organizationId,
        },
        { onConflict: "user_id,role" },
      );

    if (roleError) {
      console.error("[create-organization-onboarding] role upsert error", roleError);
      return new Response(JSON.stringify({ ok: false, error: roleError.message }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (body.cargo || body.departamento) {
      await admin
        .from("profiles")
        .update({
          cargo: body.cargo || null,
          departamento: body.departamento || null,
        })
        .eq("id", user.id);
    }

    return new Response(JSON.stringify({ ok: true, organization_id: organizationId }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro inesperado";
    console.error("[create-organization-onboarding] fatal", message);
    return new Response(JSON.stringify({ ok: false, error: message }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});