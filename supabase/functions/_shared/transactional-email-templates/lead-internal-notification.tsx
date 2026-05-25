/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Link, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { SITE_NAME, SITE_URL, styles } from './_brand.ts'

interface Props {
  origem?: string
  nome?: string
  email?: string
  telefone?: string
  empresa?: string
  cnpj?: string
  usuariosEstimados?: number | string
  planoInteresse?: string
  mensagem?: string
  leadId?: string
  painelUrl?: string
}

const Row = ({ label, value }: { label: string; value?: string | number }) => (
  value !== undefined && value !== null && value !== '' ? (
    <Text style={styles.metaRow}>
      <span style={styles.metaLabel}>{label}: </span>
      <span style={styles.metaValue}>{String(value)}</span>
    </Text>
  ) : null
)

const LeadInternalNotificationEmail = (p: Props) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>{`Novo lead — ${p.empresa ?? p.nome ?? ''}`}</Preview>
    <Body style={styles.main}>
      <Container style={styles.container}>
        <Section style={styles.header}><Text style={styles.brand}>LexFlow</Text></Section>
        <Section style={styles.card}>
          <Heading style={styles.h1}>Novo lead{p.origem ? ` · ${p.origem}` : ''}</Heading>
          <Section style={styles.metaBox}>
            <Row label="Nome" value={p.nome} />
            <Row label="E-mail" value={p.email} />
            <Row label="Telefone" value={p.telefone} />
            <Row label="Empresa" value={p.empresa} />
            <Row label="CNPJ" value={p.cnpj} />
            <Row label="Usuários estimados" value={p.usuariosEstimados} />
            <Row label="Plano de interesse" value={p.planoInteresse} />
          </Section>
          {p.mensagem && (
            <>
              <Heading as="h2" style={styles.h2}>Mensagem</Heading>
              <Section style={styles.noticeInfo}>
                <Text style={{ margin: 0, whiteSpace: 'pre-wrap' as const, color: '#1e3a5f' }}>{p.mensagem}</Text>
              </Section>
            </>
          )}
          {p.painelUrl && (
            <Section style={{ textAlign: 'center' as const }}>
              <Button style={styles.button} href={p.painelUrl}>Abrir painel de leads</Button>
            </Section>
          )}
          {p.leadId && <Text style={styles.footer}>Lead ID: {p.leadId}</Text>}
        </Section>
        <Text style={styles.legal}>LexFlow · <Link href={SITE_URL} style={styles.legalLink}>lexflowai.com.br</Link></Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: LeadInternalNotificationEmail,
  subject: (d: Record<string, any>) => {
    const label = d?.empresa || d?.nome || 'novo contato'
    return `[${SITE_NAME}] Novo lead: ${label}`
  },
  displayName: 'Notificação interna de novo lead',
  previewData: {
    origem: 'planos',
    nome: 'Maria Silva',
    email: 'maria@empresa.com',
    telefone: '+55 11 99999-0000',
    empresa: 'Empresa Exemplo',
    cnpj: '12.345.678/0001-90',
    usuariosEstimados: 25,
    planoInteresse: 'Business',
    mensagem: 'Interesse em conhecer o plano e cronograma de onboarding.',
    leadId: 'abc-123',
    painelUrl: 'https://lexflowai.com.br/super-admin',
  },
} satisfies TemplateEntry
