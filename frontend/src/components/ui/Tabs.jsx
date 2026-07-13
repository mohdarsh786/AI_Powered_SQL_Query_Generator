import React from 'react';

export default function Tabs({ tabs, activeTab, onChange, className = '' }) {
  const activeIndex = tabs.findIndex(t => t.id === activeTab);

  return (
    <div className={`flex justify-center w-full ${className}`}>
      <div className="inline-flex items-center p-1 bg-surface border border-[var(--color-muted)] rounded-[var(--radius-lg)] relative">
        {/* Sliding Indicator */}
        <div 
          className="absolute top-1 bottom-1 bg-[var(--color-muted)]/50 rounded-[var(--radius-md)] transition-all duration-[var(--motion-normal)] ease-[var(--ease-out)]"
          style={{ 
            width: `calc(100% / ${tabs.length} - 8px)`,
            left: `calc(${activeIndex * (100 / tabs.length)}% + 4px)`
          }}
        />
        
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className={`
                relative z-10 px-8 py-2 text-[var(--text-body)] font-medium transition-colors duration-[var(--motion-fast)] rounded-[var(--radius-md)]
                ${isActive 
                  ? 'text-text-primary' 
                  : 'text-text-secondary hover:text-text-primary'
                }
              `}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
