import { cn } from "@/lib/utils";

interface ComplianceRingProps {
  value: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
}

export function ComplianceRing({ 
  value, 
  size = 64, 
  strokeWidth = 6,
  className 
}: ComplianceRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  
  const getColor = () => {
    if (value >= 90) return "text-emerald-500";
    if (value >= 70) return "text-amber-500";
    return "text-destructive";
  };

  const getLabel = () => {
    if (value >= 90) return "OK";
    if (value >= 70) return "Atenção";
    return "Crítico";
  };

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted/30"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={cn("transition-all duration-700 ease-out", getColor())}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-bold">{value}%</span>
        <span className={cn("text-[10px] font-medium", getColor())}>{getLabel()}</span>
      </div>
    </div>
  );
}
