import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { createPostComment, fetchBoardPost, fetchPostComments } from '../services/stockApi'

function PostDetailPage() {
  const { postId = '' } = useParams()
  const [post, setPost] = useState(null)
  const [comments, setComments] = useState([])
  const [commentText, setCommentText] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [commentError, setCommentError] = useState('')
  const isLoggedIn = Boolean(window.localStorage.getItem('token'))

  useEffect(() => {
    document.body.classList.add('is-detail-page')

    return () => {
      document.body.classList.remove('is-detail-page')
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    async function loadPost() {
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

    loadPost()

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

  return (
    <main className="app-shell">
      <header className="detail-header is-compact">
        <Link className="back-link" to={post?.symbol ? `/${post.symbol}` : '/'}>
          Back
        </Link>
      </header>

      <section className="post-detail-page" aria-label="Post detail">
        {isLoading ? <p className="post-detail-state">게시글을 불러오는 중입니다.</p> : null}
        {error ? <p className="post-detail-state is-error">{error}</p> : null}

        {post ? (
          <>
            <article className="post-detail-card">
              <div className="post-detail-titlebar">
                <h1>{post.title}</h1>
                <dl>
                  <div>
                    <dt>추천</dt>
                    <dd>{post.recommendCount ?? 0}</dd>
                  </div>
                  <div>
                    <dt>조회</dt>
                    <dd>{post.viewCount ?? 0}</dd>
                  </div>
                </dl>
              </div>
              <div className="post-detail-meta">
                <strong className="post-detail-author">
                  {post.username}
                  {post.authorHolding ? <i>보유</i> : null}
                </strong>
                <span>{formatDateTime(post.createdAt)}</span>
              </div>
              <p className="post-detail-content">{post.content}</p>
              <div className="post-detail-actions">
                <button type="button">추천 {post.recommendCount ?? 0}</button>
                <button type="button">비추 0</button>
              </div>
            </article>

            <section className="post-comments" aria-label="Comments">
              <div className="post-comments-heading">
                <h2>댓글 [{comments.length}]</h2>
              </div>
              {comments.length === 0 ? (
                <p className="post-detail-state">댓글이 없습니다.</p>
              ) : (
                <div className="post-comment-list">
                  {comments.map((comment) => (
                    <article className="post-comment" key={comment.commentId}>
                      <div>
                        <strong>{comment.username}</strong>
                        <span>{formatDateTime(comment.createdAt)}</span>
                      </div>
                      <p>{comment.content}</p>
                    </article>
                  ))}
                </div>
              )}

              <form className="post-comment-form" onSubmit={handleCommentSubmit}>
                <textarea
                  value={commentText}
                  onChange={(event) => setCommentText(event.target.value)}
                  placeholder={isLoggedIn ? '댓글을 입력하세요.' : '로그인 후 댓글을 작성할 수 있습니다.'}
                  disabled={!isLoggedIn || isSubmitting}
                  rows={3}
                />
                <div>
                  <span>{commentError}</span>
                  <button type="submit" disabled={!isLoggedIn || isSubmitting}>
                    {isSubmitting ? '작성 중' : '댓글쓰기'}
                  </button>
                </div>
              </form>
            </section>
          </>
        ) : null}
      </section>
    </main>
  )
}

function formatDateTime(value) {
  if (!value) return '-'
  return new Date(value).toLocaleString('ko-KR')
}

export default PostDetailPage
