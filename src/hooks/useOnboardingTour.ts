import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'lexflow_onboarding_completed';

export interface TourStep {
  step: number;
  focus: 'dashboard' | 'criar' | 'alertas';
  targetSelector: string;
  message: string;
  cta: string;
}

export const tourSteps: TourStep[] = [
  {
    step: 1,
    focus: 'dashboard',
    targetSelector: '[data-tour="kpi-grid"]',
    message: 'Bem-vindo ao LexFlow! Aqui você acompanha todos os indicadores da sua gestão de contratos em tempo real.',
    cta: 'Próximo',
  },
  {
    step: 2,
    focus: 'criar',
    targetSelector: '[data-tour="novo-contrato"]',
    message: 'Crie novos contratos ou serviços com poucos cliques. Use os templates prontos para agilizar o processo.',
    cta: 'Próximo',
  },
  {
    step: 3,
    focus: 'alertas',
    targetSelector: '[data-tour="alertas"]',
    message: 'Receba alertas automáticos sobre vencimentos, riscos e aprovações pendentes. Nunca perca um prazo importante.',
    cta: 'Finalizar',
  },
];

export function useOnboardingTour() {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [hasCompleted, setHasCompleted] = useState(true);

  useEffect(() => {
    const completed = localStorage.getItem(STORAGE_KEY);
    if (!completed) {
      setHasCompleted(false);
      // Small delay to let the page render first
      const timer = setTimeout(() => setIsActive(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const nextStep = useCallback(() => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      completeTour();
    }
  }, [currentStep]);

  const previousStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  const skipTour = useCallback(() => {
    completeTour();
  }, []);

  const completeTour = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setIsActive(false);
    setHasCompleted(true);
  }, []);

  const restartTour = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setCurrentStep(0);
    setHasCompleted(false);
    setIsActive(true);
  }, []);

  return {
    isActive,
    currentStep,
    totalSteps: tourSteps.length,
    currentStepData: tourSteps[currentStep],
    hasCompleted,
    nextStep,
    previousStep,
    skipTour,
    restartTour,
  };
}
