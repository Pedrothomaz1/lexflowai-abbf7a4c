/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Link, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { SITE_NAME, SITE_URL, styles } from './_brand.ts'

type Tipo = 'renovacao' | 'vencimento' | 'alerta'

interface Props {
  tipo?: Tipo
  numeroContrato?: string
  tituloContrato?: string
  fornecedor?: string
  vencimento?: string
  valorFormatado?: string
  contratoUrl?: string
}

const LABELS: Record<Tipo, { titulo: string; mensagem: string }> = {
  renovacao: {
    titulo: 'Renovação de contrato',
    mensagem: 'Este contrato está em processo de renovação. Revise as condições e confirme os próximos passos.',
  },
  vencimento: {
    titulo: 'Contrato próximo do vencimento',
    mensagem: 'Ação necessária: avalie a renovação ou encerramento antes da data de vencimento.',
  },
  alerta: {
    titulo: 'Alerta de contrato',
    mensagem: 'Este contrato requer sua atenção. Verifique os detalhes abaixo.',
  },
}

const ContractStatusAlertEmail = (p: Props) => {
  const tipo = (p.tipo ?? 'alerta') as Tipo
  const conf = LABELS[tipo] || LABELS.alerta
  return (
    <Html lang="pt-BR" dir="ltr">
      <Head />
      <Preview>{`${conf.titulo} — ${p.numeroContrato ?? ''}`}</Preview>
      <Body style={styles.main}>
        <Container style={styles.container}>
          <Section style={styles.header}><Text style={styles.brand}>LexFlow</Text></Section>
          <Section style={styles.card}>
            <Heading style={styles.h1}>{conf.titulo}</Heading>
            <Text style={styles.text}>{conf.mensagem}</Text>
            <Section style={styles.metaBox}>
              {p.numeroContrato && <Text style={styles.metaRow}><span style={styles.metaLabel}>Contrato: </span><span style={styles.metaValue}>{p.numeroContrato}</span></Text>}
              {p.tituloContrato && <Text style={styles.metaRow}><span style={styles.metaLabel}>Título: </span><span style={styles.metaValue}>{p.tituloContrato}</span></Text>}
              {p.fornecedor && <Text style={styles.metaRow}><span style={styles.metaLabel}>Fornecedor: </span><span style={styles.metaValue}>{p.fornecedor}</span></Text>}
              {p.vencimento && <Text style={styles.metaRow}><span style={styles.metaLabel}>Vencimento: </span><span style={styles.metaValue}>{p.vencimento}</span></Text>}
              {p.valorFormatado && <Text style={styles.metaRow}><span style={styles.metaLabel}>Valor: </span><span style={styles.metaValue}>{p.valorFormatado}</span></Text>}
            </Section>
            {p.contratoUrl && (
              <Section style={{ textAlign: 'center' as const }}>
                <Button style={styles.button} href={p.contratoUrl}>Abrir contrato</Button>
              </Section>
            )}
            <Text style={styles.footer}>
              Você está recebendo este alerta porque é responsável pela gestão deste contrato no {SITE_NAME}.
            </Text>
          </Section>
          <Text style={styles.legal}>LexFlow · <Link href={SITE_URL} style={styles.legalLink}>lexflowai.com.br</Link></Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: ContractStatusAlertEmail,
  subject: (d: Record<string, any>) => {
    const tipo = (d?.tipo ?? 'alerta') as Tipo
    const t = LABELS[tipo]?.titulo ?? 'Alerta de contrato'
    return d?.numeroContrato ? `${t} — ${d.numeroContrato}` : t
  },
  displayName: 'Alerta de status de contrato',
  previewData: {
    tipo: 'vencimento',
    numeroContrato: 'CT-2025-0042',
    tituloContrato: 'Prestação de serviços de TI',
    fornecedor: 'Alpha Tech Ltda.',
    vencimento: '15/06/2026',
    valorFormatado: 'R$ 120.000,00',
    contratoUrl: 'https://lexflowai.com.br/contratos/preview',
  },
} satisfies TemplateEntry
