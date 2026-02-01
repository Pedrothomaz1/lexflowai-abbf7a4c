import { cn } from "@/lib/utils";

interface TourProgressProps {
  currentStep: number;
  totalSteps: number;
}

export function TourProgress({ currentStep, totalSteps }: TourProgressProps) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: totalSteps }).map((_, index) => (
        <div
          key={index}
          className={cn(
            "h-2 rounded-full transition-all duration-300",
            index === currentStep
              ? "w-6 bg-primary"
              : index < currentStep
              ? "w-2 bg-primary/60"
              : "w-2 bg-primary/20"
          )}
        />
      ))}
    </div>
  );
}
