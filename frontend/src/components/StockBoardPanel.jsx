import { useEffect, useState } from 'react'
import PostInlineThread from './PostInlineThread'
import { createStockBoardPost, fetchStockBoardPosts } from '../services/stockApi'

function StockBoardPanel({ quote }) {
  const [posts, setPosts] = useState([])
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [boardMode, setBoardMode] = useState('all')
  const [sortMode, setSortMode] = useState('latest')
  const [expandedPostId, setExpandedPostId] = useState(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [formError, setFormError] = useState('')
  const isLoggedIn = Boolean(window.localStorage.getItem('token'))
  const displayedPosts = sortPosts(
    boardMode === 'popular' ? posts.filter((post) => getRecommendCount(post) > 0) : posts,
    sortMode,
  )

  useEffect(() => {
    if (!quote?.symbol) return

    let cancelled = false

    async function loadPosts() {
      setIsLoading(true)
      try {
        const nextPosts = await fetchStockBoardPosts(quote.symbol)
        if (cancelled) return
        setPosts(nextPosts)
        setExpandedPostId(null)
        setError('')
      } catch (err) {
        if (cancelled) return
        setPosts([])
        setError(err instanceof Error ? err.message : '종목 게시글을 불러오지 못했습니다.')
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    loadPosts()

    return () => {
      cancelled = true
    }
  }, [quote?.symbol])

  async function handleSubmit(event) {
    event.preventDefault()
    if (!title.trim() || !content.trim()) {
      setFormError('제목과 내용을 입력해주세요.')
      return
    }

    setIsSubmitting(true)
    try {
      const created = await createStockBoardPost(quote.symbol, {
        title: title.trim(),
        content: content.trim(),
      })
      setPosts((current) => [created, ...current])
      setTitle('')
      setContent('')
      setIsFormOpen(false)
      setFormError('')
    } catch (err) {
      setFormError(err instanceof Error ? err.message : '게시글 작성에 실패했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="stock-board-panel" aria-label={`${quote.name} board`}>
      <div className="stock-board-heading">
        <div>
          <p className="eyebrow">Board</p>
          <h2>{quote.name} 게시판</h2>
        </div>
        <span>{isLoading ? '불러오는 중' : `${posts.length}개`}</span>
      </div>

      <div className="stock-board-toolbar">
        <div className="stock-board-tabs">
          <button
            className={boardMode === 'all' ? 'is-active' : ''}
            type="button"
            onClick={() => setBoardMode('all')}
          >
            전체글
          </button>
          <button
            className={boardMode === 'popular' ? 'is-active is-popular' : 'is-popular'}
            type="button"
            onClick={() => setBoardMode('popular')}
          >
            인기글
          </button>
        </div>
        <label className="stock-board-sort">
          <span>정렬</span>
          <select value={sortMode} onChange={(event) => setSortMode(event.target.value)}>
            <option value="views">조회순</option>
            <option value="recommend">추천순</option>
            <option value="latest">최신순</option>
          </select>
        </label>
      </div>

      {error ? <p className="stock-board-state is-error">{error}</p> : null}
      {!error ? (
        <div className="stock-board-table">
          <div className="stock-board-row is-header">
            <span>번호</span>
            <span>제목</span>
            <span>작성자</span>
            <span>시간</span>
            <span>조회</span>
            <span>추천</span>
          </div>
          {!isLoading && displayedPosts.length === 0 ? (
            <p className="stock-board-empty">게시글이 없습니다.</p>
          ) : null}
          {displayedPosts.map((post) => (
            <div className="stock-board-entry" key={post.postId}>
              <article className="stock-board-row">
                <span>{post.postId}</span>
                <button
                  className="stock-board-title-link"
                  type="button"
                  aria-expanded={expandedPostId === post.postId}
                  onClick={() => setExpandedPostId((current) => (current === post.postId ? null : post.postId))}
                >
                  {post.title}
                </button>
                <span className="stock-board-author">
                  {post.username}
                  {post.authorHolding ? <i>보유</i> : null}
                </span>
                <span>{formatPostTime(post.createdAt)}</span>
                <span>{getViewCount(post)}</span>
                <span>{getRecommendCount(post)}</span>
              </article>
              {expandedPostId === post.postId ? (
                <div className="stock-board-inline">
                  <PostInlineThread
                    postId={post.postId}
                    onPostDeleted={(deletedPostId) => {
                      setPosts((current) => current.filter((item) => item.postId !== deletedPostId))
                      setExpandedPostId(null)
                    }}
                    onPostUpdated={(updatedPost) => {
                      setPosts((current) => current.map((item) => (
                        item.postId === updatedPost.postId ? { ...item, ...updatedPost } : item
                      )))
                    }}
                  />
                </div>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      {isFormOpen ? (
        <form className="stock-board-form" onSubmit={handleSubmit}>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder={isLoggedIn ? '제목' : '로그인 후 작성 가능'}
            disabled={!isLoggedIn || isSubmitting}
            maxLength={200}
          />
          <textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder={isLoggedIn ? '이 종목에 대한 의견을 남겨보세요.' : '로그인 후 작성할 수 있습니다.'}
            disabled={!isLoggedIn || isSubmitting}
            rows={3}
          />
          <div className="stock-board-form-foot">
            <span>{formError}</span>
            <button type="submit" disabled={!isLoggedIn || isSubmitting}>
              {isSubmitting ? '작성 중' : '등록'}
            </button>
          </div>
        </form>
      ) : null}

      <div className="stock-board-bottom">
        <button type="button" onClick={() => setIsFormOpen((isOpen) => !isOpen)}>
          {isFormOpen ? '닫기' : '글쓰기'}
        </button>
      </div>
    </section>
  )
}

function sortPosts(posts, mode) {
  return [...posts].sort((left, right) => {
    if (mode === 'views') {
      return getViewCount(right) - getViewCount(left) || compareLatest(left, right)
    }
    if (mode === 'recommend') {
      return getRecommendCount(right) - getRecommendCount(left) || compareLatest(left, right)
    }
    return compareLatest(left, right)
  })
}

function compareLatest(left, right) {
  return new Date(right.createdAt ?? 0).getTime() - new Date(left.createdAt ?? 0).getTime()
}

function getViewCount(post) {
  return Number(post.viewCount ?? post.views ?? 0)
}

function getRecommendCount(post) {
  return Number(post.recommendCount ?? post.recommendations ?? post.likes ?? 0)
}

function formatPostTime(value) {
  if (!value) return '-'
  return new Date(value).toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default StockBoardPanel
