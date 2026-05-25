/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Link, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { SITE_NAME, SITE_URL, styles } from './_brand.ts'

interface Props {
  step?: 0 | 1 | 3 | 5 | 7
  ownerNome?: string | null
  orgNome?: string
  appUrl?: string
}

interface StepConfig {
  title: string
  intro: string
  bullets?: string[]
  noticeTitle?: string
  noticeBody?: string
  noticeStyle?: 'info' | 'warn'
  closing?: string
  ctaUrl: (appUrl: string) => string
  ctaText: string
}

function buildSteps(p: Props): Record<number, StepConfig> {
  const first = p.ownerNome?.split(' ')[0] ?? ''
  const orgNome = p.orgNome ?? 'sua organização'
  return {
    0: {
      title: `Bem-vindo${first ? `, ${first}` : ''}!`,
      intro: `Sua conta para ${orgNome} está ativa. Acesse o LexFlow para começar a cadastrar contratos.`,
      ctaUrl: (u) => u,
      ctaText: 'Acessar LexFlow',
    },
    1: {
      title: `${first ? first + ', v' : 'V'}amos cadastrar seu primeiro contrato`,
      intro: 'É o passo mais rápido para sentir o valor do LexFlow. Em menos de 3 minutos você tem um contrato monitorado com alertas automáticos de vencimento.',
      noticeStyle: 'info',
      noticeTitle: 'Como fazer',
      noticeBody:
        '1. Vá em Contratos → Novo Contrato\n2. Anexe o PDF — a IA extrai os dados principais sozinha\n3. Confirme datas de vigência e valores. Pronto.',
      closing: 'A partir daí, alertas de vencimento e reajuste rodam no automático.',
      ctaUrl: (u) => `${u}/contratos/novo`,
      ctaText: 'Cadastrar primeiro contrato',
    },
    3: {
      title: 'Alertas automáticos antes do vencimento',
      intro: `O LexFlow já está monitorando os contratos de ${orgNome}. Você pode escolher como quer ser avisado.`,
      bullets: [
        'E-mail — resumo diário e alertas críticos',
        'Notificação no app — sino no canto superior',
        'WhatsApp (opcional) — para alertas urgentes',
      ],
      closing: 'Configure uma vez. O sistema avisa com 90, 60, 30 e 7 dias de antecedência por padrão — você ajusta quando quiser.',
      ctaUrl: (u) => `${u}/configuracoes/notificacoes`,
      ctaText: 'Ajustar alertas',
    },
    5: {
      title: 'Sua equipe junto, na mesma fonte de verdade',
      intro: 'O LexFlow foi feito para ser usado por times. Convide quem precisa enxergar contratos, aprovar fluxos ou só receber alertas.',
      noticeStyle: 'warn',
      noticeTitle: 'Papéis disponíveis',
      noticeBody:
        'Admin gerencia tudo • Gestor cria e aprova • Visualizador apenas consulta. Você controla quem vê o quê.',
      closing: 'Convide pelo e-mail — eles recebem o link de acesso direto.',
      ctaUrl: (u) => `${u}/configuracoes/usuarios`,
      ctaText: 'Convidar equipe',
    },
    7: {
      title: `${first ? first + ', c' : 'C'}omo está sendo até aqui?`,
      intro: 'Faz uma semana que você começou no LexFlow. Quero saber sua opinião — o que está funcionando, o que travou, o que faltou.',
      closing: 'Sua resposta vai direto pra mim. Se preferir falar por vídeo, dá pra agendar 15 minutos em qualquer horário.',
      noticeStyle: 'info',
      noticeTitle: 'Como responder',
      noticeBody: 'Responder este e-mail é o jeito mais rápido. Eu leio todas.',
      ctaUrl: (u) => `${u}/contato`,
      ctaText: 'Falar com o time',
    },
  }
}

const SUBJECTS: Record<number, (orgNome: string) => string> = {
  0: (org) => `Bem-vindo ao ${SITE_NAME} — ${org}`,
  1: (org) => `Cadastre seu primeiro contrato em 3 minutos — ${org}`,
  3: () => 'Nunca mais perca um vencimento — alertas automáticos',
  5: () => `Convide sua equipe para o ${SITE_NAME}`,
  7: () => 'Como está sendo a primeira semana?',
}

const OnboardingStepEmail = (p: Props) => {
  const step = (p.step ?? 0) as number
  const steps = buildSteps(p)
  const cfg = steps[step] ?? steps[0]
  const appUrl = p.appUrl ?? SITE_URL
  const noticeStyle = cfg.noticeStyle === 'warn' ? styles.noticeWarn : styles.noticeInfo

  return (
    <Html lang="pt-BR" dir="ltr">
      <Head />
      <Preview>{cfg.title}</Preview>
      <Body style={styles.main}>
        <Container style={styles.container}>
          <Section style={styles.header}><Text style={styles.brand}>LexFlow</Text></Section>
          <Section style={styles.card}>
            <Heading style={styles.h1}>{cfg.title}</Heading>
            <Text style={styles.text}>{cfg.intro}</Text>
            {cfg.bullets && cfg.bullets.length > 0 && (
              <>
                {cfg.bullets.map((b, i) => (
                  <Text key={i} style={{ ...styles.text, margin: '0 0 8px' }}>• {b}</Text>
                ))}
              </>
            )}
            {cfg.noticeBody && (
              <Section style={noticeStyle}>
                {cfg.noticeTitle && <Text style={{ margin: '0 0 6px', fontWeight: 600 as const }}>{cfg.noticeTitle}</Text>}
                <Text style={{ margin: 0, whiteSpace: 'pre-wrap' as const }}>{cfg.noticeBody}</Text>
              </Section>
            )}
            {cfg.closing && <Text style={styles.text}>{cfg.closing}</Text>}
            <Section style={{ textAlign: 'center' as const, margin: '8px 0 4px' }}>
              <Button style={styles.button} href={cfg.ctaUrl(appUrl)}>{cfg.ctaText}</Button>
            </Section>
            <Text style={styles.footer}>{SITE_NAME} — Gestão preventiva de contratos.</Text>
          </Section>
          <Text style={styles.legal}>LexFlow · <Link href={SITE_URL} style={styles.legalLink}>lexflowai.com.br</Link></Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: OnboardingStepEmail,
  subject: (d: Record<string, any>) => {
    const step = (d?.step ?? 0) as number
    const org = d?.orgNome ?? 'sua organização'
    return (SUBJECTS[step] ?? SUBJECTS[0])(org)
  },
  displayName: 'Onboarding — sequência por dia',
  previewData: {
    step: 1,
    ownerNome: 'Maria Silva',
    orgNome: 'Acme Holdings',
    appUrl: SITE_URL,
  },
} satisfies TemplateEntry
