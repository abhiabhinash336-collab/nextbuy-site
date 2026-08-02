import { useMemo, useState } from 'react';

export interface PriceHistoryPoint {
  date: string;
  price: number;
}

interface PriceChartProps {
  data: PriceHistoryPoint[];
  height?: number;
}

export function PriceChart({ data, height = 200 }: PriceChartProps) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const sorted = useMemo(() => [...data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()), [data]);

  if (sorted.length < 2) {
    return (
      <div className="flex items-center justify-center text-sm text-gray-400" style={{ height }}>
        Not enough price history data to plot a chart yet.
      </div>
    );
  }

  const width = 600;
  const padX = 40;
  const padY = 20;
  const prices = sorted.map((d) => d.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;
  const stepX = (width - padX * 2) / (sorted.length - 1);

  const points = sorted.map((d, i) => {
    const x = padX + i * stepX;
    const y = padY + (1 - (d.price - min) / range) * (height - padY * 2);
    return { x, y, ...d };
  });

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${height - padY} L ${points[0].x} ${height - padY} Z`;

  const hover = hoverIdx != null ? points[hoverIdx] : null;

  return (
    <div className="relative w-full">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ height }} preserveAspectRatio="none">
        <defs>
          <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 0.25, 0.5, 0.75, 1].map((t) => {
          const y = padY + t * (height - padY * 2);
          const val = max - t * range;
          return (
            <g key={t}>
              <line x1={padX} y1={y} x2={width - padX} y2={y} stroke="currentColor" className="text-gray-200 dark:text-white/5" strokeWidth="1" />
              <text x={4} y={y + 4} className="fill-gray-400 text-[10px]">${val.toFixed(0)}</text>
            </g>
          );
        })}
        <path d={areaPath} fill="url(#priceGrad)" />
        <path d={linePath} fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {points.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={hoverIdx === i ? 4 : 0}
            fill="#3b82f6"
            stroke="white"
            strokeWidth="2"
            className="transition-all"
          />
        ))}
        {hover && (
          <line x1={hover.x} y1={padY} x2={hover.x} y2={height - padY} stroke="#3b82f6" strokeWidth="1" strokeDasharray="3 3" opacity="0.5" />
        )}
        {points.map((p, i) => (
          <rect
            key={`hit-${i}`}
            x={p.x - stepX / 2}
            y={0}
            width={stepX}
            height={height}
            fill="transparent"
            onMouseEnter={() => setHoverIdx(i)}
            onMouseLeave={() => setHoverIdx(null)}
          />
        ))}
      </svg>
      {hover && (
        <div
          className="pointer-events-none absolute -translate-x-1/2 rounded-lg bg-gray-900 dark:bg-white px-2.5 py-1.5 text-xs text-white dark:text-gray-900 shadow-lg whitespace-nowrap"
          style={{ left: `${(hover.x / width) * 100}%`, top: `${(hover.y / height) * 100}%`, transform: 'translate(-50%, -120%)' }}
        >
          <div className="font-semibold">${hover.price.toFixed(2)}</div>
          <div className="text-gray-300 dark:text-gray-600">{new Date(hover.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
        </div>
      )}
      <div className="mt-1 flex justify-between text-[10px] text-gray-400 px-10">
        <span>{new Date(sorted[0].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
        <span>{new Date(sorted[sorted.length - 1].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
      </div>
    </div>
  );
}
