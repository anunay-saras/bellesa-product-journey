import React from 'react';
import './KpiTiles.css';
import { compact, money, pct } from '../data';

export default function KpiTiles({ kpis }) {
  const tiles = [
    { key: 'cust', icon: '👥', label: 'Customers acquired', value: compact(kpis.customers), tone: 'a',
      hint: 'New customers in this period, counted by their first-ever purchase (all sales channels).' },
    { key: 'rep', icon: '🔁', label: 'Repurchase rate', value: pct(kpis.repurchaseRate), tone: 'b',
      hint: 'Customers who made a 2nd purchase ÷ all customers acquired in the period.' },
    { key: 'rep6', icon: '⏱️', label: '6-mo repurchase', value: pct(kpis.repurchase6moRate), tone: 'c',
      hint: `Customers who repurchased within 180 days ÷ customers with at least 180 days since acquisition (${compact(kpis.eligible6mo)} eligible). Recent buyers who haven't had a full 6-month window aren't counted.` },
    { key: 'sales', icon: '💰', label: 'Acquisition net sales', value: money(kpis.acqSales), tone: 'd',
      hint: 'Net sales from customers\' first (acquisition) order — not their lifetime spend.' },
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
