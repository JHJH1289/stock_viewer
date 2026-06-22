import ChangeBadge from './ChangeBadge'
import StockLink from './StockLink'
import { formatPrice } from '../utils/market'

function StockSearchResults({ query, results, quotes, isSearching, isLoadingQuotes, error, isLoggedIn, onBuy }) {
  if (!query.trim()) {
    return null
  }

  return (
    <section className="search-results market-board" aria-label="Stock master search results">
        <div className="board-heading">
        <div>
          <p className="eyebrow">Stock Master</p>
          <h2>Search Results</h2>
        </div>
        <span>{isSearching ? 'Searching' : `${results.length} matches`}</span>
      </div>

      {error ? <p className="error-message is-inline">{error}</p> : null}

      <div className="master-table">
        <div className="master-header">
          <span>Name</span>
          <span>Symbol</span>
          <span>Price</span>
          <span>Change</span>
          <span>Country</span>
          <span>Exchange</span>
          <span>Currency</span>
          <span>Trade</span>
        </div>

        {results.map((stock) => {
          const quote = quotes[`${stock.country}-${stock.symbol}`]

          return (
            <div className="master-row" key={`${stock.country}-${stock.symbol}`}>
              <StockLink className="stock-text-link" symbol={stock.symbol}>
                <strong>{stock.name}</strong>
              </StockLink>
              <span>{stock.symbol}</span>
              <span>{quote ? formatPrice(quote.price, quote.currency) : isLoadingQuotes ? 'Loading' : '-'}</span>
              <span>{quote ? <ChangeBadge value={quote.changePercent} /> : '-'}</span>
              <span>{stock.country}</span>
              <span>{stock.exchange}</span>
              <span>{stock.currency}</span>
              {isLoggedIn && quote ? (
                <button className="trade-action-btn buy-btn" type="button" onClick={() => onBuy(toTradeStock(stock, quote))}>
                  매수
                </button>
              ) : (
                <span className="search-trade-state">{isLoggedIn ? '시세 대기' : '로그인 필요'}</span>
              )}
            </div>
          )
        })}

        {!isSearching && results.length === 0 ? (
          <p className="empty-message">No matching stocks in stock master.</p>
        ) : null}
      </div>
    </section>
  )
}

function toTradeStock(stock, quote) {
  return {
    symbol: stock.symbol,
    name: stock.name,
    market: quote.market ?? stock.exchange,
    price: quote.price,
    currency: quote.currency ?? stock.currency,
  }
}

export default StockSearchResults
