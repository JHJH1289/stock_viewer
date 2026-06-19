import { useState } from 'react'
import { deletePost, updatePost } from '../services/boardApi'
import PostForm from './PostForm'

function PostDetail({ post, currentUsername, onClose, onDeleted, onUpdated }) {
  const [isEditing, setIsEditing] = useState(false)
  const [error, setError] = useState('')
  const isOwner = currentUsername && currentUsername === post.username

  async function handleDelete() {
    if (!window.confirm('정말 삭제하시겠습니까?')) return
    try {
      await deletePost(post.postId)
      onDeleted()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : '삭제에 실패했습니다.')
    }
  }

  async function handleUpdate({ title, content }) {
    const updated = await updatePost({ id: post.postId, title, content })
    onUpdated(updated)
  }

  if (isEditing) {
    return <PostForm initial={post} onSubmit={handleUpdate} onClose={() => setIsEditing(false)} />
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card post-detail-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="post-detail-title">{post.title}</h2>
          <button className="icon-button" onClick={onClose}>✕</button>
        </div>
        <div className="post-meta">
          <span className="post-author">{post.username}</span>
          <span className="post-date">{formatDate(post.createdAt)}</span>
        </div>
        <div className="post-content">{post.content}</div>
        {error && <p className="error-message">{error}</p>}
        {isOwner && (
          <div className="post-actions">
            <button className="auth-action" onClick={() => setIsEditing(true)}>수정</button>
            <button className="auth-action danger" onClick={handleDelete}>삭제</button>
          </div>
        )}
      </div>
    </div>
  )
}

function formatDate(isoString) {
  if (!isoString) return ''
  const d = new Date(isoString)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export default PostDetail
