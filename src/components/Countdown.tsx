import { useEffect, useState } from 'react';
import { timeUntil } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface CountdownProps {
  target: string | Date;
  className?: string;
  compact?: boolean;
}

export function Countdown({ target, className, compact }: CountdownProps) {
  const [, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const t = timeUntil(target);

  if (t.expired) {
    return <span className={cn('text-xs font-medium text-gray-400', className)}>Offer ended</span>;
  }

  if (compact) {
    const parts: string[] = [];
    if (t.days > 0) parts.push(`${t.days}d`);
    parts.push(`${String(t.hours).padStart(2, '0')}h`);
    parts.push(`${String(t.minutes).padStart(2, '0')}m`);
    parts.push(`${String(t.seconds).padStart(2, '0')}s`);
    return <span className={cn('font-mono text-xs font-semibold text-error-500', className)}>{parts.join(' ')}</span>;
  }

  const blocks = [
    { label: 'Days', value: t.days },
    { label: 'Hours', value: t.hours },
    { label: 'Mins', value: t.minutes },
    { label: 'Secs', value: t.seconds },
  ];

  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      {blocks.map((b) => (
        <div key={b.label} className="flex flex-col items-center">
          <div className="grid h-9 w-10 place-items-center rounded-lg bg-gray-900 dark:bg-white/10 font-mono text-sm font-bold text-white tabular-nums">
            {String(b.value).padStart(2, '0')}
          </div>
          <span className="mt-0.5 text-[9px] uppercase tracking-wide text-gray-400">{b.label}</span>
        </div>
      ))}
    </div>
  );
}
