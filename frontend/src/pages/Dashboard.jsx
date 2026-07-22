import { Link } from 'react-router-dom';
import useDashboard from '../hooks/useDashboard';
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
  const {
    summary,
    recentTransactions,
    pendingTransactions,
    loading,
    editingTxnId,
    editCategory,
    editAmount,
    editNote,
    isMobile,
    smsPermissionGranted,
    notificationListenerEnabled,
    setEditCategory,
    setEditAmount,
    setEditNote,
    setEditingTxnId,
    handleTransactionSuccess,
    handleQuickConfirm,
    handleReject,
    handleStartEdit,
    handleConfirmEdit,
    requestSmsPermission,
    requestNotificationPermission
  } = useDashboard();

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
        <div className="mobile-status-container card">
          <h4 className="mobile-status-header">
            <span className="mobile-status-icon">⚙️</span> Mobile Payment Auto-Detection Status
          </h4>
          <div className="mobile-status-grid">
            <div className="mobile-status-card">
              <span className="mobile-status-label">
                SMS Auto-detect: {smsPermissionGranted ? '✅ Enabled' : '❌ Disabled'}
              </span>
              {!smsPermissionGranted && (
                <button onClick={requestSmsPermission} className="mobile-status-btn">
                  Enable SMS
                </button>
              )}
            </div>
            <div className="mobile-status-card">
              <span className="mobile-status-label">
                Payment Apps Notifications: {notificationListenerEnabled ? '✅ Enabled' : '❌ Disabled'}
              </span>
              {!notificationListenerEnabled && (
                <button onClick={requestNotificationPermission} className="mobile-status-btn">
                  Enable Access
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Pending Transactions Alert */}
      {pendingTransactions.length > 0 && (
        <div className="pending-transactions-section pending-section">
          <h3 className="pending-header">
            <span className="pending-header-icon">💸</span> Auto-Detected Payments Pending Confirmation
          </h3>
          <p className="pending-description">
            We detected these payments from your messages/notifications. Confirm to include them in your logs.
          </p>
          <div className="pending-list">
            {pendingTransactions.map((txn) => (
              <div key={txn._id} className="pending-card">
                {editingTxnId === txn._id ? (
                  /* Editing Mode */
                  <div className="edit-form-container">
                    <div className="edit-form-row">
                      <div className="edit-form-group">
                        <label className="edit-form-label">Category</label>
                        <select
                          value={editCategory}
                          onChange={(e) => setEditCategory(e.target.value)}
                          className="edit-form-input"
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
                      <div className="edit-form-group">
                        <label className="edit-form-label">Amount</label>
                        <input
                          type="number"
                          value={editAmount}
                          onChange={(e) => setEditAmount(e.target.value)}
                          className="edit-form-input"
                        />
                      </div>
                      <div className="edit-form-group wide">
                        <label className="edit-form-label">Note</label>
                        <input
                          type="text"
                          value={editNote}
                          onChange={(e) => setEditNote(e.target.value)}
                          className="edit-form-input"
                        />
                      </div>
                    </div>
                    <div className="pending-actions">
                      <button onClick={() => handleConfirmEdit(txn._id)} className="btn-confirm">
                        Save & Confirm
                      </button>
                      <button onClick={() => setEditingTxnId(null)} className="btn-cancel">
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Standard Mode */
                  <>
                    <div className="pending-card-header">
                      <div>
                        <span className={`pending-badge ${txn.type === 'income' ? 'income' : 'expense'}`}>
                          {txn.type.toUpperCase()}
                        </span>
                        <span className="pending-title">{txn.category}</span>
                        <span className="pending-date">
                          {new Date(txn.date).toLocaleString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            hour: 'numeric',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                      <div className={`pending-amount ${txn.type === 'income' ? 'income' : 'expense'}`}>
                        {txn.type === 'income' ? '+' : '-'}{getCurrencySymbol(txn.currency)}{txn.amount.toFixed(2)}
                      </div>
                    </div>
                    
                    {txn.note && (
                      <div className="pending-note">
                        {txn.note}
                      </div>
                    )}

                    <div className="pending-sms">
                      Source: {txn.smsSender} | Raw message: "{txn.rawMessage}"
                    </div>

                    <div className="pending-actions">
                      <button onClick={() => handleQuickConfirm(txn._id)} className="btn-confirm">
                        Confirm
                      </button>
                      <button onClick={() => handleStartEdit(txn)} className="btn-edit">
                        Edit
                      </button>
                      <button onClick={() => handleReject(txn._id)} className="btn-discard">
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
              <div className="chart-container-wrapper">
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
              <div className="chart-container-wrapper">
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
