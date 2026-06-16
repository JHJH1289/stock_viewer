import { formatPercent } from '../utils/market'

function ChangeBadge({ value }) {
  return (
    <span className={value >= 0 ? 'change-badge is-positive' : 'change-badge is-negative'}>
      {formatPercent(value)}
    </span>
  )
}

export default ChangeBadge
