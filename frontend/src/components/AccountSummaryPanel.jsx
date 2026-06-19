import { useEffect, useState } from 'react'
import { fetchBalance, fetchHoldings, fetchTradeOrders } from '../services/stockApi'
import { formatPrice } from '../utils/market'

function AccountSummaryPanel({ isLoggedIn, refreshKey, stocks = [], onSell }) {
  const [balance, setBalance] = useState(null)
  const [holdings, setHoldings] = useState([])
  const [orders, setOrders] = useState([])
  const [isHoldingsOpen, setIsHoldingsOpen] = useState(true)
  const [isOrdersOpen, setIsOrdersOpen] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isLoggedIn) {
      return
    }

    let cancelled = false

    Promise.all([fetchBalance(), fetchHoldings(), fetchTradeOrders()])
      .then(([nextBalance, nextHoldings, nextOrders]) => {
        if (cancelled) return
        setBalance(nextBalance)
        setHoldings(nextHoldings)
        setOrders(nextOrders)
        setError('')
      })
      .catch((err) => {
        if (cancelled) return
        setBalance(null)
        setHoldings([])
        setOrders([])
        setError(err.message)
      })

    return () => {
      cancelled = true
    }
  }, [isLoggedIn, refreshKey])

  return (
    <section className="top-summary-card" aria-label="Account summary">
      <div className="top-summary-heading">
        <div>
          <p className="eyebrow">Account</p>
          <h2>계좌 정보</h2>
        </div>
        <span className={isLoggedIn ? 'summary-badge is-up' : 'summary-badge'}>
          {isLoggedIn ? '연결됨' : '로그인 필요'}
        </span>
      </div>

      {isLoggedIn && error ? <p className="account-summary-error">{error}</p> : null}

      <div className="account-summary-balances">
        <div>
          <span>KRW 잔고</span>
          <strong>{isLoggedIn && balance ? formatPrice(balance.krwAmount, 'KRW') : '-'}</strong>
        </div>
        <div>
          <span>USD 잔고</span>
          <strong>{isLoggedIn && balance ? formatPrice(balance.usdAmount, 'USD') : '-'}</strong>
        </div>
      </div>

      <div className="account-orders">
        <button
          className="account-orders-toggle"
          type="button"
          aria-expanded={isHoldingsOpen}
          onClick={() => setIsHoldingsOpen((isOpen) => !isOpen)}
        >
          <span>보유 종목</span>
          <b>{isLoggedIn ? `${holdings.length}개 ${isHoldingsOpen ? '접기' : '보기'}` : '로그인 필요'}</b>
        </button>
        {isHoldingsOpen ? (
          !isLoggedIn ? (
            <p className="account-orders-empty">로그인하면 보유 종목을 확인할 수 있습니다.</p>
          ) : holdings.length === 0 ? (
            <p className="account-orders-empty">보유 종목이 없습니다.</p>
          ) : (
            <div className="account-holdings-table">
              <div className="account-holdings-row is-header">
                <span>종목</span>
                <span>수량</span>
                <span>평균가</span>
                <span>현재가</span>
                <span></span>
              </div>
              {holdings.map((holding) => {
                const live = stocks.find((stock) => stock.symbol === holding.symbol)
                const currency = holding.marketCode === 'KRX' ? 'KRW' : 'USD'
                return (
                  <div className="account-holdings-row" key={`${holding.marketCode}-${holding.symbol}`}>
                    <strong>
                      {holding.symbol}
                      <small>{holding.stockName}</small>
                    </strong>
                    <span>{Number(holding.quantity).toLocaleString()}</span>
                    <span>{formatPrice(holding.avgBuyPrice, currency)}</span>
                    <span>{live ? formatPrice(live.price, live.currency ?? currency) : '-'}</span>
                    <button type="button" onClick={() => onSell?.(holding)}>
                      매도
                    </button>
                  </div>
                )
              })}
            </div>
          )
        ) : null}
      </div>

      <div className="account-orders">
        <button
          className="account-orders-toggle"
          type="button"
          aria-expanded={isOrdersOpen}
          onClick={() => setIsOrdersOpen((isOpen) => !isOpen)}
        >
          <span>거래 기록</span>
          <b>{isLoggedIn ? `${orders.length}건 ${isOrdersOpen ? '접기' : '보기'}` : '로그인 필요'}</b>
        </button>
        {isOrdersOpen ? (
          !isLoggedIn ? (
            <p className="account-orders-empty">로그인하면 거래 기록을 확인할 수 있습니다.</p>
          ) : orders.length === 0 ? (
            <p className="account-orders-empty">거래 기록이 없습니다.</p>
          ) : (
            <div className="account-orders-table">
              <div className="account-orders-row is-header">
                <span>종목</span>
                <span>구분</span>
                <span>수량</span>
                <span>체결가</span>
                <span>총액</span>
                <span>일시</span>
              </div>
              {orders.slice(0, 5).map((order) => (
                <div className="account-orders-row" key={order.orderId}>
                  <strong>{order.symbol}</strong>
                  <span className={order.orderType === 'BUY' ? 'order-type-buy' : 'order-type-sell'}>
                    {order.orderType === 'BUY' ? '매수' : '매도'}
                  </span>
                  <span>{Number(order.quantity).toLocaleString()}</span>
                  <span>{formatPrice(order.price, order.currency)}</span>
                  <span>{formatPrice(order.totalAmount, order.currency)}</span>
                  <span>{new Date(order.createdAt).toLocaleString('ko-KR')}</span>
                </div>
              ))}
            </div>
          )
        ) : null}
      </div>
    </section>
  )
}

export default AccountSummaryPanel
