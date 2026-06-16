import { useMemo } from 'react'

function PriceSparkline({ changePercent, symbol, compact = false }) {
  const points = useMemo(() => createSparklinePoints(changePercent, symbol), [changePercent, symbol])
  const path = points.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x},${point.y}`).join(' ')

  return (
    <svg className={compact ? 'sparkline is-compact' : 'sparkline'} viewBox="0 0 120 42" role="img">
      <title>{symbol} price trend</title>
      <path className="sparkline-fill" d={`${path} L120,42 L0,42 Z`} />
      <path className={changePercent >= 0 ? 'sparkline-line is-up' : 'sparkline-line is-down'} d={path} />
    </svg>
  )
}

function createSparklinePoints(changePercent, symbol) {
  const seed = [...symbol].reduce((sum, char) => sum + char.charCodeAt(0), 0)

  return Array.from({ length: 9 }, (_, index) => {
    const wave = Math.sin((index + seed) * 0.9) * 7
    const trend = changePercent >= 0 ? 30 - index * 2.1 : 15 + index * 2.1
    const y = Math.max(6, Math.min(36, trend + wave))
    return {
      x: index * 15,
      y,
    }
  })
}

export default PriceSparkline
