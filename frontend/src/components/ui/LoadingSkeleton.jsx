import React from 'react';

export function LoadingSkeleton({ className = '', variant = 'rectangular' }) {
  const baseClasses = "animate-pulse bg-[var(--color-muted)]";
  
  const variants = {
    rectangular: "rounded-[var(--radius-md)]",
    circular: "rounded-full",
    text: "rounded-[var(--radius-sm)] h-4 w-3/4"
  };

  return (
    <div className={`${baseClasses} ${variants[variant]} ${className}`} />
  );
}
