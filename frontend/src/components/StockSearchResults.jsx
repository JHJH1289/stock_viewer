function StockSearchResults({ query, results, isSearching, error }) {
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
          <span>Symbol</span>
          <span>Name</span>
          <span>Country</span>
          <span>Exchange</span>
          <span>Currency</span>
          <span>Corp Code</span>
        </div>

        {results.map((stock) => (
          <div className="master-row" key={`${stock.country}-${stock.symbol}`}>
            <strong>{stock.symbol}</strong>
            <span>{stock.name}</span>
            <span>{stock.country}</span>
            <span>{stock.exchange}</span>
            <span>{stock.currency}</span>
            <span>{stock.corpCode || '-'}</span>
          </div>
        ))}

        {!isSearching && results.length === 0 ? (
          <p className="empty-message">No matching stocks in stock master.</p>
        ) : null}
      </div>
    </section>
  )
}

export default StockSearchResults
