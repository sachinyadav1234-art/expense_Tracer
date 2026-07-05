import { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [serverUrl, setServerUrl] = useState(localStorage.getItem('server_url') || (
    (window.Capacitor?.isNative || (window.Capacitor && window.Capacitor.Plugins)) 
      ? 'http://10.0.2.2:5000/api' 
      : 'http://localhost:5000/api'
  ));

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

        {error && <div className="error-alert">{error}</div>}

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
