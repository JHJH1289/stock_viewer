import { useState } from 'react'
import DashboardView from './components/DashboardView'
import MarketDataLoader from './components/MarketDataLoader'
import './App.css'

const refreshOptions = [5, 10, 30]

function App() {
  const [query, setQuery] = useState('')
  const [direction, setDirection] = useState('all')
  const [refreshSeconds, setRefreshSeconds] = useState(5)

  return (
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
  )
}

export default App
