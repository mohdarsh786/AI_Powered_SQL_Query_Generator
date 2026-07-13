import React, { useState } from 'react';

export default function Tooltip({ children, content, position = 'top', className = '' }) {
  const [isVisible, setIsVisible] = useState(false);

  const positions = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2"
  };

  return (
    <div 
      className={`relative flex items-center ${className}`}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onFocus={() => setIsVisible(true)}
      onBlur={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div className={`
          absolute z-[var(--z-popover)] px-2.5 py-1.5 text-[var(--text-caption)] 
          bg-elevated text-text-primary border border-[var(--color-muted)] 
          rounded-[var(--radius-sm)] shadow-md whitespace-nowrap
          animate-in fade-in zoom-in duration-[var(--motion-fast)]
          ${positions[position]}
        `}>
          {content}
        </div>
      )}
    </div>
  );
}
