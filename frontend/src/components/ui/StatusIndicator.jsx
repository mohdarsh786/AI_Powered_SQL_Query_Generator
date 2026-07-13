import React from 'react';

export default function StatusIndicator({ status, label, className = '' }) {
  // status: 'online', 'offline', 'warning', 'loading'
  const colors = {
    online: "bg-success",
    offline: "bg-danger",
    warning: "bg-warning",
    loading: "bg-primary animate-pulse"
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="relative flex h-2.5 w-2.5">
        {status === 'online' && (
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-40"></span>
        )}
        <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${colors[status] || colors.offline}`}></span>
      </span>
      {label && (
        <span className="text-[var(--text-caption)] font-medium text-text-secondary">
          {label}
        </span>
      )}
    </div>
  );
}
