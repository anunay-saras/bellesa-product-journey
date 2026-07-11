import React from 'react';
import './KpiTiles.css';
import { compact, money, pct } from '../data';

export default function KpiTiles({ kpis }) {
  const tiles = [
    { key: 'cust', icon: '👥', label: 'Customers acquired', value: compact(kpis.customers), tone: 'a' },
    { key: 'rep', icon: '🔁', label: 'Repurchase rate', value: pct(kpis.repurchaseRate), tone: 'b' },
    { key: 'rep6', icon: '⏱️', label: '6-mo repurchase', value: pct(kpis.repurchase6moRate), tone: 'c' },
    { key: 'sales', icon: '💰', label: 'Acquisition net sales', value: money(kpis.acqSales), tone: 'd' },
  ];
  return (
    <div className="kpis">
      {tiles.map((t) => (
        <div className={'kpi kpi-' + t.tone} key={t.key}>
          <div className="kpi-top">
            <span className="kpi-icon">{t.icon}</span>
          </div>
          <div className="kpi-value">{t.value}</div>
          <div className="kpi-label">{t.label}</div>
        </div>
      ))}
    </div>
  );
}
