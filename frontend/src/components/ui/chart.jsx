import * as React from 'react';
import { Tooltip as RechartsTooltip } from 'recharts';
import { cn } from '../../lib/utils';

const chartColors = ['--chart-1', '--chart-2', '--chart-3', '--chart-4', '--chart-5'];

export function ChartContainer({ config, className, children, ...props }) {
  const inlineStyles = React.useMemo(() => {
    if (!config) return undefined;
    const entries = Object.entries(config);
    if (!entries.length) return undefined;

    return entries.reduce((acc, [key, value], index) => {
      if (value?.color) {
        acc[`--color-${key}`] = value.color;
        if (index < chartColors.length) {
          acc[chartColors[index]] = value.color;
        }
      }
      if (value?.label) {
        acc[`--label-${key}`] = value.label;
      }
      return acc;
    }, {});
  }, [config]);

  return (
    <div
      data-chart-container=""
      className={cn('flex w-full flex-col gap-2', className)}
      style={inlineStyles}
      {...props}
    >
      {children}
    </div>
  );
}

export function ChartTooltip({ cursor, wrapperClassName, content, ...props }) {
  return (
    <RechartsTooltip
      animationDuration={200}
      cursor={
        cursor ?? {
          strokeDasharray: '4 4',
          stroke: 'var(--border)',
        }
      }
      wrapperClassName={cn('border-none bg-transparent p-0 shadow-none', wrapperClassName)}
      content={content ?? <ChartTooltipContent />}
      {...props}
    />
  );
}

export function ChartTooltipContent({ label, active, payload, indicator = 'dot' }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border bg-popover px-3 py-2 text-sm text-popover-foreground shadow-md">
      {label && <div className="mb-2 text-xs font-medium text-muted-foreground">{label}</div>}
      <div className="space-y-1">
        {payload.map((item) => (
          <div key={item.name} className="flex items-center gap-2">
            <span
              className={cn(
                'inline-flex rounded-full',
                indicator === 'dot' ? 'h-2 w-2' : 'h-[6px] w-2 rounded-none',
              )}
              style={{ backgroundColor: item.color }}
            />
            <div className="grid">
              <span className="text-xs font-medium text-muted-foreground">{item.name}</span>
              <span className="text-sm font-semibold text-foreground">
                {typeof item.value === 'number' ? item.value.toLocaleString() : item.value}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
