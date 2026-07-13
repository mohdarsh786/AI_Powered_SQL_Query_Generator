import React from 'react';

export default function SectionHeader({ title, description, actions, className = '' }) {
  return (
    <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 ${className}`}>
      <div>
        <h2 className="text-[var(--text-section)] font-semibold text-text-primary tracking-tight">
          {title}
        </h2>
        {description && (
          <p className="text-[var(--text-body)] text-text-secondary mt-1 max-w-2xl">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-3">
          {actions}
        </div>
      )}
    </div>
  );
}
