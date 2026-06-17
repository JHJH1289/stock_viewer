import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import ChangeBadge from './ChangeBadge'
import DetailPriceChart from './DetailPriceChart'
import { fetchStockQuote } from '../services/stockApi'
import { formatPrice } from '../utils/market'

function StockDetailPage() {
  const { symbol = '' } = useParams()
  const [quote, setQuote] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function loadQuote() {
      setIsLoading(true)
      try {
        const nextQuote = await fetchStockQuote(symbol)
        if (cancelled) return

        setQuote(nextQuote)
        setError('')
      } catch (err) {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Unable to load stock detail.')
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    loadQuote()

    return () => {
      cancelled = true
    }
  }, [symbol])

  return (
    <main className="app-shell">
      <header className="detail-header">
        <Link className="back-link" to="/">
          Back
        </Link>
        <div>
          <p className="eyebrow">Stock Detail</p>
          <h1>{quote?.name ?? symbol.toUpperCase()}</h1>
          <span>{quote?.symbol ?? symbol.toUpperCase()}</span>
        </div>
      </header>

      {isLoading ? <p className="empty-message">Loading stock detail...</p> : null}
      {error ? <p className="error-message">{error}</p> : null}

      {quote ? (
        <section className="detail-panel">
          <div className="detail-price">
            <span>Current Price</span>
            <strong>{formatPrice(quote.price, quote.currency)}</strong>
            <ChangeBadge value={quote.changePercent} />
          </div>
          <DetailPriceChart quote={quote} />
          <dl className="detail-list">
            <div>
              <dt>Symbol</dt>
              <dd>{quote.symbol}</dd>
            </div>
            <div>
              <dt>Market</dt>
              <dd>{quote.market}</dd>
            </div>
            <div>
              <dt>Currency</dt>
              <dd>{quote.currency}</dd>
            </div>
          </dl>
        </section>
      ) : null}
    </main>
  )
}

export default StockDetailPage
