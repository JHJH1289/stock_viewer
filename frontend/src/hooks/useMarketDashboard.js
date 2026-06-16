import { useCallback, useEffect, useState } from 'react'
import { fetchMarketDashboard } from '../services/stockApi'

export function useMarketDashboard({ refreshSeconds }) {
  const [health, setHealth] = useState(null)
  const [integrations, setIntegrations] = useState(null)
  const [stocks, setStocks] = useState([])
  const [lastUpdated, setLastUpdated] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    setIsLoading(true)

    try {
      const dashboard = await fetchMarketDashboard()
      setHealth(dashboard.health)
      setIntegrations(dashboard.integrations)
      setStocks(dashboard.stocks)
      setLastUpdated(dashboard.loadedAt)
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    const initialLoadId = window.setTimeout(refresh, 0)
    return () => window.clearTimeout(initialLoadId)
  }, [refresh])

  useEffect(() => {
    const timerId = window.setInterval(refresh, refreshSeconds * 1000)
    return () => window.clearInterval(timerId)
  }, [refresh, refreshSeconds])

  return {
    health,
    integrations,
    stocks,
    lastUpdated,
    isLoading,
    error,
    refresh,
  }
}
