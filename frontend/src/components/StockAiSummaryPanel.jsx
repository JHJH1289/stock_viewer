import { useEffect, useMemo, useState } from 'react'
import Markdown from 'react-markdown'
import { fetchStockAiSummary } from '../services/stockApi'
import { formatPrice } from '../utils/market'

function StockAiSummaryPanel({ quote, valuation, history, news }) {
  const [summary, setSummary] = useState('')
  const [model, setModel] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const chart = useMemo(() => buildChartSummary(history?.points ?? [], quote?.currency), [history, quote?.currency])

  async function loadSummary() {
    if (!quote) return

    setIsLoading(true)
    try {
      const result = await fetchStockAiSummary(buildStockPayload({ quote, valuation, chart, news }))
      setSummary(result.summary)
      setModel(result.model)
      setError('')
    } catch (err) {
      setSummary('')
      setModel('')
      setError(err instanceof Error ? err.message : 'AI 요약을 가져오지 못했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (!quote || !history) return

    let cancelled = false
    async function loadInitialSummary() {
      setIsLoading(true)
      try {
        const result = await fetchStockAiSummary(buildStockPayload({ quote, valuation, chart, news }))
        if (cancelled) return
        setSummary(result.summary)
        setModel(result.model)
        setError('')
      } catch (err) {
        if (cancelled) return
        setSummary('')
        setModel('')
        setError(err instanceof Error ? err.message : 'AI 요약을 가져오지 못했습니다.')
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    loadInitialSummary()

    return () => {
      cancelled = true
    }
  }, [quote, history, valuation, chart, news])

  return (
    <aside className="ai-summary-panel stock-ai-summary" aria-label="AI company summary">
      <div className="ai-summary-heading">
        <div>
          <p className="eyebrow">Local LLM</p>
          <h2>기업 AI 요약</h2>
        </div>
        <button type="button" onClick={loadSummary} disabled={isLoading || !quote}>
          {isLoading ? '분석 중' : '새로 분석'}
        </button>
      </div>

      <div className="ai-summary-facts">
        <span>{quote?.symbol ?? '-'}</span>
        <span>{chart.changePercent == null ? '차트 대기' : `${chart.changePercent.toFixed(2)}%`}</span>
        <span>{valuation ? `PER ${valuation.per ?? '-'}` : '가치지표 없음'}</span>
      </div>

      {error ? <p className="ai-summary-state is-error">{error}</p> : null}
      {!error && isLoading ? <p className="ai-summary-state">뉴스, 가치지표, 차트를 반영해 요약하는 중입니다.</p> : null}
      {!error && !isLoading && summary ? <div className="ai-summary-body"><Markdown>{summary}</Markdown></div> : null}
      {!error && !isLoading && summary ? (
        <p className="ai-summary-disclaimer">⚠ 본 요약은 AI가 생성한 참고 자료입니다. 투자 판단의 책임은 투자자 본인에게 있으며, 실제 투자 결과를 보장하지 않습니다.</p>
      ) : null}
      {!error && !isLoading && !summary ? (
        <p className="ai-summary-state">차트 데이터가 준비되면 로컬 Ollama로 요약합니다.</p>
      ) : null}

      <div className="ai-summary-foot">
        <span>{model ? `model: ${model}` : 'Ollama local'}</span>
        <span>투자 판단 보조용</span>
      </div>
    </aside>
  )
}

function buildStockPayload({ quote, valuation, chart, news }) {
  return {
    quote: {
      name: quote.name,
      symbol: quote.symbol,
      market: quote.market,
      price: quote.price,
      currency: quote.currency,
      changePercent: quote.changePercent,
    },
    valuation: valuation
      ? {
          year: valuation.year,
          fiscalDate: valuation.fiscalDate,
          priceDate: valuation.priceDate,
          per: valuation.per,
          pbr: valuation.pbr,
          roe: valuation.roe,
          debtRatio: valuation.debtRatio,
          score: valuation.score,
          revenue: valuation.revenue,
          operatingIncome: valuation.operatingIncome,
          netIncome: valuation.netIncome,
        }
      : null,
    chart,
    news: (news ?? []).slice(0, 5).map((item) => ({
      title: item.title,
      description: item.description,
      publishedAt: item.publishedAt,
    })),
  }
}

function buildChartSummary(points, currency) {
  const validPoints = points
    .filter((point) => Number.isFinite(Number(point.close)))
    .map((point) => ({
      timestamp: point.timestamp,
      open: Number(point.open),
      high: Number(point.high),
      low: Number(point.low),
      close: Number(point.close),
      volume: Number(point.volume) || 0,
    }))

  if (validPoints.length === 0) {
    return { pointCount: 0 }
  }

  const first = validPoints[0]
  const last = validPoints[validPoints.length - 1]
  const firstPrice = first.open || first.close
  const change = last.close - firstPrice
  const changePercent = firstPrice ? (change / firstPrice) * 100 : 0

  return {
    pointCount: validPoints.length,
    startAt: first.timestamp,
    endAt: last.timestamp,
    firstPrice: formatPrice(firstPrice, currency),
    lastClose: formatPrice(last.close, currency),
    high: formatPrice(Math.max(...validPoints.map((point) => point.high || point.close)), currency),
    low: formatPrice(Math.min(...validPoints.map((point) => point.low || point.close)), currency),
    volume: validPoints.reduce((sum, point) => sum + point.volume, 0),
    change,
    changePercent,
  }
}

export default StockAiSummaryPanel
