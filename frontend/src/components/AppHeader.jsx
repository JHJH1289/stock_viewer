import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

function AppHeader({
  health,
  integrations,
  isLoading,
  theme,
  onRefresh,
  onThemeChange,
  currentUser,
  onLoginClick,
  onSignupClick,
  onLogout,
}) {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const userMenuRef = useRef(null)

  useEffect(() => {
    function handlePointerDown(event) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setIsUserMenuOpen(false)
      }
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setIsUserMenuOpen(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  function handleLogout() {
    setIsUserMenuOpen(false)
    onLogout()
  }

  const dartStatus = getIntegrationStatus(integrations, 'OpenDART')
  const kisStatus = getIntegrationStatus(integrations, 'Korea Investment')

  return (
    <header className="app-header">
      <div>
        <p className="eyebrow">Stock Viewer</p>
        <h1>Live Stock Monitor</h1>
      </div>
      <div className="header-actions">
        <div className="status-pill" aria-live="polite" title={`Backend ${health?.status ?? 'Checking'}`}>
          <span className={dartStatus.configured ? 'status-dot is-up' : 'status-dot'} />
          DART {dartStatus.label}
        </div>
        <div className="status-pill" aria-live="polite" title={`Backend ${health?.status ?? 'Checking'}`}>
          <span className={kisStatus.configured ? 'status-dot is-up' : 'status-dot'} />
          KIS {kisStatus.label}
        </div>
        <button className="theme-toggle" type="button" onClick={onThemeChange} aria-label="Change theme">
          <span className={theme === 'light' ? 'theme-icon is-light' : 'theme-icon is-dark'} />
          {theme === 'light' ? 'Light' : 'Dark'}
        </button>
        <button className="icon-button" type="button" onClick={onRefresh} aria-label="Refresh">
          <span className={isLoading ? 'refresh-symbol is-spinning' : 'refresh-symbol'} />
        </button>
        {currentUser ? (
          <div className="user-menu" ref={userMenuRef}>
            <button
              className="user-menu-trigger"
              type="button"
              aria-expanded={isUserMenuOpen}
              aria-haspopup="menu"
              onClick={() => setIsUserMenuOpen((isOpen) => !isOpen)}
            >
              {currentUser.username}
            </button>
            {isUserMenuOpen ? (
              <div className="user-menu-panel" role="menu">
                <Link className="user-menu-item" to="/mypage" role="menuitem" onClick={() => setIsUserMenuOpen(false)}>
                  마이 페이지
                </Link>
                <button className="user-menu-item" type="button" role="menuitem" onClick={handleLogout}>
                  로그아웃
                </button>
              </div>
            ) : null}
          </div>
        ) : (
          <>
            <button className="auth-action" type="button" onClick={onLoginClick}>
              로그인
            </button>
            <button className="auth-action auth-action-primary" type="button" onClick={onSignupClick}>
              회원가입
            </button>
          </>
        )}
      </div>
    </header>
  )
}

function getIntegrationStatus(integrations, name) {
  const check = integrations?.checks?.find((item) => item.name === name)
  if (!check) {
    return { configured: false, label: 'Checking' }
  }

  return {
    configured: check.configured,
    label: check.configured ? 'UP' : 'Missing',
  }
}

export default AppHeader
