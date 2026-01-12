import * as React from "react";
import { motion, HTMLMotionProps, Variants } from "framer-motion";
import { cn } from "@/lib/utils";

// Stagger container for animating children in sequence
interface StaggerContainerProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode;
  className?: string;
  staggerDelay?: number;
}

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
};

const StaggerContainer = React.forwardRef<HTMLDivElement, StaggerContainerProps>(
  ({ className, children, staggerDelay = 0.1, ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        initial="hidden"
        animate="visible"
        variants={{
          hidden: { opacity: 0 },
          visible: {
            opacity: 1,
            transition: {
              staggerChildren: staggerDelay,
              delayChildren: 0.1,
            },
          },
        }}
        className={cn(className)}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);
StaggerContainer.displayName = "StaggerContainer";

// Item for use inside StaggerContainer
interface StaggerItemProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode;
  className?: string;
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 24,
    },
  },
};

const StaggerItem = React.forwardRef<HTMLDivElement, StaggerItemProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        variants={itemVariants}
        className={cn(className)}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);
StaggerItem.displayName = "StaggerItem";

// Fade in animation
interface FadeInProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  direction?: "up" | "down" | "left" | "right";
}

const FadeIn = React.forwardRef<HTMLDivElement, FadeInProps>(
  ({ className, children, delay = 0, direction = "up", ...props }, ref) => {
    const directionOffset = {
      up: { y: 20, x: 0 },
      down: { y: -20, x: 0 },
      left: { y: 0, x: 20 },
      right: { y: 0, x: -20 },
    };

    return (
      <motion.div
        ref={ref}
        initial={{ 
          opacity: 0, 
          ...directionOffset[direction] 
        }}
        animate={{ 
          opacity: 1, 
          y: 0, 
          x: 0 
        }}
        transition={{
          duration: 0.5,
          delay,
          ease: [0.25, 0.46, 0.45, 0.94],
        }}
        className={cn(className)}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);
FadeIn.displayName = "FadeIn";

// Scale in animation
interface ScaleInProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}

const ScaleIn = React.forwardRef<HTMLDivElement, ScaleInProps>(
  ({ className, children, delay = 0, ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{
          type: "spring",
          stiffness: 300,
          damping: 20,
          delay,
        }}
        className={cn(className)}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);
ScaleIn.displayName = "ScaleIn";

// Hover card effect
interface HoverCardEffectProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode;
  className?: string;
}

const HoverCardEffect = React.forwardRef<HTMLDivElement, HoverCardEffectProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        whileHover={{ 
          y: -4,
          boxShadow: "0 12px 24px -8px hsl(var(--primary) / 0.12)",
        }}
        transition={{
          type: "spring",
          stiffness: 400,
          damping: 25,
        }}
        className={cn(className)}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);
HoverCardEffect.displayName = "HoverCardEffect";

export { 
  StaggerContainer, 
  StaggerItem, 
  FadeIn, 
  ScaleIn, 
  HoverCardEffect,
  containerVariants,
  itemVariants 
};
