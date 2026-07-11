import React, { useMemo, useState } from 'react';
import './ProductTables.css';
import { buildTable, resolveMonths, monthPresets, monthLabel, intFull, moneyFull, money } from '../data';
import { FreeFilter, Dropdown } from './controls';

const LEVELS = [
  { key: 'acq', title: '1st · Acquisition products', badge: '1st' },
  { key: 'second', title: '2nd purchase products', badge: '2nd' },
  { key: 'third', title: '3rd purchase products', badge: '3rd' },
];

function LevelTable({ badge, title, rows, free, onFree }) {
  const max = Math.max(1, ...rows.map((r) => r.customers));
  return (
    <div className="lvl">
      <div className="lvl-head">
        <div className="lvl-title">
          <span className={'lvl-badge b-' + badge}>{badge}</span>
          {title}
        </div>
        <FreeFilter label="Free filter" value={free} onChange={onFree} />
      </div>
      <div className="lvl-table-wrap">
        <table className="lvl-table">
          <thead>
            <tr>
              <th className="c-rank">#</th>
              <th className="c-prod">Product</th>
              <th className="c-num">Orders</th>
              <th className="c-num">Net sales</th>
              <th className="c-num">AOV</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.product}>
                <td className="c-rank">{i + 1}</td>
                <td className="c-prod">
                  <span className="prod-name" title={r.product}>{r.product}</span>
                  <span className="prod-bar" style={{ width: (r.customers / max) * 100 + '%' }} />
                </td>
                <td className="c-num">{intFull(r.orders)}</td>
                <td className="c-num strong">{moneyFull(r.netSales)}</td>
                <td className="c-num muted">{money(r.aov)}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={5} className="empty">No products for this selection.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function ProductTables({ tables, monthOptions }) {
  const [month, setMonth] = useState('last12');
  const [free, setFree] = useState({ acq: 'all', second: 'all', third: 'all' });

  const monthsSet = useMemo(() => resolveMonths(monthOptions, month), [monthOptions, month]);
  const presets = monthPresets(monthOptions);

  const built = useMemo(
    () => ({
      acq: buildTable(tables.acq, monthsSet, free.acq, 20),
      second: buildTable(tables.second, monthsSet, free.second, 20),
      third: buildTable(tables.third, monthsSet, free.third, 20),
    }),
    [tables, monthsSet, free]
  );

  return (
    <section className="card">
      <div className="card-head">
        <div>
          <h2 className="card-title">Product Performance Tables</h2>
          <p className="card-desc">
            Top 20 products at each purchase step · orders &amp; net sales · sliced by acquisition-cohort month
          </p>
        </div>
        <div className="tbl-month">
          <span className="tbl-month-label">Cohort month</span>
          <Dropdown value={month} onChange={setMonth} icon="📅">
            <optgroup label="Presets">
              {presets.map((p) => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </optgroup>
            <optgroup label="Individual months">
              {monthOptions.map((m) => (
                <option key={m} value={m}>{monthLabel(m)}</option>
              ))}
            </optgroup>
          </Dropdown>
        </div>
      </div>

      <div className="lvl-grid">
        {LEVELS.map((lv) => (
          <LevelTable
            key={lv.key}
            badge={lv.badge}
            title={lv.title}
            rows={built[lv.key]}
            free={free[lv.key]}
            onFree={(v) => setFree((f) => ({ ...f, [lv.key]: v }))}
          />
        ))}
      </div>
    </section>
  );
}
