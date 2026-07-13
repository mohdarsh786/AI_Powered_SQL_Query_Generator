import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export default function Modal({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  maxWidth = 'max-w-[560px]' 
}) {
  const [isRendered, setIsRendered] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const modalRef = useRef(null);

  // Handle Mount/Unmount and Animation
  useEffect(() => {
    if (isOpen) {
      setIsRendered(true);
      requestAnimationFrame(() => setIsVisible(true));
    } else {
      setIsVisible(false);
      const timer = setTimeout(() => setIsRendered(false), 250); // Matches normal duration
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Handle ESC and Focus trapping
  useEffect(() => {
    if (!isVisible) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }

      if (e.key === 'Tab') {
        if (!modalRef.current) return;
        const focusableElements = modalRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            lastElement.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === lastElement) {
            firstElement.focus();
            e.preventDefault();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isVisible, onClose]);

  // Initial focus on mount (runs only once when modal becomes visible)
  useEffect(() => {
    if (isVisible && modalRef.current) {
      setTimeout(() => {
        // Try to find an input, select, or textarea first to avoid focusing the close button
        const firstInput = modalRef.current.querySelector('input, select, textarea');
        if (firstInput) {
          firstInput.focus();
        } else {
          const focusable = modalRef.current.querySelectorAll(
            'button, [href], [tabindex]:not([tabindex="-1"])'
          );
          if (focusable.length > 0) {
            focusable[0].focus();
          }
        }
      }, 10);
    }
  }, [isVisible]);

  // Lock body scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isRendered) return null;

  return createPortal(
    <div className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div 
        className={`absolute inset-0 bg-black/40 backdrop-blur-md transition-opacity duration-[var(--motion-normal)] ease-[var(--ease-out)] ${isVisible ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Modal Dialog */}
      <div 
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className={`
          relative w-full ${maxWidth} bg-surface border border-[var(--color-muted)]
          rounded-[var(--radius-xl)] shadow-modal overflow-hidden
          flex flex-col max-h-[90vh]
          transition-all duration-[var(--motion-normal)] ease-[var(--ease-out)]
          ${isVisible ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-4'}
        `}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-muted)] shrink-0">
          <h2 id="modal-title" className="text-[var(--text-section)] font-semibold text-text-primary tracking-tight">
            {title}
          </h2>
          <button 
            onClick={onClose}
            aria-label="Close modal"
            className="w-10 h-10 flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-[var(--color-muted)] rounded-[var(--radius-md)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-muted)]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}
