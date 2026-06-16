import ChangeBadge from './ChangeBadge'
import PriceSparkline from './PriceSparkline'

function TickerStrip({ stocks }) {
  return (
    <section className="ticker-strip" aria-label="Top movers">
      {stocks.map((stock) => (
        <article className="ticker-card" key={stock.symbol}>
          <div>
            <strong>{stock.symbol}</strong>
            <span>{stock.name}</span>
          </div>
          <PriceSparkline changePercent={stock.changePercent} symbol={stock.symbol} />
          <div className="ticker-price">
            <strong>${stock.price.toFixed(2)}</strong>
            <ChangeBadge value={stock.changePercent} />
          </div>
        </article>
      ))}
    </section>
  )
}

export default TickerStrip
