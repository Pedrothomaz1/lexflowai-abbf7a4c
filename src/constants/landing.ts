/**
 * Landing page configuration
 * Centralized feature/highlight definitions
 * Enables: i18n future, feature flags, hotfix without deploy
 */

import {
  Bell,
  BarChart3,
  Users,
  ShieldOff,
  CheckCircle,
  Clock,
  LucideIcon,
} from "lucide-react";

export interface Feature {
  id: string;
  icon: LucideIcon;
  title: string;
  description: string;
}

export interface Highlight {
  id: string;
  icon: LucideIcon;
  text: string;
}

/**
 * Main features displayed in grid
 * Use id for analytics, feature flags
 */
export const LANDING_FEATURES: Feature[] = [
  {
    id: "anticipate-deadlines",
    icon: Bell,
    title: "Antecipe vencimentos importantes",
    description:
      "Visualize contratos próximos do vencimento e tenha tempo para decidir com tranquilidade.",
  },
  {
    id: "identify-risks",
    icon: BarChart3,
    title: "Saiba onde está o risco agora",
    description:
      "Identifique rapidamente contratos que exigem atenção antes de se tornarem urgência.",
  },
  {
    id: "centralized-view",
    icon: Users,
    title: "Tudo centralizado",
    description:
      "Contratos, fornecedores e obrigações organizados em uma única visão.",
  },
  {
    id: "autonomy",
    icon: ShieldOff,
    title: "Autonomia para decidir",
    description:
      "Acompanhe o status dos contratos sem depender de outras áreas.",
  },
];

/**
 * Hero highlights - quick value propositions
 */
export const HERO_HIGHLIGHTS: Highlight[] = [
  {
    id: "early-deadlines",
    icon: Bell,
    text: "Vencimentos antecipados",
  },
  {
    id: "realtime-risks",
    icon: BarChart3,
    text: "Riscos visíveis em tempo real",
  },
  {
    id: "own-timing",
    icon: CheckCircle,
    text: "Decisões no seu tempo",
  },
];

/**
 * Value proposition section config
 */
export const VALUE_PROPOSITION = {
  icon: Clock,
  title: "O tempo certo para cada decisão",
  description:
    "Antecipe vencimentos, organize obrigações e mantenha o controle. Simples assim.",
} as const;

/**
 * CTA buttons in hero section
 */
export const HERO_CTAS = {
  primary: {
    label: "Começar agora",
    route: "AUTH", // Will use ROUTES[HERO_CTAS.primary.route]
  },
  secondary: {
    label: "Ver como funciona",
    onClick: () => {
      // Scroll to features or open demo video
      document.getElementById("features")?.scrollIntoView({ behavior: "smooth" });
    },
  },
} as const;
