// Onboarding email templates - LexFlow brand
// Verde primário e mostarda, fundo branco, executive tone

export type OnboardingStep = 0 | 1 | 3 | 5 | 7;

interface TemplateContext {
  ownerNome?: string | null;
  orgNome: string;
  appUrl: string;
}

const baseShell = (title: string, body: string, ctaUrl: string, ctaText: string) => `<!DOCTYPE html>
<html lang="pt-BR"><body style="margin:0;padding:40px 20px;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:14px;box-shadow:0 4px 12px rgba(0,0,0,.06);overflow:hidden">
  <tr><td style="padding:28px 32px;background:#1a3c2a;text-align:left">
    <h1 style="margin:0;font-size:20px;font-weight:700;color:#ffffff;letter-spacing:-0.01em">LexFlow</h1>
  </td></tr>
  <tr><td style="padding:36px 32px 8px">
    <h2 style="margin:0 0 18px;font-size:22px;font-weight:700;color:#18181b;letter-spacing:-0.01em;line-height:1.3">${title}</h2>
    ${body}
    <table width="100%" style="margin:28px 0 8px"><tr><td align="center">
      <a href="${ctaUrl}" style="display:inline-block;background:#1a3c2a;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:10px">${ctaText}</a>
    </td></tr></table>
  </td></tr>
  <tr><td style="padding:20px 32px 28px;background:#fafafa;border-top:1px solid #e4e4e7">
    <p style="margin:0;font-size:12px;color:#71717a;text-align:center;line-height:1.5">
      LexFlow — Gestão preventiva de contratos<br>
      <a href="${ctaUrl}/configuracoes/notificacoes" style="color:#71717a;text-decoration:underline">Gerenciar preferências de e-mail</a>
    </p>
  </td></tr>
</table></td></tr></table></body></html>`;

const p = (text: string) =>
  `<p style="margin:0 0 14px;font-size:15px;line-height:1.65;color:#3f3f46">${text}</p>`;

const list = (items: string[]) =>
  `<ul style="margin:14px 0 18px;padding:0 0 0 22px;color:#3f3f46;font-size:15px;line-height:1.7">${items
    .map((i) => `<li style="margin:0 0 6px">${i}</li>`)
    .join("")}</ul>`;

function step1({ ownerNome, orgNome, appUrl }: TemplateContext) {
  const first = ownerNome?.split(" ")[0] || "";
  return {
    subject: `Cadastre seu primeiro contrato em 3 minutos — ${orgNome}`,
    html: baseShell(
      `${first ? first + ", v" : "V"}amos cadastrar seu primeiro contrato`,
      p(
        `É o passo mais rápido para sentir o valor do LexFlow. Em menos de 3 minutos você tem um contrato monitorado com alertas automáticos de vencimento.`,
      ) +
        `<div style="background:#f0fdf4;border-left:4px solid #1a3c2a;padding:14px 16px;border-radius:8px;margin:18px 0">
        <p style="margin:0 0 8px;font-size:14px;font-weight:600;color:#1a3c2a">Como fazer</p>
        <ol style="margin:0;padding:0 0 0 18px;font-size:14px;line-height:1.6;color:#3f3f46">
          <li>Vá em <strong>Contratos → Novo Contrato</strong></li>
          <li>Anexe o PDF — a IA extrai os dados principais sozinha</li>
          <li>Confirme datas de vigência e valores. Pronto.</li>
        </ol>
      </div>` +
        p(`A partir daí, alertas de vencimento e reajuste rodam no automático.`),
      `${appUrl}/contratos/novo`,
      "Cadastrar primeiro contrato",
    ),
  };
}

function step3({ ownerNome, orgNome, appUrl }: TemplateContext) {
  return {
    subject: `Nunca mais perca um vencimento — alertas automáticos`,
    html: baseShell(
      "Alertas automáticos antes do vencimento",
      p(
        `O LexFlow já está monitorando os contratos de <strong>${orgNome}</strong>. Você pode escolher como quer ser avisado.`,
      ) +
        list([
          "<strong>E-mail</strong> — resumo diário e alertas críticos",
          "<strong>Notificação no app</strong> — sino no canto superior",
          "<strong>WhatsApp</strong> (opcional) — para alertas urgentes",
        ]) +
        p(
          `Configure uma vez. O sistema avisa com 90, 60, 30 e 7 dias de antecedência por padrão — você ajusta quando quiser.`,
        ),
      `${appUrl}/configuracoes/notificacoes`,
      "Ajustar alertas",
    ),
  };
}

function step5({ ownerNome, orgNome, appUrl }: TemplateContext) {
  return {
    subject: `Convide sua equipe para o LexFlow`,
    html: baseShell(
      "Sua equipe junto, na mesma fonte de verdade",
      p(
        `O LexFlow foi feito para ser usado por times. Convide quem precisa enxergar contratos, aprovar fluxos ou só receber alertas.`,
      ) +
        `<div style="background:#fefce8;border-left:4px solid #ca8a04;padding:14px 16px;border-radius:8px;margin:18px 0">
        <p style="margin:0 0 6px;font-size:14px;font-weight:600;color:#854d0e">Papéis disponíveis</p>
        <p style="margin:0;font-size:14px;line-height:1.6;color:#3f3f46">
          <strong>Admin</strong> gerencia tudo • <strong>Gestor</strong> cria e aprova • <strong>Visualizador</strong> apenas consulta. Você controla quem vê o quê.
        </p>
      </div>` +
        p(`Convide pelo e-mail — eles recebem o link de acesso direto.`),
      `${appUrl}/configuracoes/usuarios`,
      "Convidar equipe",
    ),
  };
}

function step7({ ownerNome, orgNome, appUrl }: TemplateContext) {
  const first = ownerNome?.split(" ")[0] || "";
  return {
    subject: `Como está sendo a primeira semana?`,
    html: baseShell(
      `${first ? first + ", c" : "C"}omo está sendo até aqui?`,
      p(
        `Faz uma semana que você começou no LexFlow. Quero saber sua opinião — o que está funcionando, o que travou, o que faltou.`,
      ) +
        p(
          `Sua resposta vai direto pra mim. Se preferir falar por vídeo, dá pra agendar 15 minutos em qualquer horário.`,
        ) +
        `<div style="background:#f4f4f5;padding:14px 16px;border-radius:8px;margin:18px 0">
        <p style="margin:0;font-size:14px;line-height:1.6;color:#52525b">
          <strong>Responder este e-mail</strong> é o jeito mais rápido. Eu leio todas.
        </p>
      </div>`,
      `${appUrl}/contato`,
      "Falar com o time",
    ),
  };
}

export function renderTemplate(step: OnboardingStep, ctx: TemplateContext) {
  switch (step) {
    case 1:
      return step1(ctx);
    case 3:
      return step3(ctx);
    case 5:
      return step5(ctx);
    case 7:
      return step7(ctx);
    case 0:
    default:
      return {
        subject: `Bem-vindo ao LexFlow — ${ctx.orgNome}`,
        html: baseShell(
          `Bem-vindo${ctx.ownerNome ? ", " + ctx.ownerNome.split(" ")[0] : ""}!`,
          p(`Sua conta para <strong>${ctx.orgNome}</strong> está ativa.`),
          ctx.appUrl,
          "Acessar LexFlow",
        ),
      };
  }
}

export const ONBOARDING_STEPS: OnboardingStep[] = [0, 1, 3, 5, 7];
