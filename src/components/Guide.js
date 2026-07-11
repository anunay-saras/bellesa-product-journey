import React from 'react';
import './Guide.css';

export default function Guide({ generated, monthCount }) {
  return (
    <div className="guide">
      <section className="card guide-intro">
        <h2 className="guide-h1">How to read this dashboard</h2>
        <p>
          This dashboard follows Bellesa customers from the <b>first product they ever bought</b>
          {' '}(their “acquisition”) through the products they bought next. Every customer is counted
          once, by that first purchase. Use it to see which products bring customers in, and what
          those customers go on to buy.
        </p>
      </section>

      <section className="card">
        <h3 className="guide-h2">The views</h3>
        <div className="guide-grid">
          <div className="guide-item">
            <span className="guide-ico ic-a">🔀</span>
            <div>
              <div className="guide-item-title">Product Purchase Journey (the flow diagram)</div>
              <p>
                Click any <b>acquisition product</b> to see the top products those customers bought
                as their <b>2nd</b> purchase, then click a 2nd product to see their <b>3rd</b>. The
                number on each product is how many customers followed that exact path.
              </p>
            </div>
          </div>
          <div className="guide-item">
            <span className="guide-ico ic-b">📊</span>
            <div>
              <div className="guide-item-title">Product Performance Tables</div>
              <p>
                The top 20 products at each step (1st, 2nd, 3rd purchase) with the number of orders
                and the net sales they generated, for the acquisition period you pick.
              </p>
            </div>
          </div>
          <div className="guide-item">
            <span className="guide-ico ic-c">🧭</span>
            <div>
              <div className="guide-item-title">Acquisition → 2nd Purchase Pivot</div>
              <p>
                For each top acquisition product: how many customers came back for a 2nd purchase,
                what they bought, and — importantly — <b>how many never made a 2nd purchase</b>.
                Click a row to expand the full 2nd-product mix.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="card">
        <h3 className="guide-h2">What each number means</h3>
        <dl className="guide-defs">
          <div>
            <dt>Customers acquired</dt>
            <dd>New customers in the selected period, counted by their first-ever purchase (all sales channels).</dd>
          </div>
          <div>
            <dt>Repurchase rate</dt>
            <dd>Of those customers, the share who ever made a 2nd purchase.</dd>
          </div>
          <div>
            <dt>6-month repurchase</dt>
            <dd>
              The share who bought again <b>within 180 days</b> of their first order. To be fair, this
              only counts customers who have <b>been around at least 180 days</b> — someone who bought
              last month hasn’t had a full 6-month window yet, so they’re left out of this one.
            </dd>
          </div>
          <div>
            <dt>Acquisition net sales</dt>
            <dd>Net sales from customers’ first (acquisition) order — not their lifetime spend.</dd>
          </div>
          <div>
            <dt>Orders / Net sales (tables)</dt>
            <dd>Number of customers who had that product at that step, and the net sales it generated.</dd>
          </div>
        </dl>
      </section>

      <section className="card">
        <h3 className="guide-h2">Filters</h3>
        <div className="guide-grid">
          <div className="guide-item">
            <span className="guide-ico ic-a">📅</span>
            <div>
              <div className="guide-item-title">Time period</div>
              <p>
                The <b>6M / 12M / 24M</b> switch (flow diagram &amp; KPIs) and the <b>cohort-month</b>
                {' '}dropdown (tables &amp; pivot) pick <i>when customers were acquired</i>. Default is the
                last 12 complete months; the current, unfinished month is always excluded.
              </p>
            </div>
          </div>
          <div className="guide-item">
            <span className="guide-ico ic-b">🎁</span>
            <div>
              <div className="guide-item-title">Free-product filter (All / Paid / Free)</div>
              <p>
                Each step has its own toggle. <b>Free products</b> are giveaways and gift claims
                (recorded as $0 items) — not paid purchases. Use <b>Paid</b> to focus on real
                purchases, <b>Free</b> to look only at gifts, or <b>All</b> to include everything.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="card guide-foot-card">
        <h3 className="guide-h2">Good to know</h3>
        <ul className="guide-list">
          <li>Everything is sliced by <b>when the customer was acquired</b>, so a period shows that group of new customers and what they did next.</li>
          <li>Covers <b>all sales channels</b> (Shopify + Amazon). A Shopify-only view would be slightly smaller.</li>
          <li>Data refreshes <b>automatically every day</b> (last refresh: {generated}). {monthCount} complete months of history are available in the month picker.</li>
          <li>The “6-month repurchase” counts any repeat order within 180 days, including free/gift orders — so it reads a little higher than finance’s stricter “paid repurchase” definition.</li>
        </ul>
      </section>
    </div>
  );
}
