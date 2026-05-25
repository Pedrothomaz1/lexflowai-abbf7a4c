/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Link, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { SITE_NAME, SITE_URL, styles } from './_brand.ts'

interface Props {
  contraparteNome?: string
  contratoNome?: string
  escopo?: 'view' | 'comment' | 'sign'
  validadeDias?: number
  portalUrl?: string
  mensagem?: string
}

const ESCOPO_LABEL: Record<string, string> = {
  view: 'visualizar',
  comment: 'visualizar e comentar',
  sign: 'visualizar, comentar e assinar',
}

const CounterpartyPortalAccessEmail = (p: Props) => {
  const escopo = ESCOPO_LABEL[p.escopo ?? 'view'] ?? 'visualizar'
  const dias = p.validadeDias ?? 14
  return (
    <Html lang="pt-BR" dir="ltr">
      <Head />
      <Preview>{`Acesso ao contrato ${p.contratoNome ?? ''}`}</Preview>
      <Body style={styles.main}>
        <Container style={styles.container}>
          <Section style={styles.header}><Text style={styles.brand}>LexFlow</Text></Section>
          <Section style={styles.card}>
            <Heading style={styles.h1}>Acesso ao contrato</Heading>
            <Text style={styles.text}>
              {p.contraparteNome ? `Olá, ${p.contraparteNome}` : 'Olá'},
            </Text>
            <Text style={styles.text}>
              Você recebeu acesso ao contrato{' '}
              <strong>{p.contratoNome ?? 'compartilhado com você'}</strong> para{' '}
              <strong>{escopo}</strong>. O link expira em {dias} dias.
            </Text>
            {p.mensagem && (
              <Section style={styles.noticeInfo}>
                <Text style={{ margin: 0, whiteSpace: 'pre-wrap' as const }}>{p.mensagem}</Text>
              </Section>
            )}
            {p.portalUrl && (
              <Section style={{ textAlign: 'center' as const, margin: '8px 0 4px' }}>
                <Button style={styles.button} href={p.portalUrl}>Acessar contrato</Button>
              </Section>
            )}
            {p.portalUrl && (
              <Text style={{ ...styles.small, wordBreak: 'break-all' as const, margin: '16px 0 0' }}>
                Se o botão não funcionar, copie o link: {p.portalUrl}
              </Text>
            )}
            <Text style={styles.footer}>
              Enviado por {SITE_NAME}. Este é um e-mail automático — não responda.
            </Text>
          </Section>
          <Text style={styles.legal}>LexFlow · <Link href={SITE_URL} style={styles.legalLink}>lexflowai.com.br</Link></Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: CounterpartyPortalAccessEmail,
  subject: (d: Record<string, any>) => `${SITE_NAME} — Acesso ao contrato${d?.contratoNome ? ` ${d.contratoNome}` : ''}`,
  displayName: 'Acesso de contraparte ao contrato',
  previewData: {
    contraparteNome: 'João Pereira',
    contratoNome: 'CT-2025-0042',
    escopo: 'sign',
    validadeDias: 14,
    portalUrl: 'https://lexflowai.com.br/portal/preview',
    mensagem: 'Segue contrato para análise e assinatura.',
  },
} satisfies TemplateEntry
