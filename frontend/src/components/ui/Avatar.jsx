import React from 'react';
import { User } from 'lucide-react';

export default function Avatar({ src, alt, fallback, size = 'md', className = '' }) {
  const sizes = {
    sm: "w-8 h-8 text-xs",
    md: "w-10 h-10 text-sm",
    lg: "w-12 h-12 text-base",
    xl: "w-16 h-16 text-lg"
  };

  return (
    <div 
      className={`
        relative inline-flex items-center justify-center overflow-hidden 
        bg-[var(--color-muted)] rounded-full ring-2 ring-surface 
        ${sizes[size]} ${className}
      `}
    >
      {src ? (
        <img src={src} alt={alt || 'Avatar'} className="w-full h-full object-cover" />
      ) : fallback ? (
        <span className="font-medium text-text-secondary uppercase">{fallback}</span>
      ) : (
        <User className="w-1/2 h-1/2 text-text-secondary" />
      )}
    </div>
  );
}
