import React, { useMemo, useState } from 'react';
import './SankeyJourney.css';
import { buildJourney, compact, intFull } from '../data';
import { FreeFilter } from './controls';

// SVG layout constants (coordinate space; scales responsively via viewBox).
const NW = 250; // node width
const RH = 32; // row height
const RG = 10; // row gap
const HEADER_H = 34;
const COL_X = [0, 375, 750];
const RIGHT = [NW, 375 + NW, 750 + NW];
const LEFT = [0, 375, 750];

function truncate(s, n = 26) {
  return s && s.length > n ? s.slice(0, n - 1) + '…' : s;
}

export default function SankeyJourney({ windowData, winLabel }) {
  const [free, setFree] = useState({ acq: 'all', second: 'all', third: 'all' });
  const [query, setQuery] = useState('');
  const [selAcq, setSelAcq] = useState(null);
  const [sel2nd, setSel2nd] = useState(null);

  const model = useMemo(
    () => buildJourney(windowData, free, selAcq, sel2nd, { query }),
    [windowData, free, selAcq, sel2nd, query]
  );
  const { acqNodes, secNodes, thirdNodes, links12, links23, curAcq, cur2nd } = model;

  const cols = [acqNodes, secNodes, thirdNodes];
  const maxRows = Math.max(acqNodes.length, secNodes.length, thirdNodes.length, 1);
  const contentH = maxRows * (RH + RG) - RG;
  const totalH = HEADER_H + contentH;

  const yTop = (colLen, i) => {
    const off = (contentH - (colLen * (RH + RG) - RG)) / 2;
    return HEADER_H + off + i * (RH + RG);
  };
  const yCenter = (colLen, i) => yTop(colLen, i) + RH / 2;

  const idx = [
    new Map(acqNodes.map((n, i) => [n.name, i])),
    new Map(secNodes.map((n, i) => [n.name, i])),
    new Map(thirdNodes.map((n, i) => [n.name, i])),
  ];

  const maxV12 = Math.max(1, ...links12.map((l) => l.value));
  const maxV23 = Math.max(1, ...links23.map((l) => l.value));
  const widthFor = (v, max) => 2 + (v / max) * 15;

  const linkPath = (x1, y1, x2, y2) => {
    const mx = (x1 + x2) / 2;
    return `M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`;
  };

  const clickAcq = (name) => { setSelAcq(name); setSel2nd(null); };

  const COL_TITLES = ['Acquisition product', '2nd purchase', '3rd purchase'];
  const selected = [curAcq, cur2nd, null];
  const total2nd = secNodes.reduce((s, n) => s + n.value, 0);
  const total3rd = thirdNodes.reduce((s, n) => s + n.value, 0);

  return (
    <section className="card sankey">
      <div className="card-head">
        <div>
          <h2 className="card-title">Product Purchase Journey</h2>
          <p className="card-desc">
            {winLabel} cohort · click an <b>acquisition product</b> to see the 2nd products its
            customers bought next, then click a <b>2nd product</b> to see the 3rd. Counts are path-specific.
          </p>
        </div>
        <div className="sankey-search">
          <span className="sankey-search-icon">🔍</span>
          <input
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelAcq(null); setSel2nd(null); }}
            placeholder="Search acquisition product…"
          />
          {query && (
            <button className="sankey-search-clear" onClick={() => setQuery('')} type="button">×</button>
          )}
        </div>
      </div>

      <div className="sankey-filters">
        <FreeFilter label="1st · free filter" value={free.acq} onChange={(v) => setFree((f) => ({ ...f, acq: v }))} />
        <FreeFilter label="2nd · free filter" value={free.second} onChange={(v) => setFree((f) => ({ ...f, second: v }))} />
        <FreeFilter label="3rd · free filter" value={free.third} onChange={(v) => setFree((f) => ({ ...f, third: v }))} />
      </div>

      <div className="sankey-path">
        <span className="sankey-crumb sel-1">1st: {curAcq || '—'}</span>
        <span className="sankey-arrow">→</span>
        <span className="sankey-crumb sel-2">2nd: {cur2nd || '—'}</span>
        <span className="sankey-hint">
          {curAcq && `${intFull(total2nd)} customers made a 2nd purchase`}
          {cur2nd && total3rd > 0 && ` · ${intFull(total3rd)} went on to a 3rd`}
        </span>
      </div>

      <div className="sankey-scroll">
        <svg
          className="sankey-svg"
          viewBox={`0 0 1000 ${totalH}`}
          style={{ minWidth: 760, height: totalH }}
          preserveAspectRatio="xMinYMin meet"
        >
          <defs>
            <linearGradient id="linkg" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#b9a6ff" />
              <stop offset="100%" stopColor="#8f74ff" />
            </linearGradient>
            <linearGradient id="nodeg" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#7c5cff" />
              <stop offset="100%" stopColor="#9d7bff" />
            </linearGradient>
          </defs>

          {COL_TITLES.map((t, c) => (
            <text key={t} x={COL_X[c] + NW / 2} y={18} className="sk-coltitle" textAnchor="middle">
              {t.toUpperCase()}
            </text>
          ))}

          {/* active path links */}
          <g>
            {links12.map((l) => {
              const si = idx[0].get(l.source);
              const ti = idx[1].get(l.target);
              if (si === undefined || ti === undefined) return null;
              return (
                <path
                  key={'12:' + l.target}
                  d={linkPath(RIGHT[0], yCenter(acqNodes.length, si), LEFT[1], yCenter(secNodes.length, ti))}
                  className="sk-link"
                  style={{ strokeWidth: widthFor(l.value, maxV12) }}
                />
              );
            })}
            {links23.map((l) => {
              const si = idx[1].get(l.source);
              const ti = idx[2].get(l.target);
              if (si === undefined || ti === undefined) return null;
              return (
                <path
                  key={'23:' + l.target}
                  d={linkPath(RIGHT[1], yCenter(secNodes.length, si), LEFT[2], yCenter(thirdNodes.length, ti))}
                  className="sk-link"
                  style={{ strokeWidth: widthFor(l.value, maxV23) }}
                />
              );
            })}
          </g>

          {/* nodes */}
          {cols.map((col, c) =>
            col.length === 0 ? (
              <text key={'empty' + c} x={COL_X[c] + NW / 2} y={HEADER_H + contentH / 2} className="sk-empty" textAnchor="middle">
                {c === 1 ? 'Select an acquisition product' : 'No further purchases'}
              </text>
            ) : (
              col.map((n, i) => {
                const isSel = selected[c] === n.name;
                const clickable = c === 0 || c === 1;
                const y = yTop(col.length, i);
                return (
                  <g
                    key={c + ':' + n.name}
                    className={'sk-node' + (isSel ? ' sel' : '') + (clickable ? ' clickable' : '')}
                    onClick={clickable ? () => (c === 0 ? clickAcq(n.name) : setSel2nd(n.name)) : undefined}
                  >
                    <rect x={COL_X[c]} y={y} width={NW} height={RH} rx={8} className="sk-node-rect" />
                    <text x={COL_X[c] + 12} y={y + RH / 2} className="sk-node-label" dominantBaseline="central">
                      {truncate(n.name)}
                    </text>
                    <text x={COL_X[c] + NW - 12} y={y + RH / 2} className="sk-node-val" textAnchor="end" dominantBaseline="central">
                      {compact(n.value)}
                    </text>
                  </g>
                );
              })
            )
          )}
        </svg>
      </div>
    </section>
  );
}
