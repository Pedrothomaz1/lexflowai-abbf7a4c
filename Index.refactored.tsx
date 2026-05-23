/**
 * Index - Landing Page (REFACTORED)
 *
 * BEFORE: 165 lines, monolithic component, hardcoded values, difficult to test
 * AFTER: 30 lines, composed components, centralized config, testable pieces
 *
 * Migration Steps:
 * 1. Import components from '@/components/landing'
 * 2. Replace inline JSX with component tree
 * 3. Delete this file, rename to Index.tsx
 * 4. Run tests to verify
 *
 * Files changed:
 * - Index.tsx (this file) ← was 165 lines
 * - src/constants/routes.ts ← NEW
 * - src/constants/landing.ts ← NEW
 * - src/components/landing/LandingHeader.tsx ← NEW
 * - src/components/landing/HeroSection.tsx ← NEW
 * - src/components/landing/FeaturesGrid.tsx ← NEW
 * - src/components/landing/ValueProposition.tsx ← NEW
 * - src/components/landing/LandingFooter.tsx ← NEW
 */

import {
  LandingHeader,
  HeroSection,
  FeaturesGrid,
  ValueProposition,
  LandingFooter,
} from "@/components/landing";

export function Index() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-background">
      <LandingHeader />
      <main className="container mx-auto px-6">
        <HeroSection />
        <FeaturesGrid />
        <ValueProposition />
      </main>
      <LandingFooter />
    </div>
  );
}

export default Index;
