import { formatPrice } from '../utils/market'

function ValuationMetricsPanel({ metrics, currency = 'KRW' }) {
  if (!metrics) return null

  const score = toNumber(metrics.valuationScore)
  const scorePercent = clamp(score ?? 0, 0, 100)
  const scoreTone = getScoreTone(score)
  const metricItems = [
    {
      label: 'PER',
      value: formatRatio(metrics.per, '배'),
      score: metrics.perScore,
      helper: '낮을수록 유리',
    },
    {
      label: 'PBR',
      value: formatRatio(metrics.pbr, '배'),
      score: metrics.pbrScore,
      helper: '낮을수록 유리',
    },
    {
      label: 'ROE',
      value: formatPercentValue(metrics.roe),
      score: metrics.roeScore,
      helper: '높을수록 유리',
    },
    {
      label: '부채비율',
      value: formatPercentValue(metrics.debtRatio),
      score: metrics.debtScore,
      helper: '낮을수록 안정',
    },
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
      <div className={`valuation-score-block ${scoreTone}`}>
        <div className="valuation-score-ring" style={{ '--score': `${scorePercent}%` }}>
          <strong>{formatPlain(score)}</strong>
          <span>/100</span>
        </div>
        <div className="valuation-score-copy">
          <span>가치 점수</span>
          <p>{getScoreLabel(score)}</p>
        </div>
      </div>

      <div className="valuation-content">
        <div className="valuation-heading">
          <h2>가치 지표</h2>
          <span>{`${metrics.year ?? '-'} 결산 · ${metrics.priceDate ?? '-'}`}</span>
        </div>

        <div className="valuation-metric-grid">
          {metricItems.map((item) => {
            const itemScore = toNumber(item.score)
            const itemPercent = clamp(((itemScore ?? 0) / 25) * 100, 0, 100)
            const itemTone = getMetricTone(itemScore)

            return (
              <div className={`valuation-metric ${itemTone}`} key={item.label}>
                <div className="valuation-metric-topline">
                  <span>{item.label}</span>
                  <small>{getMetricLabel(itemScore)}</small>
                </div>
                <strong>{item.value}</strong>
                <div className="valuation-meter" aria-hidden="true">
                  <span style={{ width: `${itemPercent}%` }} />
                </div>
                <div className="valuation-metric-foot">
                  <span>{item.helper}</span>
                  <b>{`${formatPlain(itemScore)}점`}</b>
                </div>
              </div>
            )
          })}
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

function toNumber(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return null
  }

  return Number(value)
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

function formatPlain(value) {
  const number = toNumber(value)
  if (number === null) return '-'

  return new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 0 }).format(number)
}

function formatRatio(value, suffix) {
  const number = toNumber(value)
  if (number === null) return '-'

  return `${new Intl.NumberFormat('ko-KR', {
    maximumFractionDigits: 2,
  }).format(number)}${suffix}`
}

function formatPercentValue(value) {
  const number = toNumber(value)
  if (number === null) return '-'

  return `${new Intl.NumberFormat('ko-KR', {
    maximumFractionDigits: 2,
  }).format(number)}%`
}

function formatLargeMoney(value, currency) {
  const number = toNumber(value)
  if (number === null) return '-'

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
  if (score >= 50) return '균형권'
  if (score >= 25) return '주의 필요'
  return '분석 주의'
}

function getMetricTone(score) {
  if (score >= 20) return 'is-good'
  if (score >= 10) return 'is-mid'
  return 'is-low'
}

function getMetricLabel(score) {
  if (score >= 20) return '좋음'
  if (score >= 10) return '보통'
  return '주의'
}

export default ValuationMetricsPanel
