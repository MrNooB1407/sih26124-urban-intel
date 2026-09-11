import { useState, useEffect, useRef } from 'react'

export default function useWebSocket() {
  const [incidents, setIncidents] = useState([])
  const [busPositions, setBusPositions] = useState({})
  const [trafficZones, setTrafficZones] = useState([])
  const [accidentAlert, setAlert] = useState(null)
  const [connected, setConnected] = useState(false)
  
  const wsRef = useRef(null)

  useEffect(() => {
    let timeoutId = null;
    
    function connect() {
      const wsUrl = `ws://${window.location.hostname}:8000/ws`
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen = () => {
        setConnected(true)
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          if (data.event === 'new_incident') {
            setIncidents(prev => [data.data, ...prev])
          } else if (data.event === 'bus_position') {
            setBusPositions(prev => ({
              ...prev,
              [data.data.bus_id]: data.data
            }))
          } else if (data.event === 'traffic_update') {
            setTrafficZones(prev => {
              const updated = [...prev]
              const zone = data.data
              const idx = updated.findIndex(z => 
                z.route_name === zone.route_name && z.segment_index === zone.segment_index
              )
              if (idx >= 0) updated[idx] = zone
              else updated.push(zone)
              return updated
            })
          } else if (data.event === 'accident_alert') {
            setAlert(data.data)
            setTimeout(() => setAlert(null), 15000)
          }
        } catch (err) {
          console.error("Failed to parse websocket message", err)
        }
      }

      ws.onclose = () => {
        setConnected(false)
        timeoutId = setTimeout(connect, 3000)
      }

      ws.onerror = () => {
        ws.close()
      }
    }

    connect()

    return () => {
      if (timeoutId) clearTimeout(timeoutId)
      if (wsRef.current) wsRef.current.close()
    }
  }, [])

  return { incidents, busPositions, trafficZones, accidentAlert, connected }
}
