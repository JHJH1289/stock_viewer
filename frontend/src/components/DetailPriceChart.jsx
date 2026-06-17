import { useMemo } from 'react'
import { formatPrice } from '../utils/market'

function DetailPriceChart({ quote }) {
  const chart = useMemo(() => createCandleChart(quote), [quote])

  return (
    <section className="detail-chart-panel" aria-label={`${quote.name} candle chart`}>
      <div className="detail-chart-heading">
        <div>
          <p className="eyebrow">Price Chart</p>
          <h2>Candles & Volume</h2>
        </div>
        <div className="detail-chart-legend" aria-label="chart legend">
          <span><i className="legend-dot is-ma-fast" />MA 5</span>
          <span><i className="legend-dot is-ma-slow" />MA 10</span>
          <span><i className="legend-dot is-volume" />VOL</span>
        </div>
      </div>

      <svg className="detail-chart" viewBox={`0 0 ${chart.width} ${chart.height}`} role="img">
        <title>{quote.symbol} candlestick chart</title>
        {chart.priceGridLines.map((line) => (
          <g key={line.y}>
            <line
              className="detail-chart-grid"
              x1={chart.padding.left}
              x2={chart.width - chart.padding.right}
              y1={line.y}
              y2={line.y}
            />
            <text className="detail-chart-label" x={chart.padding.left - 10} y={line.y + 4}>
              {formatCompactPrice(line.value, quote.currency)}
            </text>
          </g>
        ))}
        {chart.verticalGridLines.map((line) => (
          <line
            key={line.x}
            className="detail-chart-grid is-vertical"
            x1={line.x}
            x2={line.x}
            y1={chart.padding.top}
            y2={chart.volume.bottom}
          />
        ))}
        <line
          className="detail-chart-axis"
          x1={chart.padding.left}
          x2={chart.width - chart.padding.right}
          y1={chart.volume.top - 12}
          y2={chart.volume.top - 12}
        />

        {chart.maFastPath && <path className="moving-average is-fast" d={chart.maFastPath} />}
        {chart.maSlowPath && <path className="moving-average is-slow" d={chart.maSlowPath} />}

        {chart.candles.map((candle) => (
          <g key={candle.index}>
            <line
              className={`candle-wick ${candle.tone}`}
              x1={candle.x}
              x2={candle.x}
              y1={candle.highY}
              y2={candle.lowY}
            />
            <rect
              className={`candle-body ${candle.tone}`}
              x={candle.bodyX}
              y={candle.bodyY}
              width={candle.bodyWidth}
              height={candle.bodyHeight}
              rx="1.5"
            />
            <rect
              className={`volume-bar ${candle.tone}`}
              x={candle.volumeX}
              y={candle.volumeY}
              width={candle.volumeWidth}
              height={candle.volumeHeight}
              rx="1"
            />
          </g>
        ))}

        <text className="detail-chart-time" x={chart.padding.left} y={chart.height - 14}>
          Open
        </text>
        <text className="detail-chart-time is-end" x={chart.width - chart.padding.right} y={chart.height - 14}>
          Now
        </text>
      </svg>
    </section>
  )
}

function createCandleChart(quote) {
  const width = 760
  const height = 360
  const padding = {
    top: 22,
    right: 28,
    bottom: 32,
    left: 78,
  }
  const priceArea = {
    top: padding.top,
    bottom: 248,
  }
  const volume = {
    top: 272,
    bottom: height - padding.bottom,
  }
  const series = createCandleSeries(quote)
  const min = Math.min(...series.map((candle) => candle.low))
  const max = Math.max(...series.map((candle) => candle.high))
  const range = max - min || Math.max(Number(quote.price) * 0.01, 1)
  const maxVolume = Math.max(...series.map((candle) => candle.volume), 1)
  const drawableWidth = width - padding.left - padding.right
  const candleGap = drawableWidth / series.length
  const bodyWidth = Math.max(Math.min(candleGap * 0.52, 13), 5)

  const yForPrice = (value) => priceArea.top + ((max - value) / range) * (priceArea.bottom - priceArea.top)
  const xForIndex = (index) => padding.left + candleGap * index + candleGap / 2

  const candles = series.map((candle, index) => {
    const x = xForIndex(index)
    const openY = yForPrice(candle.open)
    const closeY = yForPrice(candle.close)
    const tone = candle.close >= candle.open ? 'is-up' : 'is-down'
    const volumeHeight = Math.max(((candle.volume / maxVolume) * (volume.bottom - volume.top)), 2)

    return {
      index,
      x,
      tone,
      bodyX: x - bodyWidth / 2,
      bodyY: Math.min(openY, closeY),
      bodyWidth,
      bodyHeight: Math.max(Math.abs(openY - closeY), 2),
      highY: yForPrice(candle.high),
      lowY: yForPrice(candle.low),
      volumeX: x - bodyWidth / 2,
      volumeY: volume.bottom - volumeHeight,
      volumeWidth: bodyWidth,
      volumeHeight,
    }
  })

  const priceGridLines = Array.from({ length: 5 }, (_, index) => {
    const value = min + (range / 4) * index
    return {
      value,
      y: yForPrice(value),
    }
  }).reverse()

  const verticalGridLines = Array.from({ length: 4 }, (_, index) => ({
    x: padding.left + (drawableWidth / 3) * index,
  }))

  return {
    width,
    height,
    padding,
    volume,
    candles,
    priceGridLines,
    verticalGridLines,
    maFastPath: createMovingAveragePath(series, 5, xForIndex, yForPrice),
    maSlowPath: createMovingAveragePath(series, 10, xForIndex, yForPrice),
  }
}

function createCandleSeries(quote) {
  const count = 34
  const seed = [...quote.symbol].reduce((sum, char) => sum + char.charCodeAt(0), 0)
  const lastPrice = Math.max(Number(quote.price) || 1, 0.01)
  const changePercent = Number(quote.changePercent) || 0
  const totalMove = lastPrice * (changePercent / 100)
  const firstClose = Math.max(lastPrice - totalMove, lastPrice * 0.92)
  const volatility = Math.max(Math.abs(totalMove) * 0.2, lastPrice * 0.006)

  let previousClose = firstClose

  return Array.from({ length: count }, (_, index) => {
    const progress = index / (count - 1)
    const target = firstClose + (lastPrice - firstClose) * progress
    const wave = Math.sin((seed + index) * 0.72) * volatility
    const drift = Math.cos((seed + index) * 0.31) * volatility * 0.65
    const open = previousClose
    const close = index === count - 1 ? lastPrice : Math.max(target + wave + drift, 0.01)
    const spread = Math.max(Math.abs(close - open) * 0.85, volatility * (0.65 + ((seed + index) % 5) * 0.12))
    const high = Math.max(open, close) + spread
    const low = Math.max(Math.min(open, close) - spread * 0.78, 0.01)
    const volume = Math.round(900 + Math.abs(close - open) * 90 + ((seed + index * 19) % 900))

    previousClose = close

    return {
      open,
      high,
      low,
      close,
      volume,
    }
  })
}

function createMovingAveragePath(series, windowSize, xForIndex, yForPrice) {
  const points = series
    .map((_, index) => {
      if (index < windowSize - 1) {
        return null
      }

      const window = series.slice(index - windowSize + 1, index + 1)
      const average = window.reduce((sum, candle) => sum + candle.close, 0) / windowSize

      return {
        x: xForIndex(index),
        y: yForPrice(average),
      }
    })
    .filter(Boolean)

  return points.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x},${point.y}`).join(' ')
}

function formatCompactPrice(value, currency) {
  if (currency === 'KRW') {
    return `${Math.round(value / 1000).toLocaleString('ko-KR')}k`
  }

  return formatPrice(value, currency)
}

export default DetailPriceChart
