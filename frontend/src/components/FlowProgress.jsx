import { Check } from 'lucide-react';

export default function FlowProgress({
  steps,
  activeStep,
  label = 'Journey progress',
  accent = 'from-sky-500 via-blue-500 to-indigo-500',
}) {
  if (!steps?.length) return null;
  const activeIndex = Math.max(
    steps.findIndex((step) => step.id === activeStep),
    0,
  );
  const totalSegments = Math.max(steps.length - 1, 1);
  const progressPercent = Math.min(100, Math.max(0, (activeIndex / totalSegments) * 100));

  return (
    <div className="mb-8">
      <div className="flex flex-col gap-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-500 sm:flex-row sm:items-center sm:justify-between">
        <span>{label}</span>
        <span className="tracking-[0.2em] text-slate-400">
          Step {Math.min(activeIndex + 1, steps.length)} / {steps.length}
        </span>
      </div>
      <div className="relative mt-3">
        <div className="h-1.5 rounded-full bg-slate-200/80" />
        <div
          className={`absolute left-0 top-0 h-1.5 rounded-full bg-gradient-to-r ${accent} transition-all`}
          style={{ width: `${progressPercent}%` }}
        />
        <div className="pointer-events-none absolute inset-0 flex items-center justify-between">
          {steps.map((step, index) => {
            const status =
              index < activeIndex ? 'done' : index === activeIndex ? 'active' : 'upcoming';
            return (
              <div
                key={step.id}
                className="flex flex-col items-center text-center"
                aria-current={status === 'active'}
              >
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-semibold transition ${
                    status === 'done'
                      ? 'border-sky-500 bg-sky-500 text-white shadow-sm shadow-sky-300/70'
                      : status === 'active'
                        ? 'border-sky-500 bg-white text-sky-600 shadow-sm shadow-sky-200'
                        : 'border-slate-200 bg-white text-slate-400'
                  }`}
                >
                  {status === 'done' ? <Check className="h-4 w-4" /> : index + 1}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="mt-6 flex flex-wrap items-start justify-between gap-2 text-center text-[11px] font-semibold uppercase tracking-widest text-slate-500">
        {steps.map((step) => (
          <div key={step.id} className="flex-1 min-w-[4rem] px-1">
            {step.label}
          </div>
        ))}
      </div>
    </div>
  );
}
