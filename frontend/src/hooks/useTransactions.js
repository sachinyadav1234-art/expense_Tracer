import { useState, useEffect, useCallback } from 'react';
import transactionService from '../services/transactionService';

export const useTransactions = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingTxn, setEditingTxn] = useState(null);

  // Filters state
  const [typeFilter, setTypeFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Unique categories list for filters
  const categoriesList = [
    'Salary', 'Freelance', 'Investment', 'Gift', 
    'Food', 'Rent', 'Utilities', 'Entertainment', 
    'Travel', 'Shopping', 'Medical', 'Others'
  ];

  // Fetch all transactions
  const fetchTransactions = useCallback(async () => {
    try {
      setLoading(true);
      // Query parameters for filters
      const params = {};
      if (typeFilter) params.type = typeFilter;
      if (categoryFilter) params.category = categoryFilter;

      // Note: transactionService.getTransactions() gets all, but to support filters we need to call it with params
      // Let's modify transactionService to support params if it doesn't already!
      // In transactionService, getTransactions does: api.get('/transactions');
      // Wait, let's pass params to it.
      // Yes, in transactionService, we can update it or write it to accept params!
      // Let's check how we wrote transactionService.js:
      // getTransactions: async () => { const res = await api.get('/transactions'); return res.data; }
      // Ah! We didn't pass params. We should make it:
      // getTransactions: async (params) => { const res = await api.get('/transactions', { params }); return res.data; }
      // Let's fix that!
      const data = await transactionService.getTransactions(params);
      if (data.success) {
        setTransactions(data.transactions);
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  }, [typeFilter, categoryFilter]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // Handle transaction delete
  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this transaction?')) {
      try {
        const data = await transactionService.deleteTransaction(id);
        if (data.success) {
          setTransactions(transactions.filter((t) => t._id !== id));
        }
      } catch (error) {
        console.error('Error deleting transaction:', error);
      }
    }
  };

  // Form success callback (updates or adds transaction)
  const handleFormSuccess = (updatedTxn, mode) => {
    if (mode === 'update') {
      setTransactions(
        transactions.map((t) => (t._id === updatedTxn._id ? updatedTxn : t))
      );
      setEditingTxn(null);
    }
  };

  // Client-side search filtering
  const filteredTransactions = transactions.filter((txn) => {
    const noteMatch = txn.note?.toLowerCase().includes(searchQuery.toLowerCase());
    const categoryMatch = txn.category.toLowerCase().includes(searchQuery.toLowerCase());
    return noteMatch || categoryMatch;
  });

  return {
    transactions,
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
    fetchTransactions,
    handleDelete,
    handleFormSuccess
  };
};

export default useTransactions;
