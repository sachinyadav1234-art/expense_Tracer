import { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import TransactionForm from '../components/TransactionForm';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

const getCurrencySymbol = (code) => {
  switch (code) {
    case 'USD': return '$';
    case 'EUR': return '€';
    case 'GBP': return '£';
    case 'INR': return '₹';
    case 'SGD': return 'S$';
    case 'AED': return 'د.إ';
    case 'SAR': return 'ر.س';
    default: return code + ' ';
  }
};

const Dashboard = () => {
  const { user } = useContext(AuthContext);
  const [summary, setSummary] = useState({ totalIncome: 0, totalExpense: 0, balance: 0 });
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [pendingTransactions, setPendingTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Editing state for pending auto-detected transactions
  const [editingTxnId, setEditingTxnId] = useState(null);
  const [editCategory, setEditCategory] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editNote, setEditNote] = useState('');

  // Native app state
  const [isMobile, setIsMobile] = useState(false);
  const [smsPermissionGranted, setSmsPermissionGranted] = useState(false);
  const [notificationListenerEnabled, setNotificationListenerEnabled] = useState(false);

  const checkNativePermissions = async () => {
    const isNative = window.Capacitor?.isNative || (window.Capacitor && window.Capacitor.Plugins);
    if (isNative) {
      setIsMobile(true);
      try {
        const smsStatus = await window.Capacitor.Plugins.AutoFetchPlugin.isSMSPermissionGranted();
        setSmsPermissionGranted(smsStatus.granted);
        
        const notifStatus = await window.Capacitor.Plugins.AutoFetchPlugin.isNotificationListenerEnabled();
        setNotificationListenerEnabled(notifStatus.enabled);
      } catch (e) {
        console.error('Error checking native permissions:', e);
      }
    }
  };

  const requestSmsPermission = async () => {
    try {
      await window.Capacitor.Plugins.AutoFetchPlugin.requestSMSPermission();
      setTimeout(checkNativePermissions, 2000);
    } catch (e) {
      console.error(e);
    }
  };

  const requestNotificationPermission = async () => {
    try {
      await window.Capacitor.Plugins.AutoFetchPlugin.requestNotificationListenerPermission();
    } catch (e) {
      console.error(e);
    }
  };

  // Fetch summary and recent transactions
  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Summary api call
      const summaryRes = await api.get('/transactions/summary');
      if (summaryRes.data.success) {
        setSummary({
          totalIncome: summaryRes.data.totalIncome,
          totalExpense: summaryRes.data.totalExpense,
          balance: summaryRes.data.balance,
        });
      }

      // Transactions list api call (recent 5 transactions)
      const txnRes = await api.get('/transactions');
      if (txnRes.data.success) {
        setRecentTransactions(txnRes.data.transactions.slice(0, 5));
      }

      // Fetch pending transactions
      const pendingRes = await api.get('/transactions?status=pending');
      if (pendingRes.data.success) {
        setPendingTransactions(pendingRes.data.transactions);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    checkNativePermissions();

    window.addEventListener('focus', checkNativePermissions);
    return () => window.removeEventListener('focus', checkNativePermissions);
  }, []);

  const handleTransactionSuccess = () => {
    fetchData();
  };

  const handleQuickConfirm = async (id) => {
    try {
      await api.put(`/transactions/${id}`, { status: 'confirmed' });
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleReject = async (id) => {
    if (window.confirm('Are you sure you want to discard this transaction?')) {
      try {
        await api.delete(`/transactions/${id}`);
        fetchData();
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleStartEdit = (txn) => {
    setEditingTxnId(txn._id);
    setEditCategory(txn.category);
    setEditAmount(txn.amount);
    setEditNote(txn.note || '');
  };

  const handleConfirmEdit = async (id) => {
    try {
      await api.put(`/transactions/${id}`, {
        status: 'confirmed',
        category: editCategory,
        amount: parseFloat(editAmount),
        note: editNote
      });
      setEditingTxnId(null);
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  // Recharts representation data
  const pieData = [
    { name: 'Income', value: summary.totalIncome },
    { name: 'Expense', value: summary.totalExpense },
  ];

  // Category breakdown chart data for expenses
  const getCategoryData = () => {
    const categoryMap = {};
    recentTransactions.forEach((txn) => {
      if (txn.type === 'expense') {
        const amt = txn.amountInBaseCurrency || txn.amount;
        categoryMap[txn.category] = (categoryMap[txn.category] || 0) + amt;
      }
    });

    return Object.keys(categoryMap).map((key) => ({
      category: key,
      amount: categoryMap[key],
    }));
  };

  const categoryData = getCategoryData();

  const COLORS = ['#10b981', '#ef4444']; // green for income, red for expense
  const CATEGORY_COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#6b7280'];

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h2>Dashboard Overview</h2>
        <p>Aapka expense aur income summary yahan hai 📊</p>
      </header>

      {/* Mobile background tracker setup instructions */}
      {isMobile && (
        <div style={{
          background: '#f3f4f6',
          border: '1px solid #e5e7eb',
          borderRadius: '12px',
          padding: '1rem',
          marginBottom: '1.5rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <h4 style={{ margin: '0 0 0.5rem 0', color: '#374151', display: 'flex', alignItems: 'center' }}>
            <span style={{ marginRight: '6px' }}>⚙️</span> Mobile Payment Auto-Detection Status
          </h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem' }}>
            <div style={{ flex: '1', minWidth: '220px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff', padding: '8px 12px', borderRadius: '8px', border: '1px solid #f3f4f6' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: '500' }}>
                SMS Auto-detect: {smsPermissionGranted ? '✅ Enabled' : '❌ Disabled'}
              </span>
              {!smsPermissionGranted && (
                <button 
                  onClick={requestSmsPermission}
                  style={{ background: '#6366f1', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold' }}
                >
                  Enable SMS
                </button>
              )}
            </div>
            <div style={{ flex: '1', minWidth: '220px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff', padding: '8px 12px', borderRadius: '8px', border: '1px solid #f3f4f6' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: '500' }}>
                Payment Apps Notifications: {notificationListenerEnabled ? '✅ Enabled' : '❌ Disabled'}
              </span>
              {!notificationListenerEnabled && (
                <button 
                  onClick={requestNotificationPermission}
                  style={{ background: '#6366f1', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold' }}
                >
                  Enable Access
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Pending Transactions Alert */}
      {pendingTransactions.length > 0 && (
        <div className="pending-transactions-section" style={{
          background: '#eef2ff',
          border: '1px solid #c7d2fe',
          borderRadius: '12px',
          padding: '1.25rem',
          marginBottom: '1.5rem',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
        }}>
          <h3 style={{ color: '#3730a3', marginTop: 0, marginBottom: '0.5rem', display: 'flex', alignItems: 'center' }}>
            <span style={{ marginRight: '8px' }}>💸</span> Auto-Detected Payments Pending Confirmation
          </h3>
          <p style={{ color: '#4f46e5', fontSize: '0.85rem', marginTop: 0, marginBottom: '1rem' }}>
            We detected these payments from your messages/notifications. Confirm to include them in your logs.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            {pendingTransactions.map((txn) => (
              <div key={txn._id} style={{
                background: '#fff',
                border: '1px solid #e0e7ff',
                borderRadius: '8px',
                padding: '1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
                boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
              }}>
                {editingTxnId === txn._id ? (
                  /* Editing Mode */
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                      <div style={{ flex: '1', minWidth: '150px' }}>
                        <label style={{ fontSize: '0.8rem', color: '#4b5563', fontWeight: 'bold' }}>Category</label>
                        <select
                          value={editCategory}
                          onChange={(e) => setEditCategory(e.target.value)}
                          style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #d1d5db', marginTop: '4px' }}
                        >
                          <option value="Food">Food</option>
                          <option value="Shopping">Shopping</option>
                          <option value="Travel">Travel</option>
                          <option value="Entertainment">Entertainment</option>
                          <option value="Utilities">Utilities</option>
                          <option value="Health">Health</option>
                          <option value="Others">Others</option>
                        </select>
                      </div>
                      <div style={{ flex: '1', minWidth: '100px' }}>
                        <label style={{ fontSize: '0.8rem', color: '#4b5563', fontWeight: 'bold' }}>Amount</label>
                        <input
                          type="number"
                          value={editAmount}
                          onChange={(e) => setEditAmount(e.target.value)}
                          style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #d1d5db', marginTop: '4px' }}
                        />
                      </div>
                      <div style={{ flex: '2', minWidth: '200px' }}>
                        <label style={{ fontSize: '0.8rem', color: '#4b5563', fontWeight: 'bold' }}>Note</label>
                        <input
                          type="text"
                          value={editNote}
                          onChange={(e) => setEditNote(e.target.value)}
                          style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #d1d5db', marginTop: '4px' }}
                        />
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      <button 
                        onClick={() => handleConfirmEdit(txn._id)}
                        style={{ background: '#10b981', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                      >
                        Save & Confirm
                      </button>
                      <button 
                        onClick={() => setEditingTxnId(null)}
                        style={{ background: '#6b7280', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer' }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Standard Mode */
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <div>
                        <span style={{
                          background: txn.type === 'income' ? '#d1fae5' : '#fee2e2',
                          color: txn.type === 'income' ? '#065f46' : '#991b1b',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontSize: '0.75rem',
                          fontWeight: 'bold',
                          marginRight: '8px'
                        }}>
                          {txn.type.toUpperCase()}
                        </span>
                        <span style={{ fontWeight: 'bold', color: '#1f2937' }}>{txn.category}</span>
                        <span style={{ fontSize: '0.85rem', color: '#6b7280', marginLeft: '10px' }}>
                          {new Date(txn.date).toLocaleString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            hour: 'numeric',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                      <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: txn.type === 'income' ? '#10b981' : '#ef4444' }}>
                        {txn.type === 'income' ? '+' : '-'}{getCurrencySymbol(txn.currency)}{txn.amount.toFixed(2)}
                      </div>
                    </div>
                    
                    {txn.note && (
                      <div style={{ fontSize: '0.9rem', color: '#4b5563', fontWeight: '500' }}>
                        {txn.note}
                      </div>
                    )}

                    <div style={{ 
                      fontSize: '0.75rem', 
                      color: '#6b7280', 
                      background: '#f9fafb', 
                      padding: '0.5rem', 
                      borderRadius: '4px',
                      borderLeft: '3px solid #6366f1',
                      fontStyle: 'italic',
                      marginTop: '4px'
                    }}>
                      Source: {txn.smsSender} | Raw message: "{txn.rawMessage}"
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                      <button 
                        onClick={() => handleQuickConfirm(txn._id)}
                        style={{ background: '#10b981', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                      >
                        Confirm
                      </button>
                      <button 
                        onClick={() => handleStartEdit(txn)}
                        style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer' }}
                      >
                        Edit
                      </button>
                      <button 
                        onClick={() => handleReject(txn._id)}
                        style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer' }}
                      >
                        Reject
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="summary-cards">
        <div className="card balance-card">
          <h3>Total Balance</h3>
          <p className={`amount ${summary.balance >= 0 ? 'text-income' : 'text-expense'}`}>
            ₹{summary.balance.toFixed(2)}
          </p>
        </div>
        <div className="card income-card">
          <h3>Total Income</h3>
          <p className="amount text-income">₹{summary.totalIncome.toFixed(2)}</p>
        </div>
        <div className="card expense-card">
          <h3>Total Expenses</h3>
          <p className="amount text-expense">₹{summary.totalExpense.toFixed(2)}</p>
        </div>
      </div>

      {loading ? (
        <div className="loading-spinner">Loading dashboard details...</div>
      ) : (
        <div className="dashboard-grid">
          {/* Add transaction and recent list */}
          <div className="left-panel">
            <div className="form-card">
              <TransactionForm onSuccess={handleTransactionSuccess} />
            </div>

            <div className="recent-transactions-card">
              <div className="card-header">
                <h3>Recent Transactions</h3>
                <Link to="/transactions" className="view-all-link">View All</Link>
              </div>

              {recentTransactions.length === 0 ? (
                <p className="no-data">No transactions added yet. Add your first transaction above!</p>
              ) : (
                <div className="recent-list">
                  {recentTransactions.map((txn) => (
                    <div key={txn._id} className="recent-item">
                      <div className="item-info">
                        <span className="item-category">{txn.category}</span>
                        <span className="item-date">
                          {new Date(txn.date).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                          })}
                        </span>
                      </div>
                      <div className="item-note-amt">
                        {txn.note && <span className="item-note">{txn.note}</span>}
                        <span className={`item-amount ${txn.type === 'income' ? 'text-income' : 'text-expense'}`}>
                          {txn.type === 'income' ? '+' : '-'}{getCurrencySymbol(txn.currency)}{txn.amount.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Charts representation */}
          <div className="right-panel">
            <div className="chart-card">
              <h3>Income vs Expense Chart</h3>
              <div style={{ width: '100%', height: 260 }}>
                {summary.totalIncome === 0 && summary.totalExpense === 0 ? (
                  <p className="no-chart-data">No data to display in chart</p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData.filter(d => d.value > 0)}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {pieData.filter(d => d.value > 0).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[entry.name === 'Income' ? 0 : 1]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => `₹${value.toFixed(2)}`} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <div className="chart-card">
              <h3>Expense Category Breakdown (Recent)</h3>
              <div style={{ width: '100%', height: 260 }}>
                {categoryData.length === 0 ? (
                  <p className="no-chart-data">No recent expenses to show categories</p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={categoryData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="category" />
                      <YAxis />
                      <Tooltip formatter={(value) => `₹${value.toFixed(2)}`} />
                      <Bar dataKey="amount" fill="#c084fc">
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
