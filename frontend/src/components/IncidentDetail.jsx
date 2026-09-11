import { useAuth } from '../context/AuthContext'

export default function IncidentDetail({ incident, onClose }) {
  const { role } = useAuth()
  
  if (!incident) return null

  const getSeverityClass = (sev) => `severity-${sev?.toLowerCase() || 'low'}`
  const formattedTime = new Date(incident.timestamp).toLocaleString()

  return (
    <div className="detail-panel">
      <div className="detail-panel-header">
        <div>
          <span className="incident-type-badge">{incident.type?.replace('_', ' ')}</span>
          <span className={`severity-badge ${getSeverityClass(incident.severity)}`}>
            {incident.severity}
          </span>
        </div>
        <button className="detail-panel-close" onClick={onClose}>✕</button>
      </div>

      <div className="detail-content">
        <div className="detail-row">
          <strong>Location:</strong> {incident.lat?.toFixed(6)}, {incident.lng?.toFixed(6)}
        </div>
        <div className="detail-row">
          <strong>Time:</strong> {formattedTime}
        </div>
        
        {role === 'authority' && incident.bus_id && (
          <div className="detail-row">
            <strong>Detected by Bus:</strong> {incident.bus_id}
          </div>
        )}
        
        <div className="detail-row">
          <strong>Accuracy:</strong> {incident.accuracy?.toFixed(1)}%
        </div>

        {role === 'authority' && incident.type === 'accident' && (
          <>
            <div className="detail-row">
              <strong>Plate No:</strong> {incident.plate_number || 'N/A'}
            </div>
            <div className="detail-row">
              <strong>Contact:</strong> {incident.contact_number || 'N/A'}
            </div>
          </>
        )}

        {incident.image_path && (
          <img 
            src={`http://localhost:8000${incident.image_path}`} 
            alt="Incident snapshot" 
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        )}
      </div>
    </div>
  )
}
