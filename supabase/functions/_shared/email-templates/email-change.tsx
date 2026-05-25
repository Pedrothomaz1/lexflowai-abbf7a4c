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

interface EmailChangeEmailProps {
  siteName: string
  oldEmail: string
  email: string
  newEmail: string
  confirmationUrl: string
}

export const EmailChangeEmail = ({
  siteName,
  oldEmail,
  newEmail,
  confirmationUrl,
}: EmailChangeEmailProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>Confirme a alteração de e-mail no {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}><Text style={brand}>LexFlow</Text></Section>
        <Section style={card}>
          <Heading style={h1}>Confirme a alteração de e-mail</Heading>
          <Text style={text}>
            Você solicitou alterar o e-mail da sua conta no <strong>{siteName}</strong> de{' '}
            <Link href={`mailto:${oldEmail}`} style={link}>{oldEmail}</Link> para{' '}
            <Link href={`mailto:${newEmail}`} style={link}>{newEmail}</Link>.
          </Text>
          <Button style={button} href={confirmationUrl}>Confirmar alteração</Button>
          <Text style={footer}>
            Se você não fez essa solicitação, proteja sua conta imediatamente alterando sua senha.
          </Text>
        </Section>
        <Text style={legal}>LexFlow — Gestão preventiva de contratos</Text>
      </Container>
    </Body>
  </Html>
)

export default EmailChangeEmail

const main = { backgroundColor: '#ffffff', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif' }
const container = { padding: '32px 20px', maxWidth: '560px', margin: '0 auto' }
const header = { padding: '20px 24px', backgroundColor: '#1a3c2a', borderRadius: '12px 12px 0 0' }
const brand = { margin: 0, color: '#ffffff', fontSize: '18px', fontWeight: 700 as const, letterSpacing: '-0.01em' }
const card = { padding: '32px 28px', border: '1px solid #e4e4e7', borderTop: 'none', borderRadius: '0 0 12px 12px' }
const h1 = { fontSize: '22px', fontWeight: 700 as const, color: '#18181b', margin: '0 0 16px', letterSpacing: '-0.01em' }
const text = { fontSize: '15px', color: '#3f3f46', lineHeight: '1.6', margin: '0 0 24px' }
const link = { color: '#1a3c2a', textDecoration: 'underline' }
const button = { backgroundColor: '#1a3c2a', color: '#ffffff', fontSize: '15px', fontWeight: 600 as const, borderRadius: '10px', padding: '14px 28px', textDecoration: 'none', display: 'inline-block' }
const footer = { fontSize: '13px', color: '#71717a', lineHeight: '1.5', margin: '28px 0 0' }
const legal = { fontSize: '12px', color: '#a1a1aa', textAlign: 'center' as const, margin: '20px 0 0' }
