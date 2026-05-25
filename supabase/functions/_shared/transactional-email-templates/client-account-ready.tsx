/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Link, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { SITE_NAME, SITE_URL, styles } from './_brand.ts'

interface Props {
  ownerNome?: string
  organizationName?: string
  plano?: string
  inviteUrl?: string
  expiresInDays?: number
}

const ClientAccountReadyEmail = (p: Props) => {
  const dias = p.expiresInDays ?? 14
  return (
    <Html lang="pt-BR" dir="ltr">
      <Head />
      <Preview>{`Sua conta ${SITE_NAME} está pronta`}</Preview>
      <Body style={styles.main}>
        <Container style={styles.container}>
          <Section style={styles.header}><Text style={styles.brand}>LexFlow</Text></Section>
          <Section style={styles.card}>
            <Heading style={styles.h1}>
              Bem-vindo{p.ownerNome ? `, ${p.ownerNome}` : ''}!
            </Heading>
            <Text style={styles.text}>
              Sua conta no {SITE_NAME} para <strong>{p.organizationName ?? 'sua empresa'}</strong> está liberada e pronta para uso.
            </Text>
            <Text style={styles.text}>
              Clique no botão abaixo para definir sua senha e acessar o sistema. A partir daí você poderá convidar sua equipe, cadastrar contratos e configurar fornecedores.
            </Text>
            {p.inviteUrl && (
              <Section style={{ textAlign: 'center' as const, margin: '4px 0 12px' }}>
                <Button style={styles.button} href={p.inviteUrl}>Acessar {SITE_NAME}</Button>
              </Section>
            )}
            <Text style={styles.small}>Este link expira em {dias} dias.</Text>
            <Text style={styles.footer}>
              Plano contratado: {(p.plano ?? '').toUpperCase() || '—'} · {SITE_NAME} — Gestão de contratos
            </Text>
          </Section>
          <Text style={styles.legal}>LexFlow · <Link href={SITE_URL} style={styles.legalLink}>lexflowai.com.br</Link></Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: ClientAccountReadyEmail,
  subject: (d: Record<string, any>) =>
    `Sua conta ${SITE_NAME} está pronta${d?.organizationName ? ` — ${d.organizationName}` : ''}`,
  displayName: 'Conta de cliente liberada',
  previewData: {
    ownerNome: 'Maria Silva',
    organizationName: 'Acme Holdings',
    plano: 'pro',
    inviteUrl: 'https://lexflowai.com.br/aceitar-convite?token=preview',
    expiresInDays: 14,
  },
} satisfies TemplateEntry
