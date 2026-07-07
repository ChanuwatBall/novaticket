import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import { motion } from "framer-motion";

interface StepIndicatorProps {
  currentStep: number;
  totalSteps?: number;
  labels?: string[];
}

const defaultLabels = ["เลือกเที่ยว", "เลือกที่นั่ง & ข้อมูล", "ชำระเงิน"];

const StepIndicator = ({ currentStep, totalSteps = 3, labels = defaultLabels }: StepIndicatorProps) => {
  return (
    <div className="w-full px-4 pt-4 pb-1">
      <div className="flex items-start justify-between relative">
        {Array.from({ length: totalSteps }, (_, i) => {
          const step = i + 1;
          const isCompleted = step < currentStep;
          const isActive = step === currentStep;

          return (
            <div key={step} className={cn("flex items-start", step < totalSteps ? "flex-1" : "flex-none")}>
              <div className="flex flex-col items-center gap-1.5 relative z-10">
                {/* Step circle */}
                <motion.div
                  initial={false}
                  animate={{
                    scale: isActive ? 1 : 0.85,
                    backgroundColor: isCompleted || isActive
                      ? "hsl(var(--primary))"
                      : "hsl(var(--muted))",
                  }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  className={cn(
                    "relative flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold",
                    (isCompleted || isActive) ? "text-primary-foreground" : "text-muted-foreground"
                  )}
                >
                  {/* Active ring pulse */}
                  {isActive && (
                    <motion.div
                      className="absolute inset-0 rounded-full border-2 border-primary"
                      initial={{ scale: 1, opacity: 0.6 }}
                      animate={{ scale: 1.45, opacity: 0 }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
                    />
                  )}
                  {isActive && (
                    <motion.div
                      className="absolute inset-[-3px] rounded-full border-2 border-primary/30"
                      layoutId="active-ring"
                      transition={{ type: "spring", stiffness: 300, damping: 25 }}
                    />
                  )}

                  {/* Icon or number */}
                  {isCompleted ? (
                    <motion.div
                      initial={{ scale: 0, rotate: -90 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: "spring", stiffness: 400, damping: 20 }}
                    >
                      <Check className="h-4 w-4" strokeWidth={3} />
                    </motion.div>
                  ) : (
                    <motion.span
                      key={`num-${step}`}
                      initial={false}
                      animate={{ scale: isActive ? 1.1 : 1 }}
                      transition={{ type: "spring", stiffness: 400, damping: 20 }}
                    >
                      {step}
                    </motion.span>
                  )}
                </motion.div>

                {/* Label */}
                <motion.span
                  initial={false}
                  animate={{
                    opacity: isActive ? 1 : 0.6,
                    y: isActive ? 0 : 2,
                  }}
                  transition={{ duration: 0.25 }}
                  className={cn(
                    "text-[10px] text-center leading-tight max-w-[56px]",
                    isActive ? "font-bold text-primary" : "font-medium text-muted-foreground"
                  )}
                >
                  {labels[i]}
                </motion.span>
              </div>

              {/* Connector line */}
              {step < totalSteps && (
                <div className="flex-1 relative mt-[18px] mx-1">
                  <div className="h-[2px] w-full bg-muted rounded-full" />
                  <motion.div
                    className="absolute top-0 left-0 h-[2px] rounded-full bg-primary"
                    initial={false}
                    animate={{ width: isCompleted ? "100%" : "0%" }}
                    transition={{ duration: 0.4, ease: "easeInOut", delay: isCompleted ? 0.1 : 0 }}
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

export default StepIndicator;
