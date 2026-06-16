import { formatPercent } from '../utils/market'

function SummaryGrid({ marketSummary, configuredCount, integrationCount }) {
  return (
    <section className="summary-grid" aria-label="Market summary">
      <article>
        <span>Market Tone</span>
        <strong>{marketSummary.tone}</strong>
      </article>
      <article>
        <span>Up / Down</span>
        <strong>
          {marketSummary.gainers} / {marketSummary.losers}
        </strong>
      </article>
      <article>
        <span>Average Move</span>
        <strong className={marketSummary.averageMove >= 0 ? 'metric-up' : 'metric-down'}>
          {formatPercent(marketSummary.averageMove)}
        </strong>
      </article>
      <article>
        <span>API Keys</span>
        <strong>
          {configuredCount}/{integrationCount || '-'}
        </strong>
      </article>
    </section>
  )
}

export default SummaryGrid
