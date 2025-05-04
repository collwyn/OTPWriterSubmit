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
          <div key={step.number} className="flex items-center relative">
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

            {/* Step label */}
            <div
              className={cn(
                "absolute top-0 -ml-4 text-xs font-medium w-max",
                currentStep > step.number
                  ? "text-success"
                  : currentStep === step.number
                  ? "text-primary"
                  : "text-muted-foreground"
              )}
            >
              <span className="mt-10 block">{step.label}</span>
            </div>

            {/* Connector line - skip after the last item */}
            {index < steps.length - 1 && (
              <div
                className={cn(
                  "flex-auto border-t-2",
                  currentStep > step.number + 1
                    ? "border-success"
                    : currentStep > step.number
                    ? "border-success"
                    : "border-neutral-light"
                )}
              ></div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
