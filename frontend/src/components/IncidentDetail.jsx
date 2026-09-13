import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'

export default function IncidentDetail({ incident, onClose }) {
  const { role } = useAuth()
  const [imageError, setImageError] = useState(false)
  
  useEffect(() => {
    setImageError(false)
  }, [incident?.image_path])
  
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
        <button className="detail-panel-close" onClick={onClose}>×</button>
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
          <strong>Detection Confidence:</strong> {incident.accuracy?.toFixed(1)}%
        </div>

        <div className="detail-row">
          <strong>Status:</strong> <span style={{color: '#00ffcc', fontWeight: 'bold'}}>ACTIVE</span>
        </div>

        {role === 'authority' && incident.plate_number && (
          <>
            <div className="detail-row">
              <strong>Plate No:</strong> {incident.plate_number}
            </div>
            {incident.plate_confidence && (
              <div className="detail-row">
                <strong>Prototype OCR Confidence:</strong> {incident.plate_confidence}%
              </div>
            )}
            {incident.contact_number && (
              <div className="detail-row">
                <strong>Contact:</strong> {incident.contact_number}
              </div>
            )}
          </>
        )}

        {incident.type === 'overspeeding' && (
          <>
            <div className="detail-row">
              <strong>Speed:</strong> <span className="text-critical">{incident.current_speed?.toFixed(1)} km/h</span>
            </div>
            <div className="detail-row">
              <strong>Speed Limit:</strong> {incident.speed_limit?.toFixed(1)} km/h
            </div>
            <div className="detail-row">
              <strong>Excess:</strong> +{(incident.current_speed - incident.speed_limit)?.toFixed(1)} km/h
            </div>
          </>
        )}

        {incident.type === 'lane_violation' && (
          <>
            <div className="detail-row">
              <strong>Current Lane:</strong> <span className="text-critical">{incident.current_lane}</span>
            </div>
            <div className="detail-row">
              <strong>Expected Lane:</strong> {incident.expected_lane}
            </div>
          </>
        )}

        {incident.image_path && (
          <div className="camera-evidence">
            <div className="camera-evidence-header">
              <h4>Camera Evidence</h4>
              <div className="camera-evidence-badges">
                <span className="badge-real">REAL VIDEO FRAME</span>
                <span className="badge-proto">PROTOTYPE INFERENCE</span>
              </div>
            </div>
            
            <div className="camera-evidence-content">
              {imageError ? (
                <div className="camera-evidence-fallback">
                  <strong>Evidence unavailable</strong>
                  <span>The source frame could not be loaded.</span>
                </div>
              ) : (
                <img 
                  className="camera-evidence-image"
                  src={`http://localhost:8000${incident.image_path}`} 
                  alt="Incident snapshot" 
                  onError={() => setImageError(true)}
                />
              )}
            </div>

            <div className="camera-evidence-meta">
              <div className="meta-grid">
                <div className="meta-item">
                  <span className="meta-label">Detection</span>
                  <span className="meta-value">{incident.type?.replace('_', ' ').toUpperCase()}</span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">Confidence</span>
                  <span className="meta-value">{incident.accuracy?.toFixed(1)}%</span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">Location</span>
                  <span className="meta-value">{incident.lat?.toFixed(5)}, {incident.lng?.toFixed(5)}</span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">Camera Source</span>
                  <span className="meta-value">{role === 'authority' ? incident.bus_id : 'Public Safety Camera'}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

