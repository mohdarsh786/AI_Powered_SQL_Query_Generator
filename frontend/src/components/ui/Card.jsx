import React from 'react';

export default function Card({ children, className = '', hover = false, ...props }) {
  return (
    <div
      className={`
        bg-card rounded-[var(--radius-xl)] p-[var(--spacing-6)]
        border border-[var(--color-muted)] shadow-md
        ${hover ? 'transition-all duration-[var(--motion-normal)] ease-[var(--ease-default)] hover:shadow-lg hover:-translate-y-0.5 hover:border-white/10' : ''}
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
}
