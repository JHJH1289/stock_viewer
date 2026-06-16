export function filterStocks(stocks, query, direction) {
  const keyword = query.trim().toLowerCase()

  return stocks.filter((stock) => {
    const matchesKeyword =
      stock.symbol.toLowerCase().includes(keyword) || stock.name.toLowerCase().includes(keyword)
    const matchesDirection =
      direction === 'all' ||
      (direction === 'up' && stock.changePercent >= 0) ||
      (direction === 'down' && stock.changePercent < 0)

    return matchesKeyword && matchesDirection
  })
}

export function getTopMovers(stocks) {
  return [...stocks]
    .sort((first, second) => Math.abs(second.changePercent) - Math.abs(first.changePercent))
    .slice(0, 3)
}

export function getMarketSummary(stocks) {
  const gainers = stocks.filter((stock) => stock.changePercent >= 0).length
  const losers = stocks.length - gainers
  const averageMove =
    stocks.length === 0
      ? 0
      : stocks.reduce((sum, stock) => sum + stock.changePercent, 0) / stocks.length

  return {
    gainers,
    losers,
    averageMove,
    tone: gainers >= losers ? 'Mostly Up' : 'Mostly Down',
  }
}

export function getIntegrationCount(integrations) {
  const configuredCount = integrations?.checks.filter((check) => check.configured).length ?? 0
  const integrationCount = integrations?.checks.length ?? 0

  return {
    configuredCount,
    integrationCount,
  }
}

export function formatPercent(value) {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`
}

export function formatPrice(value, currency = 'USD') {
  const locale = currency === 'KRW' ? 'ko-KR' : 'en-US'

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: currency === 'KRW' ? 0 : 2,
  }).format(value)
}

export function getPrimaryStockLabel(stock) {
  return stock.name
}

export function getSecondaryStockLabel(stock) {
  return stock.symbol
}
