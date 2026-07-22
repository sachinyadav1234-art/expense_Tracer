import { Routes, Route, Navigate } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from './context/AuthContext';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import Groups from './pages/Groups';
import Login from './pages/Login';
import Register from './pages/Register';

// Protected Route component jo verify karega ki user login hai ya nahi
const PrivateRoute = ({ children }) => {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return <div className="loading-spinner">Loading authentication...</div>;
  }

  // Agar user logged in nahi hai to login page par redirect kar do
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

function App() {
  const { user } = useContext(AuthContext);

  return (
    <div className="app-container">
      {/* Navigation menu */}
      <Navbar />

      <main className="main-content">
        <Routes>
          {/* Public routes */}
          <Route
            path="/login"
            element={user ? <Navigate to="/" replace /> : <Login />}
          />
          <Route
            path="/register"
            element={user ? <Navigate to="/" replace /> : <Register />}
          />

          {/* Protected routes */}
          <Route
            path="/"
            element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/transactions"
            element={
              <PrivateRoute>
                <Transactions />
              </PrivateRoute>
            }
          />
          <Route
            path="/groups"
            element={
              <PrivateRoute>
                <Groups />
              </PrivateRoute>
            }
          />

          {/* Fallback route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <footer className="app-footer">
        <p>© {new Date().getFullYear()} Expense Tracker. Made with ❤️</p>
      </footer>
    </div>
  );
}

export default App;