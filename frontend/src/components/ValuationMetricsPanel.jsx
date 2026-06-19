import { formatPrice } from '../utils/market'

function ValuationMetricsPanel({ metrics, currency = 'KRW' }) {
  if (!metrics) return null

  const scoreTone = getScoreTone(metrics.valuationScore)
  const metricItems = [
    { label: 'PER', value: formatRatio(metrics.per, '배'), score: metrics.perScore },
    { label: 'PBR', value: formatRatio(metrics.pbr, '배'), score: metrics.pbrScore },
    { label: 'ROE', value: formatPercentValue(metrics.roe), score: metrics.roeScore },
    { label: '부채비율', value: formatPercentValue(metrics.debtRatio), score: metrics.debtScore },
  ]

  const financialItems = [
    { label: '시가총액', value: formatLargeMoney(metrics.marketCap, currency) },
    { label: '자산총계', value: formatLargeMoney(metrics.totalAssets, currency) },
    { label: '자본총계', value: formatLargeMoney(metrics.totalEquity, currency) },
    { label: '순이익', value: formatLargeMoney(metrics.netIncome, currency) },
    { label: '영업이익', value: formatLargeMoney(metrics.operatingIncome, currency) },
    { label: '매출액', value: formatLargeMoney(metrics.revenue, currency) },
  ]

  return (
    <section className="valuation-panel" aria-label="Valuation metrics">
      <div className="valuation-score-block">
        <span>가치 점수</span>
        <strong className={scoreTone}>{formatPlain(metrics.valuationScore)}</strong>
        <p>{getScoreLabel(metrics.valuationScore)}</p>
      </div>

      <div className="valuation-content">
        <div className="valuation-heading">
          <h2>가치 지표</h2>
          <span>{`${metrics.year ?? '-'} 결산 · ${metrics.priceDate ?? '-'}`}</span>
        </div>

        <div className="valuation-metric-grid">
          {metricItems.map((item) => (
            <div className="valuation-metric" key={item.label}>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
              <small>{`${formatPlain(item.score)}점`}</small>
            </div>
          ))}
        </div>

        <dl className="valuation-financial-grid">
          {financialItems.map((item) => (
            <div key={item.label}>
              <dt>{item.label}</dt>
              <dd>{item.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}

function formatPlain(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return '-'
  }

  return new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 0 }).format(Number(value))
}

function formatRatio(value, suffix) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return '-'
  }

  return `${new Intl.NumberFormat('ko-KR', {
    maximumFractionDigits: 2,
  }).format(Number(value))}${suffix}`
}

function formatPercentValue(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return '-'
  }

  return `${new Intl.NumberFormat('ko-KR', {
    maximumFractionDigits: 2,
  }).format(Number(value))}%`
}

function formatLargeMoney(value, currency) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return '-'
  }

  const number = Number(value)
  if (currency === 'KRW' && Math.abs(number) >= 100_000_000) {
    return `${new Intl.NumberFormat('ko-KR', {
      maximumFractionDigits: 1,
    }).format(number / 100_000_000)}억`
  }

  return formatPrice(number, currency)
}

function getScoreTone(score) {
  if (score >= 75) return 'is-strong'
  if (score >= 50) return 'is-steady'
  return 'is-caution'
}

function getScoreLabel(score) {
  if (score >= 75) return '저평가 후보'
  if (score >= 50) return '보통'
  if (score >= 25) return '고평가 주의'
  return '분석 주의'
}

export default ValuationMetricsPanel
