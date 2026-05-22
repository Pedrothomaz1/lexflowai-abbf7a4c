/**
 * Brand-aligned semantic color mappings for service categories
 * Uses CSS variables from Master Brand Palette (index.css)
 *
 * Pattern: Maps categories to semantic color tokens that respect:
 * - Light/dark mode via CSS variables
 * - Brand color palette consistency
 * - Accessibility (contrast ratios)
 */

export const CATEGORIA_COLORS = {
  seguranca: {
    label: "Segurança",
    // Uses destructive/critical semantic color (wine/burgundy palette)
    className: "bg-[hsl(var(--destructive)/0.1)] text-[hsl(var(--destructive))] dark:bg-[hsl(var(--destructive)/0.15)]",
    bgVar: "hsl(var(--destructive)/0.1)",
    textVar: "hsl(var(--destructive))",
  },
  manutencao: {
    label: "Manutenção",
    // Uses primary semantic color (verde principal palette)
    className: "bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))] dark:bg-[hsl(var(--primary)/0.15)]",
    bgVar: "hsl(var(--primary)/0.1)",
    textVar: "hsl(var(--primary))",
  },
  higiene: {
    label: "Higiene",
    // Uses success semantic color (green palette)
    className: "bg-[hsl(var(--success)/0.1)] text-[hsl(var(--success))] dark:bg-[hsl(var(--success)/0.15)]",
    bgVar: "hsl(var(--success)/0.1)",
    textVar: "hsl(var(--success))",
  },
  infraestrutura: {
    label: "Infraestrutura",
    // Uses info/secondary semantic color (blue palette)
    className: "bg-[hsl(var(--muted)/0.1)] text-[hsl(var(--muted-foreground))] dark:bg-[hsl(var(--muted)/0.2)]",
    bgVar: "hsl(var(--muted)/0.1)",
    textVar: "hsl(var(--muted-foreground))",
  },
  veiculos: {
    label: "Veículos",
    // Uses warning/amber semantic color (mostarda accent palette)
    className: "bg-[hsl(var(--warning)/0.1)] text-[hsl(var(--warning))] dark:bg-[hsl(var(--warning)/0.15)]",
    bgVar: "hsl(var(--warning)/0.1)",
    textVar: "hsl(var(--warning))",
  },
  outros: {
    label: "Outros",
    // Uses secondary semantic color (neutral palette)
    className: "bg-[hsl(var(--secondary)/0.1)] text-[hsl(var(--secondary-foreground))] dark:bg-[hsl(var(--secondary)/0.15)]",
    bgVar: "hsl(var(--secondary)/0.1)",
    textVar: "hsl(var(--secondary-foreground))",
  },
} as const;

/**
 * Semantic color mapping for purchase request status indicators
 * Also uses CSS variables for consistency with Master Brand Palette
 */
export const PURCHASE_STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  pendente: {
    bg: "bg-[hsl(var(--warning)/0.1)]",
    text: "text-[hsl(var(--warning))]",
    label: "Pendente",
  },
  enviado: {
    bg: "bg-[hsl(var(--primary)/0.1)]",
    text: "text-[hsl(var(--primary))]",
    label: "Enviado",
  },
  confirmado: {
    bg: "bg-[hsl(var(--success)/0.1)]",
    text: "text-[hsl(var(--success))]",
    label: "Confirmado",
  },
  erro: {
    bg: "bg-[hsl(var(--destructive)/0.1)]",
    text: "text-[hsl(var(--destructive))]",
    label: "Erro",
  },
} as const;

export type CategoriaKey = keyof typeof CATEGORIA_COLORS;
