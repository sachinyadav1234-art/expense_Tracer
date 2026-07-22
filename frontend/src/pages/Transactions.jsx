import useTransactions from '../hooks/useTransactions';
import TransactionForm from '../components/TransactionForm';

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

const Transactions = () => {
  const {
    loading,
    editingTxn,
    typeFilter,
    categoryFilter,
    searchQuery,
    categoriesList,
    filteredTransactions,
    setTypeFilter,
    setCategoryFilter,
    setSearchQuery,
    setEditingTxn,
    handleDelete,
    handleFormSuccess
  } = useTransactions();

  return (
    <div className="transactions-container">
      <header className="transactions-header">
        <h2>All Transactions</h2>
        <p>Aapke saare transactions ki list aur manage karne ki tools 💸</p>
      </header>

      {/* Edit Form Overlay (Agar edit button dabaaya ho) */}
      {editingTxn && (
        <div className="edit-modal-backdrop">
          <div className="edit-modal-content">
            <TransactionForm
              existingTransaction={editingTxn}
              onSuccess={handleFormSuccess}
              onCancel={() => setEditingTxn(null)}
            />
          </div>
        </div>
      )}

      {/* Filter controls */}
      <div className="filters-card">
        <h3>🔍 Filter & Search</h3>
        <div className="filters-grid">
          <div className="filter-group">
            <label htmlFor="search">Search</label>
            <input
              type="text"
              id="search"
              placeholder="Search by note/category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="filter-group">
            <label htmlFor="type-filter">Type</label>
            <select
              id="type-filter"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="">All Types</option>
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="category-filter">Category</label>
            <select
              id="category-filter"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="">All Categories</option>
              {categoriesList.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Transaction list table */}
      {loading ? (
        <div className="loading-spinner">Loading transactions...</div>
      ) : (
        <div className="transactions-card">
          {filteredTransactions.length === 0 ? (
            <p className="no-data">No transactions match your search/filters.</p>
          ) : (
            <div className="table-responsive">
              <table className="transactions-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Category</th>
                    <th>Note</th>
                    <th>Amount</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map((txn) => (
                    <tr key={txn._id}>
                      <td>
                        {new Date(txn.date).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td>
                        <span className={`badge ${txn.type === 'income' ? 'badge-income' : 'badge-expense'}`}>
                          {txn.type}
                        </span>
                      </td>
                      <td className="table-category">{txn.category}</td>
                      <td className="table-note">{txn.note || '-'}</td>
                      <td className={`table-amount ${txn.type === 'income' ? 'text-income' : 'text-expense'}`}>
                        {txn.type === 'income' ? '+' : '-'}{getCurrencySymbol(txn.currency)}{txn.amount.toFixed(2)}
                      </td>
                      <td>
                        <div className="table-actions">
                          <button
                            onClick={() => setEditingTxn(txn)}
                            className="edit-btn"
                            title="Edit Transaction"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleDelete(txn._id)}
                            className="delete-btn"
                            title="Delete Transaction"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Transactions;
