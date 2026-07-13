import React from 'react';

export default function Badge({ 
  children, 
  variant = 'default',
  className = '' 
}) {
  const variants = {
    default: "bg-surface border-[var(--color-muted)] text-text-secondary",
    primary: "bg-primary/10 border-primary/20 text-primary",
    success: "bg-success/10 border-success/20 text-success",
    warning: "bg-warning/10 border-warning/20 text-warning",
    danger: "bg-danger/10 border-danger/20 text-danger",
    purple: "bg-secondary/10 border-secondary/20 text-secondary"
  };

  return (
    <span className={`
      inline-flex items-center justify-center px-2.5 py-0.5 
      rounded-full border backdrop-blur-sm
      text-[var(--text-helper)] font-semibold tracking-wide
      ${variants[variant] || variants.default}
      ${className}
    `}>
      {children}
    </span>
  );
}
