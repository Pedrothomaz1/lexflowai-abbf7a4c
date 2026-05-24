import * as React from "react";
import { motion, HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

interface AnimatedCardProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  hoverScale?: number;
  hoverShadow?: boolean;
}

const AnimatedCard = React.forwardRef<HTMLDivElement, AnimatedCardProps>(
  ({ className, children, delay = 0, hoverScale = 1.02, hoverShadow = true, ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{
          duration: 0.4,
          delay,
          ease: [0.25, 0.46, 0.45, 0.94],
        }}
        whileHover={{
          scale: hoverScale,
          boxShadow: hoverShadow ? "0 10px 40px -10px hsl(var(--primary) / 0.15)" : undefined,
        }}
        whileTap={{ scale: 0.98 }}
        className={cn(
          "rounded-2xl border bg-card text-card-foreground shadow-sm transition-all duration-200",
          className
        )}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);
AnimatedCard.displayName = "AnimatedCard";

interface AnimatedCardHeaderProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode;
  className?: string;
}

const AnimatedCardHeader = React.forwardRef<HTMLDivElement, AnimatedCardHeaderProps>(
  ({ className, children, ...props }, ref) => (
    <motion.div
      ref={ref}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.2 }}
      className={cn("flex flex-col space-y-1.5 p-5", className)}
      {...props}
    >
      {children}
    </motion.div>
  )
);
AnimatedCardHeader.displayName = "AnimatedCardHeader";

interface AnimatedCardContentProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode;
  className?: string;
}

const AnimatedCardContent = React.forwardRef<HTMLDivElement, AnimatedCardContentProps>(
  ({ className, children, ...props }, ref) => (
    <motion.div
      ref={ref}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.3 }}
      className={cn("p-5 pt-0", className)}
      {...props}
    >
      {children}
    </motion.div>
  )
);
AnimatedCardContent.displayName = "AnimatedCardContent";

export { AnimatedCard, AnimatedCardHeader, AnimatedCardContent };
