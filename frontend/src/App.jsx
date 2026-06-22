import { useEffect, useMemo, useState } from 'react'
import { Route, Routes } from 'react-router-dom'
import AccountSummaryPanel from './components/AccountSummaryPanel'
import AppHeader from './components/AppHeader'
import AuthModal from './components/AuthModal'
import MarketControls from './components/MarketControls'
import MarketBoardSlots from './components/MarketBoardSlots'
import PostDetailPage from './components/PostDetailPage'
import QuoteTable from './components/QuoteTable'
import StockDetailPage from './components/StockDetailPage'
import StockSearchResults from './components/StockSearchResults'
import TickerStrip from './components/TickerStrip'
import MyPage from './components/MyPage'
import TradeModal from './components/TradeModal'
import { useMarketDashboard } from './hooks/useMarketDashboard'
import { useStockSearch } from './hooks/useStockSearch'
import { filterStocks, getTopMovers } from './utils/market'
import './App.css'

const refreshOptions = [30, 60, 120]
const landingLogoutWindowMs = 60 * 60 * 1000
const landingLogoutKey = 'stock-viewer-landing-logout-at'

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
            onThemeChange={() => setTheme((t) => (t === 'light' ? 'dark' : 'light'))}
          />
        }
      />
      <Route path="/mypage" element={<MyPage />} />
      <Route path="/posts/:postId" element={<PostDetailPage />} />
      <Route path="/:symbol" element={<StockDetailPage />} />
    </Routes>
  )
}

function DashboardPage({ theme, onThemeChange }) {
  const [query, setQuery] = useState('')
  const [direction, setDirection] = useState('all')
  const [refreshSeconds, setRefreshSeconds] = useState(30)
  const [authModal, setAuthModal] = useState(null)
  const [currentUser, setCurrentUser] = useState(getLandingCurrentUser)
  const [tradeTarget, setTradeTarget] = useState(null)
  const [portfolioKey, setPortfolioKey] = useState(0)

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

  const handleBuy = (stock) => setTradeTarget({ stock, mode: 'buy' })
  const handleSell = (holding) => {
    const live = stocks.find((stock) => stock.symbol === holding.symbol)
    const currency = holding.marketCode === 'KRX' ? 'KRW' : 'USD'
    const stock = live ?? {
      symbol: holding.symbol,
      name: holding.stockName,
      price: holding.avgBuyPrice,
      currency,
      market: holding.marketCode,
    }
    setTradeTarget({ stock, mode: 'sell' })
  }

  return (
    <main className="app-shell">
      <AppHeader
        health={health}
        integrations={integrations}
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
      <AccountSummaryPanel
        isLoggedIn={!!currentUser}
        refreshKey={portfolioKey}
        stocks={stocks}
        onSell={handleSell}
      />
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
      <QuoteTable
        stocks={filteredStocks}
        lastUpdated={lastUpdated}
        isLoggedIn={!!currentUser}
        onBuy={handleBuy}
      />
      <MarketBoardSlots />

      {authModal ? (
        <AuthModal
          mode={authModal}
          onClose={() => setAuthModal(null)}
          onModeChange={setAuthModal}
          onAuthSuccess={(data) => {
            window.localStorage.setItem('token', data.token)
            window.localStorage.setItem('username', data.username)
            setCurrentUser({ username: data.username })
          }}
        />
      ) : null}

      {tradeTarget && (
        <TradeModal
          stock={tradeTarget.stock}
          mode={tradeTarget.mode}
          onClose={() => setTradeTarget(null)}
          onSuccess={() => setPortfolioKey(k => k + 1)}
        />
      )}
    </main>
  )
}

function getLandingCurrentUser() {
  const lastLogoutAt = Number(window.localStorage.getItem(landingLogoutKey) ?? 0)
  const shouldResetLogin = !lastLogoutAt || Date.now() - lastLogoutAt > landingLogoutWindowMs

  if (shouldResetLogin) {
    window.localStorage.removeItem('token')
    window.localStorage.removeItem('username')
    window.localStorage.setItem(landingLogoutKey, String(Date.now()))
    return null
  }

  const token = window.localStorage.getItem('token')
  const username = window.localStorage.getItem('username')
  return token && username ? { username } : null
}

export default App
