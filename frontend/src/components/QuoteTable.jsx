import ChangeBadge from './ChangeBadge'
import PriceSparkline from './PriceSparkline'

function QuoteTable({ stocks, lastUpdated }) {
  return (
    <section className="market-board" aria-label="Live watchlist">
      <div className="board-heading">
        <div>
          <p className="eyebrow">Watchlist</p>
          <h2>Quotes</h2>
        </div>
        <span>{lastUpdated ? `${lastUpdated.toLocaleTimeString()} updated` : 'Waiting'}</span>
      </div>

      <div className="quote-table">
        <div className="quote-header">
          <span>Symbol</span>
          <span>Market</span>
          <span>Price</span>
          <span>Change</span>
          <span>Trend</span>
        </div>

        {stocks.map((stock) => (
          <div className="quote-row" key={stock.symbol}>
            <div className="symbol-cell">
              <strong>{stock.symbol}</strong>
              <span>{stock.name}</span>
            </div>
            <span>{stock.market}</span>
            <strong>${stock.price.toFixed(2)}</strong>
            <ChangeBadge value={stock.changePercent} />
            <PriceSparkline changePercent={stock.changePercent} symbol={stock.symbol} compact />
          </div>
        ))}

        {stocks.length === 0 ? <p className="empty-message">No matching stocks.</p> : null}
      </div>
    </section>
  )
}

export default QuoteTable
