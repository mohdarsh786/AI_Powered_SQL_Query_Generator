import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

export default function Dropdown({ trigger, children, align = 'right', className = '' }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <div onClick={() => setIsOpen(!isOpen)} className="cursor-pointer">
        {trigger}
      </div>

      {isOpen && (
        <div 
          className={`
            absolute z-[var(--z-dropdown)] mt-2 w-56 rounded-[var(--radius-lg)] bg-surface 
            border border-[var(--color-muted)] shadow-card overflow-hidden
            origin-top-${align} ${align === 'right' ? 'right-0' : 'left-0'}
            animate-in fade-in scale-95 duration-[var(--motion-fast)]
            ${className}
          `}
        >
          <div className="py-1" role="menu" aria-orientation="vertical">
            {React.Children.map(children, child => {
              if (React.isValidElement(child)) {
                return React.cloneElement(child, {
                  onClick: (e) => {
                    setIsOpen(false);
                    if (child.props.onClick) child.props.onClick(e);
                  }
                });
              }
              return child;
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export function DropdownItem({ children, onClick, className = '', icon: Icon, danger }) {
  return (
    <button
      onClick={onClick}
      className={`
        w-full text-left px-4 py-2 text-[var(--text-body)] flex items-center gap-2
        hover:bg-[var(--color-muted)] transition-colors duration-[var(--motion-fast)]
        ${danger ? 'text-danger hover:bg-danger/10' : 'text-text-primary'}
        ${className}
      `}
      role="menuitem"
    >
      {Icon && <Icon className="w-4 h-4" />}
      {children}
    </button>
  );
}
