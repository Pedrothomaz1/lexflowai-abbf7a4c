import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";
import { Resend } from "https://esm.sh/resend@4.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface InviteRequest {
  email: string;
  organization_id: string;
  role_in_org: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY not configured");
    }

    const resend = new Resend(resendApiKey);

    // Get auth token from request
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Authorization header required");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Create client with user token to get user info
    const supabaseUser = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    // Get current user
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      throw new Error("User not authenticated");
    }

    const { email, organization_id, role_in_org }: InviteRequest = await req.json();

    if (!email || !organization_id) {
      throw new Error("Email and organization_id are required");
    }

    // Verify user is admin of the organization
    const { data: membership, error: membershipError } = await supabase
      .from("organization_members")
      .select("role_in_org")
      .eq("organization_id", organization_id)
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    if (membershipError || !membership) {
      throw new Error("Not a member of this organization");
    }

    if (!["owner", "admin"].includes(membership.role_in_org)) {
      throw new Error("Only admins can invite members");
    }

    // Get organization details
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .select("nome")
      .eq("id", organization_id)
      .single();

    if (orgError || !org) {
      throw new Error("Organization not found");
    }

    // Get inviter profile
    const { data: inviterProfile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();

    const inviterName = inviterProfile?.full_name || user.email || "Um administrador";

    // Check if invite already exists
    const { data: existingInvite } = await supabase
      .from("organization_invites")
      .select("id, token, expires_at")
      .eq("organization_id", organization_id)
      .eq("email", email.toLowerCase())
      .is("accepted_at", null)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    let inviteToken: string;

    if (existingInvite) {
      // Reuse existing token
      inviteToken = existingInvite.token;
      console.log("Reusing existing invite for:", email);
    } else {
      // Create new invite - delete any old ones first
      await supabase
        .from("organization_invites")
        .delete()
        .eq("organization_id", organization_id)
        .eq("email", email.toLowerCase());

      // Create new invite
      const { data: newInvite, error: insertError } = await supabase
        .from("organization_invites")
        .insert({
          organization_id,
          email: email.toLowerCase(),
          role_in_org: role_in_org || "member",
          invited_by: user.id,
        })
        .select("token")
        .single();

      if (insertError || !newInvite) {
        console.error("Insert error:", insertError);
        throw new Error("Failed to create invite");
      }

      inviteToken = newInvite.token;
      console.log("Created new invite for:", email);
    }

    // Build invite URL - use the frontend URL
    const baseUrl = Deno.env.get("SITE_URL") || "https://id-preview--9b5e925d-516b-4c9a-8bf5-96cde5168edd.lovable.app";
    const inviteUrl = `${baseUrl}/aceitar-convite?token=${inviteToken}`;

    // Send email
    const { error: emailError } = await resend.emails.send({
      from: "LexFlow <alertas@porveri.com.br>",
      to: [email],
      replyTo: "suporte@porveri.com.br",
      subject: `Convite para ${org.nome} - LexFlow`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 480px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 32px 24px; text-align: center; border-bottom: 1px solid #e4e4e7;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #18181b;">LexFlow</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 32px;">
              <h2 style="margin: 0 0 16px; font-size: 20px; font-weight: 600; color: #18181b;">
                Você foi convidado! 🎉
              </h2>
              
              <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.6; color: #52525b;">
                <strong>${inviterName}</strong> convidou você para fazer parte da organização <strong>${org.nome}</strong> no LexFlow.
              </p>
              
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
                <tr>
                  <td style="background-color: #f4f4f5; border-radius: 8px; padding: 16px;">
                    <p style="margin: 0 0 4px; font-size: 13px; color: #71717a;">Organização</p>
                    <p style="margin: 0; font-size: 15px; font-weight: 600; color: #18181b;">${org.nome}</p>
                  </td>
                </tr>
              </table>
              
              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${inviteUrl}" 
                       style="display: inline-block; background-color: #18181b; color: #ffffff; font-size: 15px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 8px;">
                      Aceitar Convite
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 24px 0 0; font-size: 13px; color: #a1a1aa; text-align: center;">
                Este convite expira em 7 dias.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; background-color: #fafafa; border-top: 1px solid #e4e4e7; border-radius: 0 0 12px 12px;">
              <p style="margin: 0; font-size: 12px; color: #a1a1aa; text-align: center;">
                Se você não esperava este convite, pode ignorar este e-mail.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `,
      text: `
Você foi convidado para ${org.nome}!

${inviterName} convidou você para fazer parte da organização ${org.nome} no LexFlow.

Clique no link abaixo para aceitar o convite:
${inviteUrl}

Este convite expira em 7 dias.

Se você não esperava este convite, pode ignorar este e-mail.
      `.trim(),
    });

    if (emailError) {
      console.error("Email error:", emailError);
      throw new Error("Failed to send invite email");
    }

    console.log("Invite email sent successfully to:", email);

    return new Response(
      JSON.stringify({ success: true, message: "Convite enviado com sucesso" }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in enviar-convite-organizacao:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
