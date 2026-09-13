import { useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Polyline, CircleMarker, Marker, Popup, useMap, LayersControl, LayerGroup } from 'react-leaflet'
import L from 'leaflet'
import IncidentDetail from './IncidentDetail'
import { routesData } from '../config/routesData'

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
  const baseRouteWaypoints = routesData["Secunderabad-HITEC"].waypoints;

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
                positions={baseRouteWaypoints} 
                pathOptions={{ color: 'blue', weight: 3, opacity: 0.6, dashArray: '5, 10' }} 
              />
            </LayerGroup>
          </LayersControl.Overlay>

          <LayersControl.Overlay checked name="Traffic Density">
            <LayerGroup>
              {Object.values(routesData).map(route => (
                route.waypoints.slice(0, -1).map((pt1, i) => {
                  const pt2 = route.waypoints[i + 1]
                  const zone = trafficZones.find(z => z.segment_index === i && z.route_name === route.name)
                  if (zone) {
                    return (
                      <Polyline
                        key={`traffic-${route.name}-${i}`}
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
                })
              ))}
            </LayerGroup>
          </LayersControl.Overlay>

          <LayersControl.Overlay checked name="Active Bottlenecks">
            <LayerGroup>
              {trafficZones.map(zone => {
                if (zone.density_level === 'high' && zone.bottleneck_start && (Date.now() - zone.bottleneck_start >= 20000)) {
                  const route = routesData[zone.route_name];
                  if (!route) return null;
                  const pt1 = route.waypoints[zone.segment_index];
                  const pt2 = route.waypoints[zone.segment_index + 1];
                  if (!pt1 || !pt2) return null;
                  
                  return (
                    <Polyline
                      key={`bottleneck-${zone.route_name}-${zone.segment_index}`}
                      positions={[pt1, pt2]}
                      pathOptions={{ color: 'red', weight: 8, className: 'bottleneck-pulse' }}
                    >
                      <Popup>
                        <strong>Persistent Traffic Bottleneck</strong><br/>
                        Route: {zone.route_name}<br/>
                        Segment: {zone.segment_index}<br/>
                        Vehicle Load: {zone.vehicle_count}<br/>
                        Duration: {Math.floor((Date.now() - zone.bottleneck_start) / 1000)}s
                      </Popup>
                    </Polyline>
                  );
                }
                return null;
              })}
            </LayerGroup>
          </LayersControl.Overlay>

          <LayersControl.Overlay checked name="Traffic Heatmap">
            <LayerGroup>
              {Object.values(routesData).map(route => (
                route.waypoints.slice(0, -1).map((pt1, i) => {
                  const pt2 = route.waypoints[i + 1]
                  const zone = trafficZones.find(z => z.segment_index === i && z.route_name === route.name)
                  if (zone && pt1 && pt2) {
                    const fractions = [0.2, 0.4, 0.6, 0.8]
                    return fractions.map(fraction => {
                      const lat = pt1[0] + (pt2[0] - pt1[0]) * fraction
                      const lng = pt1[1] + (pt2[1] - pt1[1]) * fraction
                      const radius = Math.min(12 + (zone.vehicle_count * 1.5), 40)
                      const color = trafficColors[zone.density_level] || trafficColors.normal
                      return (
                        <CircleMarker
                          key={`heat-${route.name}-${i}-${fraction}`}
                          center={[lat, lng]}
                          radius={radius}
                          stroke={false}
                          fillColor={color}
                          fillOpacity={0.4}
                          className="heatmap-point"
                        />
                      )
                    })
                  }
                  return null
                })
              ))}
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

          {isAuthority && Object.values(routesData).map(route => {
            const assignedBus = Object.values(busPositions).find(b => b.route_name === route.name)
            const busPrefix = assignedBus ? assignedBus.bus_id : "BUS"
            const label = `${busPrefix} — ${route.name}`
            
            return (
              <LayersControl.Overlay key={route.name} checked name={label}>
                <LayerGroup>
                  <Polyline positions={route.waypoints} color="#00ffcc" weight={3} opacity={0.5} />
                </LayerGroup>
              </LayersControl.Overlay>
            )
          })}
        </LayersControl>

      </MapContainer>
      <MapLegend />
    </div>
  )
}
