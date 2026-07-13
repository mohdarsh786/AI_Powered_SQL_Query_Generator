import React from 'react';

export default function Input({ 
  label, 
  error, 
  className = '', 
  wrapperClassName = '',
  id,
  ...props 
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${wrapperClassName}`}>
      {label && (
        <label htmlFor={id} className="text-[var(--text-caption)] font-medium text-text-secondary">
          {label}
        </label>
      )}
      <input
        id={id}
        className={`
          w-full bg-surface border border-[var(--color-muted)] rounded-[var(--radius-md)]
          px-4 h-9 text-[var(--text-body)] text-text-primary
          placeholder:text-text-secondary/50
          transition-all duration-[var(--motion-fast)] ease-[var(--ease-default)]
          focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/40
          disabled:opacity-50 disabled:cursor-not-allowed
          ${error ? 'border-danger focus:border-danger focus:ring-danger focus:shadow-none' : ''}
          ${className}
        `}
        {...props}
      />
      {error && (
        <span className="text-[var(--text-helper)] text-danger mt-1">
          {error}
        </span>
      )}
    </div>
  );
}
