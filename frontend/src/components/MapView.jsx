import { useEffect } from 'react'
import { MapContainer, TileLayer, Polyline, CircleMarker, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'

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
  return null
}

const typeColors = {
  pothole: '#ff8c00',
  road_damage: '#ffd700',
  accident: '#ff3333',
  congestion: '#4488ff'
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

export default function MapView({ incidents, busPositions, trafficZones, onIncidentClick, center }) {
  return (
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

      {/* Base Route */}
      <Polyline 
        positions={ROUTE_WAYPOINTS} 
        pathOptions={{ color: 'blue', weight: 3, opacity: 0.6, dashArray: '5, 10' }} 
      />

      {/* Traffic Overlay */}
      {ROUTE_WAYPOINTS.slice(0, -1).map((pt1, i) => {
        const pt2 = ROUTE_WAYPOINTS[i + 1]
        // Check if there is a traffic zone for this segment
        const zone = trafficZones.find(z => z.segment_index === i)
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

      {/* Incidents */}
      {incidents.map(inc => (
        <CircleMarker
          key={inc.id}
          center={[inc.lat, inc.lng]}
          radius={severityRadius[inc.severity] || 5}
          pathOptions={{
            color: typeColors[inc.type] || '#fff',
            fillColor: typeColors[inc.type] || '#fff',
            fillOpacity: 0.8,
            weight: 2
          }}
          eventHandlers={{
            click: () => onIncidentClick(inc)
          }}
        />
      ))}

      {/* Buses */}
      {Object.values(busPositions).map(bus => (
        <Marker 
          key={bus.bus_id} 
          position={[bus.lat, bus.lng]}
          icon={createBusIcon(bus.bus_id)}
        >
          <Popup>
            Bus ID: {bus.bus_id}<br/>
            Speed: {bus.speed.toFixed(1)} km/h
          </Popup>
        </Marker>
      ))}

    </MapContainer>
  )
}
