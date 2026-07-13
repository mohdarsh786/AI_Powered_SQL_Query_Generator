import React from 'react';
import { Search } from 'lucide-react';
import Input from './Input';

export default function SearchInput({ className = '', ...props }) {
  return (
    <div className={`relative ${className}`}>
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <Search className="h-4 w-4 text-text-secondary" />
      </div>
      <input
        type="search"
        className="w-full max-w-[320px] bg-surface border border-[var(--color-muted)] rounded-[var(--radius-md)]
          pl-9 pr-4 h-9 text-[var(--text-body)] text-text-primary
          placeholder:text-text-secondary/50
          transition-all duration-[var(--motion-fast)] ease-[var(--ease-default)]
          focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/40"
        {...props}
      />
    </div>
  );
}
