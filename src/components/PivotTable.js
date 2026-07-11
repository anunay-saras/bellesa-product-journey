import React, { useMemo, useState } from 'react';
import './PivotTable.css';
import { buildPivot, resolveMonths, monthPresets, monthLabel, intFull, moneyFull, pct } from '../data';
import { Dropdown } from './controls';

function SecondBreakdown({ row }) {
  const segments = [
    ...row.topSecond.map((s) => ({ label: s.product, customers: s.customers, kind: 'named' })),
  ];
  if (row.no2nd > 0) segments.push({ label: 'No second purchase', customers: row.no2nd, kind: 'none' });
  const max = Math.max(1, ...segments.map((s) => s.customers));

  return (
    <div className="pv-breakdown">
      <div className="pv-breakdown-title">2nd product purchased by {row.acq} acquirers</div>
      <div className="pv-bars">
        {segments.map((s) => (
          <div className={'pv-bar-row ' + s.kind} key={s.label}>
            <span className="pv-bar-label" title={s.label}>{s.label}</span>
            <span className="pv-bar-track">
              <span className="pv-bar-fill" style={{ width: (s.customers / max) * 100 + '%' }} />
            </span>
            <span className="pv-bar-val">{intFull(s.customers)}</span>
            <span className="pv-bar-pct">{pct(row.customers ? (s.customers / row.customers) * 100 : 0)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PivotTable({ pivot, monthOptions }) {
  const [month, setMonth] = useState('last12');
  const [open, setOpen] = useState(() => new Set());

  const monthsSet = useMemo(() => resolveMonths(monthOptions, month), [monthOptions, month]);
  const presets = monthPresets(monthOptions);
  const rows = useMemo(() => buildPivot(pivot, monthsSet, 20, 8), [pivot, monthsSet]);

  const toggle = (acq) =>
    setOpen((prev) => {
      const next = new Set(prev);
      next.has(acq) ? next.delete(acq) : next.add(acq);
      return next;
    });

  return (
    <section className="card">
      <div className="card-head">
        <div>
          <h2 className="card-title">Acquisition → 2nd Purchase Pivot</h2>
          <p className="card-desc">
            Top 20 acquisition products · repeat-purchase behaviour &amp; where those customers went next ·
            click a row to expand the 2nd-product mix
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

      <div className="pv-wrap">
        <table className="pv-table">
          <thead>
            <tr>
              <th className="c-prod">Acquisition product</th>
              <th className="c-num">Customers</th>
              <th className="c-num">Repurchased</th>
              <th className="c-num">Repurchase rate</th>
              <th className="c-num">No 2nd purchase</th>
              <th className="c-num">6-mo repeat</th>
              <th className="c-num">Avg days→2nd</th>
              <th className="c-num">Net sales</th>
              <th className="c-exp" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const isOpen = open.has(r.acq);
              return (
                <React.Fragment key={r.acq}>
                  <tr className={'pv-row' + (isOpen ? ' is-open' : '')} onClick={() => toggle(r.acq)}>
                    <td className="c-prod"><span className="prod-name" title={r.acq}>{r.acq}</span></td>
                    <td className="c-num strong">{intFull(r.customers)}</td>
                    <td className="c-num">{intFull(r.repurchasers)}</td>
                    <td className="c-num">
                      <span className="pill pill-good">{pct(r.repurchaseRate)}</span>
                    </td>
                    <td className="c-num">
                      {intFull(r.no2nd)} <span className="sub">({pct(r.no2ndPct)})</span>
                    </td>
                    <td className="c-num" title={`${intFull(r.eligible6mo)} eligible (>180 days tenure)`}>
                      {r.rep180Rate == null ? '—' : pct(r.rep180Rate)}
                    </td>
                    <td className="c-num muted">{r.avgDaysTo2nd == null ? '—' : Math.round(r.avgDaysTo2nd) + 'd'}</td>
                    <td className="c-num strong">{moneyFull(r.netSales)}</td>
                    <td className="c-exp"><span className={'caret' + (isOpen ? ' open' : '')}>▸</span></td>
                  </tr>
                  {isOpen && (
                    <tr className="pv-detail-row">
                      <td colSpan={9}><SecondBreakdown row={r} /></td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
