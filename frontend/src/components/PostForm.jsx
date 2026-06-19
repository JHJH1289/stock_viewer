import { useState } from 'react'

function PostForm({ initial = null, onSubmit, onClose }) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [content, setContent] = useState(initial?.content ?? '')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!title.trim() || !content.trim()) {
      setError('제목과 내용을 입력해주세요.')
      return
    }
    setIsLoading(true)
    setError('')
    try {
      await onSubmit({ title: title.trim(), content: content.trim() })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card post-form-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{initial ? '글 수정' : '글 작성'}</h2>
          <button className="icon-button" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit} className="post-form">
          <div className="post-form-field">
            <label>제목</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="제목을 입력하세요"
              maxLength={200}
            />
          </div>
          <div className="post-form-field">
            <label>내용</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="내용을 입력하세요"
              rows={8}
            />
          </div>
          {error && <p className="error-message">{error}</p>}
          <div className="post-form-actions">
            <button type="button" className="auth-action" onClick={onClose}>취소</button>
            <button type="submit" className="auth-action primary" disabled={isLoading}>
              {isLoading ? '처리 중...' : (initial ? '수정' : '작성')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default PostForm