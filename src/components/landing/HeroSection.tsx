/**
 * HeroSection - Main value proposition above the fold
 *
 * The main entry point for landing page visitors. Displays:
 * - Headline with gradient ("Contratos sob controle...")
 * - Subheadline describing value proposition
 * - 3 quick highlights (icons + text)
 * - 2 CTAs: Primary "Começar agora" + Secondary "Ver como funciona"
 *
 * The secondary CTA scrolls to #features section for more details.
 *
 * @example
 * ```tsx
 * import { HeroSection } from '@/components/landing/HeroSection';
 *
 * function Landing() {
 *   return (
 *     <>
 *       <HeroSection />
 *       ... other sections
 *     </>
 *   );
 * }
 * ```
 *
 * @returns React component rendered as <section> with centered layout
 */

import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import { HERO_HIGHLIGHTS, HERO_CTAS } from "@/constants/landing";

export function HeroSection() {
  const navigate = useNavigate();

  return (
    <section className="py-20 text-center">
      {/* Headline */}
      <h1 className="text-5xl md:text-6xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary-glow">
        Contratos sob controle. Decisões no tempo certo.
      </h1>

      {/* Subheadline */}
      <p className="text-xl text-muted-foreground mb-6 max-w-2xl mx-auto">
        Tudo o que exige sua atenção, em um só lugar.
      </p>

      {/* Feature Highlights */}
      <div className="flex flex-wrap justify-center gap-6 mb-8">
        {HERO_HIGHLIGHTS.map((highlight) => {
          const Icon = highlight.icon;
          return (
            <div
              key={highlight.id}
              className="flex items-center gap-2 text-sm text-muted-foreground"
            >
              <Icon className="h-5 w-5 text-primary" />
              <span>{highlight.text}</span>
            </div>
          );
        })}
      </div>

      {/* CTAs */}
      <div className="flex gap-4 justify-center">
        <Button
          size="lg"
          onClick={() => navigate(ROUTES.AUTH)}
          className="btn-cta gap-2 shadow-lg hover:shadow-xl transition-all"
        >
          {HERO_CTAS.primary.label}
          <ArrowRight className="h-5 w-5" />
        </Button>
        <Button size="lg" variant="outline" onClick={HERO_CTAS.secondary.onClick}>
          {HERO_CTAS.secondary.label}
        </Button>
      </div>
    </section>
  );
}

export default HeroSection;
