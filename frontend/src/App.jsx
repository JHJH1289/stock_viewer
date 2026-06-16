import { useEffect, useMemo, useState } from 'react'
import './App.css'

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api'

function App() {
  const [health, setHealth] = useState(null)
  const [integrations, setIntegrations] = useState(null)
  const [stocks, setStocks] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const [healthResponse, integrationResponse, stocksResponse] = await Promise.all([
          fetch(`${apiBaseUrl}/health`),
          fetch(`${apiBaseUrl}/integrations/status`),
          fetch(`${apiBaseUrl}/stocks/watchlist`),
        ])

        if (!healthResponse.ok || !integrationResponse.ok || !stocksResponse.ok) {
          throw new Error('API response check failed.')
        }

        setHealth(await healthResponse.json())
        setIntegrations(await integrationResponse.json())
        setStocks(await stocksResponse.json())
        setError('')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error occurred.')
      }
    }

    loadDashboard()
  }, [])

  const marketTone = useMemo(() => {
    if (stocks.length === 0) return 'Waiting'
    const gainers = stocks.filter((stock) => stock.changePercent >= 0).length
    return gainers >= stocks.length / 2 ? 'Mostly Up' : 'Mostly Down'
  }, [stocks])

  const configuredCount = integrations?.checks.filter((check) => check.configured).length ?? 0
  const integrationCount = integrations?.checks.length ?? 0

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Stock Viewer</p>
          <h1>Market Monitoring</h1>
        </div>
        <div className="status-pill" aria-live="polite">
          <span className={health?.status === 'UP' ? 'status-dot is-up' : 'status-dot'} />
          API {health?.status ?? 'Checking'}
        </div>
      </header>

      <section className="summary-grid" aria-label="Dashboard summary">
        <article>
          <span>Market Tone</span>
          <strong>{marketTone}</strong>
        </article>
        <article>
          <span>Watchlist</span>
          <strong>{stocks.length}</strong>
        </article>
        <article>
          <span>API Keys</span>
          <strong>
            {configuredCount}/{integrationCount || '-'}
          </strong>
        </article>
      </section>

      {error ? <p className="error-message">{error}</p> : null}

      <section className="integration-panel" aria-label="Integration key status">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Backend Env</p>
            <h2>Key Load Check</h2>
          </div>
          <span>{integrations ? new Date(integrations.checkedAt).toLocaleTimeString() : '-'}</span>
        </div>
        <div className="integration-list">
          {integrations?.checks.map((check) => (
            <div className="integration-row" key={check.name}>
              <span className={check.configured ? 'status-dot is-up' : 'status-dot'} />
              <strong>{check.name}</strong>
              <span>{check.configured ? 'Loaded' : 'Missing'}</span>
            </div>
          )) ?? <p className="empty-message">Checking backend env keys...</p>}
        </div>
      </section>

      <section className="watchlist" aria-label="Watchlist">
        <div className="table-header">
          <span>Symbol</span>
          <span>Market</span>
          <span>Price</span>
          <span>Change</span>
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
