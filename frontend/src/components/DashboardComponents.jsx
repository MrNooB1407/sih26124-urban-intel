import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts';
import { AlertTriangle, Car, Gauge, Activity, Navigation, Zap } from 'lucide-react';

export function Header({ wsConnected, activeTab, setActiveTab, isAuthority }) {
  return (
    <header className="dashboard-header">
      <div className="header-brand">
        <Activity size={24} color="#00ffcc" />
        <div>
          <h1>Urban Intel</h1>
          <span className="subtitle" style={{ color: isAuthority ? '#f39c12' : '#00ffcc', fontWeight: '500', letterSpacing: '0.5px' }}>
            {isAuthority ? 'AUTHORITY COMMAND CENTER' : 'PUBLIC SAFETY | Real-time road hazards and traffic alerts'}
          </span>
        </div>
      </div>
      <div className="header-nav">
        <span className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>Dashboard</span>
        <span className={`nav-item ${activeTab === 'analytics' ? 'active' : ''}`} onClick={() => setActiveTab('analytics')}>Analytics</span>
        <span className={`nav-item ${activeTab === 'capabilities' ? 'active' : ''}`} onClick={() => setActiveTab('capabilities')}>System Capabilities</span>
        {isAuthority && (
          <span className={`nav-item ${activeTab === 'vehicles' ? 'active' : ''}`} onClick={() => setActiveTab('vehicles')}>Vehicles</span>
        )}
        <div className="connection-status">
          <span className={`status-dot ${wsConnected ? 'connected pulse' : 'disconnected'}`}></span>
          {wsConnected ? '● LIVE SYSTEM ACTIVE' : '⚠ SYSTEM OFFLINE'}
        </div>
      </div>
    </header>
  );
}

export function KPIRow({ incidents, busPositions }) {
  const activeCount = incidents.length;
  const criticalCount = incidents.filter(i => i.severity === 'critical').length;
  const overspeedingCount = incidents.filter(i => i.type === 'overspeeding').length;
  const laneViolations = incidents.filter(i => i.type === 'lane_violation').length;

  return (
    <div className="kpi-row">
      <div className="kpi-card">
        <div className="kpi-icon"><AlertTriangle size={20} /></div>
        <div className="kpi-data">
          <h3>Active Incidents</h3>
          <p className="kpi-value">{activeCount}</p>
        </div>
      </div>
      <div className="kpi-card critical">
        <div className="kpi-icon"><Zap size={20} /></div>
        <div className="kpi-data">
          <h3>Critical Alerts</h3>
          <p className="kpi-value">{criticalCount}</p>
        </div>
      </div>
      <div className="kpi-card">
        <div className="kpi-icon"><Car size={20} /></div>
        <div className="kpi-data">
          <h3>Vehicles Monitored</h3>
          <p className="kpi-value">{Object.keys(busPositions).length}</p>
        </div>
      </div>
      <div className="kpi-card">
        <div className="kpi-icon"><Gauge size={20} /></div>
        <div className="kpi-data">
          <h3>Overspeeding Events</h3>
          <p className="kpi-value">{overspeedingCount}</p>
        </div>
      </div>
      <div className="kpi-card">
        <div className="kpi-icon"><Navigation size={20} /></div>
        <div className="kpi-data">
          <h3>Lane Violations</h3>
          <p className="kpi-value">{laneViolations}</p>
        </div>
      </div>
    </div>
  );
}

export function VehicleMonitoring({ busPositions, incidents = [], isFullPage = false }) {
  const [tick, setTick] = React.useState(0);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setTick(t => t + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const buses = Object.values(busPositions);

  return (
    <div className={`panel vehicle-monitoring ${isFullPage ? 'full-page' : ''}`}>
      <h2>Live Vehicle Monitoring</h2>
      <div className="table-responsive">
        <table>
          <thead>
            <tr>
              <th>Vehicle & Route</th>
              <th>Speed & Limit</th>
              <th>Location (Lat, Lng)</th>
              <th>Violations</th>
              <th>Status</th>
              <th>Last Update</th>
            </tr>
          </thead>
          <tbody>
            {buses.map(bus => {
              if (!bus || !bus.bus_id) return null;

              // 1. Incidents & Violations
              const busIncidents = incidents
                .filter(i => i.bus_id === bus.bus_id)
                .sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));
              
              const speedViolations = busIncidents.filter(i => i.type === 'overspeeding');
              const laneViolations = busIncidents.filter(i => i.type === 'lane_violation');
              const totalViolations = speedViolations.length + laneViolations.length;

              // 2. Dynamic Speed Limit
              const latestOverspeed = speedViolations.find(i => i.speed_limit != null);
              const knownLimit = latestOverspeed ? latestOverspeed.speed_limit : null;
              
              const currentSpeed = bus.speed || 0;
              const isSpeeding = knownLimit != null && currentSpeed > knownLimit;

              // 3. Status logic (within last 120s)
              const now = Date.now();
              let displayStatus = 'Normal';
              let statusClass = 'badge-normal';
              
              const recentIncidents = busIncidents.filter(inc => {
                 if (!inc.timestamp) return false;
                 const safeTs = inc.timestamp.endsWith('Z') ? inc.timestamp : inc.timestamp + 'Z';
                 return (now - new Date(safeTs).getTime()) < 120000;
              });

              if (isSpeeding) {
                displayStatus = 'Overspeeding';
                statusClass = 'badge-critical';
              } else if (recentIncidents.length > 0) {
                const latestActive = recentIncidents[0];
                displayStatus = (latestActive.type || '').replace('_', ' ').toUpperCase();
                statusClass = latestActive.severity === 'critical' || latestActive.severity === 'high' 
                              ? 'badge-critical' 
                              : (latestActive.severity === 'medium' ? 'badge-warning' : 'badge-normal');
              }

              // 4. Time parsing for last update
              const safeBusTs = bus.timestamp ? (bus.timestamp.endsWith('Z') ? bus.timestamp : bus.timestamp + 'Z') : null;
              const msAgo = safeBusTs ? Math.max(0, now - new Date(safeBusTs).getTime()) : 999999;
              const secsAgo = Math.floor(msAgo / 1000);
              const isLive = secsAgo <= 5;
              
              let timeDisplay = '';
              if (!safeBusTs) timeDisplay = 'N/A';
              else if (isLive) timeDisplay = 'Live';
              else if (secsAgo < 60) timeDisplay = `${secsAgo} sec ago`;
              else timeDisplay = `${Math.floor(secsAgo / 60)} min ago`;

              // Speed Bar logic
              const maxBarSpeed = knownLimit ? knownLimit + 20 : Math.max(100, currentSpeed + 10);
              const speedPct = Math.min(100, (currentSpeed / maxBarSpeed) * 100);

              return (
                <tr key={bus.bus_id}>
                  <td>
                    <strong>{bus.bus_id}</strong>
                    {bus.route_name && <div style={{ fontSize: '0.8rem', color: '#8b949e', marginTop: '2px' }}>{bus.route_name}</div>}
                  </td>
                  <td>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span className={isSpeeding ? 'text-critical' : ''} style={{ fontWeight: 'bold' }}>{currentSpeed.toFixed(1)} km/h</span>
                      <span style={{ color: '#8b949e', fontSize: '0.85em' }}>Limit: {knownLimit ? `${knownLimit} km/h` : 'Unknown'}</span>
                    </div>
                    <div style={{ width: '100%', height: '4px', background: '#30363d', borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{ 
                        height: '100%', 
                        width: `${speedPct}%`, 
                        background: isSpeeding ? '#ff3333' : '#00cc44',
                        transition: 'width 0.5s ease-out'
                      }} />
                    </div>
                  </td>
                  <td>
                    {bus.lat ? bus.lat.toFixed(4) : 'N/A'}, {bus.lng ? bus.lng.toFixed(4) : 'N/A'}
                  </td>
                  <td>
                    {totalViolations > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <strong style={{ color: '#ff8c00' }}>{totalViolations} Total</strong>
                        <span style={{ fontSize: '0.8em', color: '#8b949e' }}>{speedViolations.length} Spd | {laneViolations.length} Ln</span>
                      </div>
                    ) : (
                      <span style={{ color: '#8b949e' }}>0 Violations</span>
                    )}
                  </td>
                  <td>
                    <span className={`badge ${statusClass}`}>
                      {displayStatus}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span className={`status-dot ${isLive ? 'pulse connected' : 'disconnected'}`} style={{ width: 8, height: 8 }} />
                      <span style={{ color: isLive ? '#00ffcc' : '#8b949e' }}>{timeDisplay}</span>
                    </div>
                  </td>
                </tr>
              )
            })}
            {buses.length === 0 && <tr><td colSpan="6" style={{ textAlign: 'center', color: '#8b949e', padding: '20px' }}>No active vehicles</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function AnalyticsSection({ incidents }) {
  // 1. Overview
  const typeCounts = incidents.reduce((acc, inc) => {
    acc[inc.type] = (acc[inc.type] || 0) + 1;
    return acc;
  }, {});
  const overviewData = Object.keys(typeCounts).map(key => ({
    name: key.replace('_', ' ').toUpperCase(),
    count: typeCounts[key]
  }));

  // 2. Severity
  const sevCounts = incidents.reduce((acc, inc) => {
    acc[inc.severity] = (acc[inc.severity] || 0) + 1;
    return acc;
  }, {});
  const sevData = [
    { name: 'CRITICAL', count: sevCounts['critical'] || 0, color: '#ff3333' },
    { name: 'HIGH', count: sevCounts['high'] || 0, color: '#ff8c00' },
    { name: 'MEDIUM', count: sevCounts['medium'] || 0, color: '#ffd700' },
    { name: 'LOW', count: sevCounts['low'] || 0, color: '#00cc44' }
  ].filter(d => d.count > 0);

  // 3. Trends
  const timeBuckets = {};
  incidents.forEach(inc => {
    if (!inc.timestamp) return;
    const date = new Date(inc.timestamp.endsWith('Z') ? inc.timestamp : inc.timestamp + 'Z');
    if (isNaN(date.getTime())) return;
    const hh = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    const bucket = hh + ':' + mm;
    timeBuckets[bucket] = (timeBuckets[bucket] || 0) + 1;
  });
  const trendData = Object.keys(timeBuckets).sort().map(key => ({
    time: key,
    incidents: timeBuckets[key]
  }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="panel analytics-section">
        <h2>Incident Overview</h2>
        {overviewData.length === 0 ? (
           <div style={{ padding: '20px', textAlign: 'center', color: '#888' }}>No incidents recorded yet.</div>
        ) : (
          <div style={{ width: '100%', height: 220, marginTop: '20px' }}>
            <ResponsiveContainer>
              <BarChart data={overviewData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="name" stroke="#888" fontSize={10} tickMargin={10} />
                <YAxis stroke="#888" allowDecimals={false} />
                <Tooltip contentStyle={{ backgroundColor: '#222', border: '1px solid #444', color: '#fff' }} itemStyle={{color: '#00ffcc'}} cursor={{fill: '#2a2a2a'}} />
                <Bar dataKey="count" fill="#00ffcc" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="panel analytics-section">
        <h2>Severity Distribution</h2>
        {sevData.length === 0 ? (
           <div style={{ padding: '20px', textAlign: 'center', color: '#888' }}>No severity data available.</div>
        ) : (
          <div style={{ width: '100%', height: 220, marginTop: '10px' }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={sevData} dataKey="count" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5}>
                  {sevData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#222', border: '1px solid #444', color: '#fff' }} itemStyle={{color: '#fff'}} />
                <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '12px' }}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="panel analytics-section">
        <h2>Incident Trends</h2>
        {trendData.length <= 1 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: '#888' }}>
            Gathering historical data... Need multiple timestamps to form a trend.
          </div>
        ) : (
          <div style={{ width: '100%', height: 220, marginTop: '20px' }}>
            <ResponsiveContainer>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="time" stroke="#888" fontSize={10} tickMargin={10} />
                <YAxis stroke="#888" allowDecimals={false} />
                <Tooltip contentStyle={{ backgroundColor: '#222', border: '1px solid #444', color: '#fff' }} itemStyle={{color: '#f39c12'}} />
                <Line type="monotone" dataKey="incidents" stroke="#f39c12" strokeWidth={3} dot={{ r: 4, fill: '#f39c12' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}

export function InfrastructureMonitoring({ incidents }) {
  const infraTypes = ['pothole', 'road_damage'];
  const driverTypes = ['overspeeding', 'lane_violation'];

  const infraCount = incidents.filter(i => infraTypes.includes(i.type)).length;
  const driverCount = incidents.filter(i => driverTypes.includes(i.type)).length;

  const data = [
    { name: 'Infrastructure Hazards', count: infraCount, fill: '#ff8c00' },
    { name: 'Driver Violations', count: driverCount, fill: '#ff00ff' }
  ];

  return (
    <div className="panel infra-monitoring">
      <h2>Infrastructure vs Driver Violations</h2>
      {incidents.length === 0 ? (
        <div style={{ padding: '20px', textAlign: 'center', color: '#888' }}>No data available.</div>
      ) : (
        <div style={{ width: '100%', height: 200, marginTop: '20px' }}>
          <ResponsiveContainer>
            <BarChart data={data} layout="vertical" margin={{ left: 5, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" horizontal={false} />
              <XAxis type="number" stroke="#888" allowDecimals={false} />
              <YAxis dataKey="name" type="category" stroke="#888" fontSize={11} width={130} />
              <Tooltip contentStyle={{ backgroundColor: '#222', border: '1px solid #444', color: '#fff' }} cursor={{fill: '#2a2a2a'}} />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

export function DemoControls({ onSeed }) {
  const triggerIncident = async (type) => {
    const payload = {
      type: type,
      lat: 17.4334 + (Math.random() - 0.5) * 0.01,
      lng: 78.5016 + (Math.random() - 0.5) * 0.01,
      bus_id: 'BUS-DEMO',
      accuracy: 99.9,
      severity: 'high'
    };
    if (type === 'overspeeding') {
      payload.current_speed = 75;
      payload.speed_limit = 40;
      payload.severity = 'critical';
    } else if (type === 'lane_violation') {
      payload.current_lane = 'Lane 3';
      payload.expected_lane = 'Bus Lane';
    } else if (type === 'accident') {
      payload.plate_number = 'TS DEMO 1234';
      payload.contact_number = '999-999-9999';
      payload.severity = 'critical';
    } else if (type === 'pothole' || type === 'road_damage') {
      payload.severity = type === 'pothole' ? 'high' : 'medium';
      payload.accuracy = 85.5;
    }
    
    try {
      await fetch('http://localhost:8000/api/incidents/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch(e) {
      console.error(e);
    }
  }

  return (
    <div className="panel demo-controls">
      <h2>Simulation Controls</h2>
      <div className="control-buttons">
        <button onClick={onSeed} className="btn-secondary">🔄 Reset & Seed Data</button>
        <button onClick={() => triggerIncident('overspeeding')} className="btn-secondary">⚡ Trigger Overspeeding</button>
        <button onClick={() => triggerIncident('lane_violation')} className="btn-secondary">↔ Trigger Lane Violation</button>
        <button onClick={() => triggerIncident('accident')} className="btn-secondary">🚨 Trigger Accident</button>
        <button onClick={() => triggerIncident('pothole')} className="btn-secondary">🕳 Trigger Pothole</button>
        <button onClick={() => triggerIncident('road_damage')} className="btn-secondary">🚧 Trigger Road Damage</button>
        <p className="control-hint">Use start_all.py in the terminal to run the live simulation.</p>
      </div>
    </div>
  );
}




export function TrafficZoneMonitoring({ trafficZones }) {
  if (!trafficZones || trafficZones.length === 0) {
    return (
      <div className="panel infra-monitoring">
        <h2>Traffic Zone Intelligence</h2>
        <div style={{ padding: '40px 20px', textAlign: 'center', color: '#888' }}>No active traffic zones detected.</div>
      </div>
    );
  }

  const totalZones = trafficZones.length;
  const highDensity = trafficZones.filter(z => z.density_level === 'high').length;
  const totalVehicles = trafficZones.reduce((acc, z) => acc + (z.vehicle_count || 0), 0);

  return (
    <div className="panel infra-monitoring">
      <h2>Traffic Zone Intelligence</h2>
      
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', marginTop: '15px' }}>
        <div style={{ flex: 1, background: '#21262d', padding: '12px', borderRadius: '6px', textAlign: 'center' }}>
          <div style={{ fontSize: '10px', color: '#888', textTransform: 'uppercase' }}>Monitored Zones</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#00ffcc' }}>{totalZones}</div>
        </div>
        <div style={{ flex: 1, background: '#21262d', padding: '12px', borderRadius: '6px', textAlign: 'center' }}>
          <div style={{ fontSize: '10px', color: '#888', textTransform: 'uppercase' }}>High Density</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: highDensity > 0 ? '#ff3333' : '#00cc44' }}>{highDensity}</div>
        </div>
        <div style={{ flex: 1, background: '#21262d', padding: '12px', borderRadius: '6px', textAlign: 'center' }}>
          <div style={{ fontSize: '10px', color: '#888', textTransform: 'uppercase' }}>Total Vehicles</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#fff' }}>{totalVehicles}</div>
        </div>
      </div>

      <div className="infra-grid">
        {trafficZones.map((zone) => (
          <div key={`${zone.route_name}-${zone.segment_index}`} className="infra-item">
            <span className="infra-label">Zone {zone.segment_index + 1} ({zone.route_name})</span>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 8 }}>
              <span className={`badge badge-${zone.density_level === 'high' ? 'critical' : zone.density_level === 'moderate' ? 'warning' : 'normal'}`}>
                {zone.density_level.toUpperCase()}
              </span>
              <span style={{ fontSize: '0.8rem', color: '#8b949e' }}>{zone.vehicle_count} vehicles</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SystemStatusBar({ wsConnected, busPositions, incidents, isAuthority }) {
  const activeBusCount = Object.keys(busPositions || {}).length;
  const incidentCount = (incidents || []).length;

  return (
    <div className="system-status-bar">
      <div className="status-item">
        <span className={`status-dot ${wsConnected ? 'connected pulse' : 'disconnected'}`}></span>
        {wsConnected ? 'WS: LIVE' : 'WS: OFFLINE'}
      </div>
      <div className="status-separator">|</div>
      <div className="status-item">
        Deck-AI: NOMINAL · PROTOTYPE
      </div>
      <div className="status-separator">|</div>
      <div className="status-item">
        {isAuthority ? `Fleet Telemetry: ${activeBusCount}` : 'Public Sensors: ONLINE'}
      </div>
      <div className="status-separator">|</div>
      <div className="status-item">
        {isAuthority ? `Unresolved Anomalies: ${incidentCount}` : `Active Safety Alerts: ${incidentCount}`}
      </div>
    </div>
  );
}

export function InsightCards({ incidents, trafficZones, busPositions, isAuthority, onActionClick }) {
  const insights = [];

  // 1. Critical Accident
  const criticalAccident = (incidents || []).find(i => i.type === 'accident' && i.severity === 'critical');
  if (criticalAccident) {
    insights.push({
      id: 'critical_accident',
      type: 'critical',
      title: 'Critical Accident Detected',
      description: 'A critical accident has been reported. Immediate incident review is recommended.',
      actionText: 'Review Incident',
      actionData: criticalAccident
    });
  }

  // 2. High Traffic Density
  const highDensityZones = (trafficZones || []).filter(z => z.density_level === 'high');
  const routeCounts = {};
  highDensityZones.forEach(z => {
    routeCounts[z.route_name] = (routeCounts[z.route_name] || 0) + 1;
  });
  const congestedRoute = Object.keys(routeCounts).find(route => routeCounts[route] > 1);
  if (congestedRoute) {
    let trafficActionData = null;
    const activeBuses = Object.values(busPositions || {});
    const congestedBus = activeBuses.find(b => b.route_name === congestedRoute);
    if (congestedBus) {
      trafficActionData = { lat: congestedBus.lat, lng: congestedBus.lng, id: 'traffic_focus' };
    }

    insights.push({
      id: 'traffic_congestion',
      type: 'warning',
      title: 'High Traffic Density',
      description: `Multiple high-density zones detected on ${congestedRoute}. Consider traffic management or alternate routing.`,
      actionText: 'View Traffic',
      actionData: trafficActionData
    });
  }

  // 3. Repeated Fleet Violations (Authority Only)
  if (isAuthority) {
    const overspeeding = (incidents || []).filter(i => i.type === 'overspeeding');
    const busCounts = {};
    const busIncidents = {};
    overspeeding.forEach(i => {
      busCounts[i.bus_id] = (busCounts[i.bus_id] || 0) + 1;
      busIncidents[i.bus_id] = i; // keep the latest one
    });
    const repeatOffender = Object.keys(busCounts).find(bus_id => busCounts[bus_id] >= 2);
    if (repeatOffender) {
      insights.push({
        id: 'fleet_violations',
        type: 'warning',
        title: 'Repeated Speed Violations',
        description: `Bus ${repeatOffender} has logged multiple overspeeding incidents. Review operator activity.`,
        actionText: 'Review Incident',
        actionData: busIncidents[repeatOffender]
      });
    }
  }

  // 4. Infrastructure Attention
  const potholes = (incidents || []).filter(i => i.type === 'pothole');
  if (potholes.length >= 3) {
    insights.push({
      id: 'infrastructure',
      type: 'info',
      title: 'Infrastructure Attention',
      description: 'Elevated pothole incidents detected. A maintenance assessment is recommended.',
      actionText: 'Review Hazards',
      actionData: potholes[0]
    });
  }

  // Take max 2 insights
  const displayInsights = insights.slice(0, 2);

  if (displayInsights.length === 0) return null;

  return (
    <div className="insight-cards-container">
      {displayInsights.map(insight => (
        <div key={insight.id} className={`insight-card insight-${insight.type}`}>
          <div className="insight-content">
            <h4>{insight.title}</h4>
            <p>{insight.description}</p>
          </div>
          <button 
            className="insight-action-btn"
            onClick={() => {
              if (insight.actionData && onActionClick) {
                onActionClick(insight.actionData);
              }
            }}
            disabled={!insight.actionData}
          >
            {insight.actionText}
          </button>
        </div>
      ))}
    </div>
  );
}

export function CapabilitiesMatrix() {
  const capabilities = [
    {
      category: "Edge AI & Vision",
      items: [
        { name: "Pothole Detection", status: "SIMULATED / PROTOTYPE", desc: "YOLOv8 when available; synthetic fallback for prototype operation." },
        { name: "Road Damage Detection", status: "SIMULATED / PROTOTYPE" },
        { name: "Missing Road Divider Detection", status: "PLANNED" },
        { name: "Zebra Crossing Detection", status: "PLANNED" },
        { name: "Road Sign Detection", status: "PLANNED" },
        { name: "Waterlogging / Flooding Detection", status: "PLANNED" },
        { name: "Other Road Hazards", status: "PLANNED" },
      ]
    },
    {
      category: "Traffic & Driver Behavior",
      items: [
        { name: "Traffic Density Estimation", status: "SIMULATED / PROTOTYPE", desc: "Vehicle counting pipeline with prototype/fallback estimation." },
        { name: "Vehicle Counting", status: "SIMULATED / PROTOTYPE" },
        { name: "Vehicle Classification", status: "SIMULATED / PROTOTYPE" },
        { name: "Bottleneck Detection", status: "PLANNED" },
        { name: "Overspeeding Detection", status: "SIMULATED / PROTOTYPE" },
        { name: "Lane Violation Detection", status: "SIMULATED / PROTOTYPE" },
        { name: "Rash Driving Detection", status: "PLANNED" },
      ]
    },
    {
      category: "Emergency & Safety",
      items: [
        { name: "Accident Detection", status: "SIMULATED / PROTOTYPE", desc: "Prototype event generation using simulated detection logic." },
        { name: "Hit-and-Run Detection", status: "PLANNED" },
        { name: "Pedestrian / Child Safety", status: "PLANNED" },
        { name: "Emergency Alerts", status: "PLANNED" },
      ]
    },
    {
      category: "Identification & Evidence",
      items: [
        { name: "Camera / Video Input", status: "SIMULATED / PROTOTYPE" },
        { name: "GPS / Location", status: "SIMULATED / PROTOTYPE" },
        { name: "Incident Timestamp", status: "IMPLEMENTED" },
        { name: "Vehicle / Bus Association", status: "IMPLEMENTED" },
        { name: "ANPR / Registration Numbers", status: "SIMULATED / PROTOTYPE" },
        { name: "Confidence Scores", status: "SIMULATED / PROTOTYPE" },
        { name: "Camera Evidence", status: "SIMULATED / PROTOTYPE", desc: "Real video frames with prototype-generated detection geometry." },
      ]
    },
    {
      category: "GIS & Real-Time Operations",
      items: [
        { name: "Live Incident Map", status: "IMPLEMENTED" },
        { name: "Traffic Density Visualization", status: "IMPLEMENTED" },
        { name: "Traffic Heatmap", status: "IMPLEMENTED" },
        { name: "Individual Bus Routes", status: "IMPLEMENTED" },
        { name: "Live Fleet Telemetry", status: "IMPLEMENTED" },
        { name: "Traffic Zones", status: "IMPLEMENTED" },
        { name: "Incident ? Map Interaction", status: "IMPLEMENTED" },
        { name: "Analytics", status: "IMPLEMENTED" },
        { name: "Authority / Citizen Roles", status: "IMPLEMENTED" },
        { name: "WebSocket Real-Time Updates", status: "IMPLEMENTED" },
      ]
    },
    {
      category: "Advanced Analytics",
      items: [
        { name: "Origin-Destination Analysis", status: "PLANNED" },
        { name: "Route Delay Estimation", status: "PLANNED" },
        { name: "Historical Analysis", status: "PARTIAL" },
        { name: "Predictive Traffic / Incident Detection", status: "PLANNED" },
      ]
    }
  ];

  const getBadgeClass = (status) => {
    switch(status) {
      case 'IMPLEMENTED': return 'badge-implemented';
      case 'SIMULATED / PROTOTYPE': return 'badge-simulated';
      case 'PARTIAL': return 'badge-partial';
      case 'PLANNED': return 'badge-planned';
      default: return '';
    }
  };

  return (
    <div className="capabilities-container">
      <div className="transparency-banner">
        <h2>Prototype Capability Status</h2>
        <p>Urban Intel combines implemented application infrastructure with prototype AI inference and simulated sensing. This view clearly distinguishes what is operational in the current prototype from capabilities planned for production deployment.</p>
        <div className="capability-legend">
          <div className="legend-item"><span className="badge badge-implemented">IMPLEMENTED</span> Working in the current prototype using the implemented application architecture.</div>
          <div className="legend-item"><span className="badge badge-simulated">SIMULATED / PROTOTYPE</span> End-to-end prototype capability, but relying on simulation, fallback models, or demo data.</div>
          <div className="legend-item"><span className="badge badge-partial">PARTIAL</span> Some components are implemented, but the complete capability is not.</div>
          <div className="legend-item"><span className="badge badge-planned">PLANNED</span> Not currently implemented; intended for a future phase.</div>
        </div>
      </div>
      <div className="dashboard-grid capabilities-grid">
        {capabilities.map((cat, idx) => (
          <div className="panel capability-card" key={idx}>
            <div className="panel-header">
              <h3>{cat.category}</h3>
            </div>
            <div className="capability-list">
              {cat.items.map((item, i) => (
                <div className="capability-row" key={i}>
                  <div className="capability-info">
                    <span className="capability-name">{item.name}</span>
                    {item.desc && <span className="capability-desc">{item.desc}</span>}
                  </div>
                  <span className={`badge ${getBadgeClass(item.status)}`}>{item.status}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

