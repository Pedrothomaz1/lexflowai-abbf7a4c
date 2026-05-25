/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>Seu código de verificação LexFlow</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}><Text style={brand}>LexFlow</Text></Section>
        <Section style={card}>
          <Heading style={h1}>Confirme sua identidade</Heading>
          <Text style={text}>Use o código abaixo para concluir a verificação:</Text>
          <Text style={codeStyle}>{token}</Text>
          <Text style={footer}>
            Este código expira em alguns minutos. Se você não solicitou, ignore este e-mail.
          </Text>
        </Section>
        <Text style={legal}>LexFlow — Gestão preventiva de contratos</Text>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail

const main = { backgroundColor: '#ffffff', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif' }
const container = { padding: '32px 20px', maxWidth: '560px', margin: '0 auto' }
const header = { padding: '20px 24px', backgroundColor: '#1a3c2a', borderRadius: '12px 12px 0 0' }
const brand = { margin: 0, color: '#ffffff', fontSize: '18px', fontWeight: 700 as const, letterSpacing: '-0.01em' }
const card = { padding: '32px 28px', border: '1px solid #e4e4e7', borderTop: 'none', borderRadius: '0 0 12px 12px' }
const h1 = { fontSize: '22px', fontWeight: 700 as const, color: '#18181b', margin: '0 0 16px', letterSpacing: '-0.01em' }
const text = { fontSize: '15px', color: '#3f3f46', lineHeight: '1.6', margin: '0 0 16px' }
const codeStyle = { fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace', fontSize: '28px', fontWeight: 700 as const, color: '#1a3c2a', letterSpacing: '0.2em', backgroundColor: '#f0fdf4', padding: '16px 20px', borderRadius: '10px', textAlign: 'center' as const, margin: '0 0 24px' }
const footer = { fontSize: '13px', color: '#71717a', lineHeight: '1.5', margin: '20px 0 0' }
const legal = { fontSize: '12px', color: '#a1a1aa', textAlign: 'center' as const, margin: '20px 0 0' }
