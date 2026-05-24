/**
 * FeaturesGrid - 4-column responsive feature showcase
 *
 * Displays core product features in a responsive grid:
 * - 1 column on mobile
 * - 2 columns on tablet
 * - 4 columns on desktop
 *
 * Each feature card includes:
 * - Icon (rendered from Lucide React)
 * - Title
 * - Description
 * - Hover animation (lift effect + shadow)
 *
 * Features are loaded from LANDING_FEATURES config constant.
 * Accessible with id="features" for scroll-to-section navigation.
 *
 * @example
 * ```tsx
 * import { FeaturesGrid } from '@/components/landing/FeaturesGrid';
 *
 * function Landing() {
 *   return (
 *     <>
 *       <HeroSection />
 *       <FeaturesGrid />
 *       <Footer />
 *     </>
 *   );
 * }
 * ```
 *
 * @returns React component rendered as <section id="features"> with grid layout
 */

import { LANDING_FEATURES } from "@/constants/landing";

export function FeaturesGrid() {
  return (
    <section className="py-20" id="features">
      <h2 className="text-3xl font-bold text-center mb-4">
        Visão clara para quem decide
      </h2>
      <p className="text-center text-muted-foreground mb-12 max-w-xl mx-auto">
        Recursos pensados para gestores que precisam antecipar, não reagir.
      </p>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {LANDING_FEATURES.map((feature) => {
          const Icon = feature.icon;
          return (
            <div
              key={feature.id}
              className="card-elevated p-6 transition-smooth hover:shadow-lg hover:-translate-y-1"
              data-testid={`feature-card-${feature.id}`}
            >
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
              <p className="text-muted-foreground text-sm">{feature.description}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default FeaturesGrid;
