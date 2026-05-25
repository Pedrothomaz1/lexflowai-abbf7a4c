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

interface RecoveryEmailProps {
  siteName: string
  siteUrl?: string
  confirmationUrl: string
}

export const RecoveryEmail = ({
  siteName,
  siteUrl,
  confirmationUrl,
}: RecoveryEmailProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>Redefina sua senha no LexFlow</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}><Text style={brand}>LexFlow</Text></Section>
        <Section style={card}>
          <Heading style={h1}>Redefinir sua senha</Heading>
          <Text style={text}>
            Recebemos uma solicitação para redefinir a senha da sua conta no <strong>{siteName}</strong>.
            Clique no botão abaixo para criar uma nova senha.
          </Text>
          <Button style={button} href={confirmationUrl}>Redefinir senha</Button>
          <Text style={footer}>
            Se você não solicitou, ignore este e-mail. Sua senha continuará inalterada.
          </Text>
        </Section>
        <Text style={legal}>LexFlow · <Link href={siteUrl || 'https://lexflowai.com.br'} style={legalLink}>lexflowai.com.br</Link></Text>
      </Container>
    </Body>
  </Html>
)

export default RecoveryEmail

const main = { backgroundColor: '#ffffff', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif' }
const container = { padding: '32px 20px', maxWidth: '560px', margin: '0 auto' }
const header = { padding: '20px 24px', backgroundColor: '#1a3c2a', borderRadius: '12px 12px 0 0' }
const brand = { margin: 0, color: '#ffffff', fontSize: '18px', fontWeight: 700 as const, letterSpacing: '-0.01em' }
const card = { padding: '32px 28px', border: '1px solid #e4e4e7', borderTop: 'none', borderRadius: '0 0 12px 12px' }
const h1 = { fontSize: '22px', fontWeight: 700 as const, color: '#18181b', margin: '0 0 16px', letterSpacing: '-0.01em' }
const text = { fontSize: '15px', color: '#3f3f46', lineHeight: '1.6', margin: '0 0 24px' }
const button = { backgroundColor: '#1a3c2a', color: '#ffffff', fontSize: '15px', fontWeight: 600 as const, borderRadius: '10px', padding: '14px 28px', textDecoration: 'none', display: 'inline-block' }
const footer = { fontSize: '13px', color: '#71717a', lineHeight: '1.5', margin: '28px 0 0' }
const legal = { fontSize: '12px', color: '#a1a1aa', textAlign: 'center' as const, margin: '20px 0 0' }
const legalLink = { color: '#a1a1aa', textDecoration: 'underline' }
