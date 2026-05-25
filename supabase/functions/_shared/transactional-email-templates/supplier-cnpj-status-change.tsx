/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Link, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { SITE_NAME, SITE_URL, styles } from './_brand.ts'

interface Contrato {
  numero_contrato?: string
  titulo?: string
}

interface Props {
  fornecedorNome?: string
  novoStatus?: string
  contratos?: Contrato[]
  fornecedoresUrl?: string
}

const SupplierCnpjStatusChangeEmail = (p: Props) => {
  const status = (p.novoStatus ?? 'inativo').toUpperCase()
  const contratos = p.contratos ?? []
  return (
    <Html lang="pt-BR" dir="ltr">
      <Head />
      <Preview>{`CNPJ ${status} — ${p.fornecedorNome ?? ''}`}</Preview>
      <Body style={styles.main}>
        <Container style={styles.container}>
          <Section style={styles.header}><Text style={styles.brand}>LexFlow</Text></Section>
          <Section style={styles.card}>
            <Heading style={styles.h1}>CNPJ {status} na Receita Federal</Heading>
            <Text style={styles.text}><strong>{p.fornecedorNome ?? 'Fornecedor'}</strong></Text>
            <Section style={styles.noticeDanger}>
              <Text style={{ margin: 0 }}>
                Detectamos que o CNPJ deste fornecedor mudou para <strong>{status}</strong> na Receita Federal. Recomendamos revisar os contratos vinculados.
              </Text>
            </Section>
            {contratos.length > 0 && (
              <>
                <Heading as="h2" style={styles.h2}>Contratos ativos afetados</Heading>
                {contratos.map((c, i) => (
                  <Text key={i} style={{ ...styles.metaRow, margin: '0 0 6px' }}>
                    • <span style={styles.metaValue}>{c.numero_contrato ?? '—'}</span>
                    {c.titulo ? ` — ${c.titulo}` : ''}
                  </Text>
                ))}
              </>
            )}
            {p.fornecedoresUrl && (
              <Section style={{ textAlign: 'center' as const, marginTop: '20px' }}>
                <Button style={styles.button} href={p.fornecedoresUrl}>Abrir LexFlow</Button>
              </Section>
            )}
            <Text style={styles.footer}>Verificação automática diária de CNPJ — {SITE_NAME}.</Text>
          </Section>
          <Text style={styles.legal}>LexFlow · <Link href={SITE_URL} style={styles.legalLink}>lexflowai.com.br</Link></Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: SupplierCnpjStatusChangeEmail,
  subject: (d: Record<string, any>) =>
    `CNPJ ${(d?.novoStatus ?? 'inativo').toUpperCase()} — ${d?.fornecedorNome ?? 'fornecedor'}`,
  displayName: 'Mudança de status de CNPJ de fornecedor',
  previewData: {
    fornecedorNome: 'Alpha Tech Ltda.',
    novoStatus: 'baixada',
    contratos: [
      { numero_contrato: 'CT-2025-0042', titulo: 'Serviços de TI' },
      { numero_contrato: 'CT-2024-0188', titulo: 'Suporte e infraestrutura' },
    ],
    fornecedoresUrl: 'https://lexflowai.com.br/fornecedores',
  },
} satisfies TemplateEntry
