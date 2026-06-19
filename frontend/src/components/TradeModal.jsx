import { useEffect, useState } from 'react'
import { buyStock, fetchBalance, sellStock } from '../services/stockApi'
import { formatPrice } from '../utils/market'

const MARKET_CODE_MAP = {
  KRX: 'KRX',
  NASDAQ: 'NASDAQ',
  NYSE: 'NYSE',
  'NYSE ARCA': 'NYSE_ARCA',
  NYSE_ARCA: 'NYSE_ARCA',
  'NYSE AMERICAN': 'NYSE_ARCA',
  NYSE_AMERICAN: 'NYSE_ARCA',
  'CBOE BZX': 'CBOE_BZX',
  CBOE_BZX: 'CBOE_BZX',
}

function TradeModal({ stock, mode: initialMode, onClose, onSuccess }) {
  const [mode, setMode] = useState(initialMode ?? 'buy')
  const [quantity, setQuantity] = useState(1)
  const [balance, setBalance] = useState(null)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const price = Number(stock.price)
  const currency = stock.currency
  const marketCode = MARKET_CODE_MAP[stock.market] ?? stock.market
  const total = price * quantity

  const availableBalance = balance
    ? (currency === 'KRW' ? balance.krwAmount : balance.usdAmount)
    : null

  useEffect(() => {
    fetchBalance().then(setBalance).catch(() => {})
  }, [])

  useEffect(() => {
    const handleKey = (event) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      if (mode === 'buy') {
        await buyStock({ symbol: stock.symbol, stockName: stock.name, marketCode, quantity, price })
      } else {
        await sellStock({ symbol: stock.symbol, marketCode, quantity, price })
      }
      onSuccess?.()
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={event => event.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2>{stock.name}</h2>
            <span style={{ color: 'var(--muted)', fontSize: 13 }}>{stock.symbol} / {stock.market}</span>
          </div>
          <button className="modal-close" type="button" onClick={onClose} aria-label="닫기">x</button>
        </div>

        <div className="trade-mode-tabs">
          <button
            type="button"
            className={`trade-tab buy-tab${mode === 'buy' ? ' is-active' : ''}`}
            onClick={() => { setMode('buy'); setError('') }}
          >
            매수
          </button>
          <button
            type="button"
            className={`trade-tab sell-tab${mode === 'sell' ? ' is-active' : ''}`}
            onClick={() => { setMode('sell'); setError('') }}
          >
            매도
          </button>
        </div>

        <form className="modal-form" onSubmit={handleSubmit}>
          <div className="trade-info-row">
            <span>현재가</span>
            <strong>{formatPrice(price, currency)}</strong>
          </div>
          {availableBalance !== null && (
            <div className="trade-info-row">
              <span>가용 잔고</span>
              <strong>{formatPrice(availableBalance, currency)}</strong>
            </div>
          )}

          <label className="form-field">
            <span>수량 (주)</span>
            <input
              type="number"
              min={1}
              value={quantity}
              onChange={event => setQuantity(Math.max(1, parseInt(event.target.value, 10) || 1))}
              required
            />
          </label>

          <div className="trade-info-row trade-total">
            <span>주문 총액</span>
            <strong>{formatPrice(total, currency)}</strong>
          </div>

          {error && <p className="modal-error">{error}</p>}

          <button
            className={`modal-submit${mode === 'sell' ? ' sell-submit' : ''}`}
            type="submit"
            disabled={isLoading}
          >
            {isLoading ? '처리 중...' : (mode === 'buy' ? '매수 주문' : '매도 주문')}
          </button>
        </form>
      </div>
    </div>
  )
}

export default TradeModal
