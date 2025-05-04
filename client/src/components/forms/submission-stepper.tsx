import { cn } from "@/lib/utils";
import { CheckIcon } from "lucide-react";

type SubmissionStepperProps = {
  currentStep: number;
};

export function SubmissionStepper({ currentStep }: SubmissionStepperProps) {
  const steps = [
    { number: 1, label: "Story Details" },
    { number: 2, label: "Content & Images" },
    { number: 3, label: "Review & Submit" },
  ];

  return (
    <div className="mb-8">
      <div className="flex items-center">
        {steps.map((step, index) => (
          <div key={step.number} className="flex-1 relative">
            <div className="flex items-center">
              {/* Connector line before first item */}
              {index === 0 && (
                <div className="w-[20%] hidden md:block"></div>
              )}
              
              {/* Connector line - for all items except first */}
              {index > 0 && (
                <div
                  className={cn(
                    "flex-1 border-t-2 mr-2",
                    currentStep > step.number
                      ? "border-success"
                      : currentStep === step.number && index > 0
                      ? "border-success"
                      : "border-neutral-light"
                  )}
                ></div>
              )}
            
              {/* Step circle */}
              <div
                className={cn(
                  "rounded-full h-8 w-8 flex items-center justify-center font-semibold text-sm",
                  currentStep > step.number
                    ? "bg-success text-white"
                    : currentStep === step.number
                    ? "bg-primary text-white"
                    : "bg-neutral-light text-muted-foreground"
                )}
              >
                {currentStep > step.number ? (
                  <CheckIcon className="h-4 w-4" />
                ) : (
                  step.number
                )}
              </div>
              
              {/* Connector line after last item */}
              {index === steps.length - 1 && (
                <div className="w-[20%] hidden md:block"></div>
              )}
              
              {/* Connector line - for all items except last */}
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    "flex-1 border-t-2 ml-2",
                    currentStep > step.number + 1
                      ? "border-success"
                      : currentStep > step.number
                      ? "border-success"
                      : "border-neutral-light"
                  )}
                ></div>
              )}
            </div>
            
            {/* Step label */}
            <div
              className={cn(
                "absolute top-10 left-1/2 -translate-x-1/2 text-xs font-medium text-center w-full px-1",
                currentStep > step.number
                  ? "text-success"
                  : currentStep === step.number
                  ? "text-primary"
                  : "text-muted-foreground"
              )}
            >
              <span>{step.label}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
