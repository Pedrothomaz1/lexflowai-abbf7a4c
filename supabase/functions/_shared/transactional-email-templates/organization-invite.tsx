/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'LexFlow'
const SITE_URL = 'https://lexflowai.com.br'

interface OrganizationInviteProps {
  organizationName?: string
  inviterName?: string
  roleLabel?: string
  inviteUrl?: string
  expiresInDays?: number
}

const OrganizationInviteEmail = ({
  organizationName,
  inviterName,
  roleLabel,
  inviteUrl,
  expiresInDays = 7,
}: OrganizationInviteProps) => {
  const org = organizationName ?? 'sua organização'
  const inviter = inviterName ?? 'Um administrador'
  return (
    <Html lang="pt-BR" dir="ltr">
      <Head />
      <Preview>{`${inviter} convidou você para ${org} no ${SITE_NAME}`}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Text style={brand}>LexFlow</Text>
          </Section>
          <Section style={card}>
            <Heading style={h1}>Você foi convidado para {org}</Heading>
            <Text style={text}>
              <strong>{inviter}</strong> convidou você para colaborar em{' '}
              <strong>{org}</strong> no {SITE_NAME}
              {roleLabel ? <> como <strong>{roleLabel}</strong></> : null}.
            </Text>

            <Section style={metaBox}>
              <Text style={metaLabel}>Organização</Text>
              <Text style={metaValue}>{org}</Text>
            </Section>

            {inviteUrl && (
              <Section style={{ textAlign: 'center' as const }}>
                <Button style={button} href={inviteUrl}>
                  Aceitar convite
                </Button>
              </Section>
            )}

            <Text style={footer}>
              Este convite expira em {expiresInDays} dias. Se você não esperava
              este e-mail, pode ignorá-lo com segurança.
            </Text>
          </Section>
          <Text style={legal}>
            LexFlow ·{' '}
            <Link href={SITE_URL} style={legalLink}>
              lexflowai.com.br
            </Link>
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: OrganizationInviteEmail,
  subject: (data: Record<string, any>) =>
    `Convite para ${data?.organizationName ?? 'sua organização'} · ${SITE_NAME}`,
  displayName: 'Convite de organização',
  previewData: {
    organizationName: 'Acme Holdings',
    inviterName: 'Ana Souza',
    roleLabel: 'Administrador',
    inviteUrl: 'https://lexflowai.com.br/aceitar-convite?token=preview',
    expiresInDays: 7,
  },
} satisfies TemplateEntry

const main = {
  backgroundColor: '#ffffff',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif',
}
const container = { padding: '32px 20px', maxWidth: '560px', margin: '0 auto' }
const header = { padding: '20px 24px', backgroundColor: '#1a3c2a', borderRadius: '12px 12px 0 0' }
const brand = {
  margin: 0,
  color: '#ffffff',
  fontSize: '18px',
  fontWeight: 700 as const,
  letterSpacing: '-0.01em',
}
const card = {
  padding: '32px 28px',
  border: '1px solid #e4e4e7',
  borderTop: 'none',
  borderRadius: '0 0 12px 12px',
}
const h1 = {
  fontSize: '22px',
  fontWeight: 700 as const,
  color: '#18181b',
  margin: '0 0 16px',
  letterSpacing: '-0.01em',
}
const text = { fontSize: '15px', color: '#3f3f46', lineHeight: '1.6', margin: '0 0 20px' }
const metaBox = {
  backgroundColor: '#f4f4f5',
  borderRadius: '10px',
  padding: '14px 16px',
  margin: '0 0 24px',
}
const metaLabel = { fontSize: '12px', color: '#71717a', margin: '0 0 4px', textTransform: 'uppercase' as const, letterSpacing: '0.04em' }
const metaValue = { fontSize: '15px', fontWeight: 600 as const, color: '#18181b', margin: 0 }
const button = {
  backgroundColor: '#1a3c2a',
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: 600 as const,
  borderRadius: '10px',
  padding: '14px 28px',
  textDecoration: 'none',
  display: 'inline-block',
}
const footer = { fontSize: '13px', color: '#71717a', lineHeight: '1.5', margin: '28px 0 0' }
const legal = { fontSize: '12px', color: '#a1a1aa', textAlign: 'center' as const, margin: '20px 0 0' }
const legalLink = { color: '#a1a1aa', textDecoration: 'underline' }
