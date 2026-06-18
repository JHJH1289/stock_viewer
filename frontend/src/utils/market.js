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
