import React from 'react';

function timeAgo(timestamp) {
  if (!timestamp) return '';
  const safeTimestamp = timestamp.endsWith('Z') ? timestamp : `${timestamp}Z`;
  const diff = Math.max(0, Date.now() - new Date(safeTimestamp).getTime());
  const secs = Math.floor(diff / 1000);
  if (secs <= 10) return 'Just now';
  if (secs < 60) return `${secs} sec ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (mins % 60 === 0) return `${hours} hr ago`;
  return `${hours} hr ${mins % 60} min ago`;
}

export default function IncidentFeed({ incidents, filterType, onFilterChange, onIncidentClick, selectedId, isAuthority }) {
  const [severityFilter, setSeverityFilter] = React.useState('');
  const [tick, setTick] = React.useState(0);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setTick(t => t + 1);
    }, 10000);
    return () => clearInterval(interval);
  }, []);
  
  const types = [
    { value: '', label: 'All Types' },
    { value: 'pothole', label: 'Pothole' },
    { value: 'road_damage', label: 'Road Damage' },
    { value: 'accident', label: 'Accident' },
    { value: 'congestion', label: 'Congestion' },
    { value: 'hit_and_run', label: 'Hit & Run' },
    { value: 'overspeeding', label: 'Overspeeding' },
    { value: 'lane_violation', label: 'Lane Violation' }
  ]

  const severities = [
    { value: '', label: 'All Severities' },
    { value: 'critical', label: 'Critical' },
    { value: 'high', label: 'High' },
    { value: 'medium', label: 'Medium' },
    { value: 'low', label: 'Low' }
  ]

  const getSeverityClass = (sev) => `severity-${sev?.toLowerCase() || 'low'}`

  const filtered = incidents.filter(inc => {
    if (filterType && inc.type !== filterType) return false;
    if (severityFilter && inc.severity.toLowerCase() !== severityFilter) return false;
    return true;
  });

  return (
    <div className="incident-feed-container" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="filter-bar" style={{ display: 'flex', gap: '8px', padding: '10px 15px', borderBottom: '1px solid #30363d' }}>
        <select 
          value={filterType || ''} 
          onChange={(e) => onFilterChange(e.target.value || null)}
          className="filter-select"
          style={{ flex: 1, padding: '4px', background: '#21262d', color: '#fff', border: '1px solid #30363d', borderRadius: '4px' }}
        >
          {types.map(t => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
        <select 
          value={severityFilter} 
          onChange={(e) => setSeverityFilter(e.target.value)}
          className="filter-select"
          style={{ flex: 1, padding: '4px', background: '#21262d', color: '#fff', border: '1px solid #30363d', borderRadius: '4px' }}
        >
          {severities.map(t => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </div>
      <div className="incident-feed">
        {filtered.map(inc => {
          const safeTs = inc.timestamp.endsWith('Z') ? inc.timestamp : `${inc.timestamp}Z`;
          const diff = Math.max(0, Date.now() - new Date(safeTs).getTime());
          const isNewArrival = diff < 6000;
          const incKey = inc.id != null ? inc.id : `${inc.type}-${inc.lat}-${inc.lng}-${inc.timestamp}`;

          return (
            <div 
              key={incKey}
              className={`incident-card ${inc.type} ${selectedId === inc.id ? 'selected' : ''} ${isNewArrival ? 'new-arrival' : ''}`}
              onClick={() => onIncidentClick(inc)}
            >
              {isNewArrival && <div className="new-badge">NEW</div>}
              <div>
                <span className="incident-type-badge">{(inc.type || 'Unknown').replace('_', ' ')}</span>
                <span className={`severity-badge ${getSeverityClass(inc.severity)}`}>
                  {inc.severity || 'Unknown'}
                </span>
              </div>
              <div className="incident-meta">
                <span>
                  {inc.lat != null ? inc.lat.toFixed(4) : 'N/A'}, {inc.lng != null ? inc.lng.toFixed(4) : 'N/A'}
                </span>
                <span>{timeAgo(inc.timestamp)}</span>
              </div>
              <div className="incident-meta" style={{ marginTop: '4px' }}>
                <span>Confidence: {inc.accuracy != null ? `${inc.accuracy.toFixed(1)}%` : 'N/A'}</span>
                {isAuthority && inc.bus_id && <span style={{color: '#00ffcc', fontWeight: '500'}}>Vehicle: {inc.bus_id}</span>}
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div style={{ padding: '20px', textAlign: 'center', color: '#888' }}>
            No incidents found.
          </div>
        )}
      </div>
    </div>
  )
}
