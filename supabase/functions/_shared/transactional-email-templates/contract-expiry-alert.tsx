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

interface ContractExpiryAlertProps {
  recipientName?: string
  contractTitle?: string
  counterpartyName?: string
  expiryDate?: string
  daysRemaining?: number
  contractUrl?: string
}

const ContractExpiryAlertEmail = ({
  recipientName,
  contractTitle,
  counterpartyName,
  expiryDate,
  daysRemaining,
  contractUrl,
}: ContractExpiryAlertProps) => {
  const greeting = recipientName ? `Olá, ${recipientName}` : 'Olá'
  const titleText = contractTitle ?? 'Um contrato'
  const counterparty = counterpartyName ? ` com ${counterpartyName}` : ''
  const daysText =
    typeof daysRemaining === 'number'
      ? daysRemaining <= 0
        ? 'venceu'
        : daysRemaining === 1
          ? 'vence amanhã'
          : `vence em ${daysRemaining} dias`
      : 'está próximo do vencimento'

  return (
    <Html lang="pt-BR" dir="ltr">
      <Head />
      <Preview>{`${titleText} ${daysText}`}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Text style={brand}>LexFlow</Text>
          </Section>
          <Section style={card}>
            <Heading style={h1}>Contrato próximo do vencimento</Heading>
            <Text style={text}>{greeting},</Text>
            <Text style={text}>
              <strong>{titleText}</strong>{counterparty} {daysText}
              {expiryDate ? ` (${expiryDate})` : ''}. Revise as condições e
              defina se vai renovar, renegociar ou encerrar.
            </Text>
            {contractUrl && (
              <Button style={button} href={contractUrl}>
                Abrir contrato
              </Button>
            )}
            <Text style={footer}>
              Você está recebendo este alerta porque é responsável pela gestão
              deste contrato no {SITE_NAME}.
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
  component: ContractExpiryAlertEmail,
  subject: (data: Record<string, any>) => {
    const title = data?.contractTitle ?? 'Contrato'
    if (typeof data?.daysRemaining === 'number') {
      if (data.daysRemaining <= 0) return `${title} venceu`
      if (data.daysRemaining === 1) return `${title} vence amanhã`
      return `${title} vence em ${data.daysRemaining} dias`
    }
    return `${title} próximo do vencimento`
  },
  displayName: 'Alerta de vencimento de contrato',
  previewData: {
    recipientName: 'Ana',
    contractTitle: 'Contrato de prestação de serviços #1287',
    counterpartyName: 'Fornecedor Alpha Ltda.',
    expiryDate: '15/06/2026',
    daysRemaining: 7,
    contractUrl: 'https://lexflowai.com.br/contratos/1287',
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
const text = { fontSize: '15px', color: '#3f3f46', lineHeight: '1.6', margin: '0 0 16px' }
const button = {
  backgroundColor: '#1a3c2a',
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: 600 as const,
  borderRadius: '10px',
  padding: '14px 28px',
  textDecoration: 'none',
  display: 'inline-block',
  margin: '8px 0 0',
}
const footer = { fontSize: '13px', color: '#71717a', lineHeight: '1.5', margin: '28px 0 0' }
const legal = { fontSize: '12px', color: '#a1a1aa', textAlign: 'center' as const, margin: '20px 0 0' }
const legalLink = { color: '#a1a1aa', textDecoration: 'underline' }
