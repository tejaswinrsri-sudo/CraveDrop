import React from 'react';
import { Star } from 'lucide-react';

interface RatingBadgeProps {
  rating: number;
  count?: number;
  size?: 'sm' | 'md' | 'lg';
}

export const RatingBadge: React.FC<RatingBadgeProps> = ({ rating, count, size = 'sm' }) => {
  const getBgColor = (r: number) => {
    if (r >= 4.0) return 'bg-emerald-700 text-white';
    if (r >= 3.5) return 'bg-amber-600 text-white';
    return 'bg-slate-600 text-white';
  };

  const textSizes = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2 py-0.5',
    lg: 'text-base px-2.5 py-1',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4',
  };

  return (
    <div className="inline-flex items-center gap-1.5">
      <span
        className={`inline-flex items-center gap-1 font-semibold rounded ${getBgColor(
          rating
        )} ${textSizes[size]}`}
      >
        <span>{rating.toFixed(1)}</span>
        <Star className={`${iconSizes[size]} fill-current`} />
      </span>
      {count !== undefined && (
        <span className="text-xs text-slate-500 font-medium">({count})</span>
      )}
    </div>
  );
};
