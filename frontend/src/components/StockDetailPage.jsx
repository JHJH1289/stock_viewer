import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import ChangeBadge from './ChangeBadge'
import DetailPriceChart from './DetailPriceChart'
import { fetchStockHistory, fetchStockQuote } from '../services/stockApi'
import { formatPercent, formatPrice } from '../utils/market'

function StockDetailPage() {
  const { symbol = '' } = useParams()
  const [quote, setQuote] = useState(null)
  const [history, setHistory] = useState(null)
  const [historyRange, setHistoryRange] = useState('1d')
  const [isLoading, setIsLoading] = useState(true)
  const [isHistoryLoading, setIsHistoryLoading] = useState(false)
  const [error, setError] = useState('')
  const [historyError, setHistoryError] = useState('')
  const timestamp = formatDetailTimestamp(new Date())

  useEffect(() => {
    document.body.classList.add('is-detail-page')

    return () => {
      document.body.classList.remove('is-detail-page')
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    async function loadQuote() {
      setIsLoading(true)
      setHistory(null)
      setHistoryError('')

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

  useEffect(() => {
    if (!quote) return

    let cancelled = false

    async function loadHistory() {
      setIsHistoryLoading(true)

      try {
        const nextHistory = await fetchStockHistory(quote.symbol, historyRange)
        if (cancelled) return

        setHistory(nextHistory)
        setHistoryError('')
      } catch (err) {
        if (cancelled) return
        setHistory(null)
        setHistoryError(
          quote.currency === 'KRW'
            ? err instanceof Error
              ? err.message
              : 'Unable to load stock history.'
            : '\uD604\uC7AC \uD55C\uAD6D \uC8FC\uC2DD\uB9CC \uCC28\uD2B8 \uC870\uD68C\uB97C \uC9C0\uC6D0\uD569\uB2C8\uB2E4.',
        )
      } finally {
        if (!cancelled) {
          setIsHistoryLoading(false)
        }
      }
    }

    loadHistory()

    return () => {
      cancelled = true
    }
  }, [quote, historyRange])

  return (
    <main className="app-shell">
      <header className="detail-header is-compact">
        <Link className="back-link" to="/">
          Back
        </Link>
      </header>

      {isLoading ? <p className="empty-message">Loading stock detail...</p> : null}
      {error ? <p className="error-message">{error}</p> : null}

      {quote ? (
        <section className="detail-market-page">
          <div className="detail-stock-heading">
            <div className="detail-logo">{quote.symbol.slice(0, 2).toUpperCase()}</div>
            <div>
              <h1>{quote.name}</h1>
              <span>{`${quote.market}: ${quote.symbol}`}</span>
            </div>
          </div>

          <div className="detail-price-row">
            <strong>{formatPrice(quote.price, quote.currency)}</strong>
            <span>{quote.currency}</span>
            <ChangeBadge value={quote.changePercent} />
            <b>{`${formatPercent(quote.changePercent)} \uC804\uC77C \uB300\uBE44`}</b>
          </div>

          <p className="detail-timestamp">{timestamp} GMT+9</p>
          <DetailPriceChart
            quote={quote}
            history={history}
            range={historyRange}
            isLoading={isHistoryLoading}
            error={historyError}
            onRangeChange={setHistoryRange}
          />
        </section>
      ) : null}
    </main>
  )
}

function formatDetailTimestamp(date) {
  const period = date.getHours() < 12 ? '\uC624\uC804' : '\uC624\uD6C4'
  const hour = date.getHours() <= 12 ? date.getHours() : date.getHours() - 12
  const minute = String(date.getMinutes()).padStart(2, '0')

  return `${date.getMonth() + 1}\uC6D4 ${date.getDate()}\uC77C ${period} ${hour}:${minute}`
}

export default StockDetailPage
