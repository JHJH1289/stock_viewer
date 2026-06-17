import { Link } from 'react-router-dom'

function StockLink({ symbol, className, children, ariaLabel }) {
  return (
    <Link className={className} to={`/${encodeURIComponent(symbol)}`} aria-label={ariaLabel}>
      {children}
    </Link>
  )
}

export default StockLink
