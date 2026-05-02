import React, { useState, useEffect } from 'react';
import Scanner from './Scanner';

const API_URL = "http://127.0.0.1:8000";

const Staff = ({ token }) => {
  const [accessCode, setAccessCode] = useState('');
  const [selectedZone, setSelectedZone] = useState('');
  const [zones, setZones] = useState([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState(null);
  const [sessionExpired, setSessionExpired] = useState(false);

  useEffect(() => {
    if (!token) {
      setSessionExpired(true);
      return;
    }
    fetch(`${API_URL}/zones`)
      .then(res => res.json())
      .then(data => setZones(data))
      .catch(err => console.error("Could not fetch zones: ", err));
  }, [token]);

  const handleLogin = (e) => {
    e.preventDefault();
    // Simple mock authentication for staff
    if (accessCode === 'staff123') {
      if (!selectedZone) {
        setError('Please select a zone to monitor.');
        return;
      }
      setIsAuthenticated(true);
      setError(null);
    } else {
      setError('Invalid Access Code');
    }
  };

  if (isAuthenticated) {
    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h2>Staff Scanner Mode: <span style={{ color: 'var(--accent-primary)' }}>{selectedZone}</span></h2>
          <button className="btn btn-primary" style={{ width: 'auto' }} onClick={() => setIsAuthenticated(false)}>Logout</button>
        </div>
        <Scanner zoneName={selectedZone} token={token} />
      </div>
    );
  }

  return (
    <div className="glass-panel" style={{ maxWidth: '400px', margin: '2rem auto' }}>
      {sessionExpired && (
        <div className="mb-4" style={{ color: 'var(--danger)', textAlign: 'center' }}>
          Session expired. Please sign in again.
        </div>
      )}
      <div className="text-center mb-4">
        <h2 className="title" style={{ fontSize: '2rem' }}>Staff Login</h2>
        <p className="subtitle" style={{ fontSize: '1rem' }}>Enter credentials to access scanner.</p>
      </div>

      <form onSubmit={handleLogin}>
        <div className="form-group">
          <label>Access Code</label>
          <input 
            type="password" 
            className="form-control" 
            value={accessCode} 
            onChange={(e) => setAccessCode(e.target.value)} 
            placeholder="Hint: staff123" 
            required 
          />
        </div>

        <div className="form-group">
          <label>Assigned Zone</label>
          <select 
            className="form-control" 
            value={selectedZone} 
            onChange={(e) => setSelectedZone(e.target.value)} 
            required
          >
            <option value="" disabled>Select Zone...</option>
            {zones.map(z => (
              <option key={z.id} value={z.name}>{z.name}</option>
            ))}
            {zones.length === 0 && <option value="Main Entrance">Main Entrance (Default)</option>}
          </select>
        </div>

        {error && <div style={{ color: 'var(--danger)', marginBottom: '1rem', textAlign: 'center' }}>{error}</div>}

        <button type="submit" className="btn btn-primary">Login & Start Scanning</button>
      </form>
    </div>
  );
};

export default Staff;
