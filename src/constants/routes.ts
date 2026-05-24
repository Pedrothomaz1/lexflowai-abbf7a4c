/**
 * Application routing constants
 * Usage: navigate(ROUTES.PLANS) instead of navigate("/planos")
 * Benefits: Type-safe, refactor-proof, single source of truth
 */

export const ROUTES = {
  // Landing
  HOME: "/",
  PLANS: "/planos",
  PRIVACY: "/privacidade",

  // Auth
  AUTH: "/auth",
  AUTH_SIGNUP: "/auth?mode=signup",
  AUTH_RESET: "/auth?mode=reset",

  // Main app
  DASHBOARD: "/dashboard",
  CONTRATOS: "/contratos",
  CONTRATOS_NOVO: "/contratos/novo",
  CONTRATOS_DETALHES: (id: string) => `/contratos/${id}`,

  FORNECEDORES: "/fornecedores",
  FORNECEDORES_NOVO: "/fornecedores/novo",

  FRANQUIAS: "/franquias",
  FRANQUIAS_NOVO: "/franquias/novo",

  TEMPLATES: "/templates",
  WORKFLOWS: "/workflows",
  WORKFLOWS_BUILDER: "/workflows/builder",

  RELATORIOS: "/relatorios",
  CONFIGURACOES: "/configuracoes",

  // Admin
  SUPER_ADMIN: "/super-admin",
  SECURITY: "/security",
} as const;

// Type-safe navigation type
export type RouteKey = keyof typeof ROUTES;
export type RoutePath = typeof ROUTES[RouteKey];
