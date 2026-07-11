# Bellesa · Product Purchase Journey

An aesthetic, static React dashboard that visualises how Bellesa customers move
from their **acquisition product** to their **2nd** and **3rd** purchases.

**Live:** https://anunay-saras.github.io/bellesa-product-journey/

## What it shows

- **KPI tiles** — customers acquired, repurchase rate, 6-month repurchase rate, acquisition net sales (per acquisition window).
- **Product Purchase Journey (Sankey)** — top 15 acquisition products → their top 2nd purchase → top 3rd purchase, with an independent *free-product* filter above each level and a product search. Hover any node to trace its flow.
- **Product Performance Tables** — top 20 products at each step (orders, net sales, AOV) with a cohort-month filter and a per-level free filter.
- **Acquisition → 2nd Purchase Pivot** — top 15 acquisition products with repurchase behaviour, the count of customers who **never made a 2nd purchase**, and an expandable breakdown of which 2nd products they bought.

## Data & logic

Source: `insightsprod.bellesaenterprises_5719_prod_presentation.customer_product_purchase_journey`
(grain: one row per customer per acquisition event).

Modelling rules baked into [`fetch-data.js`](fetch-data.js):

| Rule | Detail |
|------|--------|
| **Dedup** | Pipeline re-runs are collapsed by keeping the latest `_last_updated` per `(customer_id, acquisition_date)`. A customer with two genuinely different acquisition dates stays as two acquisition events. |
| **Current month** | The partial current calendar month is excluded everywhere. |
| **Time anchor** | Everything is sliced by the customer's **acquisition-cohort month**. The 2nd/3rd tables describe how a given cohort behaved next, not the calendar month the later order landed in. |
| **Windows** | 6M / 12M / 24M are trailing full-month cohort windows (default 12M). |
| **Orders** | One order per purchase level per customer, so `orders == customers`; AOV is derived from net sales ÷ customers. |
| **Free filter** | Per level: All / Paid / Free, on `*_is_free_product`. |

Top-N caps (kept generous so displayed top lists are exact) are documented in
`baked-data.json → meta.caps`.

**No PII** ever leaves BigQuery — only aggregated counts and sums are baked.

## How it runs

The site is fully static (GitHub Pages). A Node script queries BigQuery and bakes
`src/baked-data.json`; the React app renders that file with all filtering done
client-side. A GitHub Action re-bakes and redeploys **daily**.

### Local development

```bash
npm install

# bake fresh data (needs a service-account key with insightsprod read access)
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/sa-key.json
npm run fetch-data

npm start          # dev server at http://localhost:3000/bellesa-product-journey
npm run build      # production build
npm run deploy     # publish build/ to the gh-pages branch
```

### Daily refresh (CI)

[`.github/workflows/daily-refresh.yml`](.github/workflows/daily-refresh.yml) runs at
**09:00 UTC** daily (and on manual dispatch). It reads the service-account JSON from
the `GCP_SA_KEY` repo secret, re-bakes the data, commits it, and publishes the build
to `gh-pages`.

To set the secret:

```bash
gh secret set GCP_SA_KEY < /path/to/sa-key.json
```
