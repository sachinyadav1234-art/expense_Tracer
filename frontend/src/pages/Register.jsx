import { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { register } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    // name, email aur password submit karke registration request bhejenge
    const res = await register(name, email, password);

    if (res.success) {
      navigate('/'); // direct dashboard redirect karenge
    } else {
      setError(res.message);
    }
    setLoading(false);
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Create Account</h2>
        <p className="auth-subtitle">Start tracking your money today</p>

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
            <label htmlFor="name">Full Name</label>
            <input
              type="text"
              id="name"
              placeholder="Enter your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

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
              placeholder="Choose password (min 6 characters)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? 'Creating Account...' : 'Register'}
          </button>
        </form>

        <p className="auth-footer">
          Already have an account? <Link to="/login">Login here</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
