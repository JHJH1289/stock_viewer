import { useEffect, useState } from 'react'
import { createPostComment, fetchBoardPost, fetchPostComments } from '../services/stockApi'

function PostInlineThread({ postId }) {
  const [post, setPost] = useState(null)
  const [comments, setComments] = useState([])
  const [commentText, setCommentText] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [commentError, setCommentError] = useState('')
  const isLoggedIn = Boolean(window.localStorage.getItem('token'))

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
        <p>{post.content}</p>
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
                <p>{comment.content}</p>
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
