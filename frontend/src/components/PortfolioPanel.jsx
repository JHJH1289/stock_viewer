import { useEffect, useState } from 'react'
import { fetchBalance, fetchHoldings, fetchTradeOrders } from '../services/stockApi'
import { formatPrice } from '../utils/market'

function calcChange(holding, stocks) {
  const live = stocks.find(s => s.symbol === holding.symbol)
  if (!live || live.price == null) return null
  const avgBuy = Number(holding.avgBuyPrice)
  const qty = Number(holding.quantity)
  const amount = (live.price - avgBuy) * qty
  const pct = avgBuy > 0 ? ((live.price - avgBuy) / avgBuy) * 100 : 0
  return { currentPrice: live.price, amount, pct, currency: live.currency }
}

function ChangePill({ pct }) {
  if (pct == null) return <span className="holding-change is-neutral">-</span>
  const cls = pct > 0 ? 'is-positive' : pct < 0 ? 'is-negative' : 'is-neutral'
  const sign = pct > 0 ? '+' : ''
  return <span className={`holding-change ${cls}`}>{sign}{pct.toFixed(2)}%</span>
}

function PortfolioPanel({ refreshKey, onSell, stocks = [] }) {
  const [balance, setBalance] = useState(null)
  const [holdings, setHoldings] = useState([])
  const [orders, setOrders] = useState([])
  const [showOrders, setShowOrders] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchBalance()
      .then(data => { setBalance(data); setError('') })
      .catch(e => setError(e.message))
    fetchHoldings().then(setHoldings).catch(() => {})
    fetchTradeOrders().then(setOrders).catch(() => {})
  }, [refreshKey])

  const holdingsWithChange = holdings.map(h => ({
    ...h,
    change: calcChange(h, stocks),
  }))

  const totalPnl = holdingsWithChange.reduce((sum, h) => {
    return h.change ? sum + h.change.amount : sum
  }, 0)

  return (
    <section className="portfolio-panel">
      <div className="board-heading">
        <div>
          <p className="eyebrow">My Portfolio</p>
          <h2>계좌</h2>
        </div>
        {holdings.length > 0 && (
          <span className={`portfolio-total-pnl ${totalPnl >= 0 ? 'is-positive' : 'is-negative'}`}>
            총 평가손익&nbsp;
            <strong>{totalPnl >= 0 ? '+' : ''}{totalPnl.toLocaleString('ko-KR', { maximumFractionDigits: 0 })}</strong>
          </span>
        )}
      </div>

      {error && <p className="modal-error" style={{ margin: '12px 18px 0' }}>{error}</p>}

      <div className="balance-cards">
        <div className="balance-card">
          <span>KRW 잔고</span>
          <strong>{balance ? formatPrice(balance.krwAmount, 'KRW') : '-'}</strong>
        </div>
        <div className="balance-card">
          <span>USD 잔고</span>
          <strong>{balance ? formatPrice(balance.usdAmount, 'USD') : '-'}</strong>
        </div>
      </div>

      <div className="portfolio-section">
        <h3 className="portfolio-subheading">보유 종목</h3>
        {holdingsWithChange.length === 0 ? (
          <p className="empty-message" style={{ padding: '14px 18px' }}>보유 종목이 없습니다.</p>
        ) : (
          <div className="portfolio-table">
            <div className="portfolio-header holding-cols">
              <span>종목</span>
              <span>수량</span>
              <span>평균 매수가</span>
              <span>현재가</span>
              <span>평가손익</span>
              <span></span>
            </div>
            {holdingsWithChange.map(h => {
              const currency = h.marketCode === 'KRX' ? 'KRW' : 'USD'
              return (
                <div className="portfolio-row holding-cols" key={h.symbol}>
                  <div className="holding-name">
                    <strong>{h.symbol}</strong>
                    <span>{h.stockName}</span>
                  </div>
                  <span>{Number(h.quantity).toLocaleString()}</span>
                  <span>{formatPrice(h.avgBuyPrice, currency)}</span>
                  <div className="holding-price-cell">
                    <span>{h.change ? formatPrice(h.change.currentPrice, currency) : '-'}</span>
                    <ChangePill pct={h.change?.pct} />
                  </div>
                  <div className="holding-pnl-cell">
                    {h.change ? (
                      <span className={h.change.amount >= 0 ? 'pnl-positive' : 'pnl-negative'}>
                        {h.change.amount >= 0 ? '+' : ''}
                        {formatPrice(h.change.amount, h.change.currency)}
                      </span>
                    ) : <span className="holding-change is-neutral">-</span>}
                  </div>
                  <button className="trade-action-btn sell-btn" type="button" onClick={() => onSell(h)}>
                    매도
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="portfolio-section">
        <button className="orders-toggle" type="button" onClick={() => setShowOrders(v => !v)}>
          거래 내역 ({orders.length}건) {showOrders ? '▲' : '▼'}
        </button>
        {showOrders && (
          orders.length === 0 ? (
            <p className="empty-message" style={{ padding: '14px 18px' }}>거래 내역이 없습니다.</p>
          ) : (
            <div className="portfolio-table">
              <div className="portfolio-header order-cols">
                <span>종목</span>
                <span>구분</span>
                <span>수량</span>
                <span>체결가</span>
                <span>총액</span>
                <span>일시</span>
              </div>
              {orders.map(o => (
                <div className="portfolio-row order-cols" key={o.orderId}>
                  <span>{o.symbol}</span>
                  <span className={o.orderType === 'BUY' ? 'order-type-buy' : 'order-type-sell'}>
                    {o.orderType === 'BUY' ? '매수' : '매도'}
                  </span>
                  <span>{Number(o.quantity).toLocaleString()}</span>
                  <span>{formatPrice(o.price, o.currency)}</span>
                  <span>{formatPrice(o.totalAmount, o.currency)}</span>
                  <span>{new Date(o.createdAt).toLocaleString('ko-KR')}</span>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </section>
  )
}

export default PortfolioPanel