import { useEffect, useState } from 'react'
import PostInlineThread from './PostInlineThread'
import { fetchMarketBoardPosts } from '../services/stockApi'

const marketSlots = [
  { marketCode: 'KR', eyebrow: 'KR Market', title: '한국 주식 게시판' },
  { marketCode: 'US', eyebrow: 'US Market', title: '미국 주식 게시판' },
]

function MarketBoardSlots() {
  const [boards, setBoards] = useState(() => ({
    KR: { posts: [], isLoading: true, error: '' },
    US: { posts: [], isLoading: true, error: '' },
  }))

  useEffect(() => {
    let cancelled = false

    async function loadMarketPosts() {
      const results = await Promise.all(
        marketSlots.map(async ({ marketCode }) => {
          try {
            const posts = await fetchMarketBoardPosts(marketCode, { size: 5 })
            return [marketCode, { posts, isLoading: false, error: '' }]
          } catch (err) {
            return [
              marketCode,
              {
                posts: [],
                isLoading: false,
                error: err instanceof Error ? err.message : '시장 게시글을 불러오지 못했습니다.',
              },
            ]
          }
        }),
      )

      if (!cancelled) {
        setBoards(Object.fromEntries(results))
      }
    }

    loadMarketPosts()

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <section className="market-board-slots" aria-label="Market boards">
      {marketSlots.map((slot) => (
        <BoardSlot
          key={slot.marketCode}
          eyebrow={slot.eyebrow}
          title={slot.title}
          posts={boards[slot.marketCode]?.posts ?? []}
          isLoading={boards[slot.marketCode]?.isLoading ?? false}
          error={boards[slot.marketCode]?.error ?? ''}
        />
      ))}
    </section>
  )
}

function BoardSlot({ eyebrow, title, posts, isLoading, error }) {
  const [expandedPostId, setExpandedPostId] = useState(null)

  return (
    <div className="board-slot">
      <div className="board-slot-heading">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h2>{title}</h2>
        </div>
        <span>{isLoading ? '불러오는 중' : `${posts.length}개`}</span>
      </div>
      {error ? <p className="board-slot-state">{error}</p> : null}
      {!error && !isLoading && posts.length === 0 ? (
        <p className="board-slot-state">아직 게시글이 없습니다.</p>
      ) : null}
      {!error && posts.length > 0 ? (
        <div className="board-post-list">
          {posts.map((post) => (
            <article
              className={expandedPostId === post.postId ? 'board-post-preview is-expanded' : 'board-post-preview'}
              key={`${title}-${post.postId}`}
            >
              <button
                className="board-post-title-button"
                type="button"
                aria-expanded={expandedPostId === post.postId}
                onClick={() => setExpandedPostId((current) => (current === post.postId ? null : post.postId))}
              >
                {post.title}
              </button>
              <span className="board-post-meta">
                {post.symbol ? <b>{post.symbol}</b> : null}
                <span>{post.username ?? '-'}</span>
                {post.authorHolding ? <i>보유</i> : null}
                <span>{formatPostDate(post.createdAt)}</span>
              </span>
              {expandedPostId === post.postId ? (
                <div className="board-post-inline">
                  <PostInlineThread postId={post.postId} />
                </div>
              ) : null}
            </article>
          ))}
        </div>
      ) : null}
    </div>
  )
}

function formatPostDate(value) {
  if (!value) return '-'
  return new Date(value).toLocaleDateString('ko-KR')
}

export default MarketBoardSlots
