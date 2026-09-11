import { useState, useEffect, useCallback } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import useWebSocket from './hooks/useWebSocket'
import MapView from './components/MapView'
import IncidentFeed from './components/IncidentFeed'
import AlertBanner from './components/AlertBanner'
import LoginToggle from './components/LoginToggle'
import IncidentDetail from './components/IncidentDetail'
import { getIncidents, getBuses, getTrafficZones, seedData } from './utils/api'

function Dashboard() {
  const { role } = useAuth()
  const ws = useWebSocket()
  
  const [incidents, setIncidents] = useState([])
  const [busPositions, setBusPositions] = useState({})
  const [trafficZones, setTrafficZones] = useState([])
  const [selectedIncident, setSelectedIncident] = useState(null)
  const [filterType, setFilterType] = useState(null)
  const [mapCenter, setMapCenter] = useState(null)

  // Load initial data
  useEffect(() => {
    loadData()
  }, [role])

  const loadData = async () => {
    try {
      const [inc, buses, zones] = await Promise.all([
        getIncidents(role),
        getBuses(),
        getTrafficZones(),
      ])
      setIncidents(inc)
      const busMap = {}
      buses.forEach(b => { busMap[b.bus_id] = b })
      setBusPositions(busMap)
      setTrafficZones(zones)
    } catch (err) {
      console.error('Failed to load data:', err)
    }
  }

  // Merge WebSocket updates
  useEffect(() => {
    if (ws.incidents.length > 0) {
      setIncidents(prev => {
        const newIds = new Set(ws.incidents.map(i => i.id))
        const filtered = prev.filter(i => !newIds.has(i.id))
        return [...ws.incidents, ...filtered]
      })
    }
  }, [ws.incidents])

  useEffect(() => {
    if (Object.keys(ws.busPositions).length > 0) {
      setBusPositions(prev => ({ ...prev, ...ws.busPositions }))
    }
  }, [ws.busPositions])

  useEffect(() => {
    if (ws.trafficZones.length > 0) {
      setTrafficZones(prev => {
        const updated = [...prev]
        ws.trafficZones.forEach(zone => {
          const idx = updated.findIndex(z => 
            z.route_name === zone.route_name && z.segment_index === zone.segment_index
          )
          if (idx >= 0) updated[idx] = zone
          else updated.push(zone)
        })
        return updated
      })
    }
  }, [ws.trafficZones])

  const handleSeed = async () => {
    await seedData()
    await loadData()
  }

  const handleIncidentClick = (incident) => {
    setSelectedIncident(incident)
    setMapCenter([incident.lat, incident.lng])
  }

  const filteredIncidents = filterType 
    ? incidents.filter(i => i.type === filterType)
    : incidents

  return (
    <div className="app-container">
      {ws.accidentAlert && <AlertBanner alert={ws.accidentAlert} />}
      <div className="sidebar">
        <div className="header">
          <h1>🚌 Urban Intelligence</h1>
          <LoginToggle />
        </div>
        <div className="sidebar-controls">
          <button className="seed-btn" onClick={handleSeed}>🔄 Seed Demo Data</button>
          <div className="connection-status">
            <span className={`status-dot ${ws.connected ? 'connected' : 'disconnected'}`}></span>
            {ws.connected ? 'Live' : 'Offline'}
          </div>
        </div>
        <IncidentFeed 
          incidents={filteredIncidents}
          filterType={filterType}
          onFilterChange={setFilterType}
          onIncidentClick={handleIncidentClick}
          selectedId={selectedIncident?.id}
        />
      </div>
      <div className="map-container">
        <MapView 
          incidents={filteredIncidents}
          busPositions={busPositions}
          trafficZones={trafficZones}
          onIncidentClick={handleIncidentClick}
          center={mapCenter}
        />
        {selectedIncident && (
          <IncidentDetail 
            incident={selectedIncident}
            onClose={() => setSelectedIncident(null)}
          />
        )}
      </div>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <Dashboard />
    </AuthProvider>
  )
}
