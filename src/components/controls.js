import React from 'react';
import './controls.css';

// Segmented pill toggle (window switch, free-product filter, etc.)
export function Segmented({ options, value, onChange, size }) {
  return (
    <div className={'seg' + (size === 'sm' ? ' seg-sm' : '')}>
      {options.map((o) => (
        <button
          key={o.id}
          className={'seg-btn' + (value === o.id ? ' is-active' : '')}
          onClick={() => onChange(o.id)}
          type="button"
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// Free-product filter: All / Paid / Free, with a small label above.
const FREE_OPTS = [
  { id: 'all', label: 'All' },
  { id: 'paid', label: 'Paid' },
  { id: 'free', label: 'Free' },
];
export function FreeFilter({ label, value, onChange }) {
  return (
    <div className="free-filter">
      <span className="free-filter-label">{label}</span>
      <Segmented options={FREE_OPTS} value={value} onChange={onChange} size="sm" />
    </div>
  );
}

// Styled native select for month selection.
export function Dropdown({ value, onChange, children, icon }) {
  return (
    <div className="dropdown">
      {icon && <span className="dropdown-icon">{icon}</span>}
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {children}
      </select>
      <span className="dropdown-caret" aria-hidden>▾</span>
    </div>
  );
}
