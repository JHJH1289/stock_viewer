import ChangeBadge from './ChangeBadge'
import PriceSparkline from './PriceSparkline'
import StockLink from './StockLink'
import { formatPrice, getPrimaryStockLabel, getSecondaryStockLabel } from '../utils/market'

function TickerStrip({ stocks }) {
  return (
    <section className="ticker-strip" aria-label="Top movers">
      {stocks.map((stock) => (
        <article className="ticker-card" key={stock.symbol}>
          <div>
            <StockLink className="stock-text-link" symbol={stock.symbol}>
              <strong>{getPrimaryStockLabel(stock)}</strong>
              <span>{getSecondaryStockLabel(stock)}</span>
            </StockLink>
          </div>
          <StockLink className="sparkline-link" symbol={stock.symbol} ariaLabel={`${stock.name} detail`}>
            <PriceSparkline changePercent={stock.changePercent} symbol={stock.symbol} />
          </StockLink>
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
