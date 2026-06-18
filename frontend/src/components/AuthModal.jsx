import { useEffect, useState } from 'react'
import { login, signup } from '../services/stockApi'

const emptyForm = {
  username: '',
  email: '',
  password: '',
  confirmPassword: '',
}

function AuthModal({ mode, onClose, onModeChange, onAuthSuccess }) {
  const isLogin = mode === 'login'
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [signupSuccess, setSignupSuccess] = useState(false)

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  function handleModeChange(nextMode) {
    setForm(emptyForm)
    setError('')
    setSignupSuccess(false)
    onModeChange(nextMode)
  }

  function handleChange(event) {
    setError('')
    setForm((currentForm) => ({
      ...currentForm,
      [event.target.name]: event.target.value,
    }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')

    if (!isLogin && form.password !== form.confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.')
      return
    }

    setIsLoading(true)
    try {
      if (isLogin) {
        const data = await login({ email: form.email, password: form.password })
        window.localStorage.setItem('token', data.token)
        window.localStorage.setItem('username', data.username)
        onAuthSuccess?.(data)
        onClose()
        return
      }

      await signup({ username: form.username, email: form.email, password: form.password })
      const signedUpEmail = form.email
      setSignupSuccess(true)
      setTimeout(() => {
        setSignupSuccess(false)
        setForm({ ...emptyForm, email: signedUpEmail })
        onModeChange('login')
      }, 1200)
    } catch (err) {
      setError(err instanceof Error ? err.message : '요청을 처리하지 못했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <h2>{isLogin ? '로그인' : '회원가입'}</h2>
          <button className="modal-close" type="button" onClick={onClose} aria-label="닫기">
            x
          </button>
        </div>

        <form className="modal-form" onSubmit={handleSubmit}>
          {!isLogin ? (
            <label className="form-field">
              <span>사용자명</span>
              <input
                name="username"
                type="text"
                placeholder="사용자명을 입력하세요"
                value={form.username}
                onChange={handleChange}
                required
              />
            </label>
          ) : null}

          <label className="form-field">
            <span>이메일</span>
            <input
              name="email"
              type="email"
              placeholder="이메일을 입력하세요"
              value={form.email}
              onChange={handleChange}
              required
            />
          </label>

          <label className="form-field">
            <span>비밀번호</span>
            <input
              name="password"
              type="password"
              placeholder="비밀번호를 입력하세요"
              value={form.password}
              onChange={handleChange}
              required
            />
          </label>

          {!isLogin ? (
            <label className="form-field">
              <span>비밀번호 확인</span>
              <input
                name="confirmPassword"
                type="password"
                placeholder="비밀번호를 다시 입력하세요"
                value={form.confirmPassword}
                onChange={handleChange}
                required
              />
            </label>
          ) : null}

          {signupSuccess ? <p className="modal-success">회원가입이 완료되었습니다. 로그인 화면으로 이동합니다.</p> : null}
          {error ? <p className="modal-error">{error}</p> : null}

          <button className="modal-submit" type="submit" disabled={isLoading}>
            {isLoading ? '처리 중...' : isLogin ? '로그인' : '회원가입'}
          </button>
        </form>

        <p className="modal-switch">
          {isLogin ? '계정이 없으신가요?' : '이미 계정이 있으신가요?'}
          {' '}
          <button type="button" onClick={() => handleModeChange(isLogin ? 'signup' : 'login')}>
            {isLogin ? '회원가입' : '로그인'}
          </button>
        </p>
      </div>
    </div>
  )
}

export default AuthModal
