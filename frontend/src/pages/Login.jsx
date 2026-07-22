import { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const getInitialServerUrl = () => {
    let savedURL = localStorage.getItem('server_url');
    const isLocal = window.location.hostname === 'localhost' || 
                    window.location.hostname === '127.0.0.1' || 
                    window.location.hostname === '[::1]' || 
                    window.location.hostname === '::1' ||
                    window.location.hostname.endsWith('.local') ||
                    /^192\.168\./.test(window.location.hostname) ||
                    /^10\./.test(window.location.hostname) ||
                    /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(window.location.hostname);
    if (isLocal && savedURL && savedURL.includes('onrender.com')) {
      localStorage.removeItem('server_url');
      savedURL = null;
    }
    const isNative = !!window.Capacitor?.isNative;
    return savedURL || (
      isNative 
        ? 'http://10.0.2.2:5000/api' 
        : isLocal
          ? `http://${window.location.hostname || 'localhost'}:5000/api`
          : (import.meta.env.VITE_API_URL || 'https://expense-tracer-8i63.onrender.com/api')
    );
  };

  const [serverUrl, setServerUrl] = useState(getInitialServerUrl());

  const handleSaveSettings = () => {
    localStorage.setItem('server_url', serverUrl);
    setShowSettings(false);
  };

  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // email aur password submit karke login request bhejenge
    const res = await login(email, password);

    if (res.success) {
      navigate('/'); // dashboard par redirect karenge
    } else {
      setError(res.message);
    }
    setLoading(false);
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Welcome Back!</h2>
        <p className="auth-subtitle">Login to manage your expenses</p>

        {error && (
          <div className="error-alert" style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            <span>{error}</span>
            {(error.includes('Server unreachable') || error.includes('failed') || localStorage.getItem('server_url')) && (
              <button 
                type="button"
                onClick={() => {
                  localStorage.removeItem('server_url');
                  window.location.reload();
                }}
                style={{
                  background: 'rgba(255, 255, 255, 0.2)',
                  color: '#fff',
                  border: '1px solid rgba(255, 255, 255, 0.5)',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  fontWeight: 'bold',
                  alignSelf: 'flex-start',
                  marginTop: '4px',
                  transition: 'background 0.2s'
                }}
              >
                Reset Server Settings & Reload
              </button>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              placeholder="Enter email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <p className="auth-footer">
          Don't have an account? <Link to="/register">Register here</Link>
        </p>

        <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
          <button 
            type="button" 
            onClick={() => setShowSettings(!showSettings)} 
            style={{ 
              background: 'none', 
              border: 'none', 
              color: '#6366f1', 
              cursor: 'pointer', 
              fontSize: '0.9rem',
              textDecoration: 'underline' 
            }}
          >
            {showSettings ? 'Hide Server Settings' : 'Configure Server Settings'}
          </button>
        </div>

        {showSettings && (
          <div style={{ 
            marginTop: '1rem', 
            padding: '1rem', 
            background: '#f3f4f6', 
            borderRadius: '8px', 
            textAlign: 'left' 
          }}>
            <div className="form-group" style={{ marginBottom: '0.8rem' }}>
              <label htmlFor="serverUrl" style={{ fontSize: '0.85rem', color: '#4b5563', fontWeight: 'bold' }}>Server API URL</label>
              <input
                type="text"
                id="serverUrl"
                value={serverUrl}
                onChange={(e) => setServerUrl(e.target.value)}
                style={{ 
                  width: '100%', 
                  padding: '8px', 
                  borderRadius: '4px', 
                  border: '1px solid #d1d5db', 
                  fontSize: '0.9rem',
                  marginTop: '4px' 
                }}
              />
            </div>
            <button 
              type="button" 
              onClick={handleSaveSettings}
              style={{
                background: '#6366f1',
                color: '#fff',
                border: 'none',
                padding: '6px 12px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.85rem',
                fontWeight: 'bold'
              }}
            >
              Save Settings
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;
