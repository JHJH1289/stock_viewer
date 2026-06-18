function AppHeader({ health, isLoading, theme, onRefresh, onThemeChange }) {
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
        <button className="theme-toggle" type="button" onClick={onThemeChange} aria-label="Change theme">
          <span className={theme === 'light' ? 'theme-icon is-light' : 'theme-icon is-dark'} />
          {theme === 'light' ? 'Light' : 'Dark'}
        </button>
        <button className="icon-button" type="button" onClick={onRefresh} aria-label="Refresh">
          <span className={isLoading ? 'refresh-symbol is-spinning' : 'refresh-symbol'} />
        </button>
      </div>
    </header>
  )
}

export default AppHeader
