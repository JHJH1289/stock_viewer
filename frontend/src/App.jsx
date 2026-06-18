import { useEffect, useMemo, useState } from 'react'
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
  const [theme, setTheme] = useState(() => window.localStorage.getItem('stock-viewer-theme') ?? 'light')

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    window.localStorage.setItem('stock-viewer-theme', theme)
  }, [theme])

  return (
    <Routes>
      <Route
        path="/"
        element={
          <DashboardPage
            theme={theme}
            onThemeChange={() => setTheme((currentTheme) => (currentTheme === 'light' ? 'dark' : 'light'))}
          />
        }
      />
      <Route path="/:symbol" element={<StockDetailPage />} />
    </Routes>
  )
}

function DashboardPage({ theme, onThemeChange }) {
  const [query, setQuery] = useState('')
  const [direction, setDirection] = useState('all')
  const [refreshSeconds, setRefreshSeconds] = useState(30)
  const [authModal, setAuthModal] = useState(null)
  const [currentUser, setCurrentUser] = useState(() => {
    const username = window.localStorage.getItem('username')
    return username ? { username } : null
  })
  const {
    health,
    integrations,
    stocks,
    lastUpdated,
    isLoading,
    error,
    refresh,
  } = useMarketDashboard({ refreshSeconds })
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
      <AppHeader
        health={health}
        isLoading={isLoading}
        theme={theme}
        onRefresh={refresh}
        onThemeChange={onThemeChange}
        currentUser={currentUser}
        onLoginClick={() => setAuthModal('login')}
        onSignupClick={() => setAuthModal('signup')}
        onLogout={() => {
          window.localStorage.removeItem('token')
          window.localStorage.removeItem('username')
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
      {authModal ? (
        <AuthModal
          mode={authModal}
          onClose={() => setAuthModal(null)}
          onModeChange={setAuthModal}
          onAuthSuccess={(data) => setCurrentUser({ username: data.username })}
        />
      ) : null}
    </main>
  )
}

export default App
