import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  try {
    const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const URL = Deno.env.get('SUPABASE_URL')!;

    const supabase = createClient(URL, SERVICE_ROLE);

    // Auth: aceita Bearer service_role OU x-cron-secret (validado contra vault)
    const auth = req.headers.get('Authorization') ?? '';
    const cronSecret = req.headers.get('x-cron-secret') ?? '';
    const bearerOk = auth === `Bearer ${SERVICE_ROLE}`;
    let cronOk = false;
    if (!bearerOk && cronSecret) {
      const { data: vaultRow } = await supabase
        .schema('vault' as any)
        .from('decrypted_secrets')
        .select('decrypted_secret')
        .eq('name', 'monitor_cron_secret')
        .maybeSingle();
      cronOk = !!vaultRow && (vaultRow as any).decrypted_secret === cronSecret;
    }
    if (!bearerOk && !cronOk) {
      return json({ error: 'Unauthorized' }, 401);
    }

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: members, error: memErr } = await supabase
      .from('organization_members')
      .select('user_id, organization_id, role_in_org, joined_at, organizations!inner(nome)')
      .gte('joined_at', since)
      .order('joined_at', { ascending: false });

    if (memErr) return json({ error: memErr.message }, 200);

    if (!members || members.length === 0) {
      return json({ ok: true, organizations_checked: 0, warnings: 0, total_new_members: 0 });
    }

    // Fetch emails via profiles
    const userIds = [...new Set(members.map((m: any) => m.user_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, email')
      .in('id', userIds);
    const emailMap = new Map((profiles ?? []).map((p: any) => [p.id, p.email]));

    // Group by org
    const byOrg = new Map<string, any[]>();
    for (const m of members as any[]) {
      const list = byOrg.get(m.organization_id) ?? [];
      list.push({
        user_id: m.user_id,
        email: emailMap.get(m.user_id) ?? null,
        role_in_org: m.role_in_org,
        joined_at: m.joined_at,
        org_name: m.organizations?.nome,
      });
      byOrg.set(m.organization_id, list);
    }

    let warnings = 0;
    for (const [orgId, list] of byOrg.entries()) {
      const count = list.length;
      const severity = count > 3 ? 'warning' : 'info';
      const risk_level = count > 3 ? 'medium' : 'low';
      const emails = list.map((m) => m.email).filter(Boolean);
      const description = `${count} novo(s) membro(s) na organização nas últimas 24h: ${emails.join(', ')}`;

      await supabase.from('audit_logs').insert({
        organization_id: orgId,
        acao: 'org_member_monitor',
        entidade: 'organization_members',
        event_category: 'auth',
        risk_level,
        metadata: { description, severity, count, members: list },
      });

      if (severity === 'warning') {
        warnings++;
        const { data: admins } = await supabase
          .from('organization_members')
          .select('user_id')
          .eq('organization_id', orgId)
          .in('role_in_org', ['owner', 'admin'])
          .eq('is_active', true);

        if (admins && admins.length > 0) {
          const orgName = list[0]?.org_name ?? 'sua organização';
          const notifs = admins.map((a: any) => ({
            organization_id: orgId,
            user_id: a.user_id,
            tipo: 'security',
            titulo: 'Alerta: muitos novos membros na organização',
            mensagem: `${count} novos membros adicionados a ${orgName} nas últimas 24h: ${emails.join(', ')}`,
            referencia_tipo: 'organization',
            referencia_id: orgId,
          }));
          await supabase.from('notifications').insert(notifs);
        }
      }
    }

    return json({
      ok: true,
      organizations_checked: byOrg.size,
      warnings,
      total_new_members: members.length,
    });
  } catch (e) {
    return json({ error: (e as Error).message }, 200);
  }
});
