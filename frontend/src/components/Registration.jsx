import React, { useState } from 'react';

const API_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";

const Registration = () => {
  const [formData, setFormData] = useState({ 
    name: '', email: '', age: '', dob: '', dept: '', clg_mail: '', blood_group: '', address: '', mobile_no: '' 
  });
  const [qrCode, setQrCode] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Convert age to number if present
    const payload = { ...formData };
    if (payload.age) payload.age = parseInt(payload.age, 10);

    try {
      const response = await fetch(`${API_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.detail || 'Registration failed');
      }

      setQrCode(data.qr_code);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-panel" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div className="text-center">
        <h1 className="title">Get Your Pass</h1>
        <p className="subtitle">Register with your full details to receive a unique QR entry code.</p>
      </div>

      {!qrCode ? (
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Full Name</label>
              <input type="text" className="form-control" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required placeholder="John Doe" />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Personal Email</label>
              <input type="email" className="form-control" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} required placeholder="john@example.com" />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Age</label>
              <input type="number" className="form-control" value={formData.age} onChange={(e) => setFormData({...formData, age: e.target.value})} placeholder="21" />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Date of Birth</label>
              <input type="date" className="form-control" value={formData.dob} onChange={(e) => setFormData({...formData, dob: e.target.value})} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Department</label>
              <input type="text" className="form-control" value={formData.dept} onChange={(e) => setFormData({...formData, dept: e.target.value})} placeholder="Computer Science" />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>College Mail</label>
              <input type="email" className="form-control" value={formData.clg_mail} onChange={(e) => setFormData({...formData, clg_mail: e.target.value})} placeholder="john.doe@college.edu" />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Blood Group</label>
              <select className="form-control" value={formData.blood_group} onChange={(e) => setFormData({...formData, blood_group: e.target.value})}>
                <option value="">Select...</option>
                <option value="A+">A+</option><option value="A-">A-</option>
                <option value="B+">B+</option><option value="B-">B-</option>
                <option value="O+">O+</option><option value="O-">O-</option>
                <option value="AB+">AB+</option><option value="AB-">AB-</option>
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Mobile Number</label>
              <input type="tel" className="form-control" value={formData.mobile_no} onChange={(e) => setFormData({...formData, mobile_no: e.target.value})} placeholder="+1 234 567 890" />
            </div>
            <div className="form-group" style={{ gridColumn: 'span 2', marginBottom: 0 }}>
              <label>Address</label>
              <textarea className="form-control" rows="2" value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} placeholder="123 Main St, City, Country" />
            </div>
          </div>
          
          {error && <div style={{ color: 'var(--danger)', marginBottom: '1rem', textAlign: 'center' }}>{error}</div>}
          
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Generating...' : 'Generate Pass'}
          </button>
        </form>
      ) : (
        <div className="text-center">
          <div className="qr-container mb-4">
            <img src={qrCode} alt="Your Unique QR Code" />
          </div>
          <h3 style={{ color: 'var(--success)' }} className="mb-2">Registration Successful!</h3>
          <p className="mb-4 text-muted">Please save this QR Code. You will need it to enter.</p>
          <div className="btn-group">
            <button className="btn btn-primary" onClick={() => {
              const link = document.createElement('a');
              link.href = qrCode;
              link.download = `QR_Code_${formData.email.split('@')[0]}.png`;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }}>
              📥 Download QR Code
            </button>
            <button className="btn btn-secondary" onClick={() => { 
              setQrCode(null); 
              setFormData({name: '', email: '', age: '', dob: '', dept: '', clg_mail: '', blood_group: '', address: '', mobile_no: ''}); 
            }}>
              Register Another Person
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Registration;
