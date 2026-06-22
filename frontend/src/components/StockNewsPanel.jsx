import { useEffect, useState } from 'react'
import { fetchMajorNews } from '../services/stockApi'

function StockNewsPanel({ query = '주식 증권 코스피 나스닥', onNewsLoaded }) {
  const [news, setNews] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    Promise.resolve()
      .then(() => {
        if (cancelled) return []
        setIsLoading(true)
        return fetchMajorNews({ query, display: 8 })
      })
      .then((items) => {
        if (cancelled) return
        setNews(items)
        onNewsLoaded?.(items)
        setError('')
      })
      .catch((err) => {
        if (cancelled) return
        setNews([])
        onNewsLoaded?.([])
        setError(err instanceof Error ? err.message : '주요 뉴스를 불러오지 못했습니다.')
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [query, onNewsLoaded])

  return (
    <section className="stock-news-panel" aria-label="Major stock news">
      <div className="stock-news-heading">
        <div>
          <p className="eyebrow">News</p>
          <h2>주식 주요 뉴스</h2>
        </div>
        <span>{isLoading ? '불러오는 중' : `${news.length}개`}</span>
      </div>

      {error ? <p className="stock-news-state">{error}</p> : null}
      {!error && !isLoading && news.length === 0 ? <p className="stock-news-state">표시할 뉴스가 없습니다.</p> : null}
      {!error && news.length > 0 ? (
        <div className="stock-news-list">
          {news.map((item) => (
            <a
              className="stock-news-item"
              href={item.link}
              key={`${item.link}-${item.publishedAt}`}
              target="_blank"
              rel="noreferrer"
            >
              <strong>{item.title}</strong>
              <p>{item.description}</p>
              <span>{formatNewsDate(item.publishedAt)}</span>
            </a>
          ))}
        </div>
      ) : null}
    </section>
  )
}

function formatNewsDate(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }
  return date.toLocaleString('ko-KR', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default StockNewsPanel
