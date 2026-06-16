import { formatPercent } from '../utils/market'

function ChangeBadge({ value }) {
  const tone = value === 0 ? 'is-neutral' : value > 0 ? 'is-positive' : 'is-negative'

  return (
    <span className={`change-badge ${tone}`}>
      {formatPercent(value)}
    </span>
  )
}

export default ChangeBadge
