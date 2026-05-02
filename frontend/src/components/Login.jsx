import React, { useState } from 'react'

const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState(null)

  async function submit(e) {
    e.preventDefault()
    setError(null)
    try {
      const res = await fetch(`${BACKEND}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })
      if (!res.ok) {
        const err = await res.json()
        setError(err.detail || 'Login failed')
        return
      }
      const data = await res.json()
      onLogin(data.access_token, data.role)
    } catch (err) {
      setError('Network error')
    }
  }

  return (
    <div className="glass-panel login-panel">
      <div className="text-center mb-4">
        <h2 className="title">Login</h2>
        <p className="subtitle">Sign in with your admin or staff account.</p>
      </div>
      <form onSubmit={submit}>
        <div className="form-group">
          <label>Email</label>
          <input
            type="email"
            className="form-control"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter mail"
            required
          />
        </div>
        <div className="form-group">
          <label>Password</label>
          <div className="password-field-wrap">
            <input
              type={showPassword ? 'text' : 'password'}
              className="form-control"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />
            <button
              type="button"
              className="password-toggle-btn"
              onClick={() => setShowPassword(!showPassword)}
              title={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>
        {error && <div className="login-error">{error}</div>}
        <button type="submit" className="btn btn-primary">Sign In</button>
      </form>
    </div>
  )
}
