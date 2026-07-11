import React from 'react';
import './KpiTiles.css';
import { compact, money, pct } from '../data';

export default function KpiTiles({ kpis }) {
  const tiles = [
    { key: 'cust', icon: '👥', label: 'Customers acquired', value: compact(kpis.customers), tone: 'a',
      hint: 'True-new customers (each customer\'s first-ever acquisition), all platforms. Reconciles to customer_value_summary all-platform.' },
    { key: 'rep', icon: '🔁', label: 'Repurchase rate', value: pct(kpis.repurchaseRate), tone: 'b',
      hint: 'Share of acquired customers whose journey shows a 2nd purchase. Journey-table definition; differs from customer_value_summary.' },
    { key: 'rep6', icon: '⏱️', label: '6-mo repurchase', value: pct(kpis.repurchase6moRate), tone: 'c',
      hint: 'Share who repurchased within 180 days of acquisition (journey table). Includes recent cohorts that have not yet had 180 days to repurchase.' },
    { key: 'sales', icon: '💰', label: 'Acquisition net sales', value: money(kpis.acqSales), tone: 'd',
      hint: 'Net sales of the acquisition (first) order only — not lifetime cohort revenue.' },
  ];
  return (
    <div className="kpis">
      {tiles.map((t) => (
        <div className={'kpi kpi-' + t.tone} key={t.key} title={t.hint}>
          <div className="kpi-top">
            <span className="kpi-icon">{t.icon}</span>
            <span className="kpi-info" aria-label={t.hint}>ⓘ</span>
          </div>
          <div className="kpi-value">{t.value}</div>
          <div className="kpi-label">{t.label}</div>
        </div>
      ))}
    </div>
  );
}
