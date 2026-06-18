function IntegrationStatusList({ integrations }) {
  const checks = integrations?.checks ?? []

  return (
    <section className="integration-panel" aria-label="API integration status">
      <div className="integration-heading">
        <div>
          <p className="eyebrow">API Integrations</p>
          <h2>Connection Status</h2>
        </div>
        <span>{checks.length ? `${configuredCount(checks)}/${checks.length} connected` : 'Checking'}</span>
      </div>

      <div className="integration-list">
        {checks.map((check) => (
          <div className="integration-row" key={check.name}>
            <span className={check.configured ? 'status-dot is-up' : 'status-dot'} />
            <strong>{check.name}</strong>
            <span>{check.configured ? 'Connected' : 'Missing'}</span>
          </div>
        ))}
      </div>
    </section>
  )
}

function configuredCount(checks) {
  return checks.filter((check) => check.configured).length
}

export default IntegrationStatusList
