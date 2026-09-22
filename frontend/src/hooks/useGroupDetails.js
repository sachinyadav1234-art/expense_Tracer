import { useState, useEffect, useCallback, useRef } from 'react';
import groupService from '../services/groupService';
import { subscribeToGroupUpdates } from '../services/socketService';

export const useGroupDetails = () => {
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [groupDetails, setGroupDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState(null);

  // Expense creation form state
  const [expDesc, setExpDesc] = useState('');
  const [expAmount, setExpAmount] = useState('');
  const [expPaidBy, setExpPaidBy] = useState('');
  const [expCategory, setExpCategory] = useState('Others');
  const [expSplitAmong, setExpSplitAmong] = useState([]);

  const expPaidByRef = useRef(expPaidBy);
  const expSplitAmongRef = useRef(expSplitAmong);

  useEffect(() => {
    expPaidByRef.current = expPaidBy;
  }, [expPaidBy]);

  useEffect(() => {
    expSplitAmongRef.current = expSplitAmong;
  }, [expSplitAmong]);

  const fetchGroupDetails = useCallback(async (groupId, showLoading = true) => {
    if (!groupId) return;
    try {
      if (showLoading) setDetailsLoading(true);
      const data = await groupService.getGroupById(groupId);
      if (data.success) {
        setGroupDetails(data);
        setLastSyncedAt(new Date());

        // Default payer to first member if not already set
        if (data.group && data.group.members && data.group.members.length > 0 && !expPaidByRef.current) {
          setExpPaidBy(data.group.members[0].name);
        }

        // Default split selection to all members if currently empty
        if (expSplitAmongRef.current.length === 0 && data.group && data.group.members) {
          setExpSplitAmong(data.group.members.map((m) => m.name));
        }
      }
    } catch (err) {
      console.error('Failed to fetch group details:', err);
    } finally {
      if (showLoading) setDetailsLoading(false);
    }
  }, []);

  // Real-time synchronization subscription & polling fallback
  useEffect(() => {
    if (!selectedGroup?._id) return;

    // 1. Subscribe to real-time WebSocket updates
    const unsubscribe = subscribeToGroupUpdates(selectedGroup._id, (updatedData) => {
      console.log('[Live Sync] Group updated in real-time:', updatedData);
      setGroupDetails((prev) => ({
        ...prev,
        group: updatedData.group || prev?.group,
        expenses: updatedData.expenses || prev?.expenses,
        balances: updatedData.balances || prev?.balances,
        settlements: updatedData.settlements || prev?.settlements,
      }));
      setLastSyncedAt(new Date());
    });

    // 2. Periodic background sync fallback (every 4 seconds) to ensure 100% sync across laptops
    const pollInterval = setInterval(() => {
      fetchGroupDetails(selectedGroup._id, false);
    }, 4000);

    // 3. Sync on window refocus
    const handleFocus = () => {
      fetchGroupDetails(selectedGroup._id, false);
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      unsubscribe();
      clearInterval(pollInterval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [selectedGroup?._id, fetchGroupDetails]);

  const handleSelectGroup = (group) => {
    setSelectedGroup(group);
    // Clear split state so it re-initializes for the new group
    setExpSplitAmong([]);
    setExpPaidBy('');
    fetchGroupDetails(group._id, true);
  };

  const handleBackToGroups = () => {
    setSelectedGroup(null);
    setGroupDetails(null);
  };

  const handleSplitCheckboxChange = (memberName) => {
    if (expSplitAmong.includes(memberName)) {
      setExpSplitAmong(expSplitAmong.filter((m) => m !== memberName));
    } else {
      setExpSplitAmong([...expSplitAmong, memberName]);
    }
  };

  const handleAddExpenseSubmit = async (e) => {
    e.preventDefault();
    if (!expDesc.trim() || !expAmount || !expPaidBy || expSplitAmong.length === 0) {
      alert('Please fill in all required fields and select at least one person to split.');
      return;
    }

    try {
      setIsSubmitting(true);
      const amountNum = parseFloat(expAmount);
      const splitShare = amountNum / expSplitAmong.length;
      const splitList = expSplitAmong.map((name) => ({
        name,
        share: splitShare,
      }));

      const data = await groupService.addGroupExpense(selectedGroup._id, {
        description: expDesc.trim(),
        amount: amountNum,
        paidBy: expPaidBy,
        splitAmong: splitList,
        category: expCategory,
      });

      if (data.success) {
        setExpDesc('');
        setExpAmount('');
        if (data.group && data.expenses) {
          setGroupDetails({
            group: data.group,
            expenses: data.expenses,
            balances: data.balances,
            settlements: data.settlements,
          });
          setLastSyncedAt(new Date());
        } else {
          fetchGroupDetails(selectedGroup._id, false);
        }
      }
    } catch (err) {
      console.error('Failed to add group expense:', err);
      alert(err.response?.data?.message || 'Failed to add expense. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteExpense = async (expenseId) => {
    if (window.confirm('Are you sure you want to delete this expense?')) {
      try {
        const data = await groupService.deleteGroupExpense(selectedGroup._id, expenseId);
        if (data.success) {
          if (data.group && data.expenses) {
            setGroupDetails({
              group: data.group,
              expenses: data.expenses,
              balances: data.balances,
              settlements: data.settlements,
            });
            setLastSyncedAt(new Date());
          } else {
            fetchGroupDetails(selectedGroup._id, false);
          }
        }
      } catch (err) {
        console.error('Failed to delete expense:', err);
      }
    }
  };

  return {
    selectedGroup,
    groupDetails,
    detailsLoading,
    isSubmitting,
    lastSyncedAt,
    expDesc,
    expAmount,
    expPaidBy,
    expCategory,
    expSplitAmong,
    setExpDesc,
    setExpAmount,
    setExpPaidBy,
    setExpCategory,
    setExpSplitAmong,
    fetchGroupDetails,
    handleSelectGroup,
    handleBackToGroups,
    handleSplitCheckboxChange,
    handleAddExpenseSubmit,
    handleDeleteExpense,
  };
};

export default useGroupDetails;
