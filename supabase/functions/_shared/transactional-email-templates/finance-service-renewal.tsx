/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Link, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { SITE_NAME, SITE_URL, styles } from './_brand.ts'

interface Props {
  nomeServico?: string
  categoria?: string
  valorFormatado?: string
  frequencia?: string
  proximoVencimento?: string
  observacoes?: string
}

const FinanceServiceRenewalEmail = (p: Props) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>{`Renovação de serviço — ${p.nomeServico ?? 'serviço'}`}</Preview>
    <Body style={styles.main}>
      <Container style={styles.container}>
        <Section style={styles.header}><Text style={styles.brand}>LexFlow</Text></Section>
        <Section style={styles.card}>
          <Heading style={styles.h1}>Serviço renovado</Heading>
          {p.nomeServico && (
            <Text style={styles.text}>
              <strong>{p.nomeServico}</strong>{p.categoria ? ` · ${p.categoria}` : ''}
            </Text>
          )}
          <Section style={styles.metaBox}>
            {p.valorFormatado && <Text style={styles.metaRow}><span style={styles.metaLabel}>Valor: </span><span style={styles.metaValue}>{p.valorFormatado}</span></Text>}
            {p.frequencia && <Text style={styles.metaRow}><span style={styles.metaLabel}>Frequência: </span><span style={styles.metaValue}>{p.frequencia}</span></Text>}
            {p.proximoVencimento && <Text style={styles.metaRow}><span style={styles.metaLabel}>Próximo vencimento: </span><span style={styles.metaValue}>{p.proximoVencimento}</span></Text>}
          </Section>
          {p.observacoes && (
            <Section style={styles.noticeInfo}>
              <Text style={{ margin: 0, fontWeight: 600 as const, color: '#1e40af' }}>Observações</Text>
              <Text style={{ margin: '6px 0 0', color: '#1e3a5f' }}>{p.observacoes}</Text>
            </Section>
          )}
          <Text style={styles.footer}>E-mail gerado automaticamente pelo {SITE_NAME}.</Text>
        </Section>
        <Text style={styles.legal}>LexFlow · <Link href={SITE_URL} style={styles.legalLink}>lexflowai.com.br</Link></Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: FinanceServiceRenewalEmail,
  subject: (d: Record<string, any>) => `[${SITE_NAME}] Renovação de serviço${d?.nomeServico ? ` — ${d.nomeServico}` : ''}`,
  displayName: 'Renovação de serviço',
  previewData: {
    nomeServico: 'Manutenção preventiva',
    categoria: 'TI',
    valorFormatado: 'R$ 4.500,00',
    frequencia: 'Mensal',
    proximoVencimento: '15/02/2026',
  },
} satisfies TemplateEntry
