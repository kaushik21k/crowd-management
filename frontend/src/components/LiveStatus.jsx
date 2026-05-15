import React, { useState, useEffect } from 'react';

const API_URL = "http://127.0.0.1:8000";
const WS_URL = "ws://127.0.0.1:8000/ws";

const LiveStatus = () => {
  const [zones, setZones] = useState([]);
  const [alert, setAlert] = useState(null);

  useEffect(() => {
    // Initial fetch
    fetch(`${API_URL}/zones`)
      .then(res => res.json())
      .then(data => setZones(data))
      .catch(err => console.error("Could not fetch zones: ", err));

    // WebSocket connection
    const ws = new WebSocket(WS_URL);
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'entry') {
        // Update zone capacity
        setZones(prevZones => 
          prevZones.map(z => z.name === data.zone.name ? { ...z, current_count: data.zone.current_count } : z)
        );
        
        // Show alert message
        const isFull = data.zone.current_count >= data.zone.capacity;
        const isAlmostFull = data.zone.current_count / data.zone.capacity >= 0.85 && !isFull;
        if (isFull) {
          setAlert({ type: 'danger', message: `🚨 ${data.zone.name} is now FULL! Please avoid this area.` });
          setTimeout(() => setAlert(null), 8000);
        } else if (isAlmostFull) {
          setAlert({ type: 'warning', message: `⚠️ ${data.zone.name} is filling up quickly. Plan accordingly.` });
          setTimeout(() => setAlert(null), 5000);
        }
      }
    };

    return () => ws.close();
  }, []);

  return (
    <div>
      <div className="text-center mb-4">
        <h1 className="title">Public Live Crowd Status</h1>
        <p className="subtitle">Track real-time capacity of all zones to plan your visit.</p>
      </div>

      {alert && (
        <div 
          className="mb-4 text-center" 
          style={{ 
            padding: '1rem', 
            borderRadius: '8px',
            backgroundColor: alert.type === 'danger' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.2)',
            border: `1px solid ${alert.type === 'danger' ? 'var(--danger)' : '#f59e0b'}`,
            fontWeight: 'bold',
            fontSize: '1.2rem',
            color: alert.type === 'danger' ? 'var(--danger)' : '#fbbf24',
            animation: 'fadeIn 0.5s ease-in-out'
          }}
        >
          {alert.message}
        </div>
      )}

      <div className="grid">
        {zones.length === 0 ? <p className="text-center">No live data available at the moment.</p> : null}
        {zones.map((zone, idx) => {
          const progress = zone.current_count / zone.capacity;
          const isFull = zone.current_count >= zone.capacity;
          return (
            <div key={idx} className="glass-panel zone-card" style={{ transition: 'all 0.3s ease' }}>
              <h2 className="zone-title" style={{ margin: '0 0 1rem 0' }}>{zone.name}</h2>
              <div className="capacity-stats" style={{ marginBottom: '0.5rem' }}>
                <span><span className="capacity-number" style={{ color: isFull ? 'var(--danger)' : progress >= 0.85 ? '#fbbf24' : 'var(--text-main)' }}>{zone.current_count}</span> / {zone.capacity}</span>
                <span>{Math.round(progress * 100)}%</span>
              </div>
              <div className="capacity-indicator">
                <div 
                  className="capacity-inner" 
                  style={{ 
                    '--progress': `${Math.min(progress * 100, 100)}%`,
                    background: isFull ? 'var(--danger)' : progress >= 0.85 ? '#fbbf24' : 'var(--success)'
                  }}
                ></div>
              </div>
              <p style={{ 
                color: isFull ? 'var(--danger)' : progress >= 0.85 ? '#fbbf24' : 'var(--success)', 
                fontWeight: 'bold',
                fontSize: '0.9rem', 
                marginTop: '0.75rem', 
                marginBottom: 0,
                textAlign: 'center'
              }}>
                {isFull ? 'Zone Full - Entry Restricted' : progress >= 0.85 ? 'High Traffic - Expect Delays' : 'Open - Walk-ins Welcome'}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  );
};

export default LiveStatus;
