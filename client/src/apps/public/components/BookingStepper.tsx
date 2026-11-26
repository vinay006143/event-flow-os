import React from 'react';
import { Check } from 'lucide-react';

const STEPS = [
  { num: 1, label: 'Select Passes' },
  { num: 2, label: 'Attendee Details' },
  { num: 3, label: 'Payment & Passes' },
];

export function BookingStepper({ currentStep }: { currentStep: 1 | 2 | 3 }) {
  return (
    <div className="mb-8 rounded-2xl border border-amber-900/15 bg-white px-4 py-3.5 shadow-sm sm:px-6">
      <div className="flex items-center justify-between gap-2">
        {STEPS.map((step, idx) => {
          const done = step.num < currentStep;
          const active = step.num === currentStep;
          return (
            <React.Fragment key={step.num}>
              <div className="flex items-center gap-2.5">
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-extrabold transition ${
                    done
                      ? 'bg-emerald-600 text-white'
                      : active
                        ? 'bg-[#060f2b] text-amber-300 ring-2 ring-amber-400/50'
                        : 'bg-stone-100 text-stone-400'
                  }`}
                >
                  {done ? <Check className="h-3.5 w-3.5" /> : step.num}
                </span>
                <span
                  className={`text-xs font-bold sm:text-sm ${
                    active ? 'text-stone-900' : done ? 'text-emerald-700' : 'text-stone-400'
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {idx < STEPS.length - 1 && (
                <div
                  className={`hidden h-px flex-1 sm:block ${
                    done ? 'bg-emerald-500' : 'bg-stone-200'
                  }`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
