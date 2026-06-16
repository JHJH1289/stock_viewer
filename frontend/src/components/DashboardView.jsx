import { useMemo } from 'react'
import AppHeader from './AppHeader'
import MarketControls from './MarketControls'
import QuoteTable from './QuoteTable'
import SummaryGrid from './SummaryGrid'
import TickerStrip from './TickerStrip'
import { filterStocks, getIntegrationCount, getMarketSummary, getTopMovers } from '../utils/market'

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
  const marketSummary = useMemo(() => getMarketSummary(stocks), [stocks])
  const { configuredCount, integrationCount } = getIntegrationCount(integrations)

  return (
    <main className="app-shell">
      <AppHeader health={health} isLoading={isLoading} onRefresh={onRefresh} />
      <TickerStrip stocks={topMovers} />
      <SummaryGrid
        marketSummary={marketSummary}
        configuredCount={configuredCount}
        integrationCount={integrationCount}
      />
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
      <QuoteTable stocks={filteredStocks} lastUpdated={lastUpdated} />
    </main>
  )
}

export default DashboardView
