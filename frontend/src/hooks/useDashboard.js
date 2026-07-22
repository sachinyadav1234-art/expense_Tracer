import { useState, useEffect } from 'react';
import transactionService from '../services/transactionService';

export const useDashboard = () => {
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
    const isNative = !!window.Capacitor?.isNative;
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

  // Fetch summary and transactions
  const fetchData = async () => {
    try {
      setLoading(true);
      
      const summaryData = await transactionService.getSummary();
      if (summaryData.success) {
        setSummary({
          totalIncome: summaryData.totalIncome,
          totalExpense: summaryData.totalExpense,
          balance: summaryData.balance,
        });
      }

      const txnData = await transactionService.getTransactions();
      if (txnData.success) {
        setRecentTransactions(txnData.transactions.slice(0, 5));
        
        // Filter pending transactions from the list
        const pending = txnData.transactions.filter(t => t.status === 'pending');
        setPendingTransactions(pending);
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
      await transactionService.updateTransaction(id, { status: 'confirmed' });
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleReject = async (id) => {
    if (window.confirm('Are you sure you want to discard this transaction?')) {
      try {
        await transactionService.deleteTransaction(id);
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
      await transactionService.updateTransaction(id, {
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

  return {
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
    fetchData,
    handleTransactionSuccess,
    handleQuickConfirm,
    handleReject,
    handleStartEdit,
    handleConfirmEdit,
    requestSmsPermission,
    requestNotificationPermission
  };
};

export default useDashboard;
