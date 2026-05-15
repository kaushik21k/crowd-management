import React, { useState, useEffect } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';

const API_URL = import.meta.env.VITE_BACKEND_URL || "http://127.0.0.1:8000";

const Scanner = ({ zoneName, token }) => {
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState(false);
  const cooldownRef = React.useRef(false);
  const lastScannedRef = React.useRef(null);

  useEffect(() => {
    // Initialize html5-qrcode scanner
    const scanner = new Html5QrcodeScanner(
      "qr-reader",
      { fps: 15, qrbox: { width: 300, height: 300 } },
      /* verbose= */ false
    );

    scanner.render(
      (text) => handleScan(text),
      (err) => {
        // Ignore constant scanning errors (e.g. background noise)
      }
    );

    return () => {
      scanner.clear().catch(error => console.error("Failed to clear scanner", error));
    };
  }, []);

  const handleScan = async (text) => {
    if (cooldownRef.current) return;
    
    cooldownRef.current = true;
    
    try {
      const response = await fetch(`${API_URL}/scan`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ qr_id: text, zone_name: zoneName || "Main Entrance" })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        if (data.alert) {
          setMessage(`⚠️ ${data.user} scanned successfully! (${data.alert})`);
        } else {
          setMessage(`✅ ${data.user} scanned successfully!`);
        }
        setSuccess(true);
      } else {
        setMessage(`ERROR: ${data.detail}`);
        setSuccess(false);
      }
    } catch (err) {
      setMessage(`CONNECTION ERROR: Could not reach backend.`);
      setSuccess(false);
    }
    
    setTimeout(() => {
      cooldownRef.current = false;
    }, 2000);
  };

  return (
    <div className="glass-panel" style={{ maxWidth: '600px', margin: '0 auto' }}>
      <div className="text-center mb-4">
        <h1 className="title">Entry Scanner</h1>
        <p className="subtitle">Show your new QR Code to the camera to enter.</p>
      </div>

      <div style={{ borderRadius: '12px', overflow: 'hidden', background: '#fff' }}>
        <div id="qr-reader" style={{ width: '100%', border: 'none' }}></div>
      </div>
      
      {message && (
        <div 
          className="mt-4 text-center" 
          style={{ 
            padding: '1rem', 
            borderRadius: '8px',
            backgroundColor: success ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
            border: `1px solid ${success ? 'var(--success)' : 'var(--danger)'}`,
            fontWeight: 'bold',
            fontSize: '1.2rem',
            color: success ? 'var(--success)' : 'var(--danger)'
          }}
        >
          {message}
        </div>
      )}
    </div>
  );
};

export default Scanner;
