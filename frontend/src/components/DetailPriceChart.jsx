import { useMemo, useState } from 'react'
import { formatPrice } from '../utils/market'

const rangeOptions = [
  { value: '1d', label: '일일' },
  { value: '1mo', label: '1개월' },
  { value: '6mo', label: '6개월' },
  { value: '1y', label: '1년' },
]

function DetailPriceChart({ quote, history, range, isLoading, error, onRangeChange }) {
  const chart = useMemo(() => createChart(history?.points ?? [], quote.currency), [history, quote.currency])
  const [activeIndex, setActiveIndex] = useState(chart.defaultIndex)
  const [selection, setSelection] = useState(null)
  const safeActiveIndex = activeIndex < chart.points.length ? activeIndex : chart.defaultIndex
  const activePoint = chart.points[safeActiveIndex] ?? chart.points[chart.defaultIndex]
  const selectedRange = createSelectedRange(selection, chart, quote.currency)

  function getPointerIndex(event) {
    const bounds = event.currentTarget.getBoundingClientRect()
    const ratio = (event.clientX - bounds.left) / bounds.width
    const clampedRatio = Math.max(0, Math.min(1, ratio))
    return Math.round(clampedRatio * (chart.points.length - 1))
  }

  function handlePointerMove(event) {
    if (chart.points.length === 0) return

    const nextIndex = getPointerIndex(event)
    setActiveIndex(nextIndex)
    if (selection?.isDragging) {
      setSelection((current) => current ? { ...current, endIndex: nextIndex } : current)
    }
  }

  function handlePointerDown(event) {
    if (chart.points.length === 0) return

    const nextIndex = getPointerIndex(event)
    event.currentTarget.setPointerCapture?.(event.pointerId)
    setActiveIndex(nextIndex)
    setSelection({
      startIndex: nextIndex,
      endIndex: nextIndex,
      isDragging: true,
    })
  }

  function handlePointerUp(event) {
    if (!selection?.isDragging) return

    const nextIndex = getPointerIndex(event)
    event.currentTarget.releasePointerCapture?.(event.pointerId)
    setActiveIndex(nextIndex)
    setSelection(null)
  }

  return (
    <section className="detail-chart-panel" aria-label={`${quote.name} price chart`}>
      <div className="detail-range-tabs" aria-label="Chart range">
        {rangeOptions.map((option) => (
          <button
            className={range === option.value ? 'is-active' : ''}
            type="button"
            key={option.value}
            onClick={() => onRangeChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="detail-chart-loader">
          <div className="spinner-chart" />
        </div>
      ) : null}
      {error ? <p className="detail-chart-state is-error">{error}</p> : null}
      {!isLoading && !error && chart.points.length === 0 ? (
        <p className="detail-chart-state">표시할 차트 데이터가 없습니다.</p>
      ) : null}

      {!isLoading && chart.points.length > 0 ? (
        <>
          <svg
            className="detail-chart"
            viewBox={`0 0 ${chart.width} ${chart.height}`}
            role="img"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={() => setSelection(null)}
            onPointerLeave={() => {
              if (!selection?.isDragging) {
                setActiveIndex(chart.defaultIndex)
              }
            }}
          >
            <title>{quote.symbol} price chart</title>
            <defs>
              <linearGradient id="detail-chart-fill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#f28b82" stopOpacity="0.38" />
                <stop offset="100%" stopColor="#f28b82" stopOpacity="0.05" />
              </linearGradient>
            </defs>

            {chart.gridLines.map((line) => (
              <g key={line.y}>
                <line
                  className="detail-chart-grid"
                  x1={chart.padding.left}
                  x2={chart.width - chart.padding.right}
                  y1={line.y}
                  y2={line.y}
                />
                <text className="detail-chart-label" x={chart.padding.left - 12} y={line.y + 4}>
                  {formatAxisPrice(line.value, quote.currency)}
                </text>
              </g>
            ))}

            {chart.markers.map((marker) => (
              <g key={`${marker.x}-${marker.label}`}>
                <line
                  className="detail-chart-grid is-vertical"
                  x1={marker.x}
                  x2={marker.x}
                  y1={chart.padding.top}
                  y2={chart.height - chart.padding.bottom}
                />
                <text className="detail-chart-time" x={marker.x} y={chart.height - 10}>
                  {marker.label}
                </text>
              </g>
            ))}

            <path className="detail-area-fill" d={chart.areaPath} />
            <path className="detail-area-line" d={chart.linePath} pathLength="1" />

            {selectedRange ? (
              <g>
                <rect
                  className={`detail-selection-area ${selectedRange.delta >= 0 ? 'is-up' : 'is-down'}`}
                  x={selectedRange.x}
                  y={chart.padding.top}
                  width={selectedRange.width}
                  height={chart.height - chart.padding.top - chart.padding.bottom}
                  rx="3"
                />
                <line
                  className="detail-selection-line"
                  x1={selectedRange.start.x}
                  x2={selectedRange.start.x}
                  y1={chart.padding.top}
                  y2={chart.height - chart.padding.bottom}
                />
                <line
                  className="detail-selection-line"
                  x1={selectedRange.end.x}
                  x2={selectedRange.end.x}
                  y1={chart.padding.top}
                  y2={chart.height - chart.padding.bottom}
                />
                <circle className="detail-selection-dot" cx={selectedRange.start.x} cy={selectedRange.start.y} r="4.5" />
                <circle className="detail-selection-dot" cx={selectedRange.end.x} cy={selectedRange.end.y} r="4.5" />
                <g transform={`translate(${selectedRange.tooltipX}, ${chart.padding.top + 34})`}>
                  <rect
                    className={`detail-selection-tooltip-bg ${selectedRange.delta >= 0 ? 'is-up' : 'is-down'}`}
                    width="204"
                    height="46"
                    rx="6"
                  />
                  <text className="detail-selection-tooltip-text" x="10" y="18">
                    {selectedRange.deltaLabel}
                  </text>
                  <text className="detail-selection-tooltip-subtext" x="10" y="34">
                    {selectedRange.periodLabel}
                  </text>
                </g>
              </g>
            ) : null}

            <line
              className="detail-hover-line"
              x1={activePoint.x}
              x2={activePoint.x}
              y1={chart.padding.top}
              y2={chart.height - chart.padding.bottom}
            />
            <circle className="detail-hover-dot" cx={activePoint.x} cy={activePoint.y} r="4.5" />
            <g transform={`translate(${activePoint.tooltipX}, ${chart.padding.top + 2})`}>
              <rect className="detail-tooltip-bg" width="184" height="28" rx="4" />
              <text className="detail-tooltip-text" x="10" y="18">
                {`${formatPrice(activePoint.close, quote.currency)}  ${activePoint.label}`}
              </text>
            </g>
          </svg>

          <dl className="detail-summary-grid">
            {chart.summary.map((item) => (
              <div className={item.type ? `is-${item.type}` : undefined} key={item.label}>
                <dt>{item.label}</dt>
                <dd>
                  <span>{item.value}</span>
                  {item.type === 'high' || item.type === 'low' ? (
                    <i aria-hidden="true">
                      <b style={{ width: `${item.type === 'high' ? 100 : 18}%` }} />
                    </i>
                  ) : null}
                </dd>
              </div>
            ))}
          </dl>
        </>
      ) : null}
    </section>
  )
}

function createSelectedRange(selection, chart, currency) {
  if (!selection || chart.points.length === 0) {
    return null
  }

  const startIndex = Math.max(0, Math.min(selection.startIndex, chart.points.length - 1))
  const endIndex = Math.max(0, Math.min(selection.endIndex, chart.points.length - 1))
  const start = chart.points[startIndex]
  const end = chart.points[endIndex]
  if (!start || !end) {
    return null
  }

  const delta = end.close - start.close
  const deltaPercent = start.close === 0 ? 0 : (delta / start.close) * 100
  const direction = delta >= 0 ? '+' : ''
  const x = Math.min(start.x, end.x)
  const width = Math.max(Math.abs(end.x - start.x), 3)
  const tooltipX = Math.min(Math.max((start.x + end.x) / 2 - 102, chart.padding.left), chart.width - chart.padding.right - 204)

  return {
    start,
    end,
    delta,
    x,
    width,
    tooltipX,
    deltaLabel: `${direction}${formatPrice(delta, currency)} (${direction}${deltaPercent.toFixed(2)}%)`,
    periodLabel: `${start.label} → ${end.label}`,
  }
}

function createChart(rawPoints, currency) {
  const width = 880
  const height = 280
  const padding = {
    top: 18,
    right: 22,
    bottom: 34,
    left: 76,
  }
  const points = rawPoints
    .filter((point) => Number.isFinite(Number(point.close)))
    .map((point) => ({
      timestamp: point.timestamp,
      open: Number(point.open),
      high: Number(point.high),
      low: Number(point.low),
      close: Number(point.close),
      volume: Number(point.volume) || 0,
      label: formatPointLabel(point.timestamp),
    }))

  if (points.length === 0) {
    return {
      width,
      height,
      padding,
      points: [],
      defaultIndex: 0,
      linePath: '',
      areaPath: '',
      gridLines: [],
      markers: [],
      summary: [],
    }
  }

  const values = points.flatMap((point) => [point.high || point.close, point.low || point.close])
  const low = Math.min(...values)
  const high = Math.max(...values)
  const range = high - low || Math.max(points[0].close * 0.01, 1)
  const min = low - range * 0.12
  const max = high + range * 0.12
  const drawableWidth = width - padding.left - padding.right
  const drawableHeight = height - padding.top - padding.bottom
  const indexDivisor = Math.max(points.length - 1, 1)

  const xForIndex = (index) => padding.left + (drawableWidth / indexDivisor) * index
  const yForValue = (value) => padding.top + ((max - value) / (max - min)) * drawableHeight
  const plottedPoints = points.map((point, index) => ({
    ...point,
    x: xForIndex(index),
    y: yForValue(point.close),
  }))
  const linePath = plottedPoints.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x},${point.y}`).join(' ')
  const lastPoint = plottedPoints[plottedPoints.length - 1]
  const firstPoint = plottedPoints[0]
  const chartBottom = height - padding.bottom
  const areaPath = `${linePath} L${lastPoint.x},${chartBottom} L${firstPoint.x},${chartBottom} Z`
  const gridLines = Array.from({ length: 5 }, (_, index) => {
    const value = min + ((max - min) / 4) * index
    return {
      value,
      y: yForValue(value),
    }
  }).reverse()

  return {
    width,
    height,
    padding,
    points: plottedPoints.map((point) => ({
      ...point,
      tooltipX: Math.min(Math.max(point.x - 88, padding.left), width - padding.right - 184),
    })),
    defaultIndex: plottedPoints.length - 1,
    linePath,
    areaPath,
    gridLines,
    markers: createMarkers(plottedPoints),
    summary: createSummary(points, currency),
  }
}

function createMarkers(points) {
  if (points.length <= 1) return []

  const markerCount = Math.min(5, points.length)
  return Array.from({ length: markerCount }, (_, index) => {
    const pointIndex = Math.round((index / (markerCount - 1)) * (points.length - 1))
    const point = points[pointIndex]
    return {
      x: point.x,
      label: shortDate(point.timestamp),
    }
  })
}

function createSummary(points, currency) {
  const first = points[0]
  const last = points[points.length - 1]
  const high = Math.max(...points.map((point) => point.high || point.close))
  const low = Math.min(...points.map((point) => point.low || point.close))
  const volume = points.reduce((sum, point) => sum + point.volume, 0)

  return [
    ['시가', formatPrice(first.open || first.close, currency)],
    ['고가', formatPrice(high, currency)],
    ['저가', formatPrice(low, currency)],
    ['종가', formatPrice(last.close, currency)],
    ['거래량', volume.toLocaleString('ko-KR')],
  ].map(([label, value], index) => ({
    label,
    value,
    type: index === 1 ? 'high' : index === 2 ? 'low' : undefined,
  }))
}

function formatPointLabel(timestamp) {
  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) {
    return timestamp
  }

  const hasTime = timestamp.includes('T')
  const dateLabel = `${date.getMonth() + 1}/${date.getDate()}`
  if (!hasTime) {
    return dateLabel
  }

  return `${dateLabel} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function shortDate(timestamp) {
  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) {
    return timestamp
  }

  return `${date.getMonth() + 1}/${date.getDate()}`
}

function formatAxisPrice(value, currency) {
  if (currency === 'KRW') {
    return `${Math.round(value / 10000).toLocaleString('ko-KR')}만`
  }

  return formatPrice(value, currency)
}

export default DetailPriceChart
