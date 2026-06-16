const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api'

export async function fetchMarketDashboard() {
  const [healthResponse, integrationResponse, stocksResponse] = await Promise.all([
    fetch(`${apiBaseUrl}/health`),
    fetch(`${apiBaseUrl}/integrations/status`),
    fetch(`${apiBaseUrl}/stocks/watchlist`),
  ])

  if (!healthResponse.ok || !integrationResponse.ok || !stocksResponse.ok) {
    throw new Error('Unable to load market data.')
  }

  return {
    health: await healthResponse.json(),
    integrations: await integrationResponse.json(),
    stocks: await stocksResponse.json(),
    loadedAt: new Date(),
  }
}

export async function searchStockMaster(keyword, limit = 20) {
  const params = new URLSearchParams({
    keyword,
    limit: String(limit),
  })
  const response = await fetch(`${apiBaseUrl}/stocks/search?${params.toString()}`)

  if (!response.ok) {
    throw new Error('Unable to search stock master.')
  }

  return response.json()
}
