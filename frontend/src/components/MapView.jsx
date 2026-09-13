import { useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Polyline, CircleMarker, Marker, Popup, useMap, LayersControl, LayerGroup } from 'react-leaflet'
import L from 'leaflet'
import IncidentDetail from './IncidentDetail'

const ROUTE_WAYPOINTS = [
  [17.4334, 78.5016], [17.4428, 78.4872], [17.4442, 78.4776], [17.4455, 78.4682],
  [17.4412, 78.4556], [17.4265, 78.4528], [17.4248, 78.4485], [17.4194, 78.4452],
  [17.4230, 78.4320], [17.4290, 78.4110], [17.4338, 78.4005], [17.4395, 78.3905],
  [17.4504, 78.3808], [17.4415, 78.3802], [17.4312, 78.3705], [17.4372, 78.3444],
]

function MapUpdater({ center }) {
  const map = useMap()
  
  useEffect(() => {
    if (center) {
      map.flyTo(center, 15, { duration: 1.5 })
    }
  }, [center, map])

  useEffect(() => {
    const observer = new ResizeObserver(() => {
      map.invalidateSize()
    })
    observer.observe(map.getContainer())
    return () => observer.disconnect()
  }, [map])

  return null
}

const typeColors = {
  pothole: '#ff8c00',
  road_damage: '#ffd700',
  accident: '#ff3333',
  congestion: '#4488ff',
  overspeeding: '#ff00ff',
  lane_violation: '#800080'
}

const severityRadius = {
  low: 5,
  medium: 7,
  high: 9,
  critical: 12
}

const trafficColors = {
  normal: '#00cc44',
  moderate: '#ffcc00',
  high: '#ff3333'
}

const createBusIcon = (busId) => {
  return L.divIcon({
    className: 'bus-marker-icon',
    html: `<div>🚌</div><div class="bus-label">${busId}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15]
  })
}

function MapLegend() {
  return (
    <div className="map-legend">
      <h4>LEGEND</h4>
      <div className="legend-section">
        <strong>Vehicles</strong>
        <div className="legend-item"><span style={{background: 'rgba(0,0,0,0.5)', display: 'inline-block', width: 12, height: 12, borderRadius: '50%'}}></span> Bus Position</div>
      </div>
      <div className="legend-section">
        <strong>Incident Severity</strong>
        <div className="legend-item"><span className="legend-color critical"></span> Critical</div>
        <div className="legend-item"><span className="legend-color high"></span> High</div>
        <div className="legend-item"><span className="legend-color medium"></span> Medium</div>
        <div className="legend-item"><span className="legend-color low"></span> Low/Normal</div>
      </div>
      <div className="legend-section">
        <strong>Traffic Conditions</strong>
        <div className="legend-item"><span className="legend-line" style={{background: trafficColors.high}}></span> High Density</div>
        <div className="legend-item"><span className="legend-line" style={{background: trafficColors.moderate}}></span> Moderate</div>
        <div className="legend-item"><span className="legend-line" style={{background: trafficColors.normal}}></span> Normal</div>
      </div>
    </div>
  )
}

function IncidentMarker({ inc, isSelected, onIncidentClick }) {
  const markerRef = useRef(null)

  useEffect(() => {
    if (isSelected && markerRef.current) {
      markerRef.current.openPopup()
    }
  }, [isSelected])

  return (
    <CircleMarker
      ref={markerRef}
      center={[inc.lat, inc.lng]}
      radius={(severityRadius[inc.severity] || 5) + (isSelected ? 6 : 0)}
      pathOptions={{
        color: isSelected ? '#ffffff' : (typeColors[inc.type] || '#fff'),
        fillColor: typeColors[inc.type] || '#fff',
        fillOpacity: isSelected ? 1 : 0.8,
        weight: isSelected ? 4 : 2
      }}
      eventHandlers={{
        click: () => onIncidentClick(inc)
      }}
    >
      <Popup 
        offset={[0, -10]} 
        autoPan={true} 
        autoPanPadding={[50, 50]}
        className="incident-leaflet-popup"
        closeButton={false}
        maxHeight={280}
      >
        <IncidentDetail incident={inc} onClose={() => onIncidentClick(null)} />
      </Popup>
    </CircleMarker>
  )
}

export default function MapView({ incidents, busPositions, trafficZones, onIncidentClick, center, selectedId, isAuthority }) {
  return (
    <div style={{ height: '100%', width: '100%', position: 'relative' }}>
      <MapContainer 
        center={[17.44, 78.45]} 
        zoom={13} 
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <MapUpdater center={center} />

        <LayersControl position="topright">
          <LayersControl.Overlay checked name="Base Routes">
            <LayerGroup>
              <Polyline 
                positions={ROUTE_WAYPOINTS} 
                pathOptions={{ color: 'blue', weight: 3, opacity: 0.6, dashArray: '5, 10' }} 
              />
            </LayerGroup>
          </LayersControl.Overlay>

          <LayersControl.Overlay checked name="Traffic Density">
            <LayerGroup>
              {ROUTE_WAYPOINTS.slice(0, -1).map((pt1, i) => {
                const pt2 = ROUTE_WAYPOINTS[i + 1]
                const zone = trafficZones.find(z => z.segment_index === i && z.route_name === 'Secunderabad-HITEC')
                if (zone) {
                  return (
                    <Polyline
                      key={`traffic-${i}`}
                      positions={[pt1, pt2]}
                      pathOptions={{ 
                        color: trafficColors[zone.density_level] || trafficColors.normal, 
                        weight: 6, 
                        opacity: 0.8 
                      }}
                    />
                  )
                }
                return null
              })}
            </LayerGroup>
          </LayersControl.Overlay>

          <LayersControl.Overlay checked name="Live Incidents">
            <LayerGroup>
              {incidents.map(inc => (
                <IncidentMarker
                  key={inc.id}
                  inc={inc}
                  isSelected={inc.id === selectedId}
                  onIncidentClick={onIncidentClick}
                />
              ))}
            </LayerGroup>
          </LayersControl.Overlay>

          {isAuthority && (
            <LayersControl.Overlay checked name="Live Fleet">
              <LayerGroup>
                {Object.values(busPositions).map(bus => (
                  <Marker 
                    key={bus.bus_id} 
                    position={[bus.lat, bus.lng]}
                    icon={createBusIcon(bus.bus_id)}
                  >
                    <Popup>
                      <strong>{bus.bus_id}</strong><br/>
                      Speed: {bus.speed?.toFixed(1) || 0} km/h<br/>
                      Route: {bus.route_name || 'N/A'}
                    </Popup>
                  </Marker>
                ))}
              </LayerGroup>
            </LayersControl.Overlay>
          )}

          {isAuthority && (
            <LayersControl.Overlay checked name="Fleet Routes">
              <LayerGroup>
                <Polyline positions={ROUTE_WAYPOINTS} color="#00ffcc" weight={3} opacity={0.5} />
              </LayerGroup>
            </LayersControl.Overlay>
          )}
        </LayersControl>

      </MapContainer>
      <MapLegend />
    </div>
  )
}
