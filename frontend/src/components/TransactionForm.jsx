import { useState, useEffect } from 'react';
import transactionService from '../services/transactionService';

const TransactionForm = ({ existingTransaction, onSuccess, onCancel }) => {
  const [type, setType] = useState('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Common categories list
  const incomeCategories = ['Salary', 'Freelance', 'Investment', 'Gift', 'Others'];
  const expenseCategories = ['Food', 'Rent', 'Utilities', 'Entertainment', 'Travel', 'Shopping', 'Medical', 'Others'];

  // Agar edit mode hai, to existing values set karenge
  useEffect(() => {
    if (existingTransaction) {
      setType(existingTransaction.type);
      setAmount(existingTransaction.amount);
      setCategory(existingTransaction.category);
      setNote(existingTransaction.note || '');
      setDate(new Date(existingTransaction.date).toISOString().split('T')[0]);
    } else {
      // Default category on load
      setCategory('Food');
    }
  }, [existingTransaction]);

  // Type change hone pe category sync karenge
  useEffect(() => {
    if (!existingTransaction) {
      setCategory(type === 'income' ? 'Salary' : 'Food');
    }
  }, [type, existingTransaction]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!amount || amount <= 0) {
      setError('Amount must be greater than 0');
      return;
    }

    setLoading(true);

    const transactionData = {
      type,
      amount: Number(amount),
      category,
      note,
      date,
    };

    try {
      if (existingTransaction) {
        // Edit mode
        const data = await transactionService.updateTransaction(existingTransaction._id, transactionData);
        if (data.success) {
          onSuccess(data.transaction, 'update');
        }
      } else {
        // Add mode
        const data = await transactionService.createTransaction(transactionData);
        if (data.success) {
          onSuccess(data.transaction, 'add');
          // Reset form fields
          setAmount('');
          setNote('');
          setDate(new Date().toISOString().split('T')[0]);
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="transaction-form">
      <h3>{existingTransaction ? '✏️ Edit Transaction' : '➕ Add Transaction'}</h3>

      {error && <div className="error-alert">{error}</div>}

      <div className="form-row">
        <div className="form-group-half">
          <label>Type</label>
          <div className="type-toggle">
            <button
              type="button"
              className={`toggle-btn income ${type === 'income' ? 'active' : ''}`}
              onClick={() => setType('income')}
            >
              Income
            </button>
            <button
              type="button"
              className={`toggle-btn expense ${type === 'expense' ? 'active' : ''}`}
              onClick={() => setType('expense')}
            >
              Expense
            </button>
          </div>
        </div>

        <div className="form-group-half">
          <label htmlFor="amount">Amount ($)</label>
          <input
            type="number"
            id="amount"
            min="1"
            step="any"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            placeholder="0.00"
          />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group-half">
          <label htmlFor="category">Category</label>
          <select
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            required
          >
            {type === 'income'
              ? incomeCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))
              : expenseCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
          </select>
        </div>

        <div className="form-group-half">
          <label htmlFor="date">Date</label>
          <input
            type="date"
            id="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="note">Note (Optional)</label>
        <input
          type="text"
          id="note"
          value={note}
          placeholder="What is this for?"
          onChange={(e) => setNote(e.target.value)}
        />
      </div>

      <div className="form-actions">
        {onCancel && (
          <button type="button" onClick={onCancel} className="cancel-btn">
            Cancel
          </button>
        )}
        <button type="submit" className="submit-btn" disabled={loading}>
          {loading ? 'Saving...' : existingTransaction ? 'Update' : 'Add'}
        </button>
      </div>
    </form>
  );
};

export default TransactionForm;
