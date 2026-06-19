import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { createPost, fetchGeneralPosts } from '../services/boardApi'
import PostDetail from './PostDetail'
import PostForm from './PostForm'

const PAGE_SIZE = 10

function GeneralBoard() {
  const currentUsername = window.localStorage.getItem('username')
  const [posts, setPosts] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [selectedPost, setSelectedPost] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)
  
  // 로그인 여부를 실시간으로 계산 (currentUsername이 변경되면 즉시 업데이트됨)
  const isLoggedIn = !!currentUsername;

  useEffect(() => {
    let cancelled = false
    async function load() {
      setIsLoading(true)
      setError('')
      try {
        const data = await fetchGeneralPosts(page, PAGE_SIZE)
        if (!cancelled) {
          setPosts(data.content ?? data ?? [])
          setTotalPages(data.totalPages ?? 1)
        }
      } catch (err) {
        if (!cancelled) setError(err.message ?? '게시글을 불러오지 못했습니다.')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [page, refreshKey])

  function refresh() {
    setPage(0)
    setRefreshKey((k) => k + 1)
  }

  async function handleCreate({ title, content }) {
    await createPost({ title, content })
    refresh()
  }

  return (
    <main className="app-shell">
      <header className="detail-header is-compact">
        <Link className="back-link" to="/">Back</Link>
      </header>
      <div className="board-container">
        <div className="board-heading">
          <h2>전체 게시판</h2>
          {isLoggedIn && (
            <button 
              className="auth-action primary" 
              onClick={() => setShowForm(true)}
            >
              글 작성
            </button>
          )}
        </div>

        {isLoading && <div className="board-empty">불러오는 중...</div>}
        {error && <div className="board-empty" style={{ color: 'red' }}>{error}</div>}
        
        {!isLoading && !error && posts.length === 0 && (
          <div className="board-empty">첫 번째 글을 작성해보세요.</div>
        )}

        <ul className="post-list">
          {posts.map((post) => (
            <li key={post.postId} className="post-item" onClick={() => setSelectedPost(post)}>
              <span className="post-item-title">{post.title}</span>
              <span className="post-item-meta">
                <span>{post.username}</span>
                <span>{formatDate(post.createdAt)}</span>
              </span>
            </li>
          ))}
        </ul>

        {totalPages > 1 && (
          <div className="pagination">
            <button className="page-btn" onClick={() => setPage((p) => p - 1)} disabled={page === 0}>이전</button>
            <span className="page-info">{page + 1} / {totalPages}</span>
            <button className="page-btn" onClick={() => setPage((p) => p + 1)} disabled={page >= totalPages - 1}>다음</button>
          </div>
        )}

        {showForm && <PostForm onSubmit={handleCreate} onClose={() => setShowForm(false)} />}
        
        {selectedPost && (
          <PostDetail
            post={selectedPost}
            currentUsername={currentUsername}
            isLoggedIn={isLoggedIn} 
            onClose={() => setSelectedPost(null)}
            onDeleted={refresh}
            onUpdated={(updated) => {
              setPosts((prev) => prev.map((p) => (p.postId === updated.postId ? updated : p)))
              setSelectedPost(updated)
            }}
          />
        )}
      </div>
    </main>
  )
}

function formatDate(isoString) {
  if (!isoString) return ''
  const d = new Date(isoString)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}

export default GeneralBoard