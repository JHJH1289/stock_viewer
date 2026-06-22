import { useState } from 'react'
import { formatPrice } from '../utils/market'

const SCORE_GUIDE_KEY = 'valuation-score'

const VALUATION_BENCHMARKS = {
  per: { median: 11.35, upperQuartile: 27.76, high: 77.55 },
  pbr: { median: 0.84, upperQuartile: 1.89, high: 4.98 },
}

const METRIC_GUIDES = {
  PER: {
    summary: '주가가 순이익의 몇 배로 거래되는지 보는 지표입니다. 낮을수록 이익 대비 가격 부담이 작습니다.',
    examples: [
      ['낮음', '10배 이하'],
      ['중간', '10~30배'],
      ['높음', '30배 이상'],
    ],
  },
  PBR: {
    summary: '주가가 기업 순자산의 몇 배인지 보는 지표입니다. 낮을수록 자본 대비 가격 부담이 작습니다.',
    examples: [
      ['낮음', '1배 이하'],
      ['중간', '1~3배'],
      ['높음', '3배 이상'],
    ],
  },
  ROE: {
    summary: '자기자본으로 얼마나 효율적으로 이익을 냈는지 보는 수익성 지표입니다. 높을수록 좋습니다.',
    examples: [
      ['낮음', '5% 미만'],
      ['중간', '5~15%'],
      ['높음', '15% 이상'],
    ],
  },
  부채비율: {
    summary: '자본 대비 부채 규모를 보는 안정성 지표입니다. 낮을수록 재무 부담이 작습니다.',
    examples: [
      ['낮음', '100% 이하'],
      ['중간', '100~200%'],
      ['높음', '200% 이상'],
    ],
  },
}

function ValuationMetricsPanel({
  metrics,
  metricsHistory = [],
  selectedMetricsKey = '',
  currency = 'KRW',
  onMetricsChange,
}) {
  const [openGuide, setOpenGuide] = useState(null)

  if (!metrics) return null

  const score = toNumber(metrics.valuationScore)
  const scorePercent = clamp(score ?? 0, 0, 100)
  const scoreTone = getScoreTone(score)
  const isScoreGuideOpen = openGuide === SCORE_GUIDE_KEY
  const metricItems = [
    {
      label: 'PER',
      value: formatRatio(metrics.per, '배'),
      score: metrics.perScore,
      visual: getLowerIsBetterVisual(metrics.per, VALUATION_BENCHMARKS.per),
      helper: getPerHelper(metrics.per),
    },
    {
      label: 'PBR',
      value: formatRatio(metrics.pbr, '배'),
      score: metrics.pbrScore,
      visual: getLowerIsBetterVisual(metrics.pbr, VALUATION_BENCHMARKS.pbr),
      helper: getPbrHelper(metrics.pbr),
    },
    {
      label: 'ROE',
      value: formatPercentValue(metrics.roe),
      score: metrics.roeScore,
      visual: getScoreVisual(metrics.roeScore),
      helper: '높을수록 수익성 우수',
    },
    {
      label: '부채비율',
      value: formatPercentValue(metrics.debtRatio),
      score: metrics.debtScore,
      visual: getScoreVisual(metrics.debtScore),
      helper: '낮을수록 재무 안정',
    },
  ]
  const scoreParts = [
    { label: 'PER', value: metrics.perScore },
    { label: 'PBR', value: metrics.pbrScore },
    { label: 'ROE', value: metrics.roeScore },
    { label: '부채', value: metrics.debtScore },
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
        <div className="valuation-score-topline">
          <span className="valuation-score-title">
            가치 점수
            <button
              type="button"
              className="valuation-info-button"
              aria-expanded={isScoreGuideOpen}
              aria-label="가치 점수 설명"
              onClick={() => setOpenGuide(isScoreGuideOpen ? null : SCORE_GUIDE_KEY)}
            >
              i
            </button>
          </span>
          <small>{getScoreLabel(score)}</small>
        </div>

        <div className="valuation-score-main">
          <div className="valuation-score-ring" style={{ '--score': `${scorePercent}%` }}>
            <strong>{formatScore(score)}</strong>
            <span>/100</span>
          </div>
          <p className="valuation-score-formula">
            4개 지표를 각각 25점 만점으로 환산해 합산합니다.
          </p>
        </div>

        <dl className="valuation-score-breakdown" aria-label="가치 점수 구성">
          {scoreParts.map((part) => (
            <div key={part.label}>
              <dt>{part.label}</dt>
              <dd>{`${formatScore(part.value)}점`}</dd>
            </div>
          ))}
        </dl>

        {isScoreGuideOpen ? <ScoreGuide /> : null}
      </div>

      <div className="valuation-content">
        <div className="valuation-heading">
          <h2>가치 지표</h2>
          <label className="valuation-period-select">
            <span>결산 기준</span>
            <select
              value={selectedMetricsKey || getMetricsKey(metrics)}
              onChange={(event) => onMetricsChange?.(event.target.value)}
              disabled={!onMetricsChange}
            >
              {(metricsHistory.length > 0 ? metricsHistory : [metrics]).map((item) => (
                <option value={getMetricsKey(item)} key={getMetricsKey(item)}>
                  {formatMetricsPeriod(item)}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="valuation-metric-grid">
          {metricItems.map((item) => {
            const itemScore = toNumber(item.score)
            const itemPercent = item.visual.percent
            const itemTone = item.visual.tone
            const itemLabel = item.visual.label
            const isGuideOpen = openGuide === item.label

            return (
              <div className={`valuation-metric ${itemTone}`} key={item.label}>
                <div className="valuation-metric-topline">
                  <span className="valuation-metric-title">
                    {item.label}
                    <button
                      type="button"
                      className="valuation-info-button"
                      aria-expanded={isGuideOpen}
                      aria-label={`${item.label} 설명`}
                      onClick={() => setOpenGuide(isGuideOpen ? null : item.label)}
                    >
                      i
                    </button>
                  </span>
                  <small>{itemLabel}</small>
                </div>
                <strong>{item.value}</strong>
                <div className="valuation-meter" aria-hidden="true">
                  <span style={{ width: `${itemPercent}%` }} />
                </div>
                <div className="valuation-metric-foot">
                  <span>{item.helper}</span>
                  <b>{`${formatScore(itemScore)}점`}</b>
                </div>
                {isGuideOpen ? <MetricGuide metric={item.label} /> : null}
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

function getMetricsKey(metrics) {
  return `${metrics.year ?? '-'}|${metrics.fiscalDate ?? '-'}|${metrics.priceDate ?? '-'}`
}

function formatMetricsPeriod(metrics) {
  return `${metrics.year ?? '-'} 결산 · ${metrics.priceDate ?? '-'}`
}

function ScoreGuide() {
  return (
    <div className="valuation-guide-popover is-score-guide" role="dialog" aria-label="가치 점수 설명">
      <p>
        점수는 전체 기업 분포 안에서의 상대 위치를 사용합니다. PER/PBR/부채비율은 낮을수록,
        ROE는 높을수록 높은 점수를 받습니다.
      </p>
      <dl>
        <div>
          <dt>구성</dt>
          <dd>4개 지표 × 25점</dd>
        </div>
        <div>
          <dt>총점</dt>
          <dd>최대 100점</dd>
        </div>
      </dl>
    </div>
  )
}

function MetricGuide({ metric }) {
  const guide = METRIC_GUIDES[metric]
  if (!guide) return null

  return (
    <div className="valuation-guide-popover" role="dialog" aria-label={`${metric} 설명`}>
      <p>{guide.summary}</p>
      <dl>
        {guide.examples.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

function getLowerIsBetterVisual(value, benchmark) {
  const number = toNumber(value)
  if (number === null || number <= 0) {
    return { percent: 0, tone: 'is-low', label: '결측' }
  }

  const percent = clamp((number / benchmark.high) * 100, 4, 100)
  if (number >= benchmark.high) {
    return { percent, tone: 'is-low', label: '매우 높음' }
  }
  if (number >= benchmark.upperQuartile) {
    return { percent, tone: 'is-low', label: '주의' }
  }
  if (number >= benchmark.median) {
    return { percent, tone: 'is-mid', label: '보통' }
  }

  return { percent, tone: 'is-good', label: '낮음' }
}

function getScoreVisual(score) {
  const number = toNumber(score)
  const percent = clamp(((number ?? 0) / 25) * 100, 0, 100)
  const tone = getMetricTone(number)

  return {
    percent,
    tone,
    label: getMetricLabel(number),
  }
}

function getPerHelper(value) {
  const number = toNumber(value)
  if (number === null) return '이익 기준 확인 필요'
  if (number >= VALUATION_BENCHMARKS.per.upperQuartile) return '분포 상단, 고평가 부담'
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

function formatScore(value) {
  const number = toNumber(value)
  if (number === null) return '-'

  return new Intl.NumberFormat('ko-KR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(number)
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
