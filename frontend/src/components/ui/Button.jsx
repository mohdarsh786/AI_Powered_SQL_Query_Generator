import React from 'react';
import { Loader2 } from 'lucide-react';

export default function Button({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  isLoading = false, 
  disabled = false, 
  className = '', 
  ...props 
}) {
  const baseStyles = "inline-flex items-center justify-center font-medium transition-all duration-[var(--motion-fast)] ease-[var(--ease-default)] rounded-[var(--radius-md)] disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-base focus:ring-primary/40";
  
  const variants = {
    primary: "bg-primary text-on-primary hover:bg-primary/90 active:scale-95",
    secondary: "bg-secondary text-on-secondary hover:bg-secondary/90 active:scale-95",
    ghost: "bg-transparent text-text-primary hover:bg-[var(--color-muted)] active:scale-95",
    danger: "bg-danger text-white hover:bg-danger/90 active:scale-95",
    outline: "bg-transparent text-text-primary border border-[var(--color-muted)] hover:bg-[var(--color-muted)] active:scale-95"
  };

  const sizes = {
    sm: "text-[var(--text-caption)] px-3 h-8",
    md: "text-[var(--text-body)] px-4 h-9",
    lg: "text-[var(--text-body)] font-semibold px-6 h-11"
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
      {children}
    </button>
  );
}
