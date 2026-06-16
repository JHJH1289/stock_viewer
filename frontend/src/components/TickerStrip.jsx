import ChangeBadge from './ChangeBadge'
import PriceSparkline from './PriceSparkline'
import { formatPrice, getPrimaryStockLabel, getSecondaryStockLabel } from '../utils/market'

function TickerStrip({ stocks }) {
  return (
    <section className="ticker-strip" aria-label="Top movers">
      {stocks.map((stock) => (
        <article className="ticker-card" key={stock.symbol}>
          <div>
            <strong>{getPrimaryStockLabel(stock)}</strong>
            <span>{getSecondaryStockLabel(stock)}</span>
          </div>
          <PriceSparkline changePercent={stock.changePercent} symbol={stock.symbol} />
          <div className="ticker-price">
            <strong>{formatPrice(stock.price, stock.currency)}</strong>
            <ChangeBadge value={stock.changePercent} />
          </div>
        </article>
      ))}
    </section>
  )
}

export default TickerStrip
