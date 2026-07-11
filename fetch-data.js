/*
 * fetch-data.js
 * ----------------------------------------------------------------------------
 * Bakes the Bellesa "customer_product_purchase_journey" table into a compact,
 * PII-free JSON (src/baked-data.json) that the static React app renders.
 *
 * Source : insightsprod.bellesaenterprises_5719_prod_presentation
 *          .customer_product_purchase_journey   (grain: 1 row / customer / acquisition_date)
 *
 * Auth   : Application Default Credentials via GOOGLE_APPLICATION_CREDENTIALS
 *          (locally -> rpa_sa.json ; in CI -> the GCP_SA_KEY repo secret).
 *
 * Key modelling decisions (documented, precise):
 *  - DEDUPE pipeline re-runs: keep the latest _last_updated per
 *    (customer_id, acquisition_date). A customer that legitimately has TWO
 *    different acquisition dates stays as two acquisition events.
 *  - EXCLUDE the current (partial) calendar month everywhere.
 *  - COHORT ANCHORED: every view is sliced by the customer's acquisition_month.
 *    The 2nd / 3rd product tables describe the subsequent behaviour of a given
 *    acquisition cohort, not the calendar month the 2nd/3rd order happened in.
 *  - Windows 6m / 12m / 24m are trailing full-month cohort windows.
 *  - "orders" == customers at every purchase level (one order per level per
 *    customer), so the app derives Orders and AOV from customers + netSales.
 * ----------------------------------------------------------------------------
 */
const { BigQuery } = require('@google-cloud/bigquery');
const fs = require('fs');
const path = require('path');

const PROJECT = 'insightsprod';
const TABLE =
  '`insightsprod.bellesaenterprises_5719_prod_presentation.customer_product_purchase_journey`';
const OUT = path.join(__dirname, 'src', 'baked-data.json');

// Caps that keep the baked file small while preserving exact top-N answers.
const WINDOWS = { '6m': 6, '12m': 12, '24m': 24 };
const SANKEY_ACQ_POOL = 40; // acq products carried into link12 (top-15 shown)
const SANKEY_2ND_POOL = 40; // 2nd products carried into link23
const TABLE_TOP_PER_MONTH = 40; // products kept per month per level (top-20 shown)
const PIVOT_ACQ_POOL = 25; // acq products carried into the pivot (top-15 shown)
const PIVOT_2ND_PER_ACQ = 12; // named 2nd products per acq; rest -> "Other 2nd products"

const bq = new BigQuery({ projectId: PROJECT });

// Deduped source rows for complete (non-current) months only. Every query
// starts from this CTE so the dedup + exclusion rules are applied uniformly.
const BASE = `
  base AS (
    SELECT
      customer_id, acquisition_month, acquisition_date,
      acquisition_product_name,  IF(acquisition_is_free_product, 1, 0) AS acq_free,  acquisition_net_sales_usd,
      second_product_name,       IF(second_is_free_product, 1, 0)      AS second_free, second_net_sales_usd,
      third_product_name,        IF(third_is_free_product, 1, 0)       AS third_free,  third_net_sales_usd,
      days_to_second_order, repurchased_within_180_days
    FROM (
      -- Keep each customer's FIRST-EVER acquisition (true-new-customer grain).
      -- A later "acquisition" row for the same customer is a reactivation, not a
      -- new acquisition, and is dropped. Ties on date resolved by latest _last_updated.
      SELECT *, ROW_NUMBER() OVER (
        PARTITION BY customer_id ORDER BY acquisition_date ASC, _last_updated DESC
      ) AS _rn
      FROM ${TABLE}
      WHERE acquisition_date < DATE_TRUNC(CURRENT_DATE(), MONTH)
    )
    WHERE _rn = 1
  )`;

const windowLowerBound = (n) =>
  `DATE_TRUNC(DATE_SUB(CURRENT_DATE(), INTERVAL ${n} MONTH), MONTH)`;

async function q(sql) {
  const [rows] = await bq.query({ query: sql });
  return rows;
}
const num = (v) => (v === null || v === undefined ? 0 : Number(v));

async function fetchWindow(n) {
  const lb = windowLowerBound(n);
  // Dedup to first-acquisition FIRST (full history), THEN restrict to the
  // trailing window — so a reactivation inside the window can't be mistaken
  // for an acquisition.
  const WIN = `${BASE}, w AS (SELECT * FROM base WHERE acquisition_date >= ${lb})`;

  const kpis = (
    await q(`WITH ${WIN}
    SELECT
      COUNT(*) AS customers,
      ROUND(SAFE_DIVIDE(COUNTIF(second_product_name IS NOT NULL), COUNT(*)) * 100, 1) AS repurchase_rate,
      -- 6-mo repurchase: only customers with >180 days tenure qualify (denominator).
      COUNTIF(acquisition_date <= DATE_SUB(CURRENT_DATE(), INTERVAL 180 DAY)) AS eligible_6mo,
      ROUND(SAFE_DIVIDE(
        COUNTIF(repurchased_within_180_days = 1 AND acquisition_date <= DATE_SUB(CURRENT_DATE(), INTERVAL 180 DAY)),
        COUNTIF(acquisition_date <= DATE_SUB(CURRENT_DATE(), INTERVAL 180 DAY))
      ) * 100, 1) AS repurchase_6mo_rate,
      ROUND(SUM(acquisition_net_sales_usd), 0) AS acq_sales
    FROM w`)
  )[0];

  const node1 = await q(`WITH ${WIN}
    SELECT acquisition_product_name AS product, acq_free AS free, COUNT(*) AS customers
    FROM w
    WHERE acquisition_product_name IS NOT NULL
    GROUP BY 1, 2`);

  const link12 = await q(`WITH ${WIN},
    pool AS (
      SELECT acquisition_product_name FROM w
      GROUP BY 1 ORDER BY COUNT(*) DESC LIMIT ${SANKEY_ACQ_POOL}
    )
    SELECT b.acquisition_product_name AS a, b.acq_free AS af,
           b.second_product_name AS c, b.second_free AS cf, COUNT(*) AS customers
    FROM w b JOIN pool USING (acquisition_product_name)
    WHERE b.second_product_name IS NOT NULL
    GROUP BY 1, 2, 3, 4`);

  const link23 = await q(`WITH ${WIN},
    pool AS (
      SELECT second_product_name FROM w
      WHERE second_product_name IS NOT NULL
      GROUP BY 1 ORDER BY COUNT(*) DESC LIMIT ${SANKEY_2ND_POOL}
    )
    SELECT b.second_product_name AS c, b.second_free AS cf,
           b.third_product_name AS d, b.third_free AS df, COUNT(*) AS customers
    FROM w b JOIN pool USING (second_product_name)
    WHERE b.third_product_name IS NOT NULL
    GROUP BY 1, 2, 3, 4`);

  return {
    kpis: {
      customers: num(kpis.customers),
      repurchaseRate: num(kpis.repurchase_rate),
      repurchase6moRate: num(kpis.repurchase_6mo_rate),
      eligible6mo: num(kpis.eligible_6mo),
      acqSales: num(kpis.acq_sales),
    },
    node1: node1.map((r) => [r.product, num(r.free), num(r.customers)]),
    link12: link12.map((r) => [r.a, num(r.af), r.c, num(r.cf), num(r.customers)]),
    link23: link23.map((r) => [r.c, num(r.cf), r.d, num(r.df), num(r.customers)]),
  };
}

// Per-level product table: monthly top-N products (ranked free-agnostic),
// emitted split by free flag so the client can filter and re-rank exactly.
async function fetchTable(level) {
  const cfg = {
    acq: ['acquisition_product_name', 'acq_free', 'acquisition_net_sales_usd', 'TRUE'],
    second: ['second_product_name', 'second_free', 'second_net_sales_usd', 'second_product_name IS NOT NULL'],
    third: ['third_product_name', 'third_free', 'third_net_sales_usd', 'third_product_name IS NOT NULL'],
  }[level];
  const [prod, free, sales, notNull] = cfg;

  const rows = await q(`WITH ${BASE},
    scoped AS (SELECT * FROM base WHERE ${notNull}),
    tot AS (
      SELECT acquisition_month AS month, ${prod} AS product, COUNT(*) AS c
      FROM scoped GROUP BY 1, 2
    ),
    top AS (
      SELECT month, product FROM (
        SELECT month, product, ROW_NUMBER() OVER (PARTITION BY month ORDER BY c DESC) rk FROM tot
      ) WHERE rk <= ${TABLE_TOP_PER_MONTH}
    )
    SELECT s.acquisition_month AS month, s.${free} AS free, s.${prod} AS product,
           COUNT(*) AS customers, ROUND(SUM(s.${sales}), 2) AS net_sales
    FROM scoped s
    JOIN top ON top.month = s.acquisition_month AND top.product = s.${prod}
    GROUP BY 1, 2, 3`);

  return rows.map((r) => [r.month, num(r.free), r.product, num(r.customers), num(r.net_sales)]);
}

async function fetchPivot() {
  const metrics = await q(`WITH ${BASE},
    pool AS (
      SELECT acquisition_product_name FROM base
      WHERE acquisition_product_name IS NOT NULL
      GROUP BY 1 ORDER BY COUNT(*) DESC LIMIT ${PIVOT_ACQ_POOL}
    )
    SELECT b.acquisition_month AS month, b.acquisition_product_name AS acq,
           COUNT(*) AS customers,
           COUNTIF(b.second_product_name IS NOT NULL) AS with2nd,
           -- 6-mo repurchase restricted to eligible (>180 days tenure)
           COUNTIF(b.acquisition_date <= DATE_SUB(CURRENT_DATE(), INTERVAL 180 DAY)) AS elig6mo,
           COUNTIF(b.repurchased_within_180_days = 1 AND b.acquisition_date <= DATE_SUB(CURRENT_DATE(), INTERVAL 180 DAY)) AS rep180_elig,
           SUM(b.days_to_second_order) AS days_sum,
           COUNTIF(b.days_to_second_order IS NOT NULL) AS days_cnt,
           ROUND(SUM(b.acquisition_net_sales_usd), 2) AS net_sales
    FROM base b JOIN pool USING (acquisition_product_name)
    GROUP BY 1, 2`);

  // Named 2nd products per acq (top-N overall); everything else -> "Other 2nd products".
  // NULL 2nd (no repeat purchase) is emitted as the empty-string bucket.
  const second = await q(`WITH ${BASE},
    pool AS (
      SELECT acquisition_product_name FROM base
      WHERE acquisition_product_name IS NOT NULL
      GROUP BY 1 ORDER BY COUNT(*) DESC LIMIT ${PIVOT_ACQ_POOL}
    ),
    scoped AS (SELECT b.* FROM base b JOIN pool USING (acquisition_product_name)),
    named AS (
      SELECT acquisition_product_name, second_product_name FROM (
        SELECT acquisition_product_name, second_product_name,
               ROW_NUMBER() OVER (PARTITION BY acquisition_product_name ORDER BY COUNT(*) DESC) rk
        FROM scoped WHERE second_product_name IS NOT NULL
        GROUP BY 1, 2
      ) WHERE rk <= ${PIVOT_2ND_PER_ACQ}
    )
    SELECT s.acquisition_month AS month, s.acquisition_product_name AS acq,
      CASE
        WHEN s.second_product_name IS NULL THEN ''
        WHEN n.second_product_name IS NOT NULL THEN s.second_product_name
        ELSE 'Other 2nd products'
      END AS bucket,
      COUNT(*) AS customers
    FROM scoped s
    LEFT JOIN named n
      ON n.acquisition_product_name = s.acquisition_product_name
     AND n.second_product_name = s.second_product_name
    GROUP BY 1, 2, 3`);

  return {
    metrics: metrics.map((r) => [
      r.month, r.acq, num(r.customers), num(r.with2nd), num(r.rep180_elig), num(r.elig6mo),
      num(r.days_sum), num(r.days_cnt), num(r.net_sales),
    ]),
    second: second.map((r) => [r.month, r.acq, r.bucket, num(r.customers)]),
  };
}

async function main() {
  console.log('Baking Bellesa product journey from BigQuery...');

  const monthOptions = (
    await q(`WITH ${BASE}
      SELECT DISTINCT acquisition_month AS m FROM base ORDER BY m DESC`)
  ).map((r) => r.m);

  const windows = {};
  for (const [key, n] of Object.entries(WINDOWS)) {
    console.log(`  window ${key} ...`);
    windows[key] = await fetchWindow(n);
  }

  console.log('  tables ...');
  const tables = {
    columns: {
      acq: ['month', 'free', 'product', 'customers', 'netSales'],
      second: ['month', 'free', 'product', 'customers', 'netSales'],
      third: ['month', 'free', 'product', 'customers', 'netSales'],
    },
    acq: await fetchTable('acq'),
    second: await fetchTable('second'),
    third: await fetchTable('third'),
  };

  console.log('  pivot ...');
  const pivot = await fetchPivot();

  const out = {
    meta: {
      generatedAt: new Date().toISOString(),
      source: 'insightsprod.bellesaenterprises_5719_prod_presentation.customer_product_purchase_journey',
      currentMonthExcluded: true,
      anchor: 'acquisition_month (cohort)',
      grain: 'true-new customer (each customer\'s first-ever acquisition; reactivations dropped)',
      platformScope: 'ALL platforms (Shopify + Amazon Seller Central). Journey table has no platform field so it cannot be Shopify-scoped. Reconciles to customer_value_summary all-platform.',
      dedupe: 'first acquisition_date per customer_id, ties by latest _last_updated',
      caps: {
        sankeyAcqPool: SANKEY_ACQ_POOL,
        sankey2ndPool: SANKEY_2ND_POOL,
        tableTopPerMonth: TABLE_TOP_PER_MONTH,
        pivotAcqPool: PIVOT_ACQ_POOL,
        pivot2ndPerAcq: PIVOT_2ND_PER_ACQ,
      },
      schema: {
        'windows.node1': ['product', 'free(0/1)', 'customers'],
        'windows.link12': ['acqProduct', 'acqFree', 'secondProduct', 'secondFree', 'customers'],
        'windows.link23': ['secondProduct', 'secondFree', 'thirdProduct', 'thirdFree', 'customers'],
        'pivot.metrics': ['month', 'acq', 'customers', 'with2nd', 'rep180Elig', 'elig6mo', 'daysSum', 'daysCnt', 'netSales'],
        'pivot.second': ['month', 'acq', 'bucket("" = no 2nd)', 'customers'],
      },
    },
    monthOptions,
    windows,
    tables,
    pivot,
  };

  fs.writeFileSync(OUT, JSON.stringify(out));
  const kb = (fs.statSync(OUT).size / 1024).toFixed(0);
  console.log(`Wrote ${OUT} (${kb} KB). Months: ${monthOptions.length}.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
