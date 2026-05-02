import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface StepperProps {
  current: number;
  steps: string[];
  onStepClick?: (step: number) => void;
}

export const Stepper = ({ current, steps, onStepClick }: StepperProps) => {
  return (
    <div className="w-full px-2 sm:px-4 py-6">
      <div className="flex items-center justify-between gap-1 sm:gap-2 max-w-3xl mx-auto">
        {steps.map((label, idx) => {
          const stepNum = idx + 1;
          const isDone = stepNum < current;
          const isActive = stepNum === current;
          const clickable = isDone && onStepClick;
          return (
            <div key={label} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center gap-2 min-w-0">
                <button
                  type="button"
                  disabled={!clickable}
                  onClick={() => clickable && onStepClick(stepNum)}
                  className={cn(
                    "h-9 w-9 sm:h-11 sm:w-11 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300 shrink-0 ring-4 ring-transparent",
                    isDone && "bg-success text-success-foreground hover:ring-success/20 cursor-pointer",
                    isActive && "bg-gradient-primary text-primary-foreground shadow-elevated scale-110 ring-primary/20",
                    !isDone && !isActive && "bg-muted text-muted-foreground"
                  )}
                >
                  {isDone ? <Check className="h-5 w-5" /> : stepNum}
                </button>
                <span
                  className={cn(
                    "text-[10px] sm:text-xs font-medium text-center hidden sm:block truncate max-w-[88px]",
                    isActive ? "text-foreground font-semibold" : "text-muted-foreground"
                  )}
                >
                  {label}
                </span>
              </div>
              {idx < steps.length - 1 && (
                <div className="h-1 flex-1 mx-1 sm:mx-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn(
                      "h-full bg-gradient-to-r from-success to-success rounded-full transition-all duration-500",
                      isDone ? "w-full" : "w-0"
                    )}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
