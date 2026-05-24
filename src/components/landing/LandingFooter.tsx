/**
 * LandingFooter - Sticky page footer with copyright and legal links
 *
 * Displays:
 * - Copyright notice with dynamic year
 * - Legal/policy navigation links (Privacy)
 * - Responsive layout (stacked on mobile, horizontal on desktop)
 * - Reusable across all pages
 *
 * Links navigate using react-router-dom based on ROUTES config.
 *
 * @example
 * ```tsx
 * import { LandingFooter } from '@/components/landing/LandingFooter';
 *
 * function App() {
 *   return (
 *     <>
 *       <Landing />
 *       <LandingFooter />
 *     </>
 *   );
 * }
 * ```
 *
 * @returns React component rendered as <footer> with border-top
 */

import { Link } from "react-router-dom";
import { ROUTES } from "@/constants/routes";

export function LandingFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-border py-8">
      <div className="container mx-auto px-6 flex flex-col sm:flex-row justify-between items-center gap-4">
        <p className="text-sm text-muted-foreground">
          © {currentYear} LexFlow. Todos os direitos reservados.
        </p>
        <div className="flex gap-4">
          <Link
            to={ROUTES.PRIVACY}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Política de Privacidade
          </Link>
        </div>
      </div>
    </footer>
  );
}

export default LandingFooter;
