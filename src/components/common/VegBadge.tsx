import React from 'react';

interface VegBadgeProps {
  isVeg: boolean;
  size?: 'sm' | 'md';
}

export const VegBadge: React.FC<VegBadgeProps> = ({ isVeg, size = 'sm' }) => {
  const outerSize = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';
  const innerSize = size === 'sm' ? 'w-2 h-2' : 'w-2.5 h-2.5';

  if (isVeg) {
    return (
      <span
        title="Pure Vegetarian"
        className={`inline-flex items-center justify-center border border-emerald-600 rounded p-0.5 bg-white ${outerSize}`}
      >
        <span className={`rounded-full bg-emerald-600 ${innerSize}`} />
      </span>
    );
  }

  return (
    <span
      title="Non-Vegetarian"
      className={`inline-flex items-center justify-center border border-rose-700 rounded p-0.5 bg-white ${outerSize}`}
    >
      <span
        className={`border-solid border-b-rose-700 border-b-[6px] border-x-transparent border-x-[4px] border-t-0`}
      />
    </span>
  );
};
