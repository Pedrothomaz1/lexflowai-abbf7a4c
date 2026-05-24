/**
 * LandingHeader - Navigation and branding
 *
 * Sticky header with:
 * - Logo and brand name (LexFlow)
 * - Navigation buttons: "Planos" and "Entrar"
 * - Backdrop blur effect for modern look
 *
 * Extracted from Index.tsx for:
 * - Reusability (navbar on other pages)
 * - Testability (isolated unit tests)
 * - Maintainability (focused component)
 *
 * @example
 * ```tsx
 * import { LandingHeader } from '@/components/landing/LandingHeader';
 *
 * function Landing() {
 *   return (
 *     <>
 *       <LandingHeader />
 *       <main>...page content...</main>
 *     </>
 *   );
 * }
 * ```
 *
 * @returns React component rendered as sticky <header>
 */

import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Scale } from "lucide-react";
import { ROUTES } from "@/constants/routes";

export function LandingHeader() {
  const navigate = useNavigate();

  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
      <div className="container mx-auto px-6 py-4 flex items-center justify-between">
        {/* Logo & Brand */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center">
            <Scale className="h-6 w-6 text-primary-foreground" />
          </div>
          <span className="text-2xl font-bold">LexFlow</span>
        </div>

        {/* Navigation */}
        <div className="flex items-center gap-2">
          <Button onClick={() => navigate(ROUTES.PLANS)} variant="ghost">
            Planos
          </Button>
          <Button onClick={() => navigate(ROUTES.AUTH)} variant="default">
            Entrar
          </Button>
        </div>
      </div>
    </header>
  );
}

export default LandingHeader;
