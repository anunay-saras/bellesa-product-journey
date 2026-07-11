import React, { useMemo, useState } from 'react';
import './App.css';
import baked from './baked-data.json';
import { monthLabel } from './data';
import KpiTiles from './components/KpiTiles';
import SankeyJourney from './components/SankeyJourney';
import ProductTables from './components/ProductTables';
import PivotTable from './components/PivotTable';
import { Segmented } from './components/controls';

const WINDOW_OPTIONS = [
  { id: '6m', label: '6M' },
  { id: '12m', label: '12M' },
  { id: '24m', label: '24M' },
];

export default function App() {
  const [win, setWin] = useState('12m');

  const generated = useMemo(() => {
    try {
      return new Date(baked.meta.generatedAt).toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric',
      });
    } catch {
      return '—';
    }
  }, []);

  const windowData = baked.windows[win];

  return (
    <div className="app">
      <div className="shell">
        <header className="hero">
          <div className="hero-left">
            <div className="hero-eyebrow">BELLESA · PRODUCT ANALYTICS</div>
            <h1 className="hero-title">Product Purchase Journey</h1>
            <p className="hero-sub">
              New-customer flow from acquisition to repeat purchase · counted by each
              customer's first-ever acquisition · all platforms · current month excluded ·
              refreshed {generated}
            </p>
          </div>
          <div className="hero-right">
            <span className="hero-window-label">Acquisition window</span>
            <Segmented options={WINDOW_OPTIONS} value={win} onChange={setWin} />
          </div>
        </header>

        <KpiTiles kpis={windowData.kpis} />

        <SankeyJourney windowData={windowData} winLabel={win.toUpperCase()} />

        <ProductTables tables={baked.tables} monthOptions={baked.monthOptions} />

        <PivotTable pivot={baked.pivot} monthOptions={baked.monthOptions} />

        <footer className="foot">
          <span>
            Source: <code>{baked.meta.source}</code>
          </span>
          <span>
            {baked.monthOptions.length} complete months ·{' '}
            {monthLabel(baked.monthOptions[baked.monthOptions.length - 1])} –{' '}
            {monthLabel(baked.monthOptions[0])}
          </span>
        </footer>
      </div>
    </div>
  );
}
