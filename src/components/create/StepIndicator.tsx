'use client';

import { Check } from 'lucide-react';
import { useCreateStore } from '@/store/useCreateStore';

const steps = [
  { num: 1, label: 'Hochladen' },
  { num: 2, label: 'Konfigurieren' },
  { num: 3, label: 'Bezahlen' },
  { num: 4, label: 'Ergebnis' },
];

export default function StepIndicator() {
  const { currentStep } = useCreateStore();

  return (
    <div className="flex items-center justify-center gap-2">
      {steps.map((step, i) => {
        const isCompleted = currentStep > step.num;
        const isCurrent = currentStep === step.num;

        return (
          <div key={step.num} className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-all ${
                  isCompleted
                    ? 'bg-brand text-white'
                    : isCurrent
                    ? 'bg-brand/20 text-brand border-2 border-brand'
                    : 'bg-surface text-muted border border-border'
                }`}
              >
                {isCompleted ? <Check className="h-4 w-4" /> : step.num}
              </div>
              <span
                className={`hidden text-sm sm:block ${
                  isCurrent ? 'font-medium text-foreground' : 'text-muted'
                }`}
              >
                {step.label}
              </span>
            </div>

            {i < steps.length - 1 && (
              <div
                className={`h-px w-8 sm:w-12 ${
                  isCompleted ? 'bg-brand' : 'bg-border'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
