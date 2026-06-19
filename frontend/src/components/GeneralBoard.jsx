import { useEffect, useState } from 'react'
import { createPost, fetchGeneralPosts } from '../services/boardApi'
import PostDetail from './PostDetail'
import PostForm from './PostForm'

function GeneralBoard({ currentUsername }) {
  const [posts, setPosts] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedPost, setSelectedPost] = useState(null)
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setIsLoading(true)
      try {
        const data = await fetchGeneralPosts()
        if (!cancelled) setPosts(data)
      } catch {
        /* ignored */
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  async function handleCreate({ title, content }) {
    const newPost = await createPost({ title, content })
    setPosts((prev) => [newPost, ...prev])
  }

  return (
    <div className="board-container">
      <div className="board-heading">
        <h2>전체 게시판</h2>
        {currentUsername && (
          <button className="auth-action primary" onClick={() => setShowForm(true)}>글 작성</button>
        )}
      </div>
      {isLoading && <div className="board-empty">불러오는 중...</div>}
      {!isLoading && posts.length === 0 && <div className="board-empty">첫 번째 글을 작성해보세요.</div>}
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
      {showForm && <PostForm onSubmit={handleCreate} onClose={() => setShowForm(false)} />}
      {selectedPost && (
        <PostDetail
          post={selectedPost}
          currentUsername={currentUsername}
          onClose={() => setSelectedPost(null)}
          onDeleted={() => setPosts((prev) => prev.filter((p) => p.postId !== selectedPost.postId))}
          onUpdated={(updated) => {
            setPosts((prev) => prev.map((p) => (p.postId === updated.postId ? updated : p)))
            setSelectedPost(updated)
          }}
        />
      )}
    </div>
  )
}

function formatDate(isoString) {
  if (!isoString) return ''
  const d = new Date(isoString)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}

export default GeneralBoard