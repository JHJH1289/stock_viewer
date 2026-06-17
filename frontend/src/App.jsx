import { useMemo, useState } from 'react'
import { Route, Routes } from 'react-router-dom'
import AppHeader from './components/AppHeader'
import AuthModal from './components/AuthModal'
import IntegrationStatusList from './components/IntegrationStatusList'
import MarketControls from './components/MarketControls'
import QuoteTable from './components/QuoteTable'
import StockSearchResults from './components/StockSearchResults'
import StockDetailPage from './components/StockDetailPage'
import TickerStrip from './components/TickerStrip'
import { useMarketDashboard } from './hooks/useMarketDashboard'
import { useStockSearch } from './hooks/useStockSearch'
import { filterStocks, getTopMovers } from './utils/market'
import './App.css'

const refreshOptions = [30, 60, 120]

function App() {
  return (
    <Routes>
      <Route path="/" element={<DashboardPage />} />
      <Route path="/:symbol" element={<StockDetailPage />} />
    </Routes>
  )
}

function DashboardPage() {
  const [query, setQuery] = useState('')
  const [direction, setDirection] = useState('all')
  const [refreshSeconds, setRefreshSeconds] = useState(30)
  const [authModal, setAuthModal] = useState(null) // null | 'login' | 'signup'
  const [currentUser, setCurrentUser] = useState(() => {
    const username = localStorage.getItem('username')
    return username ? { username } : null
  })

  const {
    health, integrations, stocks, lastUpdated, isLoading, error, refresh,
  } = useMarketDashboard({ refreshSeconds })

  const filteredStocks = useMemo(() => filterStocks(stocks, query, direction), [stocks, query, direction])
  const topMovers = useMemo(() => getTopMovers(stocks), [stocks])
  const {
    results: searchResults, quotes: searchQuotes,
    isSearching, isLoadingQuotes, searchError,
  } = useStockSearch(query)

  return (
    <main className="app-shell">
      <AppHeader
        health={health}
        isLoading={isLoading}
        onRefresh={refresh}
        onLoginClick={() => setAuthModal('login')}
        onSignupClick={() => setAuthModal('signup')}
        currentUser={currentUser}
        onLogout={() => {
          localStorage.removeItem('token')
          localStorage.removeItem('username')
          setCurrentUser(null)
        }}
      />
      <TickerStrip stocks={topMovers} />
      <IntegrationStatusList integrations={integrations} />
      <MarketControls
        query={query}
        direction={direction}
        refreshSeconds={refreshSeconds}
        refreshOptions={refreshOptions}
        onQueryChange={setQuery}
        onDirectionChange={setDirection}
        onRefreshSecondsChange={setRefreshSeconds}
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

      {authModal && (
        <AuthModal
          mode={authModal}
          onClose={() => setAuthModal(null)}
          onModeChange={setAuthModal}
          onAuthSuccess={(data) => setCurrentUser({ username: data.username })}
        />
      )}
    </main>
  )
}

export default App