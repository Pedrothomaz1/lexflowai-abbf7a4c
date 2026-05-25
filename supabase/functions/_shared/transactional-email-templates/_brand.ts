// Shared LexFlow brand styles for React Email templates
export const SITE_NAME = 'LexFlow'
export const SITE_URL = 'https://lexflowai.com.br'

export const brand = {
  primary: '#1a3c2a',
  primaryAccent: '#0f5132',
  mustard: '#c9a84c',
  text: '#18181b',
  body: '#3f3f46',
  muted: '#71717a',
  faint: '#a1a1aa',
  bgSoft: '#f4f4f5',
  bgFaint: '#fafafa',
  border: '#e4e4e7',
  danger: '#dc2626',
  warning: '#d97706',
  info: '#2563eb',
  success: '#059669',
}

export const fontStack =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif'

export const styles = {
  main: { backgroundColor: '#ffffff', fontFamily: fontStack },
  container: { padding: '32px 20px', maxWidth: '560px', margin: '0 auto' },
  header: {
    padding: '20px 24px',
    backgroundColor: brand.primary,
    borderRadius: '12px 12px 0 0',
  },
  brand: {
    margin: 0,
    color: '#ffffff',
    fontSize: '18px',
    fontWeight: 700 as const,
    letterSpacing: '-0.01em',
  },
  card: {
    padding: '32px 28px',
    border: `1px solid ${brand.border}`,
    borderTop: 'none',
    borderRadius: '0 0 12px 12px',
  },
  h1: {
    fontSize: '22px',
    fontWeight: 700 as const,
    color: brand.text,
    margin: '0 0 16px',
    letterSpacing: '-0.01em',
  },
  h2: {
    fontSize: '17px',
    fontWeight: 600 as const,
    color: brand.text,
    margin: '24px 0 12px',
  },
  text: {
    fontSize: '15px',
    color: brand.body,
    lineHeight: '1.6',
    margin: '0 0 16px',
  },
  small: {
    fontSize: '13px',
    color: brand.muted,
    lineHeight: '1.5',
    margin: '0 0 12px',
  },
  metaBox: {
    backgroundColor: brand.bgSoft,
    borderRadius: '10px',
    padding: '16px 18px',
    margin: '0 0 20px',
  },
  metaRow: { margin: '0 0 8px', fontSize: '14px', color: brand.body },
  metaLabel: { color: brand.muted },
  metaValue: { color: brand.text, fontWeight: 600 as const },
  button: {
    backgroundColor: brand.primary,
    color: '#ffffff',
    fontSize: '15px',
    fontWeight: 600 as const,
    borderRadius: '10px',
    padding: '14px 28px',
    textDecoration: 'none',
    display: 'inline-block',
  },
  footer: {
    fontSize: '13px',
    color: brand.muted,
    lineHeight: '1.5',
    margin: '28px 0 0',
  },
  legal: {
    fontSize: '12px',
    color: brand.faint,
    textAlign: 'center' as const,
    margin: '20px 0 0',
  },
  legalLink: { color: brand.faint, textDecoration: 'underline' },
  noticeInfo: {
    background: '#eff6ff',
    borderLeft: `4px solid ${brand.info}`,
    padding: '14px 16px',
    borderRadius: '6px',
    margin: '16px 0',
    fontSize: '14px',
    color: '#1e3a5f',
    lineHeight: '1.6',
  },
  noticeWarn: {
    background: '#fef9c3',
    borderLeft: `4px solid ${brand.warning}`,
    padding: '14px 16px',
    borderRadius: '6px',
    margin: '16px 0',
    fontSize: '14px',
    color: '#854d0e',
    lineHeight: '1.6',
  },
  noticeDanger: {
    background: '#fee2e2',
    borderLeft: `4px solid ${brand.danger}`,
    padding: '14px 16px',
    borderRadius: '6px',
    margin: '16px 0',
    fontSize: '14px',
    color: '#7f1d1d',
    lineHeight: '1.6',
  },
}
