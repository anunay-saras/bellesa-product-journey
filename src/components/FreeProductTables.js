import React, { useMemo, useState } from 'react';
import './ProductTables.css';
import { buildFreeTable, resolveMonths, monthPresets, monthLabel, intFull } from '../data';
import { Dropdown } from './controls';

const LEVELS = [
  { key: 'acq', title: 'Free product with acquisition', badge: '1st' },
  { key: 'second', title: 'Free product with 2nd order', badge: '2nd' },
  { key: 'third', title: 'Free product with 3rd order', badge: '3rd' },
];

function FreeLevelTable({ badge, title, rows }) {
  const max = Math.max(1, ...rows.map((r) => r.customers));
  return (
    <div className="lvl">
      <div className="lvl-head">
        <div className="lvl-title">
          <span className={'lvl-badge b-' + badge}>{badge}</span>
          {title}
        </div>
      </div>
      <div className="lvl-table-wrap">
        <table className="lvl-table">
          <thead>
            <tr>
              <th className="c-rank">#</th>
              <th className="c-prod">Product</th>
              <th className="c-num">Customers</th>
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
                <td className="c-num strong">{intFull(r.customers)}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={3} className="empty">No free products for this selection.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function FreeProductTables({ freeTables, monthOptions }) {
  const [month, setMonth] = useState('last12');
  const [query, setQuery] = useState('');

  const monthsSet = useMemo(() => resolveMonths(monthOptions, month), [monthOptions, month]);
  const presets = monthPresets(monthOptions);

  const built = useMemo(
    () => ({
      acq: buildFreeTable(freeTables.acq, monthsSet, query, 10),
      second: buildFreeTable(freeTables.second, monthsSet, query, 10),
      third: buildFreeTable(freeTables.third, monthsSet, query, 10),
    }),
    [freeTables, monthsSet, query]
  );

  return (
    <section className="card">
      <div className="card-head">
        <div>
          <h2 className="card-title">Free Products by Purchase Step</h2>
          <p className="card-desc">
            Top 10 free-promotion products at each step · customers who received them ·
            sliced by acquisition-cohort month
          </p>
        </div>
        <div className="tbl-month">
          <span className="tbl-month-label">Cohort month</span>
          <Dropdown value={month} onChange={setMonth} icon="📅">
            <optgroup label="Presets">
              {presets.map((p) => (<option key={p.id} value={p.id}>{p.label}</option>))}
            </optgroup>
            <optgroup label="Individual months">
              {monthOptions.map((m) => (<option key={m} value={m}>{monthLabel(m)}</option>))}
            </optgroup>
          </Dropdown>
        </div>
      </div>

      <div className="free-search-row">
        <div className="sankey-search">
          <span className="sankey-search-icon">🔍</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search any free product…"
          />
          {query && (
            <button className="sankey-search-clear" onClick={() => setQuery('')} type="button">×</button>
          )}
        </div>
      </div>

      <div className="lvl-grid">
        {LEVELS.map((lv) => (
          <FreeLevelTable key={lv.key} badge={lv.badge} title={lv.title} rows={built[lv.key]} />
        ))}
      </div>
    </section>
  );
}
