import { useState, useEffect } from 'react'

export default function AlertBanner({ alert }) {
  const [visible, setVisible] = useState(true)
  
  useEffect(() => {
    setVisible(true)
    const timer = setTimeout(() => setVisible(false), 15000)
    return () => clearTimeout(timer)
  }, [alert])

  if (!visible || !alert) return null

  return (
    <div className="alert-banner">
      <span className="alert-icon">🚨</span>
      <span>ALERT: Accident detected!</span>
      <span>Plate: <strong>{alert.plate_number || 'Unknown'}</strong></span>
      <span>Contact: <strong>{alert.contact_number || 'N/A'}</strong></span>
      <span>Location: {alert.lat?.toFixed(4)}, {alert.lng?.toFixed(4)}</span>
      <span className="alert-sent">✓ Sent to Emergency Services</span>
      <button className="alert-close" onClick={() => setVisible(false)}>✕</button>
    </div>
  )
}
