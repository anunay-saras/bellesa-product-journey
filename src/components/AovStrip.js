import React from 'react';
import './AovStrip.css';
import { money } from '../data';

// Average order value per purchase step (net sales / customers who made that
// purchase), for the selected acquisition window.
export default function AovStrip({ kpis }) {
  const steps = [
    { key: '1st', label: '1st purchase', value: kpis.aov1, tone: 'a' },
    { key: '2nd', label: '2nd purchase', value: kpis.aov2, tone: 'b' },
    { key: '3rd', label: '3rd purchase', value: kpis.aov3, tone: 'c' },
  ];
  return (
    <div className="aov-strip">
      <div className="aov-head">
        <span className="aov-title">Average order value by purchase step</span>
        <span className="aov-sub">net sales ÷ customers at that step</span>
      </div>
      <div className="aov-cells">
        {steps.map((s) => (
          <div className={'aov-cell aov-' + s.tone} key={s.key}>
            <span className="aov-step">{s.key}</span>
            <span className="aov-value">{money(s.value)}</span>
            <span className="aov-label">{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
