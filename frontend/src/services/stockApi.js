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

export async function fetchValuationMetrics(symbol) {
  const response = await fetch(`${apiBaseUrl}/stocks/valuation/${encodeURIComponent(symbol)}`)

  if (response.status === 404) {
    return null
  }

  if (!response.ok) {
    throw new Error('Unable to load valuation metrics.')
  }

  return response.json()
}

export async function fetchValuationMetricsHistory(symbol) {
  const response = await fetch(`${apiBaseUrl}/stocks/valuation/${encodeURIComponent(symbol)}/history`)

  if (response.status === 404) {
    const metrics = await fetchValuationMetrics(symbol)
    return metrics ? [metrics] : []
  }

  if (!response.ok) {
    const metrics = await fetchValuationMetrics(symbol)
    return metrics ? [metrics] : []
  }

  return response.json()
}

export async function signup({ username, email, password }) {
  const response = await fetch(`${apiBaseUrl}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, email, password }),
  })
  const data = await parseJsonResponse(response)

  if (!response.ok) {
    throw new Error(data.message ?? '회원가입에 실패했습니다.')
  }

  return data
}

export async function login({ email, password }) {
  const response = await fetch(`${apiBaseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  const data = await parseJsonResponse(response)

  if (!response.ok) {
    throw new Error(data.message ?? '로그인에 실패했습니다.')
  }

  return data
}

function authHeaders() {
  const token = window.localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export async function fetchBalance() {
  const response = await fetch(`${apiBaseUrl}/trading/balance`, {
    headers: authHeaders(),
  })
  if (!response.ok) {
    const data = await parseJsonResponse(response)
    throw new Error(data.message ?? '잔고를 불러오지 못했습니다.')
  }
  return response.json()
}

export async function fetchHoldings() {
  const response = await fetch(`${apiBaseUrl}/trading/holdings`, {
    headers: authHeaders(),
  })
  if (!response.ok) throw new Error('보유 종목을 불러오지 못했습니다.')
  return response.json()
}

export async function fetchTradeOrders() {
  const response = await fetch(`${apiBaseUrl}/trading/orders`, {
    headers: authHeaders(),
  })
  if (!response.ok) throw new Error('거래 내역을 불러오지 못했습니다.')
  return response.json()
}

export async function fetchBoardPosts({ page = 0, size = 5 } = {}) {
  const params = new URLSearchParams({
    page: String(page),
    size: String(size),
  })
  const response = await fetch(`${apiBaseUrl}/posts?${params.toString()}`)

  if (!response.ok) {
    throw new Error('게시글을 불러오지 못했습니다.')
  }

  return response.json()
}

export async function fetchMajorNews({ query = '주식 증권 코스피 나스닥', display = 8 } = {}) {
  const params = new URLSearchParams({
    query,
    display: String(display),
  })
  const response = await fetch(`${apiBaseUrl}/news/major?${params.toString()}`)
  const data = await parseJsonResponse(response)

  if (!response.ok) {
    throw new Error(data.message ?? '주요 뉴스를 불러오지 못했습니다.')
  }

  return data
}

export async function fetchStockBoardPosts(symbol) {
  const response = await fetch(`${apiBaseUrl}/posts/stock/${encodeURIComponent(symbol)}`)

  if (!response.ok) {
    throw new Error('종목 게시글을 불러오지 못했습니다.')
  }

  return response.json()
}

export async function fetchMarketBoardPosts(marketCode, { size = 5 } = {}) {
  const params = new URLSearchParams({
    size: String(size),
  })
  const response = await fetch(`${apiBaseUrl}/posts/markets/${encodeURIComponent(marketCode)}?${params.toString()}`)

  if (!response.ok) {
    throw new Error('시장 게시글을 불러오지 못했습니다.')
  }

  return response.json()
}

export async function fetchBoardPost(postId) {
  const response = await fetch(`${apiBaseUrl}/posts/${encodeURIComponent(postId)}`)

  if (!response.ok) {
    throw new Error('게시글을 불러오지 못했습니다.')
  }

  return response.json()
}

export async function createStockBoardPost(symbol, { title, content }) {
  const response = await fetch(`${apiBaseUrl}/posts/stock/${encodeURIComponent(symbol)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ title, content }),
  })
  const data = await parseJsonResponse(response)

  if (!response.ok) {
    throw new Error(data.message ?? '게시글 작성에 실패했습니다.')
  }

  return data
}

export async function fetchPostComments(postId) {
  const response = await fetch(`${apiBaseUrl}/posts/${encodeURIComponent(postId)}/comments`)

  if (!response.ok) {
    throw new Error('댓글을 불러오지 못했습니다.')
  }

  return response.json()
}

export async function createPostComment(postId, { content }) {
  const response = await fetch(`${apiBaseUrl}/posts/${encodeURIComponent(postId)}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ content }),
  })
  const data = await parseJsonResponse(response)

  if (!response.ok) {
    throw new Error(data.message ?? '댓글 작성에 실패했습니다.')
  }

  return data
}

export async function buyStock({ symbol, stockName, marketCode, quantity, price }) {
  const response = await fetch(`${apiBaseUrl}/trading/buy`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ symbol, stockName, marketCode, quantity, price }),
  })
  const data = await parseJsonResponse(response)
  if (!response.ok) throw new Error(data.message ?? '매수에 실패했습니다.')
  return data
}

export async function sellStock({ symbol, marketCode, quantity, price }) {
  const response = await fetch(`${apiBaseUrl}/trading/sell`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ symbol, marketCode, quantity, price }),
  })
  const data = await parseJsonResponse(response)
  if (!response.ok) throw new Error(data.message ?? '매도에 실패했습니다.')
  return data
}

async function parseJsonResponse(response) {
  try {
    return await response.json()
  } catch {
    return {}
  }
}
