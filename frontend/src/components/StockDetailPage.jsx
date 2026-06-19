import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import ChangeBadge from './ChangeBadge'
import DetailPriceChart from './DetailPriceChart'
import StockBoardPanel from './StockBoardPanel'
import StockNewsPanel from './StockNewsPanel'
import ValuationMetricsPanel from './ValuationMetricsPanel'
import { fetchStockHistory, fetchStockQuote, fetchValuationMetricsHistory } from '../services/stockApi'
import { formatPercent, formatPrice } from '../utils/market'

function StockDetailPage() {
  const { symbol = '' } = useParams()
  const [quote, setQuote] = useState(null)
  const [history, setHistory] = useState(null)
  const [historyRange, setHistoryRange] = useState('1d')
  const [isLoading, setIsLoading] = useState(true)
  const [isHistoryLoading, setIsHistoryLoading] = useState(false)
  const [valuationMetrics, setValuationMetrics] = useState(null)
  const [valuationHistory, setValuationHistory] = useState([])
  const [selectedValuationKey, setSelectedValuationKey] = useState('')
  const [error, setError] = useState('')
  const [historyError, setHistoryError] = useState('')
  const historyRetryKeysRef = useRef(new Set())
  const timestamp = formatDetailTimestamp(new Date())

  function handleValuationChange(nextKey) {
    setSelectedValuationKey(nextKey)
    setValuationMetrics(valuationHistory.find((item) => getValuationKey(item) === nextKey) ?? null)
  }

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
      setValuationMetrics(null)
      setValuationHistory([])
      setSelectedValuationKey('')
      setHistoryError('')

      try {
        const nextQuote = await fetchStockQuote(symbol)
        if (cancelled) return

        setQuote(nextQuote)
        setError('')
      } catch (err) {
        if (cancelled) return
        setError(err instanceof Error ? err.message : '주식 정보를 불러오지 못했습니다.')
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
    if (!quote || quote.currency !== 'KRW') return

    let cancelled = false

    async function loadValuationMetrics() {
      try {
        const nextHistory = await fetchValuationMetricsHistory(quote.symbol)
        if (!cancelled) {
          setValuationHistory(nextHistory)
          setValuationMetrics(nextHistory[0] ?? null)
          setSelectedValuationKey(nextHistory[0] ? getValuationKey(nextHistory[0]) : '')
        }
      } catch {
        if (!cancelled) {
          setValuationHistory([])
          setValuationMetrics(null)
          setSelectedValuationKey('')
        }
      }
    }

    loadValuationMetrics()

    return () => {
      cancelled = true
    }
  }, [quote])

  useEffect(() => {
    if (!quote) return

    let cancelled = false

    async function loadHistory() {
      setIsHistoryLoading(true)
      const retryKey = `${quote.symbol}:${historyRange}`

      try {
        const nextHistory = await fetchStockHistory(quote.symbol, historyRange)
        if (cancelled) return

        setHistory(nextHistory)
        setHistoryError('')
      } catch (err) {
        if (cancelled) return

        if (!historyRetryKeysRef.current.has(retryKey)) {
          historyRetryKeysRef.current.add(retryKey)
          await wait(700)
          if (cancelled) return

          try {
            const nextHistory = await fetchStockHistory(quote.symbol, historyRange)
            if (cancelled) return

            setHistory(nextHistory)
            setHistoryError('')
            return
          } catch (retryError) {
            if (cancelled) return
            setHistory(null)
            setHistoryError(retryError instanceof Error ? retryError.message : '차트 데이터를 불러오지 못했습니다.')
            return
          }
        }

        setHistory(null)
        setHistoryError(err instanceof Error ? err.message : '차트 데이터를 불러오지 못했습니다.')
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

      {isLoading ? (
        <div className="page-spinner-wrap">
          <div className="spinner" />
        </div>
      ) : null}
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
            <b>{`${formatPercent(quote.changePercent)} 전일 대비`}</b>
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
          <ValuationMetricsPanel
            metrics={valuationMetrics}
            metricsHistory={valuationHistory}
            selectedMetricsKey={selectedValuationKey}
            currency={quote.currency}
            onMetricsChange={handleValuationChange}
          />
          <section className="detail-news-board-section" aria-label="News and board">
            <StockNewsPanel query={`${quote.name} ${quote.symbol} 주식`} />
            <StockBoardPanel quote={quote} />
          </section>
        </section>
      ) : null}
    </main>
  )
}

function wait(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

function getValuationKey(metrics) {
  return `${metrics.year ?? '-'}|${metrics.fiscalDate ?? '-'}|${metrics.priceDate ?? '-'}`
}

function formatDetailTimestamp(date) {
  const period = date.getHours() < 12 ? '오전' : '오후'
  const hour = date.getHours() <= 12 ? date.getHours() : date.getHours() - 12
  const minute = String(date.getMinutes()).padStart(2, '0')

  return `${date.getMonth() + 1}월 ${date.getDate()}일 ${period} ${hour}:${minute}`
}

export default StockDetailPage
