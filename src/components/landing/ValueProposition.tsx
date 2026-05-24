/**
 * ValueProposition - Centered hero callout with icon
 *
 * Highlights key value proposition with:
 * - Large icon (from Lucide React)
 * - Bold title
 * - Descriptive text
 * - Centered card layout with border and backdrop blur
 *
 * Used as a secondary value proposition callout between major sections.
 * Data comes from VALUE_PROPOSITION config constant.
 *
 * @example
 * ```tsx
 * import { ValueProposition } from '@/components/landing/ValueProposition';
 *
 * function Landing() {
 *   return (
 *     <>
 *       <HeroSection />
 *       <FeaturesGrid />
 *       <ValueProposition />
 *       <Testimonials />
 *     </>
 *   );
 * }
 * ```
 *
 * @returns React component rendered as centered <section> with card
 */

import { VALUE_PROPOSITION } from "@/constants/landing";

export function ValueProposition() {
  const Icon = VALUE_PROPOSITION.icon;

  return (
    <section className="py-16 text-center">
      <div className="max-w-3xl mx-auto bg-card/50 border border-border rounded-2xl p-8">
        <Icon className="h-12 w-12 text-primary mx-auto mb-4" />
        <h3 className="text-2xl font-semibold mb-3">{VALUE_PROPOSITION.title}</h3>
        <p className="text-muted-foreground">{VALUE_PROPOSITION.description}</p>
      </div>
    </section>
  );
}

export default ValueProposition;
