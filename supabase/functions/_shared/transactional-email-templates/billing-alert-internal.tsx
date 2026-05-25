/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Link, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { SITE_NAME, SITE_URL, styles } from './_brand.ts'

interface Props {
  label?: string
  cliente?: string
  plano?: string
  valor?: string
  dataAlvo?: string
  status?: string
  painelUrl?: string
  severity?: 'info' | 'warn' | 'danger'
}

const BillingAlertInternalEmail = (p: Props) => {
  const sevStyle =
    p.severity === 'danger' ? styles.noticeDanger :
    p.severity === 'warn' ? styles.noticeWarn :
    styles.noticeInfo
  return (
    <Html lang="pt-BR" dir="ltr">
      <Head />
      <Preview>{`[Cobrança] ${p.cliente ?? ''} — ${p.label ?? ''}`}</Preview>
      <Body style={styles.main}>
        <Container style={styles.container}>
          <Section style={styles.header}><Text style={styles.brand}>LexFlow</Text></Section>
          <Section style={styles.card}>
            <Heading style={styles.h1}>{p.label ?? 'Alerta de cobrança'}</Heading>
            <Section style={sevStyle}>
              <Text style={{ margin: 0, fontWeight: 600 as const }}>{p.cliente ?? 'Cliente'}</Text>
            </Section>
            <Section style={styles.metaBox}>
              {p.plano && <Text style={styles.metaRow}><span style={styles.metaLabel}>Plano: </span><span style={styles.metaValue}>{p.plano}</span></Text>}
              {p.valor && <Text style={styles.metaRow}><span style={styles.metaLabel}>Valor mensal: </span><span style={styles.metaValue}>{p.valor}</span></Text>}
              {p.dataAlvo && <Text style={styles.metaRow}><span style={styles.metaLabel}>Data alvo: </span><span style={styles.metaValue}>{p.dataAlvo}</span></Text>}
              {p.status && <Text style={styles.metaRow}><span style={styles.metaLabel}>Status: </span><span style={styles.metaValue}>{p.status}</span></Text>}
            </Section>
            {p.painelUrl && (
              <Section style={{ textAlign: 'center' as const }}>
                <Button style={styles.button} href={p.painelUrl}>Abrir painel</Button>
              </Section>
            )}
            <Text style={styles.footer}>Alerta interno de cobrança gerado pelo {SITE_NAME}.</Text>
          </Section>
          <Text style={styles.legal}>LexFlow · <Link href={SITE_URL} style={styles.legalLink}>lexflowai.com.br</Link></Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: BillingAlertInternalEmail,
  subject: (d: Record<string, any>) => `[${SITE_NAME} Cobrança] ${d?.cliente ?? ''}: ${d?.label ?? 'alerta'}`.trim(),
  displayName: 'Alerta interno de cobrança',
  previewData: {
    label: 'Trial expira em 3 dia(s)',
    cliente: 'Acme Holdings',
    plano: 'pro',
    valor: 'R$ 299,00',
    dataAlvo: '2026-06-01',
    status: 'ativa',
    painelUrl: 'https://lexflowai.com.br/super-admin',
    severity: 'warn',
  },
} satisfies TemplateEntry
