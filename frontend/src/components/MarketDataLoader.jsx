import { useMarketDashboard } from '../hooks/useMarketDashboard'

function MarketDataLoader({ refreshSeconds, children }) {
  const dashboard = useMarketDashboard({ refreshSeconds })
  return children(dashboard)
}

export default MarketDataLoader
