import React from 'react';

export default function Table({ headers, data, renderRow, emptyState }) {
  if (!data || data.length === 0) {
    return emptyState || null;
  }

  return (
    <div className="w-full overflow-x-auto rounded-[var(--radius-lg)] border border-[var(--color-muted)] bg-card">
      <table className="w-full text-left text-[var(--text-body)] text-text-secondary">
        <thead className="bg-surface/50 border-b border-[var(--color-muted)] sticky top-0 backdrop-blur-sm z-10">
          <tr>
            {headers.map((header, idx) => (
              <th
                key={idx}
                className="px-5 py-3 font-semibold text-text-primary uppercase tracking-wider text-[var(--text-caption)]"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--color-muted)]/50">
          {data.map((row, idx) => (
            <tr
              key={idx}
              className="hover:bg-[var(--color-muted)]/30 transition-colors duration-[var(--motion-fast)] group"
            >
              {renderRow(row, idx)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
