function timeAgo(timestamp) {
  const diff = Date.now() - new Date(timestamp).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins} min ago`
  const hours = Math.floor(mins / 60)
  return `${hours}h ${mins % 60}m ago`
}

export default function IncidentFeed({ incidents, filterType, onFilterChange, onIncidentClick, selectedId }) {
  const types = [
    { value: '', label: 'All Types' },
    { value: 'pothole', label: 'Pothole' },
    { value: 'road_damage', label: 'Road Damage' },
    { value: 'accident', label: 'Accident' },
    { value: 'congestion', label: 'Congestion' }
  ]

  const getSeverityClass = (sev) => `severity-${sev?.toLowerCase() || 'low'}`

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="filter-bar">
        <select 
          value={filterType || ''} 
          onChange={(e) => onFilterChange(e.target.value || null)}
        >
          {types.map(t => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </div>
      <div className="incident-feed">
        {incidents.map(inc => (
          <div 
            key={inc.id}
            className={`incident-card ${inc.type} ${selectedId === inc.id ? 'selected' : ''}`}
            onClick={() => onIncidentClick(inc)}
          >
            <div>
              <span className="incident-type-badge">{inc.type.replace('_', ' ')}</span>
              <span className={`severity-badge ${getSeverityClass(inc.severity)}`}>
                {inc.severity}
              </span>
            </div>
            <div className="incident-meta">
              <span>{inc.lat.toFixed(4)}, {inc.lng.toFixed(4)}</span>
              <span>{timeAgo(inc.timestamp)}</span>
            </div>
            <div className="incident-meta" style={{ marginTop: '4px' }}>
              <span>Accuracy: {inc.accuracy?.toFixed(1)}%</span>
            </div>
          </div>
        ))}
        {incidents.length === 0 && (
          <div style={{ padding: '20px', textAlign: 'center', color: '#888' }}>
            No incidents found.
          </div>
        )}
      </div>
    </div>
  )
}
