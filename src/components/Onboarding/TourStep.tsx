import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TourProgress } from "./TourProgress";
import { cn } from "@/lib/utils";

interface TourStepProps {
  targetSelector: string;
  message: string;
  cta: string;
  currentStep: number;
  totalSteps: number;
  onNext: () => void;
  onPrevious: () => void;
  onSkip: () => void;
}

interface Position {
  top: number;
  left: number;
  width: number;
  height: number;
}

export function TourStep({
  targetSelector,
  message,
  cta,
  currentStep,
  totalSteps,
  onNext,
  onPrevious,
  onSkip,
}: TourStepProps) {
  const [targetPosition, setTargetPosition] = useState<Position | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<"bottom" | "top" | "left" | "right">("bottom");
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updatePosition = () => {
      const target = document.querySelector(targetSelector);
      if (target) {
        const rect = target.getBoundingClientRect();
        setTargetPosition({
          top: rect.top + window.scrollY,
          left: rect.left + window.scrollX,
          width: rect.width,
          height: rect.height,
        });

        // Determine tooltip position based on available space
        const viewportHeight = window.innerHeight;
        const viewportWidth = window.innerWidth;
        const spaceBelow = viewportHeight - rect.bottom;
        const spaceAbove = rect.top;
        const spaceRight = viewportWidth - rect.right;

        if (spaceBelow > 200) {
          setTooltipPosition("bottom");
        } else if (spaceAbove > 200) {
          setTooltipPosition("top");
        } else if (spaceRight > 350) {
          setTooltipPosition("right");
        } else {
          setTooltipPosition("left");
        }

        // Scroll target into view if needed
        target.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition);
    };
  }, [targetSelector]);

  const getTooltipStyles = (): React.CSSProperties => {
    if (!targetPosition) return { opacity: 0 };

    const padding = 16;
    const tooltipWidth = 320;

    switch (tooltipPosition) {
      case "bottom":
        return {
          top: targetPosition.top + targetPosition.height + padding,
          left: Math.max(padding, Math.min(
            targetPosition.left + targetPosition.width / 2 - tooltipWidth / 2,
            window.innerWidth - tooltipWidth - padding
          )),
        };
      case "top":
        return {
          bottom: window.innerHeight - targetPosition.top + padding,
          left: Math.max(padding, Math.min(
            targetPosition.left + targetPosition.width / 2 - tooltipWidth / 2,
            window.innerWidth - tooltipWidth - padding
          )),
        };
      case "right":
        return {
          top: targetPosition.top + targetPosition.height / 2 - 80,
          left: targetPosition.left + targetPosition.width + padding,
        };
      case "left":
        return {
          top: targetPosition.top + targetPosition.height / 2 - 80,
          right: window.innerWidth - targetPosition.left + padding,
        };
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100]"
      >
        {/* Overlay with spotlight */}
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />
        
        {/* Spotlight cutout */}
        {targetPosition && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute rounded-lg ring-4 ring-primary/50 ring-offset-4 ring-offset-background"
            style={{
              top: targetPosition.top - 8,
              left: targetPosition.left - 8,
              width: targetPosition.width + 16,
              height: targetPosition.height + 16,
              boxShadow: "0 0 0 9999px hsl(var(--background) / 0.85)",
            }}
          />
        )}

        {/* Tooltip */}
        <motion.div
          ref={tooltipRef}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className={cn(
            "absolute z-[101] w-80 p-5 rounded-xl border border-border bg-card shadow-xl",
          )}
          style={getTooltipStyles()}
        >
          {/* Skip button */}
          <button
            onClick={onSkip}
            className="absolute top-3 right-3 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="Pular tour"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Content */}
          <div className="space-y-4">
            <div className="pr-6">
              <p className="text-sm leading-relaxed text-foreground">
                {message}
              </p>
            </div>

            {/* Progress and actions */}
            <div className="flex items-center justify-between pt-2">
              <TourProgress currentStep={currentStep} totalSteps={totalSteps} />
              
              <div className="flex items-center gap-2">
                {currentStep > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onPrevious}
                    className="h-8 px-2"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  size="sm"
                  onClick={onNext}
                  className="h-8 btn-cta"
                >
                  {cta}
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
