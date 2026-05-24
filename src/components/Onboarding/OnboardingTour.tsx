import { useOnboardingTour } from "@/hooks/useOnboardingTour";
import { TourStep } from "./TourStep";

export function OnboardingTour() {
  const {
    isActive,
    currentStep,
    totalSteps,
    currentStepData,
    nextStep,
    previousStep,
    skipTour,
  } = useOnboardingTour();

  // Check for reduced motion preference
  const prefersReducedMotion = typeof window !== 'undefined' 
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!isActive || !currentStepData || prefersReducedMotion) {
    return null;
  }

  return (
    <TourStep
      targetSelector={currentStepData.targetSelector}
      message={currentStepData.message}
      cta={currentStepData.cta}
      currentStep={currentStep}
      totalSteps={totalSteps}
      onNext={nextStep}
      onPrevious={previousStep}
      onSkip={skipTour}
    />
  );
}
