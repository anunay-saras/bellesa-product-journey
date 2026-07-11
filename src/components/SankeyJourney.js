import React, { useMemo, useState } from 'react';
import './SankeyJourney.css';
import { buildSankey, compact } from '../data';
import { FreeFilter } from './controls';

// SVG layout constants (coordinate space; scales responsively via viewBox).
const NW = 250; // node width
const RH = 32; // row height
const RG = 10; // row gap
const HEADER_H = 34;
const COL_X = [0, 375, 750];
const RIGHT = [NW, 375 + NW, 750 + NW]; // right edges
const LEFT = [0, 375, 750]; // left edges

function truncate(s, n = 26) {
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}

export default function SankeyJourney({ windowData, winLabel }) {
  const [free, setFree] = useState({ acq: 'all', second: 'all', third: 'all' });
  const [query, setQuery] = useState('');
  const [hover, setHover] = useState(null); // "col:name"

  const model = useMemo(() => buildSankey(windowData, free), [windowData, free]);
  const { acqNodes, secNodes, thirdNodes, links12, links23 } = model;

  const cols = useMemo(() => [acqNodes, secNodes, thirdNodes], [acqNodes, secNodes, thirdNodes]);
  const maxRows = Math.max(acqNodes.length, secNodes.length, thirdNodes.length, 1);
  const contentH = maxRows * (RH + RG) - RG;
  const totalH = HEADER_H + contentH;

  const yTop = (colLen, i) => {
    const off = (contentH - (colLen * (RH + RG) - RG)) / 2;
    return HEADER_H + off + i * (RH + RG);
  };
  const yCenter = (colLen, i) => yTop(colLen, i) + RH / 2;

  // index maps for link endpoint lookup
  const idx = [
    new Map(acqNodes.map((n, i) => [n.name, i])),
    new Map(secNodes.map((n, i) => [n.name, i])),
    new Map(thirdNodes.map((n, i) => [n.name, i])),
  ];

  const maxV12 = Math.max(1, ...links12.map((l) => l.value));
  const maxV23 = Math.max(1, ...links23.map((l) => l.value));
  const widthFor = (v, max) => 1.4 + (v / max) * 13;

  // ---- emphasis (hover takes priority, then search) ----
  const q = query.trim().toLowerCase();
  const nodeKey = (c, name) => c + ':' + name;

  const emphasis = useMemo(() => {
    const nodes = new Set();
    const links = new Set();
    const lid = (t, s, tg) => t + ':' + s + '>' + tg;

    if (hover) {
      const [cStr, ...rest] = hover.split(':');
      const c = Number(cStr);
      const name = rest.join(':');
      nodes.add(hover);
      if (c === 0) {
        links12.forEach((l) => {
          if (l.source === name) { links.add(lid('12', l.source, l.target)); nodes.add(nodeKey(1, l.target)); }
        });
      } else if (c === 1) {
        links12.forEach((l) => {
          if (l.target === name) { links.add(lid('12', l.source, l.target)); nodes.add(nodeKey(0, l.source)); }
        });
        links23.forEach((l) => {
          if (l.source === name) { links.add(lid('23', l.source, l.target)); nodes.add(nodeKey(2, l.target)); }
        });
      } else {
        links23.forEach((l) => {
          if (l.target === name) { links.add(lid('23', l.source, l.target)); nodes.add(nodeKey(1, l.source)); }
        });
      }
      return { nodes, links, active: true };
    }

    if (q) {
      const match = (name) => name.toLowerCase().includes(q);
      cols.forEach((col, c) => col.forEach((n) => { if (match(n.name)) nodes.add(nodeKey(c, n.name)); }));
      links12.forEach((l) => {
        if (match(l.source) || match(l.target)) {
          links.add(lid('12', l.source, l.target));
          nodes.add(nodeKey(0, l.source)); nodes.add(nodeKey(1, l.target));
        }
      });
      links23.forEach((l) => {
        if (match(l.source) || match(l.target)) {
          links.add(lid('23', l.source, l.target));
          nodes.add(nodeKey(1, l.source)); nodes.add(nodeKey(2, l.target));
        }
      });
      return { nodes, links, active: true };
    }

    return { nodes, links, active: false };
  }, [hover, q, links12, links23, cols]);

  const linkPath = (x1, y1, x2, y2) => {
    const mx = (x1 + x2) / 2;
    return `M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`;
  };

  const COL_TITLES = ['Acquisition product', '2nd purchase', '3rd purchase'];

  return (
    <section className="card sankey">
      <div className="card-head">
        <div>
          <h2 className="card-title">Product Purchase Journey</h2>
          <p className="card-desc">
            Top 15 acquisition products → their top 2nd purchase → top 3rd purchase ·
            {' '}{winLabel} cohort · hover a product to trace its flow
          </p>
        </div>
        <div className="sankey-search">
          <span className="sankey-search-icon">🔍</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search any product…"
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

          {/* column headers */}
          {COL_TITLES.map((t, c) => (
            <text key={t} x={COL_X[c] + NW / 2} y={18} className="sk-coltitle" textAnchor="middle">
              {t.toUpperCase()}
            </text>
          ))}

          {/* links 1->2 */}
          <g>
            {links12.map((l) => {
              const si = idx[0].get(l.source);
              const ti = idx[1].get(l.target);
              if (si === undefined || ti === undefined) return null;
              const id = '12:' + l.source + '>' + l.target;
              const on = emphasis.links.has(id);
              const dim = emphasis.active && !on;
              return (
                <path
                  key={id}
                  d={linkPath(RIGHT[0], yCenter(acqNodes.length, si), LEFT[1], yCenter(secNodes.length, ti))}
                  className={'sk-link' + (on ? ' on' : '')}
                  style={{ strokeWidth: widthFor(l.value, maxV12), opacity: dim ? 0.05 : on ? 0.55 : 0.16 }}
                />
              );
            })}
            {links23.map((l) => {
              const si = idx[1].get(l.source);
              const ti = idx[2].get(l.target);
              if (si === undefined || ti === undefined) return null;
              const id = '23:' + l.source + '>' + l.target;
              const on = emphasis.links.has(id);
              const dim = emphasis.active && !on;
              return (
                <path
                  key={id}
                  d={linkPath(RIGHT[1], yCenter(secNodes.length, si), LEFT[2], yCenter(thirdNodes.length, ti))}
                  className={'sk-link' + (on ? ' on' : '')}
                  style={{ strokeWidth: widthFor(l.value, maxV23), opacity: dim ? 0.05 : on ? 0.55 : 0.16 }}
                />
              );
            })}
          </g>

          {/* nodes */}
          {cols.map((col, c) =>
            col.map((n, i) => {
              const key = nodeKey(c, n.name);
              const on = emphasis.nodes.has(key);
              const dim = emphasis.active && !on;
              const y = yTop(col.length, i);
              return (
                <g
                  key={key}
                  className={'sk-node' + (on ? ' on' : '') + (dim ? ' dim' : '')}
                  onMouseEnter={() => setHover(key)}
                  onMouseLeave={() => setHover(null)}
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
          )}
        </svg>
      </div>
    </section>
  );
}
