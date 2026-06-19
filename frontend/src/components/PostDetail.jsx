import { useEffect, useState } from 'react'
import { createComment, deleteComment, deletePost, fetchComments, updateComment, updatePost } from '../services/boardApi'
import PostForm from './PostForm'

function PostDetail({ post, currentUsername, onClose, onDeleted, onUpdated }) {
  const [isEditing, setIsEditing] = useState(false)
  const [error, setError] = useState('')
  const [comments, setComments] = useState([])
  const [commentInput, setCommentInput] = useState('')
  const [editingComment, setEditingComment] = useState(null)
  const [editInput, setEditInput] = useState('')
  const [commentError, setCommentError] = useState('')
  const isLoggedIn = !!currentUsername; 
  const isOwner = isLoggedIn && (currentUsername === post.username);

  useEffect(() => {
    fetchComments(post.postId)
      .then(setComments)
      .catch(() => {})
  }, [post.postId])

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

  async function handleAddComment(e) {
    e.preventDefault()
    if (!commentInput.trim()) return
    setCommentError('')
    try {
      const created = await createComment({ postId: post.postId, content: commentInput.trim() })
      setComments(prev => [...prev, created])
      setCommentInput('')
    } catch (err) {
      setCommentError(err instanceof Error ? err.message : '댓글 작성에 실패했습니다.')
    }
  }

  async function handleEditComment(e) {
    e.preventDefault()
    if (!editInput.trim()) return
    setCommentError('')
    try {
      const updated = await updateComment({
        postId: post.postId,
        commentId: editingComment.commentId,
        content: editInput.trim(),
      })
      setComments(prev => prev.map(c => c.commentId === updated.commentId ? updated : c))
      setEditingComment(null)
      setEditInput('')
    } catch (err) {
      setCommentError(err instanceof Error ? err.message : '댓글 수정에 실패했습니다.')
    }
  }

  async function handleDeleteComment(commentId) {
    if (!window.confirm('댓글을 삭제하시겠습니까?')) return
    try {
      await deleteComment({ postId: post.postId, commentId })
      setComments(prev => prev.filter(c => c.commentId !== commentId))
    } catch (err) {
      setCommentError(err instanceof Error ? err.message : '댓글 삭제에 실패했습니다.')
    }
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
        {error && <p className="modal-error">{error}</p>}
        {isOwner && (
          <div className="post-actions">
            <button className="auth-action" onClick={() => setIsEditing(true)}>수정</button>
            <button className="auth-action danger" onClick={handleDelete}>삭제</button>
          </div>
        )}

        <div className="comments-section">
          <h3 className="comments-heading">
            댓글{comments.length > 0 ? ` ${comments.length}개` : ''}
          </h3>

          {comments.length === 0 && (
            <p className="comments-empty">첫 번째 댓글을 남겨보세요.</p>
          )}

          <ul className="comment-list">
            {comments.map(c => (
              <li key={c.commentId} className="comment-item">
                <div className="comment-meta">
                  <span className="comment-author">{c.username}</span>
                  <span className="comment-date">{formatDate(c.createdAt)}</span>
                  {currentUsername === c.username && editingComment?.commentId !== c.commentId && (
                    <span className="comment-actions">
                      <button
                        className="comment-action-btn"
                        type="button"
                        onClick={() => { setEditingComment(c); setEditInput(c.content) }}
                      >수정</button>
                      <button
                        className="comment-action-btn danger"
                        type="button"
                        onClick={() => handleDeleteComment(c.commentId)}
                      >삭제</button>
                    </span>
                  )}
                </div>

                {editingComment?.commentId === c.commentId ? (
                  <form className="comment-edit-form" onSubmit={handleEditComment}>
                    <textarea
                      className="comment-textarea"
                      value={editInput}
                      onChange={e => setEditInput(e.target.value)}
                      rows={2}
                      autoFocus
                    />
                    <div className="comment-edit-actions">
                      <button type="submit" className="auth-action primary small">저장</button>
                      <button
                        type="button"
                        className="auth-action small"
                        onClick={() => { setEditingComment(null); setEditInput('') }}
                      >취소</button>
                    </div>
                  </form>
                ) : (
                  <div className="comment-content">{c.content}</div>
                )}
              </li>
            ))}
          </ul>

          {commentError && <p className="modal-error" style={{ marginTop: 8 }}>{commentError}</p>}

          {currentUsername ? (
            <form className="comment-form" onSubmit={handleAddComment}>
              <textarea
                className="comment-textarea"
                placeholder="댓글을 입력하세요"
                value={commentInput}
                onChange={e => setCommentInput(e.target.value)}
                rows={2}
              />
              <button
                type="submit"
                className="auth-action primary small"
                disabled={!commentInput.trim()}
              >
                댓글 작성
              </button>
            </form>
          ) : (
            <p className="comments-login-hint">댓글을 작성하려면 로그인하세요.</p>
          )}
        </div>
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
