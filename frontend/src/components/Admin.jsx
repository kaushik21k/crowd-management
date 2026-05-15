import React, { useEffect, useState } from 'react';

const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://127.0.0.1:8000';

const Admin = ({ token, focusSection }) => {
  const [stats, setStats] = useState({ total_registered: 0, total_entered: 0, total_not_entered: 0 });
  const [citizens, setCitizens] = useState([]);
  const [zones, setZones] = useState([]);
  const [zoneName, setZoneName] = useState('');
  const [zoneCapacity, setZoneCapacity] = useState(100);
  const [editingZoneId, setEditingZoneId] = useState(null);
  const [editingZoneName, setEditingZoneName] = useState('');
  const [editingZoneCapacity, setEditingZoneCapacity] = useState(100);
  const [editingZoneCount, setEditingZoneCount] = useState(0);
  const [message, setMessage] = useState(null);
  const [acknowledgedAlerts, setAcknowledgedAlerts] = useState(() => {
    try {
      const saved = localStorage.getItem('crowdflow_ack_alerts');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [showNotifications, setShowNotifications] = useState(false);
  // Staff state
  const [staffList, setStaffList] = useState([]);
  const [staffName, setStaffName] = useState('');
  const [staffEmail, setStaffEmail] = useState('');
  const [staffPassword, setStaffPassword] = useState('');
  const [showStaffPassword, setShowStaffPassword] = useState(false);
  const [staffMessage, setStaffMessage] = useState(null);
  const [staffLoading, setStaffLoading] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);

  const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

  const handleUnauthorized = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    setSessionExpired(true);
  };

  const fetchAdminData = async () => {
    if (!token) return;
    try {
      const [dashboardRes, zonesRes] = await Promise.all([
        fetch(`${API_URL}/admin/dashboard_data`, { headers: authHeaders }),
        fetch(`${API_URL}/zones`, { headers: authHeaders })
      ]);
      if (dashboardRes.status === 401 || zonesRes.status === 401) {
        handleUnauthorized();
        return;
      }
      const dashboardData = await dashboardRes.json();
      const zoneData = await zonesRes.json();
      setStats(dashboardData.stats);
      setCitizens(dashboardData.citizens || []);
      setZones(zoneData || []);
    } catch (err) {
      console.error('Failed to fetch admin data', err);
    }
  };

  const fetchStaff = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/admin/staff`, { headers: authHeaders });
      if (res.status === 401) {
        handleUnauthorized();
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setStaffList(data);
      }
    } catch (err) {
      console.error('Failed to fetch staff', err);
    }
  };

  useEffect(() => {
    if (!token) return;
    fetchAdminData();
    fetchStaff();
    const interval = setInterval(() => { fetchAdminData(); fetchStaff(); }, 5000);
    return () => clearInterval(interval);
  }, [token]);

  // Removed scroll-to-section logic in favor of distinct views

  const clearZoneForm = () => {
    setZoneName(''); setZoneCapacity(100); setEditingZoneId(null);
    setEditingZoneName(''); setEditingZoneCapacity(100); setEditingZoneCount(0);
  };

  const showTimedMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleDeleteCitizen = async (citizen) => {
    if (!window.confirm(`Are you sure you want to delete ${citizen.name}? This will also remove their entry records and free up capacity.`)) return;
    try {
      const res = await fetch(`${API_URL}/admin/citizens/${citizen.id}`, { method: 'DELETE', headers: authHeaders });
      if (res.ok) {
        showTimedMessage('success', `Attendee "${citizen.name}" deleted successfully.`);
        fetchAdminData();
      } else {
        const err = await res.json();
        showTimedMessage('danger', err.detail || 'Failed to delete attendee');
      }
    } catch {
      showTimedMessage('danger', 'Error connecting to server');
    }
  };

  const exportToCSV = () => {
    if (!citizens || citizens.length === 0) {
      alert('No data to export.');
      return;
    }
    
    const headers = ['Name', 'Email', 'Dept', 'Age', 'Status', 'Zone Entered'];
    const csvRows = [];
    csvRows.push(headers.join(','));
    
    for (const c of citizens) {
      const row = [
        `"${c.name || ''}"`,
        `"${c.email || ''}"`,
        `"${c.dept || ''}"`,
        `"${c.age || ''}"`,
        `"${c.has_entered ? 'Entered' : 'Pending'}"`,
        `"${c.zone_entered || '-'}"`
      ];
      csvRows.push(row.join(','));
    }
    
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `attendees_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const showStaffTimedMessage = (type, text) => {
    setStaffMessage({ type, text });
    setTimeout(() => setStaffMessage(null), 3500);
  };

  const handleCreateZone = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/zones`, {
        method: 'POST',
        headers: Object.assign({ 'Content-Type': 'application/json' }, authHeaders),
        body: JSON.stringify({ name: zoneName, capacity: parseInt(zoneCapacity, 10), current_count: 0 })
      });
      if (res.ok) {
        showTimedMessage('success', `Zone "${zoneName}" created!`);
        clearZoneForm(); fetchAdminData();
      } else {
        const err = await res.json();
        showTimedMessage('danger', err.detail || 'Failed to create zone');
      }
    } catch { showTimedMessage('danger', 'Error connecting to server'); }
  };

  const beginEditZone = (zone) => {
    setEditingZoneId(zone.id); setEditingZoneName(zone.name);
    setEditingZoneCapacity(zone.capacity); setEditingZoneCount(zone.current_count || 0);
  };

  const handleUpdateZone = async (e) => {
    e.preventDefault();
    if (!editingZoneId) return;
    try {
      const res = await fetch(`${API_URL}/zones/${editingZoneId}`, {
        method: 'PUT',
        headers: Object.assign({ 'Content-Type': 'application/json' }, authHeaders),
        body: JSON.stringify({ name: editingZoneName, capacity: parseInt(editingZoneCapacity, 10), current_count: parseInt(editingZoneCount, 10) })
      });
      if (res.ok) {
        showTimedMessage('success', `Zone "${editingZoneName}" updated!`);
        clearZoneForm(); fetchAdminData();
      } else {
        const err = await res.json();
        showTimedMessage('danger', err.detail || 'Failed to update zone');
      }
    } catch { showTimedMessage('danger', 'Error connecting to server'); }
  };

  const handleDeleteZone = async (zone) => {
    if (!window.confirm(`Delete zone "${zone.name}"?`)) return;
    try {
      const res = await fetch(`${API_URL}/zones/${zone.id}`, { method: 'DELETE', headers: authHeaders });
      if (res.ok) {
        showTimedMessage('success', `Zone "${zone.name}" deleted!`);
        if (editingZoneId === zone.id) clearZoneForm();
        fetchAdminData();
      } else {
        const err = await res.json();
        showTimedMessage('danger', err.detail || 'Failed to delete zone');
      }
    } catch { showTimedMessage('danger', 'Error connecting to server'); }
  };

  const handleCreateStaff = async (e) => {
    e.preventDefault();
    setStaffLoading(true);
    try {
      const res = await fetch(`${API_URL}/admin/staff`, {
        method: 'POST',
        headers: Object.assign({ 'Content-Type': 'application/json' }, authHeaders),
        body: JSON.stringify({ name: staffName, email: staffEmail, password: staffPassword })
      });
      if (res.ok) {
        showStaffTimedMessage('success', `✅ Staff "${staffName}" created! They can now log in with their credentials.`);
        setStaffName(''); setStaffEmail(''); setStaffPassword('');
        fetchStaff();
      } else {
        const err = await res.json();
        showStaffTimedMessage('danger', err.detail || 'Failed to create staff');
      }
    } catch { showStaffTimedMessage('danger', 'Error connecting to server'); }
    setStaffLoading(false);
  };

  const handleDeleteStaff = async (staff) => {
    if (!window.confirm(`Remove staff access for "${staff.name}" (${staff.email})?`)) return;
    try {
      const res = await fetch(`${API_URL}/admin/staff/${staff.id}`, { method: 'DELETE', headers: authHeaders });
      if (res.ok) {
        showStaffTimedMessage('success', `Staff "${staff.name}" removed.`);
        fetchStaff();
      } else {
        const err = await res.json();
        showStaffTimedMessage('danger', err.detail || 'Failed to remove staff');
      }
    } catch { showStaffTimedMessage('danger', 'Error connecting to server'); }
  };

  const activeAlerts = zones.filter(z => z.capacity > 0 && z.current_count / z.capacity >= 0.85);
  const unacknowledgedAlerts = activeAlerts.filter(z => !acknowledgedAlerts[z.id]);
  const notifications = activeAlerts.filter(z => acknowledgedAlerts[z.id]);

  useEffect(() => {
    if (zones.length > 0) {
      const activeIds = new Set(activeAlerts.map(z => z.id.toString()));
      let changed = false;
      const newAcks = { ...acknowledgedAlerts };
      
      Object.keys(newAcks).forEach(id => {
        if (!activeIds.has(id)) {
          delete newAcks[id];
          changed = true;
        }
      });
      
      if (changed) {
        setAcknowledgedAlerts(newAcks);
        localStorage.setItem('crowdflow_ack_alerts', JSON.stringify(newAcks));
      }
    }
  }, [zones, activeAlerts, acknowledgedAlerts]);

  const handleAcknowledge = () => {
    const newAcks = { ...acknowledgedAlerts };
    unacknowledgedAlerts.forEach(z => { newAcks[z.id] = true; });
    setAcknowledgedAlerts(newAcks);
    localStorage.setItem('crowdflow_ack_alerts', JSON.stringify(newAcks));
  };

  return (
    <div>
      {sessionExpired && (
        <div className="glass-panel mb-4" style={{ borderColor: 'var(--danger)', color: 'var(--danger)', textAlign: 'center' }}>
          Session expired or unauthorized. Please sign in again.
        </div>
      )}
      <div className="text-center mb-4">
        <h1 className="title">
          {focusSection === 'staff-access' ? 'Staff Management' : focusSection === 'zones' ? 'Zone Management' : 'Admin Monitor'}
        </h1>
        <p className="subtitle">
          {focusSection === 'staff-access' ? 'Manage staff access and credentials.' : focusSection === 'zones' ? 'Manage zones and capacities.' : 'Monitor attendees and stats.'}
        </p>
      </div>

      {/* Unacknowledged Alerts Popup */}
      {(!focusSection || focusSection === 'monitor') && unacknowledgedAlerts.length > 0 && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)'
        }}>
          <div className="glass-panel" style={{ width: '90%', maxWidth: '500px', textAlign: 'center', padding: '2rem' }}>
            <div style={{ fontSize: '3.5rem', marginBottom: '0.5rem' }}>⚠️</div>
            <h2 style={{ color: 'var(--danger)', marginBottom: '1.5rem', fontSize: '1.8rem' }}>Capacity Alert!</h2>
            {unacknowledgedAlerts.map(z => {
                const isFull = z.current_count >= z.capacity;
                return (
                  <div key={z.id} style={{ 
                    marginBottom: '1rem', fontSize: '1.1rem', fontWeight: 'bold',
                    padding: '1rem', borderRadius: '8px',
                    backgroundColor: isFull ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                    border: `1px solid ${isFull ? 'var(--danger)' : '#fbbf24'}`,
                    color: isFull ? '#fca5a5' : '#fde68a'
                  }}>
                    {isFull ? `🛑 ${z.name} is FULL!` : `⚠️ ${z.name} is almost full!`} <br/>
                    <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>({z.current_count} / {z.capacity} spaces used)</span>
                  </div>
                );
            })}
            <button 
              className="btn btn-primary" 
              style={{ marginTop: '1rem', width: '100%', fontSize: '1.1rem', padding: '0.75rem' }}
              onClick={handleAcknowledge}
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* Notification Bell Icon */}
      {(!focusSection || focusSection === 'monitor') && (
        <div style={{ position: 'fixed', top: '1.5rem', right: '2rem', zIndex: 1000 }}>
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            style={{ 
              background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(255,255,255,0.2)', 
              fontSize: '1.5rem', cursor: 'pointer', position: 'relative',
              borderRadius: '50%', width: '50px', height: '50px', 
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)', backdropFilter: 'blur(4px)'
            }}
          >
            🔔
            {notifications.length > 0 && (
              <span style={{
                position: 'absolute', top: '-2px', right: '-2px', background: 'var(--danger)', color: 'white',
                borderRadius: '50%', width: '22px', height: '22px', fontSize: '0.8rem', fontWeight: 'bold',
                display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #0f172a'
              }}>
                {notifications.length}
              </span>
            )}
          </button>
          
          {showNotifications && (
            <div className="glass-panel" style={{
              position: 'absolute', top: 'calc(100% + 10px)', right: 0, width: '320px', 
              padding: '1.25rem', zIndex: 1001, textAlign: 'left',
              boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
            }}>
              <h4 style={{ margin: '0 0 1rem 0', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem', color: '#fff', position: 'relative' }}>
                Acknowledged Alerts
                <button 
                  onClick={() => setShowNotifications(false)}
                  style={{
                    position: 'absolute', right: 0, top: 0, background: 'none', border: 'none', 
                    color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem', lineHeight: 1
                  }}
                  title="Close"
                >
                  &times;
                </button>
              </h4>
              {notifications.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0, textAlign: 'center' }}>No active alerts.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {notifications.map(z => {
                    const isFull = z.current_count >= z.capacity;
                    return (
                      <div key={z.id} style={{
                        padding: '0.75rem', borderRadius: '8px', fontSize: '0.9rem',
                        backgroundColor: isFull ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                        color: isFull ? '#fca5a5' : '#fde68a', border: `1px solid ${isFull ? 'rgba(239, 68, 68, 0.4)' : 'rgba(245, 158, 11, 0.4)'}`
                      }}>
                        <div style={{ fontWeight: 'bold', marginBottom: '0.2rem' }}>
                          {isFull ? '🛑 FULL' : '⚠️ WARNING'}
                        </div>
                        {z.name} <span style={{ float: 'right' }}>({z.current_count}/{z.capacity})</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Stats */}
      {(!focusSection || focusSection === 'monitor') && (
        <div className="grid mb-4">
          <div className="glass-panel text-center">
            <h3>Total Registered</h3>
            <p style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--accent-primary)' }}>{stats.total_registered}</p>
          </div>
          <div className="glass-panel text-center">
            <h3>Total Entered</h3>
            <p style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--success)' }}>{stats.total_entered}</p>
          </div>
          <div className="glass-panel text-center">
            <h3>Not Entered Yet</h3>
            <p style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>{stats.total_not_entered}</p>
          </div>
        </div>
      )}

      {/* ── Staff Access Management ── */}
      {focusSection === 'staff-access' && (
      <div id="staff-access-section" className="glass-panel mb-4" style={{ maxWidth: '900px', margin: '0 auto 2rem' }}>
        {/* Section Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <div style={{
            width: '40px', height: '40px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
            fontSize: '1.25rem', flexShrink: 0
          }}>👥</div>
          <div>
            <h3 style={{ margin: 0 }}>Staff Access Management</h3>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>Grant login access to event staff members</p>
          </div>
          <span style={{
            marginLeft: 'auto', background: 'rgba(59,130,246,0.15)', color: 'var(--accent-primary)',
            border: '1px solid rgba(59,130,246,0.3)', borderRadius: '20px', padding: '0.25rem 0.75rem',
            fontSize: '0.8rem', fontWeight: 600
          }}>{staffList.length} Active</span>
        </div>

        {/* Staff message */}
        {staffMessage && (
          <div style={{
            padding: '0.85rem 1.1rem', borderRadius: '8px', marginBottom: '1.25rem', fontSize: '0.9rem',
            background: staffMessage.type === 'success' ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
            border: `1px solid ${staffMessage.type === 'success' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
            color: staffMessage.type === 'success' ? 'var(--success)' : 'var(--danger)'
          }}>
            {staffMessage.text}
          </div>
        )}

        {/* Create Staff Form */}
        <div style={{
          background: 'rgba(15,23,42,0.4)', border: '1px solid var(--glass-border)',
          borderRadius: '12px', padding: '1.5rem', marginBottom: '1.5rem'
        }}>
          <h4 style={{ marginBottom: '1rem', color: 'var(--text-muted)', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            ➕ Create New Staff Account
          </h4>
          <form onSubmit={handleCreateStaff} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '1rem', alignItems: 'flex-end' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Full Name</label>
              <input type="text" className="form-control" value={staffName}
                onChange={e => setStaffName(e.target.value)} required placeholder="e.g. Ravi Kumar" />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Gmail / Email</label>
              <input type="email" className="form-control" value={staffEmail}
                onChange={e => setStaffEmail(e.target.value)} required placeholder="staff@gmail.com" />
            </div>
            <div className="form-group" style={{ marginBottom: 0, position: 'relative' }}>
              <label>Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showStaffPassword ? 'text' : 'password'}
                  className="form-control"
                  value={staffPassword}
                  onChange={e => setStaffPassword(e.target.value)}
                  required
                  placeholder="Set a secure password"
                  style={{ paddingRight: '2.5rem' }}
                />
                <button
                  type="button"
                  onClick={() => setShowStaffPassword(p => !p)}
                  style={{
                    position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '1rem'
                  }}
                  title={showStaffPassword ? 'Hide' : 'Show'}
                >
                  {showStaffPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={staffLoading}
              style={{ width: 'auto', padding: '0.75rem 1.5rem', whiteSpace: 'nowrap' }}
            >
              {staffLoading ? '...' : 'Grant Access'}
            </button>
          </form>
        </div>

        {/* Staff List */}
        <div>
          <h4 style={{ marginBottom: '1rem', color: 'var(--text-muted)', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            🔑 Active Staff Accounts
          </h4>
          {staffList.length === 0 ? (
            <div style={{
              textAlign: 'center', padding: '2rem', color: 'var(--text-muted)',
              border: '1px dashed var(--glass-border)', borderRadius: '10px'
            }}>
              No staff accounts yet. Create one above to grant scanner access.
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '0.6rem' }}>
              {staffList.map((s, idx) => (
                <div key={s.id} style={{
                  display: 'flex', alignItems: 'center', gap: '1rem',
                  padding: '0.9rem 1.1rem', borderRadius: '10px',
                  background: 'rgba(15,23,42,0.5)', border: '1px solid var(--glass-border)',
                  transition: 'border-color 0.2s'
                }}>
                  {/* Avatar */}
                  <div style={{
                    width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0,
                    background: `hsl(${(idx * 67 + 200) % 360}, 70%, 40%)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700, fontSize: '0.95rem', color: '#fff'
                  }}>
                    {s.name ? s.name[0].toUpperCase() : '?'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{s.name}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: '0.1rem' }}>
                      📧 {s.email}
                    </div>
                  </div>
                  <span style={{
                    padding: '0.2rem 0.6rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600,
                    background: 'rgba(16,185,129,0.15)', color: 'var(--success)', border: '1px solid rgba(16,185,129,0.3)'
                  }}>Staff</span>
                  <button
                    onClick={() => handleDeleteStaff(s)}
                    style={{
                      background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                      color: 'var(--danger)', borderRadius: '7px', padding: '0.4rem 0.8rem',
                      cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, transition: 'background 0.2s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.25)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'}
                  >
                    Revoke
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      )}

      {/* Zone Management */}
      {focusSection === 'zones' && (
      <div id="zone-management-section" className="glass-panel mb-4" style={{ maxWidth: '900px', margin: '0 auto 2rem' }}>
        <h3 className="mb-2">Zone Management</h3>
        {message && (
          <div style={{ color: message.type === 'danger' ? 'var(--danger)' : 'var(--success)', marginBottom: '1rem' }}>
            {message.text}
          </div>
        )}
        <form onSubmit={editingZoneId ? handleUpdateZone : handleCreateZone} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div className="form-group" style={{ marginBottom: 0, flex: 2 }}>
            <label>Zone Name</label>
            <input type="text" className="form-control"
              value={editingZoneId ? editingZoneName : zoneName}
              onChange={e => editingZoneId ? setEditingZoneName(e.target.value) : setZoneName(e.target.value)}
              required placeholder="VIP Area" />
          </div>
          <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
            <label>Capacity</label>
            <input type="number" className="form-control"
              value={editingZoneId ? editingZoneCapacity : zoneCapacity}
              onChange={e => editingZoneId ? setEditingZoneCapacity(e.target.value) : setZoneCapacity(e.target.value)}
              required min="1" />
          </div>
          {editingZoneId && (
            <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
              <label>Current Count</label>
              <input type="number" className="form-control" value={editingZoneCount}
                onChange={e => setEditingZoneCount(e.target.value)} required min="0" />
            </div>
          )}
          <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>{editingZoneId ? 'Save Changes' : 'Create'}</button>
          {editingZoneId && (
            <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={clearZoneForm}>Cancel</button>
          )}
        </form>

        <div style={{ marginTop: '1.5rem' }}>
          <h4 className="mb-2">Existing Zones</h4>
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {zones.map((zone) => (
              <div key={zone.id} className="glass-panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', padding: '1rem' }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{zone.name}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                    Capacity: {zone.capacity} | Current Count: {zone.current_count || 0}
                  </div>
                </div>
                <div className="btn-group" style={{ marginLeft: 'auto' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => beginEditZone(zone)}>Edit</button>
                  <button type="button" className="btn btn-secondary" onClick={() => handleDeleteZone(zone)}>Delete</button>
                </div>
              </div>
            ))}
            {zones.length === 0 && (
              <div className="text-center" style={{ color: 'var(--text-muted)', padding: '0.75rem 0' }}>No zones available.</div>
            )}
          </div>
        </div>
      </div>
      )}

      {/* Attendee Table */}
      {(!focusSection || focusSection === 'monitor') && (
      <>
        {message && (
          <div style={{
            padding: '0.85rem 1.1rem', borderRadius: '8px', marginBottom: '1.25rem', fontSize: '0.95rem', textAlign: 'center',
            background: message.type === 'success' ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
            border: `1px solid ${message.type === 'success' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
            color: message.type === 'success' ? 'var(--success)' : 'var(--danger)'
          }}>
            {message.text}
          </div>
        )}
        <div className="glass-panel" style={{ overflowX: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0 }}>Attendee Database</h3>
          <button 
            onClick={exportToCSV} 
            className="btn btn-primary" 
            style={{ width: 'auto', padding: '0.4rem 1rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            📥 Export CSV
          </button>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
              <th style={{ padding: '1rem 0.5rem' }}>Name</th>
              <th style={{ padding: '1rem 0.5rem' }}>Email</th>
              <th style={{ padding: '1rem 0.5rem' }}>Dept / Age</th>
              <th style={{ padding: '1rem 0.5rem' }}>Status</th>
              <th style={{ padding: '1rem 0.5rem' }}>Zone Entered</th>
              <th style={{ padding: '1rem 0.5rem', textAlign: 'right' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {citizens.map(c => (
              <tr key={c.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <td style={{ padding: '1rem 0.5rem' }}>{c.name}</td>
                <td style={{ padding: '1rem 0.5rem' }}>{c.email}</td>
                <td style={{ padding: '1rem 0.5rem' }}>{c.dept || '-'} / {c.age || '-'}</td>
                <td style={{ padding: '1rem 0.5rem' }}>
                  <span style={{
                    padding: '0.25rem 0.5rem', borderRadius: '4px',
                    backgroundColor: c.has_entered ? 'rgba(16,185,129,0.2)' : 'rgba(148,163,184,0.2)',
                    color: c.has_entered ? 'var(--success)' : 'var(--text-muted)', fontSize: '0.85rem'
                  }}>
                    {c.has_entered ? 'Entered' : 'Pending'}
                  </span>
                </td>
                <td style={{ padding: '1rem 0.5rem' }}>{c.zone_entered || '-'}</td>
                <td style={{ padding: '1rem 0.5rem', textAlign: 'right' }}>
                  <button 
                    onClick={() => handleDeleteCitizen(c)}
                    style={{
                      background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                      color: 'var(--danger)', borderRadius: '6px', padding: '0.3rem 0.6rem',
                      cursor: 'pointer', fontSize: '0.8rem', transition: 'background 0.2s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.25)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'}
                    title="Delete Attendee"
                  >
                    🗑️
                  </button>
                </td>
              </tr>
            ))}
            {citizens.length === 0 && (
              <tr><td colSpan="5" className="text-center" style={{ padding: '2rem' }}>No citizens registered yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      </>
      )}
    </div>
  );
};

export default Admin;
