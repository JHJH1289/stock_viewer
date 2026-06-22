import { useEffect, useMemo, useState } from 'react'
import Markdown from 'react-markdown'
import { fetchPortfolioAiSummary } from '../services/stockApi'

function PortfolioAiSummaryPanel({ balance, rows }) {
  const [summary, setSummary] = useState('')
  const [model, setModel] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const payload = useMemo(
    () => ({
      balance: balance
        ? {
            krwAmount: balance.krwAmount,
            usdAmount: balance.usdAmount,
          }
        : null,
      holdings: rows.map((row) => ({
        stockName: row.stockName,
        symbol: row.symbol,
        marketCode: row.marketCode,
        quantity: row.quantity,
        avgBuyPrice: row.avgBuyPrice,
        currentPrice: row.currentPrice,
        currentValue: row.currentValue,
        pnl: row.pnl,
        pnlPercent: row.pnlPercent,
        currency: row.currency,
      })),
    }),
    [balance, rows],
  )

  async function loadSummary() {
    if (!balance) return

    setIsLoading(true)
    try {
      const result = await fetchPortfolioAiSummary(payload)
      setSummary(result.summary)
      setModel(result.model)
      setError('')
    } catch (err) {
      setSummary('')
      setModel('')
      setError(err instanceof Error ? err.message : 'AI 포트폴리오 요약을 가져오지 못했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (!balance || rows.length === 0) return

    let cancelled = false
    async function loadInitialSummary() {
      setIsLoading(true)
      try {
        const result = await fetchPortfolioAiSummary(payload)
        if (cancelled) return
        setSummary(result.summary)
        setModel(result.model)
        setError('')
      } catch (err) {
        if (cancelled) return
        setSummary('')
        setModel('')
        setError(err instanceof Error ? err.message : 'AI 포트폴리오 요약을 가져오지 못했습니다.')
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
  }, [balance, rows, payload])

  const totalPnl = rows.reduce((sum, row) => sum + row.pnl, 0)
  const krwCount = rows.filter((row) => row.currency === 'KRW').length
  const usdCount = rows.filter((row) => row.currency === 'USD').length

  return (
    <section className="ai-summary-panel portfolio-ai-summary" aria-label="AI portfolio summary">
      <div className="ai-summary-heading">
        <div>
          <p className="eyebrow">Local LLM</p>
          <h2>포트폴리오 AI 요약</h2>
        </div>
        <button type="button" onClick={loadSummary} disabled={isLoading || rows.length === 0}>
          {isLoading ? '분석 중' : '새로 분석'}
        </button>
      </div>

      <div className="ai-summary-facts">
        <span>{`${rows.length}종목`}</span>
        <span>{`KR ${krwCount} / US ${usdCount}`}</span>
        <span className={totalPnl >= 0 ? 'is-positive' : 'is-negative'}>
          {totalPnl >= 0 ? '+' : ''}
          {Math.round(totalPnl).toLocaleString('ko-KR')}
        </span>
      </div>

      {error ? <p className="ai-summary-state is-error">{error}</p> : null}
      {!error && isLoading ? <p className="ai-summary-state">보유 종목과 손익을 정리하는 중입니다.</p> : null}
      {!error && !isLoading && summary ? <div className="ai-summary-body"><Markdown>{summary}</Markdown></div> : null}
      {!error && !isLoading && summary ? (
        <p className="ai-summary-disclaimer">⚠ 본 요약은 AI가 생성한 참고 자료입니다. 투자 판단의 책임은 투자자 본인에게 있으며, 실제 투자 결과를 보장하지 않습니다.</p>
      ) : null}
      {!error && !isLoading && !summary ? (
        <p className="ai-summary-state">보유 종목이 있으면 로컬 Ollama로 포트폴리오를 요약합니다.</p>
      ) : null}

      <div className="ai-summary-foot">
        <span>{model ? `model: ${model}` : 'Ollama local'}</span>
        <span>투자 판단 보조용</span>
      </div>
    </section>
  )
}

export default PortfolioAiSummaryPanel
