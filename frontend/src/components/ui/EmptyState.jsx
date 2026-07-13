import React from 'react';
import { FileQuestion } from 'lucide-react';

export default function EmptyState({ 
  icon: Icon = FileQuestion, 
  title = "No data available", 
  description, 
  action,
  className = ''
}) {
  return (
    <div className={`flex flex-col items-center justify-center py-12 px-4 text-center rounded-[var(--radius-xl)] border border-dashed border-[var(--color-muted)] bg-surface/30 ${className}`}>
      <div className="p-4 rounded-full bg-[var(--color-muted)]/50 mb-4 text-text-secondary">
        <Icon className="w-8 h-8 opacity-80" />
      </div>
      <h3 className="text-[var(--text-card-title)] font-semibold text-text-primary mb-2">
        {title}
      </h3>
      {description && (
        <p className="text-[var(--text-body)] text-text-secondary max-w-sm mb-6">
          {description}
        </p>
      )}
      {action && (
        <div>{action}</div>
      )}
    </div>
  );
}
