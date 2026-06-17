import { useMemo } from 'react'
import AppHeader from './AppHeader'
import IntegrationStatusList from './IntegrationStatusList'
import MarketControls from './MarketControls'
import QuoteTable from './QuoteTable'
import StockSearchResults from './StockSearchResults'
import TickerStrip from './TickerStrip'
import { useStockSearch } from '../hooks/useStockSearch'
import { filterStocks, getTopMovers } from '../utils/market'

function DashboardView({
  health,
  integrations,
  stocks,
  lastUpdated,
  isLoading,
  error,
  query,
  direction,
  refreshSeconds,
  refreshOptions,
  onRefresh,
  onQueryChange,
  onDirectionChange,
  onRefreshSecondsChange,
}) {
  const filteredStocks = useMemo(() => filterStocks(stocks, query, direction), [stocks, query, direction])
  const topMovers = useMemo(() => getTopMovers(stocks), [stocks])
  const {
    results: searchResults,
    quotes: searchQuotes,
    isSearching,
    isLoadingQuotes,
    searchError,
  } = useStockSearch(query)

  return (
    <main className="app-shell">
      <AppHeader health={health} isLoading={isLoading} onRefresh={onRefresh} />
      <TickerStrip stocks={topMovers} />
      <IntegrationStatusList integrations={integrations} />
      <MarketControls
        query={query}
        direction={direction}
        refreshSeconds={refreshSeconds}
        refreshOptions={refreshOptions}
        onQueryChange={onQueryChange}
        onDirectionChange={onDirectionChange}
        onRefreshSecondsChange={onRefreshSecondsChange}
      />
      {error ? <p className="error-message">{error}</p> : null}
      <StockSearchResults
        query={query}
        results={searchResults}
        quotes={searchQuotes}
        isSearching={isSearching}
        isLoadingQuotes={isLoadingQuotes}
        error={searchError}
      />
      <QuoteTable stocks={filteredStocks} lastUpdated={lastUpdated} />
    </main>
  )
}

export default DashboardView
