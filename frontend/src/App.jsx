import React, { useState, useEffect } from 'react'
import Registration from './components/Registration'
import Dashboard from './components/Dashboard'
import Admin from './components/Admin'
import Staff from './components/Staff'
import Login from './components/Login'

function App() {
  const [currentView, setCurrentView] = useState('register')
  const [auth, setAuth] = useState({ token: null, role: null })
  const [focusSection, setFocusSection] = useState('')

  useEffect(() => {
    const token = localStorage.getItem('token')
    const role = localStorage.getItem('role')
    if (token && role) {
      setAuth({ token, role })
      if (role === 'admin') setCurrentView('admin')
      else if (role === 'staff') setCurrentView('staff')
    }
  }, [])

  function handleLogin(token, role) {
    localStorage.setItem('token', token)
    localStorage.setItem('role', role)
    setAuth({ token, role })
    if (role === 'admin') setCurrentView('admin')
    else if (role === 'staff') setCurrentView('staff')
  }

  function handleLogout() {
    localStorage.removeItem('token')
    localStorage.removeItem('role')
    setAuth({ token: null, role: null })
    setCurrentView('register')
    setFocusSection('')
  }

  function navigate(view, section = '') {
    setCurrentView(view)
    setFocusSection(section)
  }

  function renderMain() {
    if (currentView === 'register') return <Registration />
    if (currentView === 'login') return <Login onLogin={handleLogin} />
    if (currentView === 'dashboard') return <Dashboard token={auth.token} />
    if (currentView === 'staff') {
      if (auth.role === 'staff' || auth.role === 'admin') return <Staff token={auth.token} />
      return <Login onLogin={handleLogin} />
    }
    if (currentView === 'admin') {
      if (auth.role === 'admin') return <Admin token={auth.token} focusSection={focusSection} />
      return <Login onLogin={handleLogin} />
    }
    return <Registration />
  }

  return (
    <div className="app-container">
      <nav>
        <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
          <span style={{ color: '#3b82f6' }}>Crowd</span>Flow
        </div>
        <div style={{ display: 'flex', gap: '15px' }}>
          {!auth.token ? (
            <>
              <a href="#" onClick={(e) => { e.preventDefault(); navigate('register'); }}>Citizen Pass</a>
              <a href="#" onClick={(e) => { e.preventDefault(); navigate('login'); }}>Sign In</a>
            </>
          ) : auth.role === 'staff' ? (
            <>
              <a href="#" onClick={(e) => { e.preventDefault(); navigate('staff'); }}>Staff Scanner</a>
              <a href="#" onClick={(e) => { e.preventDefault(); handleLogout(); }}>Logout</a>
            </>
          ) : auth.role === 'admin' ? (
            <>
              <a href="#" onClick={(e) => { e.preventDefault(); navigate('dashboard'); }}>Live Dashboard</a>
              <a href="#" onClick={(e) => { e.preventDefault(); navigate('admin', 'monitor'); }}>Admin Panel</a>
              <a href="#" onClick={(e) => { e.preventDefault(); navigate('admin', 'zones'); }}>Zones</a>
              <a href="#" onClick={(e) => { e.preventDefault(); navigate('admin', 'staff-access'); }}>Staff Access</a>
              <a href="#" onClick={(e) => { e.preventDefault(); handleLogout(); }}>Logout</a>
            </>
          ) : (
            <a href="#" onClick={(e) => { e.preventDefault(); handleLogout(); }}>Logout</a>
          )}
        </div>
      </nav>

      <main>
        {renderMain()}
      </main>
    </div>
  )
}

export default App
