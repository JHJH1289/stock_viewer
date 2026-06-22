import { useEffect, useState } from 'react'
import {
  createPostComment,
  deleteBoardPost,
  deletePostComment,
  fetchBoardPost,
  fetchPostComments,
  updateBoardPost,
  updatePostComment,
} from '../services/stockApi'

function PostInlineThread({ postId, onPostDeleted, onPostUpdated }) {
  const [post, setPost] = useState(null)
  const [comments, setComments] = useState([])
  const [commentText, setCommentText] = useState('')
  const [editingPost, setEditingPost] = useState(null)
  const [editingCommentId, setEditingCommentId] = useState(null)
  const [editingCommentText, setEditingCommentText] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [commentError, setCommentError] = useState('')
  const isLoggedIn = Boolean(window.localStorage.getItem('token'))
  const username = window.localStorage.getItem('username')
  const canEditPost = Boolean(username && post?.username === username)

  useEffect(() => {
    let cancelled = false

    async function loadThread() {
      setIsLoading(true)
      try {
        const [nextPost, nextComments] = await Promise.all([
          fetchBoardPost(postId),
          fetchPostComments(postId),
        ])
        if (cancelled) return
        setPost(nextPost)
        setComments(nextComments)
        setError('')
      } catch (err) {
        if (cancelled) return
        setPost(null)
        setComments([])
        setError(err instanceof Error ? err.message : '게시글을 불러오지 못했습니다.')
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    loadThread()

    return () => {
      cancelled = true
    }
  }, [postId])

  async function handleCommentSubmit(event) {
    event.preventDefault()
    if (!commentText.trim()) {
      setCommentError('댓글 내용을 입력해주세요.')
      return
    }

    setIsSubmitting(true)
    try {
      const created = await createPostComment(postId, { content: commentText.trim() })
      setComments((current) => [...current, created])
      setCommentText('')
      setCommentError('')
    } catch (err) {
      setCommentError(err instanceof Error ? err.message : '댓글 작성에 실패했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handlePostEditSubmit(event) {
    event.preventDefault()
    if (!editingPost?.title.trim() || !editingPost?.content.trim()) {
      setError('제목과 내용을 입력해주세요.')
      return
    }

    setIsSubmitting(true)
    try {
      const updated = await updateBoardPost(postId, {
        title: editingPost.title.trim(),
        content: editingPost.content.trim(),
      })
      setPost(updated)
      setEditingPost(null)
      setError('')
      onPostUpdated?.(updated)
    } catch (err) {
      setError(err instanceof Error ? err.message : '게시글 수정에 실패했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handlePostDelete() {
    if (!window.confirm('게시글을 삭제할까요?')) return

    setIsSubmitting(true)
    try {
      await deleteBoardPost(postId)
      onPostDeleted?.(postId)
    } catch (err) {
      setError(err instanceof Error ? err.message : '게시글 삭제에 실패했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  function startCommentEdit(comment) {
    setEditingCommentId(comment.commentId)
    setEditingCommentText(comment.content)
    setCommentError('')
  }

  async function handleCommentEditSubmit(event, commentId) {
    event.preventDefault()
    if (!editingCommentText.trim()) {
      setCommentError('댓글 내용을 입력해주세요.')
      return
    }

    setIsSubmitting(true)
    try {
      const updated = await updatePostComment(postId, commentId, { content: editingCommentText.trim() })
      setComments((current) => current.map((comment) => (
        comment.commentId === commentId ? updated : comment
      )))
      setEditingCommentId(null)
      setEditingCommentText('')
      setCommentError('')
    } catch (err) {
      setCommentError(err instanceof Error ? err.message : '댓글 수정에 실패했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleCommentDelete(commentId) {
    if (!window.confirm('댓글을 삭제할까요?')) return

    setIsSubmitting(true)
    try {
      await deletePostComment(postId, commentId)
      setComments((current) => current.filter((comment) => comment.commentId !== commentId))
    } catch (err) {
      setCommentError(err instanceof Error ? err.message : '댓글 삭제에 실패했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return <p className="inline-thread-state">게시글을 불러오는 중입니다.</p>
  }

  if (error) {
    return <p className="inline-thread-state is-error">{error}</p>
  }

  if (!post) {
    return null
  }

  return (
    <div className="inline-thread">
      <div className="inline-thread-body">
        {editingPost ? (
          <form className="inline-edit-form" onSubmit={handlePostEditSubmit}>
            <input
              value={editingPost.title}
              onChange={(event) => setEditingPost((current) => ({ ...current, title: event.target.value }))}
              disabled={isSubmitting}
              maxLength={200}
            />
            <textarea
              value={editingPost.content}
              onChange={(event) => setEditingPost((current) => ({ ...current, content: event.target.value }))}
              disabled={isSubmitting}
              rows={4}
            />
            <div>
              <button type="submit" disabled={isSubmitting}>저장</button>
              <button type="button" disabled={isSubmitting} onClick={() => setEditingPost(null)}>취소</button>
            </div>
          </form>
        ) : (
          <>
            <div className="inline-thread-actions">
              <dl>
                <div>
                  <dt>조회</dt>
                  <dd>{post.viewCount ?? 0}</dd>
                </div>
                <div>
                  <dt>추천</dt>
                  <dd>{post.recommendCount ?? 0}</dd>
                </div>
              </dl>
              {canEditPost ? (
                <div className="inline-action-buttons">
                  <button
                    type="button"
                    onClick={() => setEditingPost({ title: post.title, content: post.content })}
                    disabled={isSubmitting}
                  >
                    수정
                  </button>
                  <button type="button" onClick={handlePostDelete} disabled={isSubmitting}>
                    삭제
                  </button>
                </div>
              ) : null}
            </div>
            <p>{post.content}</p>
          </>
        )}
      </div>

      <section className="inline-comments" aria-label="Comments">
        <div className="inline-comments-heading">
          <strong>댓글 [{comments.length}]</strong>
        </div>
        {comments.length === 0 ? (
          <p className="inline-thread-state">댓글이 없습니다.</p>
        ) : (
          <div className="inline-comment-list">
            {comments.map((comment) => (
              <article className="inline-comment" key={comment.commentId}>
                <div>
                  <strong>{comment.username}</strong>
                  <span>{formatDateTime(comment.createdAt)}</span>
                </div>
                {editingCommentId === comment.commentId ? (
                  <form className="inline-edit-form is-comment-edit" onSubmit={(event) => handleCommentEditSubmit(event, comment.commentId)}>
                    <textarea
                      value={editingCommentText}
                      onChange={(event) => setEditingCommentText(event.target.value)}
                      disabled={isSubmitting}
                      rows={2}
                    />
                    <div>
                      <button type="submit" disabled={isSubmitting}>저장</button>
                      <button type="button" disabled={isSubmitting} onClick={() => setEditingCommentId(null)}>취소</button>
                    </div>
                  </form>
                ) : (
                  <>
                    <p>{comment.content}</p>
                    {username && comment.username === username ? (
                      <div className="inline-action-buttons is-comment-actions">
                        <button type="button" onClick={() => startCommentEdit(comment)} disabled={isSubmitting}>
                          수정
                        </button>
                        <button type="button" onClick={() => handleCommentDelete(comment.commentId)} disabled={isSubmitting}>
                          삭제
                        </button>
                      </div>
                    ) : null}
                  </>
                )}
              </article>
            ))}
          </div>
        )}

        <form className="inline-comment-form" onSubmit={handleCommentSubmit}>
          <textarea
            value={commentText}
            onChange={(event) => setCommentText(event.target.value)}
            placeholder={isLoggedIn ? '댓글을 입력하세요.' : '로그인 후 댓글을 작성할 수 있습니다.'}
            disabled={!isLoggedIn || isSubmitting}
            rows={2}
          />
          <div>
            <span>{commentError}</span>
            <button type="submit" disabled={!isLoggedIn || isSubmitting}>
              {isSubmitting ? '작성 중' : '댓글쓰기'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}

function formatDateTime(value) {
  if (!value) return '-'
  return new Date(value).toLocaleString('ko-KR')
}

export default PostInlineThread
