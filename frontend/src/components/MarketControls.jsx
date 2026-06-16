const directionOptions = [
  ['all', 'All'],
  ['up', 'Up'],
  ['down', 'Down'],
]

function MarketControls({
  query,
  direction,
  refreshSeconds,
  refreshOptions,
  onQueryChange,
  onDirectionChange,
  onRefreshSecondsChange,
}) {
  return (
    <section className="control-bar" aria-label="Quote filters">
      <label className="search-field">
        <span>Search</span>
        <input
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Name or symbol"
        />
      </label>

      <div className="segmented-control" aria-label="Move direction">
        {directionOptions.map(([value, label]) => (
          <button
            className={direction === value ? 'is-active' : ''}
            type="button"
            key={value}
            onClick={() => onDirectionChange(value)}
          >
            {label}
          </button>
        ))}
      </div>

      <label className="refresh-select">
        <span>Refresh</span>
        <select
          value={refreshSeconds}
          onChange={(event) => onRefreshSecondsChange(Number(event.target.value))}
        >
          {refreshOptions.map((seconds) => (
            <option value={seconds} key={seconds}>
              {seconds}s
            </option>
          ))}
        </select>
      </label>
    </section>
  )
}

export default MarketControls
