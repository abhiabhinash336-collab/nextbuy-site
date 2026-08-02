import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StarRatingProps {
  rating: number;
  size?: number;
  showNumber?: boolean;
  reviewCount?: number;
  className?: string;
}

export function StarRating({ rating, size = 14, showNumber = false, reviewCount, className }: StarRatingProps) {
  const full = Math.floor(rating);
  const hasHalf = rating - full >= 0.5;
  return (
    <div className={cn('inline-flex items-center gap-1', className)}>
      <div className="flex items-center gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => {
          const filled = i < full;
          const half = i === full && hasHalf;
          return (
            <Star
              key={i}
              style={{ width: size, height: size }}
              className={cn(
                'transition-colors',
                filled || half ? 'fill-amber-400 text-amber-400' : 'fill-transparent text-gray-300 dark:text-white/20'
              )}
            />
          );
        })}
      </div>
      {showNumber && (
        <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
          {rating.toFixed(1)}
          {reviewCount != null && <span className="text-gray-400 dark:text-gray-500"> ({reviewCount.toLocaleString()})</span>}
        </span>
      )}
    </div>
  );
}
