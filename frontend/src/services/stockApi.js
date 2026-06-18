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

export async function fetchStockQuotes(stocks) {
  const response = await fetch(`${apiBaseUrl}/stocks/quotes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(
      stocks.map((stock) => ({
        symbol: stock.symbol,
        name: stock.name,
        country: stock.country,
        exchange: stock.exchange,
      })),
    ),
  })

  if (!response.ok) {
    throw new Error('Unable to load stock quotes.')
  }

  return response.json()
}

export async function fetchStockQuote(symbol) {
  const response = await fetch(`${apiBaseUrl}/stocks/quote/${encodeURIComponent(symbol)}`)

  if (!response.ok) {
    throw new Error('Unable to load stock quote.')
  }

  return response.json()
}

export async function fetchStockHistory(symbol, range = '1mo') {
  const params = new URLSearchParams({ range })
  const response = await fetch(`${apiBaseUrl}/stocks/history/${encodeURIComponent(symbol)}?${params.toString()}`)

  if (!response.ok) {
    throw new Error('Unable to load stock history.')
  }

  return response.json()
}
