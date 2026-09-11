import { useState, useEffect } from 'react'

export default function AlertBanner({ alert }) {
  const [visible, setVisible] = useState(true)
  
  useEffect(() => {
    setVisible(true)
    const timer = setTimeout(() => setVisible(false), 15000)
    return () => clearTimeout(timer)
  }, [alert])

  if (!visible || !alert) return null

  const title = alert.type ? alert.type.replace('_', ' ').toUpperCase() : 'ALERT'
  const isOverspeeding = alert.type === 'overspeeding'
  const isAccident = alert.type === 'accident'

  return (
    <div className="alert-banner">
      <span className="alert-icon">⚠️</span>
      <span>CRITICAL ALERT: {title}</span>
      
      {isOverspeeding && (
        <span>{alert.bus_id} travelling at <strong>{alert.current_speed} km/h</strong> (Limit: {alert.speed_limit})</span>
      )}
      
      {isAccident && (
        <>
          <span>Plate: <strong>{alert.plate_number || 'Unknown'}</strong></span>
          <span>Contact: <strong>{alert.contact_number || 'N/A'}</strong></span>
          <span className="alert-sent">✓ Sent to Emergency Services</span>
        </>
      )}
      
      {!isOverspeeding && !isAccident && alert.bus_id && (
        <span>Bus: <strong>{alert.bus_id}</strong></span>
      )}

      <span>Location: {alert.lat?.toFixed(4)}, {alert.lng?.toFixed(4)}</span>
      <button className="alert-close" onClick={() => setVisible(false)}>×</button>
    </div>
  )
}
