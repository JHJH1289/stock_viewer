import { formatPrice } from '../utils/market'

const VALUATION_BENCHMARKS = {
  per: { median: 11.35, upperQuartile: 27.76, high: 77.55 },
  pbr: { median: 0.84, upperQuartile: 1.89, high: 4.98 },
}

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
      visualType: 'burden',
      burden: getValuationBurden(metrics.per, VALUATION_BENCHMARKS.per),
      helper: getPerHelper(metrics.per),
    },
    {
      label: 'PBR',
      value: formatRatio(metrics.pbr, '배'),
      score: metrics.pbrScore,
      visualType: 'burden',
      burden: getValuationBurden(metrics.pbr, VALUATION_BENCHMARKS.pbr),
      helper: getPbrHelper(metrics.pbr),
    },
    {
      label: 'ROE',
      value: formatPercentValue(metrics.roe),
      score: metrics.roeScore,
      visualType: 'score',
      helper: '높을수록 수익성 우수',
    },
    {
      label: '부채비율',
      value: formatPercentValue(metrics.debtRatio),
      score: metrics.debtScore,
      visualType: 'score',
      helper: '낮을수록 재무 안정',
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
            const isBurden = item.visualType === 'burden'
            const itemPercent = isBurden
              ? item.burden.percent
              : clamp(((itemScore ?? 0) / 25) * 100, 0, 100)
            const itemTone = isBurden ? item.burden.tone : getMetricTone(itemScore)
            const itemLabel = isBurden ? item.burden.label : getMetricLabel(itemScore)

            return (
              <div className={`valuation-metric ${itemTone}`} key={item.label}>
                <div className="valuation-metric-topline">
                  <span>{item.label}</span>
                  <small>{itemLabel}</small>
                </div>
                <strong>{item.value}</strong>
                <div className={`valuation-meter ${isBurden ? 'is-burden' : 'is-score'}`} aria-hidden="true">
                  <span style={{ width: `${itemPercent}%` }} />
                </div>
                <div className="valuation-metric-foot">
                  <span>{item.helper}</span>
                  <b>{isBurden ? '부담' : `${formatPlain(itemScore)}점`}</b>
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

function getValuationBurden(value, benchmark) {
  const number = toNumber(value)
  if (number === null || number <= 0) {
    return { percent: 0, tone: 'is-low', label: '결측' }
  }

  const percent = clamp((number / benchmark.high) * 100, 4, 100)
  if (number >= benchmark.high) {
    return { percent, tone: 'is-expensive', label: '매우 높음' }
  }
  if (number >= benchmark.upperQuartile) {
    return { percent, tone: 'is-expensive', label: '주의' }
  }
  if (number >= benchmark.median) {
    return { percent, tone: 'is-mid', label: '보통' }
  }

  return { percent, tone: 'is-good', label: '낮음' }
}

function getPerHelper(value) {
  const number = toNumber(value)
  if (number === null) return '이익 기준 확인 필요'
  if (number >= VALUATION_BENCHMARKS.per.upperQuartile) return '동종 분포 상단, 고평가 부담'
  if (number >= VALUATION_BENCHMARKS.per.median) return '중간값보다 높은 가격'
  return '이익 대비 낮은 가격'
}

function getPbrHelper(value) {
  const number = toNumber(value)
  if (number === null) return '자본 기준 확인 필요'
  if (number >= VALUATION_BENCHMARKS.pbr.high) return '상위권 고PBR, 강한 주의'
  if (number >= VALUATION_BENCHMARKS.pbr.upperQuartile) return '자본 대비 비싼 가격'
  if (number >= VALUATION_BENCHMARKS.pbr.median) return '중간값보다 높은 가격'
  return '자본 대비 낮은 가격'
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
