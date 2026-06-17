function AppHeader({ health, isLoading, onRefresh }) {
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
      </div>
    </header>
  )
}

export default AppHeader
