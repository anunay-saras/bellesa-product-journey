// -----------------------------------------------------------------------------
// data.js — pure helpers that turn the baked JSON into view models.
// No React here; components stay presentational.
// -----------------------------------------------------------------------------

const SEP = ''; // delimiter for composite link keys (never appears in names)

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

// ---- sankey -----------------------------------------------------------------
// Builds the 3-column model from a window's node1/link12/link23 grains,
// applying the three independent free selections.
export function buildSankey(win, freeSel, opts = {}) {
  const { acq: acqFree, second: secFree, third: thirdFree } = freeSel;
  const TOP_ACQ = opts.topAcq || 15;
  const TOP_2ND = opts.top2nd || 12;
  const TOP_3RD = opts.top3rd || 12;

  // Column 1: acquisition products
  const acqAgg = new Map();
  for (const [product, free, customers] of win.node1) {
    if (!matchFree(acqFree, free)) continue;
    acqAgg.set(product, (acqAgg.get(product) || 0) + customers);
  }
  const acqNodes = [...acqAgg.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, TOP_ACQ);
  const acqSet = new Set(acqNodes.map((n) => n.name));

  // Links 1->2 (only from the top acq nodes), aggregate 2nd products
  const l12 = new Map();
  const secAgg = new Map();
  for (const [a, af, c, cf, customers] of win.link12) {
    if (!acqSet.has(a)) continue;
    if (!matchFree(acqFree, af)) continue;
    if (!matchFree(secFree, cf)) continue;
    secAgg.set(c, (secAgg.get(c) || 0) + customers);
    const k = a + SEP + c;
    l12.set(k, (l12.get(k) || 0) + customers);
  }
  const secNodes = [...secAgg.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, TOP_2ND);
  const secSet = new Set(secNodes.map((n) => n.name));

  // Links 2->3 (only from the top 2nd nodes), aggregate 3rd products
  const l23 = new Map();
  const thirdAgg = new Map();
  for (const [c, cf, d, df, customers] of win.link23) {
    if (!secSet.has(c)) continue;
    if (!matchFree(secFree, cf)) continue;
    if (!matchFree(thirdFree, df)) continue;
    thirdAgg.set(d, (thirdAgg.get(d) || 0) + customers);
    const k = c + SEP + d;
    l23.set(k, (l23.get(k) || 0) + customers);
  }
  const thirdNodes = [...thirdAgg.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, TOP_3RD);
  const thirdSet = new Set(thirdNodes.map((n) => n.name));

  const links12 = [...l12.entries()]
    .map(([k, v]) => {
      const [source, target] = k.split(SEP);
      return { source, target, value: v };
    })
    .filter((l) => secSet.has(l.target));
  const links23 = [...l23.entries()]
    .map(([k, v]) => {
      const [source, target] = k.split(SEP);
      return { source, target, value: v };
    })
    .filter((l) => thirdSet.has(l.target));

  return { acqNodes, secNodes, thirdNodes, links12, links23 };
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
