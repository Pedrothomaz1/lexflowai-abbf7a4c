/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Link, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { SITE_NAME, SITE_URL, styles, brand } from './_brand.ts'

interface Parcela {
  titulo?: string
  data_vencimento?: string | null
  valor?: string | null
  status?: string | null
}

interface Props {
  numeroContrato?: string
  tituloContrato?: string
  valorTotalFormatado?: string
  vigencia?: string
  moeda?: string
  fornecedorLinha?: string
  parcelas?: Parcela[]
  observacoes?: string
}

const FinanceContractReportEmail = (p: Props) => {
  const parcelas = p.parcelas ?? []
  return (
    <Html lang="pt-BR" dir="ltr">
      <Head />
      <Preview>{`Aprovação financeira — ${p.numeroContrato ?? 'contrato'}`}</Preview>
      <Body style={styles.main}>
        <Container style={styles.container}>
          <Section style={styles.header}><Text style={styles.brand}>LexFlow</Text></Section>
          <Section style={styles.card}>
            <Heading style={styles.h1}>Contrato aprovado — análise financeira</Heading>
            {p.numeroContrato && <Text style={styles.text}><strong>{p.numeroContrato}</strong>{p.tituloContrato ? ` · ${p.tituloContrato}` : ''}</Text>}
            <Section style={styles.metaBox}>
              {p.valorTotalFormatado && <Text style={styles.metaRow}><span style={styles.metaLabel}>Valor total: </span><span style={styles.metaValue}>{p.valorTotalFormatado}</span></Text>}
              {p.vigencia && <Text style={styles.metaRow}><span style={styles.metaLabel}>Vigência: </span><span style={styles.metaValue}>{p.vigencia}</span></Text>}
              {p.moeda && <Text style={styles.metaRow}><span style={styles.metaLabel}>Moeda: </span><span style={styles.metaValue}>{p.moeda}</span></Text>}
              {p.fornecedorLinha && <Text style={styles.metaRow}><span style={styles.metaLabel}>Fornecedor: </span><span style={styles.metaValue}>{p.fornecedorLinha}</span></Text>}
            </Section>

            <Heading as="h2" style={styles.h2}>Parcelas e vencimentos</Heading>
            {parcelas.length === 0 ? (
              <Text style={styles.small}>Nenhuma parcela cadastrada para este contrato.</Text>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' as const, margin: '8px 0 16px' }}>
                <thead>
                  <tr style={{ background: brand.bgSoft }}>
                    <th style={th}>Parcela</th>
                    <th style={th}>Vencimento</th>
                    <th style={{ ...th, textAlign: 'right' as const }}>Valor</th>
                    <th style={{ ...th, textAlign: 'center' as const }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {parcelas.map((o, i) => (
                    <tr key={i} style={{ background: i % 2 === 0 ? '#ffffff' : brand.bgFaint }}>
                      <td style={td}>{o.titulo ?? '—'}</td>
                      <td style={td}>{o.data_vencimento ?? '—'}</td>
                      <td style={{ ...td, textAlign: 'right' as const, fontWeight: 600 }}>{o.valor ?? '—'}</td>
                      <td style={{ ...td, textAlign: 'center' as const }}>{o.status ?? 'pendente'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {p.observacoes && (
              <Section style={styles.noticeInfo}>
                <Text style={{ margin: 0, fontWeight: 600 as const, color: '#1e40af' }}>Observações</Text>
                <Text style={{ margin: '6px 0 0', color: '#1e3a5f' }}>{p.observacoes}</Text>
              </Section>
            )}

            <Text style={styles.footer}>Este e-mail foi gerado automaticamente pelo {SITE_NAME}. Em caso de dúvidas, fale com o gestor do contrato.</Text>
          </Section>
          <Text style={styles.legal}>LexFlow · <Link href={SITE_URL} style={styles.legalLink}>lexflowai.com.br</Link></Text>
        </Container>
      </Body>
    </Html>
  )
}

const th = { textAlign: 'left' as const, padding: '10px 12px', borderBottom: `2px solid ${brand.border}`, fontSize: '13px', color: brand.muted }
const td = { padding: '10px 12px', borderBottom: `1px solid ${brand.border}`, fontSize: '14px', color: brand.text }

export const template = {
  component: FinanceContractReportEmail,
  subject: (d: Record<string, any>) => `[${SITE_NAME}] Aprovação de Contrato${d?.numeroContrato ? ` — ${d.numeroContrato}` : ''}`,
  displayName: 'Relatório financeiro — contrato aprovado',
  previewData: {
    numeroContrato: 'CT-2025-0042',
    tituloContrato: 'Serviços de TI',
    valorTotalFormatado: 'R$ 120.000,00',
    vigencia: '01/01/2026 a 31/12/2026',
    moeda: 'BRL',
    fornecedorLinha: 'Alpha Tech Ltda. (CNPJ: 12.345.678/0001-90)',
    parcelas: [
      { titulo: 'Parcela 1', data_vencimento: '10/01/2026', valor: 'R$ 10.000,00', status: 'pendente' },
      { titulo: 'Parcela 2', data_vencimento: '10/02/2026', valor: 'R$ 10.000,00', status: 'pendente' },
    ],
    observacoes: 'Aprovado pela diretoria financeira em 22/12/2025.',
  },
} satisfies TemplateEntry
