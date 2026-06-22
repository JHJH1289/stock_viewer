import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import PortfolioAiSummaryPanel from './PortfolioAiSummaryPanel'
import StockLink from './StockLink'
import { fetchBalance, fetchHoldings, fetchStockQuote } from '../services/stockApi'
import { formatPrice } from '../utils/market'

const pieColors = ['#2563eb', '#059669', '#dc2626', '#f59e0b', '#7c3aed', '#0891b2', '#db2777', '#475569']

function MyPage() {
  const isLoggedIn = Boolean(window.localStorage.getItem('token'))
  const [balance, setBalance] = useState(null)
  const [holdings, setHoldings] = useState([])
  const [quotes, setQuotes] = useState({})
  const [isLoading, setIsLoading] = useState(isLoggedIn)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isLoggedIn) {
      return
    }

    let cancelled = false

    async function loadPortfolio() {
      setIsLoading(true)
      try {
        const [nextBalance, nextHoldings] = await Promise.all([fetchBalance(), fetchHoldings()])
        if (cancelled) return

        const quotePairs = await Promise.all(
          nextHoldings.map(async (holding) => {
            try {
              const quote = await fetchStockQuote(holding.symbol)
              return [holding.symbol, quote]
            } catch {
              return [holding.symbol, null]
            }
          }),
        )

        if (cancelled) return
        setBalance(nextBalance)
        setHoldings(nextHoldings)
        setQuotes(Object.fromEntries(quotePairs))
        setError('')
      } catch (err) {
        if (cancelled) return
        setBalance(null)
        setHoldings([])
        setQuotes({})
        setError(err instanceof Error ? err.message : '마이페이지 정보를 불러오지 못했습니다.')
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    loadPortfolio()

    return () => {
      cancelled = true
    }
  }, [isLoggedIn])

  const rows = useMemo(() => {
    return holdings.map((holding) => {
      const quote = quotes[holding.symbol]
      const currency = holding.marketCode === 'KRX' ? 'KRW' : 'USD'
      const quantity = Number(holding.quantity)
      const avgBuyPrice = Number(holding.avgBuyPrice)
      const currentPrice = Number(quote?.price ?? avgBuyPrice)
      const costValue = avgBuyPrice * quantity
      const currentValue = currentPrice * quantity
      const pnl = currentValue - costValue
      const pnlPercent = costValue > 0 ? (pnl / costValue) * 100 : 0

      return {
        ...holding,
        currency: quote?.currency ?? currency,
        currentPrice,
        costValue,
        currentValue,
        pnl,
        pnlPercent,
      }
    })
  }, [holdings, quotes])

  const totalValue = rows.reduce((sum, row) => sum + row.currentValue, 0)
  const totalPnl = rows.reduce((sum, row) => sum + row.pnl, 0)
  const pieSlices = buildPieSlices(rows, totalValue)

  return (
    <main className="app-shell">
      <header className="detail-header is-compact">
        <Link className="back-link" to="/">
          Back
        </Link>
      </header>

      <section className="mypage-shell" aria-label="My page">
        <div className="mypage-heading">
          <div>
            <p className="eyebrow">My Page</p>
            <h1>내 포트폴리오</h1>
          </div>
          <span>{isLoggedIn ? '가상 계좌 연결됨' : '로그인 필요'}</span>
        </div>

        {!isLoggedIn ? (
          <p className="mypage-state">로그인하면 보유 종목과 수익률을 확인할 수 있습니다.</p>
        ) : null}
        {isLoading ? <p className="mypage-state">포트폴리오를 불러오는 중입니다.</p> : null}
        {error ? <p className="mypage-state is-error">{error}</p> : null}

        {isLoggedIn && !isLoading && !error ? (
          <>
            <div className="mypage-summary-grid">
              <SummaryCard label="KRW 잔고" value={balance ? formatPrice(balance.krwAmount, 'KRW') : '-'} />
              <SummaryCard label="USD 잔고" value={balance ? formatPrice(balance.usdAmount, 'USD') : '-'} />
              <SummaryCard label="보유 종목" value={`${rows.length}개`} />
              <SummaryCard
                label="총 평가 손익"
                value={`${totalPnl >= 0 ? '+' : ''}${formatCompactMoney(totalPnl)}`}
                tone={totalPnl >= 0 ? 'positive' : 'negative'}
              />
            </div>

            <PortfolioAiSummaryPanel balance={balance} rows={rows} />

            <section className="mypage-portfolio-grid">
              <div className="mypage-card">
                <div className="mypage-card-heading">
                  <h2>보유 비중</h2>
                  <span>현재가 기준</span>
                </div>
                {rows.length === 0 ? (
                  <p className="mypage-state">보유 종목이 없습니다.</p>
                ) : (
                  <div className="allocation-layout">
                    <div className="allocation-pie" style={{ '--pie': pieSlices.gradient }}>
                      <strong>{rows.length}</strong>
                      <span>종목</span>
                    </div>
                    <div className="allocation-list">
                      {pieSlices.items.map((item) => (
                        <div className="allocation-item" key={item.symbol}>
                          <i style={{ background: item.color }} />
                          <span>
                            {item.stockName}
                            <small>{item.symbol}</small>
                          </span>
                          <strong>{item.percent.toFixed(1)}%</strong>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="mypage-card">
                <div className="mypage-card-heading">
                  <h2>보유 주식 현황</h2>
                  <span>매수가 대비</span>
                </div>
                {rows.length === 0 ? (
                  <p className="mypage-state">보유 종목이 없습니다.</p>
                ) : (
                  <div className="mypage-holdings-table">
                    <div className="mypage-holding-row is-header">
                      <span>종목</span>
                      <span>수량</span>
                      <span>매수가</span>
                      <span>현재가</span>
                      <span>가격차</span>
                      <span>평가손익</span>
                    </div>
                    {rows.map((row) => (
                      <div className="mypage-holding-row" key={`${row.marketCode}-${row.symbol}`}>
                        <StockLink className="mypage-holding-link" symbol={row.symbol}>
                          {row.stockName}
                          <small>{row.symbol}</small>
                        </StockLink>
                        <span>{Number(row.quantity).toLocaleString()}</span>
                        <span>{formatPrice(row.avgBuyPrice, row.currency)}</span>
                        <span>{formatPrice(row.currentPrice, row.currency)}</span>
                        <span className={row.pnl >= 0 ? 'mypage-positive' : 'mypage-negative'}>
                          {formatPrice(row.currentPrice - Number(row.avgBuyPrice), row.currency)}
                        </span>
                        <span className={row.pnl >= 0 ? 'mypage-positive' : 'mypage-negative'}>
                          {row.pnl >= 0 ? '+' : ''}
                          {formatPrice(row.pnl, row.currency)}
                          <small>
                            {row.pnlPercent >= 0 ? '+' : ''}
                            {row.pnlPercent.toFixed(2)}%
                          </small>
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </>
        ) : null}
      </section>
    </main>
  )
}

function SummaryCard({ label, value, tone = '' }) {
  return (
    <div className={`mypage-summary-card${tone ? ` is-${tone}` : ''}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function buildPieSlices(rows, totalValue) {
  if (rows.length === 0 || totalValue <= 0) {
    return { gradient: '#e5e7eb 0 100%', items: [] }
  }

  let cursor = 0
  const items = rows.map((row, index) => {
    const percent = (row.currentValue / totalValue) * 100
    const start = cursor
    const end = cursor + percent
    cursor = end
    return {
      symbol: row.symbol,
      stockName: row.stockName,
      color: pieColors[index % pieColors.length],
      percent,
      segment: `${pieColors[index % pieColors.length]} ${start}% ${end}%`,
    }
  })

  return {
    gradient: items.map((item) => item.segment).join(', '),
    items,
  }
}

function formatCompactMoney(value) {
  return Math.round(value).toLocaleString('ko-KR')
}

export default MyPage
