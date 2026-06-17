function AppHeader({ health, isLoading, onRefresh, onLoginClick, onSignupClick, currentUser, onLogout }) {
  return (
    <header className="app-header">
      <div>
        <p className="eyebrow">Stock Viewer</p>
        <h1>Live Stock Monitor</h1>
      </div>
      <div className="header-actions">
        <div className="status-pill" aria-live="polite">
          <span className={health?.status === 'UP' ? 'status-dot is-up' : 'status-dot'} />
          API {health?.status ?? 'Checking'}
        </div>
        <button className="icon-button" type="button" onClick={onRefresh} aria-label="Refresh">
          <span className={isLoading ? 'refresh-symbol is-spinning' : 'refresh-symbol'} />
        </button>
        {currentUser ? (
          <>
            <span className="status-pill">👤 {currentUser.username}</span>
            <button className="icon-button" type="button" onClick={onLogout}>
              로그아웃
            </button>
          </>
        ) : (
          <>
            <button className="icon-button" type="button" onClick={onLoginClick}>
              로그인
            </button>
            <button className="icon-button auth-button-primary" type="button" onClick={onSignupClick}>
              회원가입
            </button>
          </>
        )}
      </div>
    </header>
  )
}

export default AppHeader
