import React, { useState, useEffect } from 'react';

const API_URL = "http://127.0.0.1:8000";
const WS_URL = "ws://127.0.0.1:8000/ws";

const Dashboard = () => {
  const [zones, setZones] = useState([]);
  const [recentEntries, setRecentEntries] = useState([]);
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
        // Update recent entries
        setRecentEntries(prev => [
          { id: Date.now(), user: data.user, zone: data.zone.name, time: new Date().toLocaleTimeString() },
          ...prev
        ].slice(0, 5)); // Keep only last 5
        
        // Show alert message
        const isFull = data.zone.current_count >= data.zone.capacity;
        const isAlmostFull = data.zone.current_count / data.zone.capacity >= 0.85 && !isFull;
        if (isFull) {
          setAlert({ type: 'danger', message: `⚠️ ALERT: ${data.zone.name} is now at FULL Capacity!` });
        } else if (isAlmostFull) {
          setAlert({ type: 'warning', message: `⚠️ WARNING: ${data.zone.name} is filling up fast! (${data.zone.current_count}/${data.zone.capacity})` });
        } else {
          setAlert({ type: 'success', message: `✅ ${data.user.name} entered ${data.zone.name}` });
          setTimeout(() => setAlert(null), 3000);
        }
      }
    };

    return () => ws.close();
  }, []);

  return (
    <div>
      <div className="text-center mb-4">
        <h1 className="title">Live Dashboard</h1>
        <p className="subtitle">Real-time crowd monitoring and capacity management.</p>
      </div>

      {/* Persistent Alerts */}
      {zones.some(z => z.capacity > 0 && z.current_count / z.capacity >= 0.85) && (
        <div className="mb-4">
          {zones.filter(z => z.capacity > 0 && z.current_count / z.capacity >= 0.85).map(z => {
            const isFull = z.current_count >= z.capacity;
            return (
              <div key={z.name} style={{
                padding: '1rem', borderRadius: '8px', marginBottom: '0.5rem',
                backgroundColor: isFull ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                border: `1px solid ${isFull ? 'var(--danger)' : '#f59e0b'}`,
                fontWeight: 'bold', color: isFull ? 'var(--danger)' : '#fbbf24',
                textAlign: 'center'
              }}>
                {isFull ? `🛑 ALERT: ${z.name} is at FULL Capacity!` : `⚠️ WARNING: ${z.name} is filling up fast!`} ({z.current_count}/{z.capacity})
              </div>
            );
          })}
        </div>
      )}

      {alert && (
        <div 
          className="mb-4 text-center" 
          style={{ 
            padding: '1rem', 
            borderRadius: '8px',
            backgroundColor: alert.type === 'danger' ? 'rgba(239, 68, 68, 0.2)' : alert.type === 'warning' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(16, 185, 129, 0.2)',
            border: `1px solid ${alert.type === 'danger' ? 'var(--danger)' : alert.type === 'warning' ? '#f59e0b' : 'var(--success)'}`,
            fontWeight: 'bold',
            fontSize: '1.2rem',
            color: alert.type === 'danger' ? 'var(--danger)' : alert.type === 'warning' ? '#fbbf24' : 'var(--success)'
          }}
        >
          {alert.message}
        </div>
      )}

      <div className="grid">
        {zones.length === 0 ? <p className="text-center">No zones data available.</p> : null}
        {zones.map((zone, idx) => {
          const progress = zone.current_count / zone.capacity;
          const isFull = zone.current_count >= zone.capacity;
          return (
            <div key={idx} className="glass-panel zone-card">
              <h2 className="zone-title" style={{ margin: '0 0 1rem 0' }}>{zone.name}</h2>
              <div className="capacity-stats" style={{ marginBottom: '0.5rem' }}>
                <span><span className="capacity-number" style={{ color: isFull ? 'var(--danger)' : 'var(--text-main)' }}>{zone.current_count}</span> / {zone.capacity} MAX</span>
                <span>{Math.round(progress * 100)}%</span>
              </div>
              <div className="capacity-indicator">
                <div 
                  className="capacity-inner" 
                  style={{ 
                    '--progress': `${Math.min(progress * 100, 100)}%`,
                    background: isFull ? 'var(--danger)' : progress >= 0.85 ? '#fbbf24' : 'var(--accent-primary)'
                  }}
                ></div>
              </div>
              <p style={{ color: isFull ? 'var(--danger)' : 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.5rem', marginBottom: 0 }}>
                {isFull ? 'Zone Capacity Full' : 'Available for Entry'}
              </p>
            </div>
          )
        })}
      </div>

      <div className="recent-entries glass-panel" style={{ marginTop: '2rem' }}>
        <h3 className="mb-2">Recent Scans</h3>
        {recentEntries.length === 0 ? (
          <p className="text-muted">No recent entries yet.</p>
        ) : (
          <ul className="entry-list">
            {recentEntries.map(entry => (
              <li key={entry.id} className="entry-item" style={{display: 'flex', flexDirection: 'column', alignItems: 'flex-start'}}>
                <div style={{width: '100%', display: 'flex', justifyContent: 'space-between'}}>
                  <strong>{entry.user.name}</strong> 
                  <div className="text-muted">{entry.time} &mdash; <span>{entry.zone}</span></div>
                </div>
                <div style={{fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '0.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr', width: '100%', gap: '0.5rem'}}>
                  <span><strong>Dept:</strong> {entry.user.dept || 'N/A'}</span>
                  <span><strong>Age/DOB:</strong> {entry.user.age || 'N/A'} / {entry.user.dob || 'N/A'}</span>
                  <span><strong>Blood:</strong> {entry.user.blood_group || 'N/A'}</span>
                  <span><strong>Phone:</strong> {entry.user.mobile_no || 'N/A'}</span>
                  <span style={{gridColumn: 'span 2'}}><strong>Email:</strong> {entry.user.email}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
