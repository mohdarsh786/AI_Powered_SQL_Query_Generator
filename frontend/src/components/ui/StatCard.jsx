import React from 'react';
import Card from './Card';

export default function StatCard({ title, value, icon: Icon, trend, trendValue, className = '', onClick }) {
  return (
    <Card 
      className={`flex flex-col h-full ${className} ${onClick ? 'cursor-pointer' : ''}`} 
      hover={!!onClick}
      onClick={onClick}
    >
      <div className="flex flex-col gap-1.5 flex-1">
        <div className="flex items-start justify-between">
          <h3 className="text-[var(--text-page-title)] font-bold text-text-primary leading-none tracking-tight">
            {value}
          </h3>
          {Icon && (
            <Icon className="w-5 h-5 text-text-secondary/40 shrink-0" />
          )}
        </div>
        <p className="text-[var(--text-body)] font-medium text-text-secondary">
          {title}
        </p>
      </div>
      {trend && (
        <div className="mt-auto pt-3 border-t border-[var(--color-muted)]">
          <span className={`text-[var(--text-caption)] font-medium ${trend === 'up' ? 'text-success' : 'text-danger'}`}>
            {trend === 'up' ? '↑' : '↓'} {trendValue}
          </span>
        </div>
      )}
    </Card>
  );
}
