/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Link, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { SITE_NAME, SITE_URL, styles } from './_brand.ts'

interface Props {
  primeiroNome?: string
  planoLabel?: string
}

const LeadConfirmationEmail = (p: Props) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>Recebemos seu contato — LexFlow</Preview>
    <Body style={styles.main}>
      <Container style={styles.container}>
        <Section style={styles.header}><Text style={styles.brand}>LexFlow</Text></Section>
        <Section style={styles.card}>
          <Heading style={styles.h1}>
            {p.primeiroNome ? `Recebemos seu contato, ${p.primeiroNome}!` : 'Recebemos seu contato!'}
          </Heading>
          <Text style={styles.text}>
            Obrigado pelo interesse no <strong>{SITE_NAME}</strong>
            {p.planoLabel ? <> — plano <strong>{p.planoLabel}</strong></> : null}.
          </Text>
          <Text style={styles.text}>
            Nossa equipe vai entrar em contato em até <strong>1 dia útil</strong> para entender suas necessidades e liberar o acesso.
          </Text>
          <Text style={styles.text}>
            Enquanto isso, você pode conhecer mais em{' '}
            <Link href={SITE_URL} style={{ color: '#1a3c2a' }}>lexflowai.com.br</Link>.
          </Text>
          <Text style={styles.footer}>{SITE_NAME} · Gestão preventiva de contratos</Text>
        </Section>
        <Text style={styles.legal}>LexFlow · <Link href={SITE_URL} style={styles.legalLink}>lexflowai.com.br</Link></Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: LeadConfirmationEmail,
  subject: 'Recebemos seu contato — LexFlow',
  displayName: 'Confirmação para o lead',
  previewData: { primeiroNome: 'Maria', planoLabel: 'Business' },
} satisfies TemplateEntry
