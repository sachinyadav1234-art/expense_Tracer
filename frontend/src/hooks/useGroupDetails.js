import { useState } from 'react';
import groupService from '../services/groupService';

export const useGroupDetails = () => {
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [groupDetails, setGroupDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  // Expense creation form state
  const [expDesc, setExpDesc] = useState('');
  const [expAmount, setExpAmount] = useState('');
  const [expPaidBy, setExpPaidBy] = useState('');
  const [expCategory, setExpCategory] = useState('Others');
  const [expSplitAmong, setExpSplitAmong] = useState([]);

  const fetchGroupDetails = async (groupId) => {
    try {
      setDetailsLoading(true);
      const data = await groupService.getGroupById(groupId);
      if (data.success) {
        setGroupDetails(data);
        
        // Default payer to first member if not already set
        if (data.group.members.length > 0 && !expPaidBy) {
          setExpPaidBy(data.group.members[0].name);
        }
        
        // Default split selection to all members if currently empty
        if (expSplitAmong.length === 0) {
          setExpSplitAmong(data.group.members.map(m => m.name));
        }
      }
    } catch (err) {
      console.error('Failed to fetch group details:', err);
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleSelectGroup = (group) => {
    setSelectedGroup(group);
    // Clear split state so it re-initializes for the new group
    setExpSplitAmong([]);
    setExpPaidBy('');
    fetchGroupDetails(group._id);
  };

  const handleBackToGroups = () => {
    setSelectedGroup(null);
    setGroupDetails(null);
  };

  const handleSplitCheckboxChange = (memberName) => {
    if (expSplitAmong.includes(memberName)) {
      setExpSplitAmong(expSplitAmong.filter(m => m !== memberName));
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
      const amountNum = parseFloat(expAmount);
      const splitShare = amountNum / expSplitAmong.length;
      const splitList = expSplitAmong.map(name => ({
        name,
        share: splitShare
      }));

      const data = await groupService.addGroupExpense(selectedGroup._id, {
        description: expDesc,
        amount: amountNum,
        paidBy: expPaidBy,
        splitAmong: splitList,
        category: expCategory
      });

      if (data.success) {
        setExpDesc('');
        setExpAmount('');
        // Refresh details to update balances and settlements
        fetchGroupDetails(selectedGroup._id);
      }
    } catch (err) {
      console.error('Failed to add group expense:', err);
    }
  };

  const handleDeleteExpense = async (expenseId) => {
    if (window.confirm('Are you sure you want to delete this expense?')) {
      try {
        const data = await groupService.deleteGroupExpense(selectedGroup._id, expenseId);
        if (data.success) {
          fetchGroupDetails(selectedGroup._id);
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
    handleDeleteExpense
  };
};

export default useGroupDetails;
