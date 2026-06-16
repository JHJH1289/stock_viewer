import { useEffect, useMemo, useState } from 'react'
import './App.css'

type ApiHealth = {
  status: string
  checkedAt: string
}

type StockSnapshot = {
  symbol: string
  name: string
  price: number
  changePercent: number
  market: string
}

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api'

function App() {
  const [health, setHealth] = useState<ApiHealth | null>(null)
  const [stocks, setStocks] = useState<StockSnapshot[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const [healthResponse, stocksResponse] = await Promise.all([
          fetch(`${apiBaseUrl}/health`),
          fetch(`${apiBaseUrl}/stocks/watchlist`),
        ])

        if (!healthResponse.ok || !stocksResponse.ok) {
          throw new Error('API 응답을 확인할 수 없습니다.')
        }

        setHealth(await healthResponse.json())
        setStocks(await stocksResponse.json())
        setError('')
      } catch (err) {
        setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.')
      }
    }

    loadDashboard()
  }, [])

  const marketTone = useMemo(() => {
    if (stocks.length === 0) return '대기'
    const gainers = stocks.filter((stock) => stock.changePercent >= 0).length
    return gainers >= stocks.length / 2 ? '상승 우세' : '하락 우세'
  }, [stocks])

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Stock Viewer</p>
          <h1>관심 종목 모니터링</h1>
        </div>
        <div className="status-pill" aria-live="polite">
          <span className={health?.status === 'UP' ? 'status-dot is-up' : 'status-dot'} />
          API {health?.status ?? '확인 중'}
        </div>
      </header>

      <section className="summary-grid" aria-label="시장 요약">
        <article>
          <span>시장 분위기</span>
          <strong>{marketTone}</strong>
        </article>
        <article>
          <span>관심 종목</span>
          <strong>{stocks.length}</strong>
        </article>
        <article>
          <span>최근 확인</span>
          <strong>{health ? new Date(health.checkedAt).toLocaleTimeString() : '-'}</strong>
        </article>
      </section>

      {error ? <p className="error-message">{error}</p> : null}

      <section className="watchlist" aria-label="관심 종목 목록">
        <div className="table-header">
          <span>종목</span>
          <span>시장</span>
          <span>가격</span>
          <span>등락률</span>
        </div>
        {stocks.map((stock) => (
          <div className="stock-row" key={stock.symbol}>
            <div>
              <strong>{stock.symbol}</strong>
              <span>{stock.name}</span>
            </div>
            <span>{stock.market}</span>
            <span>${stock.price.toFixed(2)}</span>
            <span className={stock.changePercent >= 0 ? 'change positive' : 'change negative'}>
              {stock.changePercent >= 0 ? '+' : ''}
              {stock.changePercent.toFixed(2)}%
            </span>
          </div>
        ))}
      </section>
    </main>
  )
}

export default App
