import { useState } from 'react'
import { Route, Routes } from 'react-router-dom'
import DashboardView from './components/DashboardView'
import MarketDataLoader from './components/MarketDataLoader'
import StockDetailPage from './components/StockDetailPage'
import './App.css'

const refreshOptions = [30, 60, 120]

function App() {
  const [query, setQuery] = useState('')
  const [direction, setDirection] = useState('all')
  const [refreshSeconds, setRefreshSeconds] = useState(30)

  return (
    <Routes>
      <Route
        path="/"
        element={
          <MarketDataLoader refreshSeconds={refreshSeconds}>
            {(dashboard) => (
              <DashboardView
                {...dashboard}
                query={query}
                direction={direction}
                refreshSeconds={refreshSeconds}
                refreshOptions={refreshOptions}
                onRefresh={dashboard.refresh}
                onQueryChange={setQuery}
                onDirectionChange={setDirection}
                onRefreshSecondsChange={setRefreshSeconds}
              />
            )}
          </MarketDataLoader>
        }
      />
      <Route path="/:symbol" element={<StockDetailPage />} />
    </Routes>
  )
}

export default App
