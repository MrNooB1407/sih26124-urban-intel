import { useState, useEffect, useCallback } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import useWebSocket from './hooks/useWebSocket'
import MapView from './components/MapView'
import IncidentFeed from './components/IncidentFeed'
import AlertBanner from './components/AlertBanner'
import LoginToggle from './components/LoginToggle'
import { getIncidents, getBuses, getTrafficZones, seedData } from './utils/api'
import { Header, KPIRow, VehicleMonitoring, AnalyticsSection, InfrastructureMonitoring, DemoControls, TrafficZoneMonitoring, SystemStatusBar, InsightCards } from './components/DashboardComponents'

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
        const combined = [...ws.incidents, ...prev];
        const unique = [];
        const seen = new Set();
        
        for (const inc of combined) {
          const identity = inc.id != null ? inc.id : `${inc.type}-${inc.lat}-${inc.lng}-${inc.timestamp}`;
          if (!seen.has(identity)) {
            seen.add(identity);
            unique.push(inc);
          }
        }
        
        return unique;
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
    if (incident) {
      setMapCenter([incident.lat, incident.lng])
    }
  }

  const [activeTab, setActiveTab] = useState('dashboard')

  const filteredIncidents = filterType 
    ? incidents.filter(i => i.type === filterType)
    : incidents

  const isAuthority = role === 'authority'

  // If the active tab was 'vehicles' but user switched to citizen, bump them to dashboard
  useEffect(() => {
    if (!isAuthority && activeTab === 'vehicles') {
      setActiveTab('dashboard')
    }
  }, [isAuthority, activeTab])

  return (
    <div className="app-container">
      {ws.accidentAlert && <AlertBanner alert={ws.accidentAlert} />}
      <Header 
        wsConnected={ws.connected} 
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isAuthority={isAuthority}
      />
      
      <main className="dashboard-main">
        {activeTab === 'dashboard' && (
          <>
            <KPIRow incidents={incidents} busPositions={busPositions} />
            <InsightCards 
              incidents={filteredIncidents} 
              trafficZones={trafficZones} 
              busPositions={busPositions}
              isAuthority={isAuthority} 
              onActionClick={handleIncidentClick} 
            />
            
            <div className="dashboard-grid">
              {/* Left Column */}
              <div className="col-left">
                <div className="panel map-panel">
                  <MapView 
                    incidents={filteredIncidents}
                    busPositions={busPositions}
                    trafficZones={trafficZones}
                    onIncidentClick={handleIncidentClick}
                    center={mapCenter}
                    selectedId={selectedIncident?.id}
                    isAuthority={isAuthority}
                  />
                </div>
                {isAuthority && <VehicleMonitoring busPositions={busPositions} incidents={incidents} />}
              </div>
              
              {/* Right Column */}
              <div className="col-right">
                <div className="panel feed-panel">
                  <div className="feed-header">
                    <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      Live Incident Feed
                      <span style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '4px',
                        fontSize: '0.75rem',
                        background: 'rgba(0, 255, 204, 0.1)',
                        color: '#00ffcc',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontWeight: 'bold',
                        letterSpacing: '0.5px'
                      }}>
                        <span className="status-dot pulse" style={{ width: '6px', height: '6px' }}></span> LIVE
                      </span>
                    </h2>
                    <LoginToggle />
                  </div>
                  <IncidentFeed 
                    incidents={filteredIncidents}
                    filterType={filterType}
                    onFilterChange={setFilterType}
                    onIncidentClick={handleIncidentClick}
                    selectedId={selectedIncident?.id}
                    isAuthority={isAuthority}
                  />
                </div>
                
                <DemoControls onSeed={handleSeed} />
              </div>
            </div>
          </>
        )}

        {activeTab === 'analytics' && (
          <div className="dashboard-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <AnalyticsSection incidents={incidents} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <InfrastructureMonitoring incidents={incidents} />
              <TrafficZoneMonitoring trafficZones={trafficZones} />
            </div>
          </div>
        )}

        {activeTab === 'vehicles' && isAuthority && (
          <div className="dashboard-grid" style={{ gridTemplateColumns: '1fr' }}>
            <VehicleMonitoring busPositions={busPositions} incidents={incidents} isFullPage={true} />
          </div>
        )}
      </main>

      <SystemStatusBar 
        wsConnected={ws.connected} 
        busPositions={busPositions} 
        incidents={incidents} 
        isAuthority={isAuthority} 
      />
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
