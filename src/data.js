// -----------------------------------------------------------------------------
// data.js — pure helpers that turn the baked JSON into view models.
// No React here; components stay presentational.
// -----------------------------------------------------------------------------


// ---- formatting -------------------------------------------------------------
export function compact(n) {
  n = Number(n) || 0;
  const abs = Math.abs(n);
  if (abs >= 1e9) return (n / 1e9).toFixed(1).replace(/\.0$/, '') + 'B';
  if (abs >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
  if (abs >= 1e3) return (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'K';
  return n.toLocaleString('en-US');
}
export function money(n) {
  n = Number(n) || 0;
  if (Math.abs(n) >= 1000) return '$' + compact(n);
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
export function moneyFull(n) {
  return '$' + (Number(n) || 0).toLocaleString('en-US', { maximumFractionDigits: 0 });
}
export function intFull(n) {
  return (Number(n) || 0).toLocaleString('en-US');
}
export function pct(n) {
  return (Number(n) || 0).toFixed(1) + '%';
}
export function monthLabel(ym) {
  const [y, m] = ym.split('-');
  const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${names[Number(m) - 1]} ${y}`;
}

// ---- free-flag filter -------------------------------------------------------
// sel: 'all' | 'paid' | 'free'  ; flag: 0 (paid) | 1 (free)
export function matchFree(sel, flag) {
  if (sel === 'paid') return flag === 0;
  if (sel === 'free') return flag === 1;
  return true;
}

// ---- month presets ----------------------------------------------------------
// monthOptions is DESC (newest first). Presets slice the leading window.
export function monthPresets(monthOptions) {
  return [
    { id: 'last12', label: 'Last 12 months', months: monthOptions.slice(0, 12) },
    { id: 'last6', label: 'Last 6 months', months: monthOptions.slice(0, 6) },
    { id: 'last24', label: 'Last 24 months', months: monthOptions.slice(0, 24) },
    { id: 'all', label: 'All time', months: monthOptions.slice() },
  ];
}
export function resolveMonths(monthOptions, selectionId) {
  const preset = monthPresets(monthOptions).find((p) => p.id === selectionId);
  if (preset) return new Set(preset.months);
  return new Set([selectionId]); // a single "YYYY-MM"
}

// ---- product tables ---------------------------------------------------------
// rows: [month, free(0/1), product, customers, netSales]
export function buildTable(rows, monthsSet, freeSel, topN = 20) {
  const agg = new Map();
  for (const [month, free, product, customers, netSales] of rows) {
    if (!monthsSet.has(month)) continue;
    if (!matchFree(freeSel, free)) continue;
    const cur = agg.get(product) || { product, customers: 0, netSales: 0 };
    cur.customers += customers;
    cur.netSales += netSales;
    agg.set(product, cur);
  }
  const list = [...agg.values()].map((r) => ({
    ...r,
    orders: r.customers, // one order per purchase-level per customer
    aov: r.customers ? r.netSales / r.customers : 0,
  }));
  list.sort((a, b) => b.customers - a.customers);
  return list.slice(0, topN);
}

// ---- sankey (click drill-down) ----------------------------------------------
// Column 1 = top-15 acquisition products. Selecting an acquisition product
// reveals the 2nd products THOSE acquirers bought (path count = people who
// bought that 2nd product after this 1st product). Selecting a 2nd product
// reveals the 3rd products bought after it. Counts are always path-specific.
export function buildJourney(win, freeSel, selectedAcq, selected2nd, opts = {}) {
  const { acq: acqFree, second: secFree, third: thirdFree } = freeSel;
  const TOP_ACQ = opts.topAcq || 15;
  const TOP_2ND = opts.top2nd || 12;
  const TOP_3RD = opts.top3rd || 12;
  const q = (opts.query || '').trim().toLowerCase();

  // Column 1: acquisition products (optionally filtered by search)
  const acqAgg = new Map();
  for (const [product, free, customers] of win.node1) {
    if (!matchFree(acqFree, free)) continue;
    if (q && !product.toLowerCase().includes(q)) continue;
    acqAgg.set(product, (acqAgg.get(product) || 0) + customers);
  }
  const acqNodes = [...acqAgg.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, TOP_ACQ);
  const acqSet = new Set(acqNodes.map((n) => n.name));

  // Resolve the selected acquisition product (fall back to the top one).
  const curAcq = selectedAcq && acqSet.has(selectedAcq) ? selectedAcq : acqNodes[0]?.name || null;

  // Column 2: 2nd products bought by curAcq's acquirers.
  const secAgg = new Map();
  if (curAcq) {
    for (const [a, af, c, cf, customers] of win.link12) {
      if (a !== curAcq) continue;
      if (!matchFree(acqFree, af)) continue;
      if (!matchFree(secFree, cf)) continue;
      secAgg.set(c, (secAgg.get(c) || 0) + customers);
    }
  }
  const secNodes = [...secAgg.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, TOP_2ND);
  const secSet = new Set(secNodes.map((n) => n.name));
  const cur2nd = selected2nd && secSet.has(selected2nd) ? selected2nd : secNodes[0]?.name || null;

  // Column 3: 3rd products bought after cur2nd.
  const thirdAgg = new Map();
  if (cur2nd) {
    for (const [c, cf, d, df, customers] of win.link23) {
      if (c !== cur2nd) continue;
      if (!matchFree(secFree, cf)) continue;
      if (!matchFree(thirdFree, df)) continue;
      thirdAgg.set(d, (thirdAgg.get(d) || 0) + customers);
    }
  }
  const thirdNodes = [...thirdAgg.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, TOP_3RD);

  const links12 = curAcq ? secNodes.map((n) => ({ source: curAcq, target: n.name, value: n.value })) : [];
  const links23 = cur2nd ? thirdNodes.map((n) => ({ source: cur2nd, target: n.name, value: n.value })) : [];

  return { acqNodes, secNodes, thirdNodes, links12, links23, curAcq, cur2nd };
}

// ---- pivot: acquisition product -> 2nd product breakdown --------------------
// metrics: [month, acq, customers, with2nd, rep180, daysSum, daysCnt, netSales]
// second : [month, acq, bucket("" = no 2nd), customers]
export function buildPivot(pivot, monthsSet, topAcq = 15, top2nd = 8) {
  const m = new Map();
  for (const [month, acq, customers, with2nd, rep180, daysSum, daysCnt, netSales] of pivot.metrics) {
    if (!monthsSet.has(month)) continue;
    const cur =
      m.get(acq) ||
      { acq, customers: 0, with2nd: 0, rep180: 0, daysSum: 0, daysCnt: 0, netSales: 0 };
    cur.customers += customers;
    cur.with2nd += with2nd;
    cur.rep180 += rep180;
    cur.daysSum += daysSum;
    cur.daysCnt += daysCnt;
    cur.netSales += netSales;
    m.set(acq, cur);
  }

  const sec = new Map(); // acq -> Map(bucket -> customers)
  for (const [month, acq, bucket, customers] of pivot.second) {
    if (!monthsSet.has(month)) continue;
    if (!m.has(acq)) continue;
    let bm = sec.get(acq);
    if (!bm) {
      bm = new Map();
      sec.set(acq, bm);
    }
    bm.set(bucket, (bm.get(bucket) || 0) + customers);
  }

  const rows = [...m.values()]
    .map((r) => {
      const bm = sec.get(r.acq) || new Map();
      const no2nd = bm.get('') || 0;
      const named = [...bm.entries()]
        .filter(([b]) => b !== '')
        .map(([product, customers]) => ({ product, customers }))
        .sort((a, b) => b.customers - a.customers);
      return {
        acq: r.acq,
        customers: r.customers,
        no2nd,
        no2ndPct: r.customers ? (no2nd / r.customers) * 100 : 0,
        repurchasers: r.with2nd,
        repurchaseRate: r.customers ? (r.with2nd / r.customers) * 100 : 0,
        rep180Rate: r.customers ? (r.rep180 / r.customers) * 100 : 0,
        avgDaysTo2nd: r.daysCnt ? r.daysSum / r.daysCnt : null,
        netSales: r.netSales,
        aov: r.customers ? r.netSales / r.customers : 0,
        topSecond: named.slice(0, top2nd),
      };
    })
    .sort((a, b) => b.customers - a.customers)
    .slice(0, topAcq);

  return rows;
}
