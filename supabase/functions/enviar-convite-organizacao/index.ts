import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface InviteRequest {
  email: string;
  organization_id: string;
  role_in_org: string;
}

const ROLE_LABELS: Record<string, string> = {
  owner: "Proprietário",
  admin: "Administrador",
  member: "Membro",
  viewer: "Visualizador",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Authorization header required");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      throw new Error("User not authenticated");
    }

    const { email, organization_id, role_in_org }: InviteRequest = await req.json();
    if (!email || !organization_id) {
      throw new Error("Email and organization_id are required");
    }

    const normalizedEmail = email.toLowerCase().trim();
    const role = role_in_org || "member";

    // Verify caller is admin/owner of the org
    const { data: membership } = await supabase
      .from("organization_members")
      .select("role_in_org")
      .eq("organization_id", organization_id)
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    if (!membership) throw new Error("Not a member of this organization");
    if (!["owner", "admin"].includes(membership.role_in_org)) {
      throw new Error("Only admins can invite members");
    }

    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .select("nome")
      .eq("id", organization_id)
      .single();
    if (orgError || !org) throw new Error("Organization not found");

    const { data: inviterProfile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();
    const inviterName = inviterProfile?.full_name || user.email || "Um administrador";

    // Reuse existing valid invite, or create a new one
    const { data: existingInvite } = await supabase
      .from("organization_invites")
      .select("id, token, expires_at")
      .eq("organization_id", organization_id)
      .eq("email", normalizedEmail)
      .is("accepted_at", null)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    let inviteToken: string;
    let inviteId: string;

    if (existingInvite) {
      inviteToken = existingInvite.token;
      inviteId = existingInvite.id;
      console.log("Reusing existing invite for:", normalizedEmail);
    } else {
      await supabase
        .from("organization_invites")
        .delete()
        .eq("organization_id", organization_id)
        .eq("email", normalizedEmail);

      const { data: newInvite, error: insertError } = await supabase
        .from("organization_invites")
        .insert({
          organization_id,
          email: normalizedEmail,
          role_in_org: role,
          invited_by: user.id,
        })
        .select("id, token")
        .single();

      if (insertError || !newInvite) {
        console.error("Insert error:", insertError);
        throw new Error("Failed to create invite");
      }

      inviteToken = newInvite.token;
      inviteId = newInvite.id;
      console.log("Created new invite for:", normalizedEmail);
    }

    const baseUrl =
      Deno.env.get("SITE_URL") || "https://lexflowai.com.br";
    const inviteUrl = `${baseUrl}/aceitar-convite?token=${inviteToken}`;

    // Send via Lovable Emails (queued, branded, with retry + suppression)
    let emailSent = true;
    let emailError: string | undefined;
    try {
      const { error: fnError } = await supabase.functions.invoke(
        "send-transactional-email",
        {
          body: {
            templateName: "organization-invite",
            recipientEmail: normalizedEmail,
            idempotencyKey: `org-invite-${inviteId}`,
            templateData: {
              organizationName: org.nome,
              inviterName,
              roleLabel: ROLE_LABELS[role] ?? role,
              inviteUrl,
              expiresInDays: 7,
            },
          },
        },
      );
      if (fnError) throw fnError;
      console.log("Invite email enqueued for:", normalizedEmail);
    } catch (err: any) {
      emailSent = false;
      emailError = err?.message ?? String(err);
      console.error("Email enqueue error:", emailError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        email_sent: emailSent,
        invite_url: emailSent ? undefined : inviteUrl,
        message: emailSent
          ? "Convite enviado com sucesso"
          : "Convite criado. O email não pôde ser enviado, mas você pode compartilhar o link diretamente.",
        error: emailError,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      },
    );
  } catch (error: any) {
    console.error("Error in enviar-convite-organizacao:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      },
    );
  }
});
