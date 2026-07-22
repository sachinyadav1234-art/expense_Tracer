import { useState, useEffect } from 'react';
import groupService from '../services/groupService';
import useGroupDetails from '../hooks/useGroupDetails';

const getCurrencySymbol = (code) => {
  return code === 'USD' ? '$' : code === 'EUR' ? '€' : code === 'GBP' ? '£' : '₹';
};

const Groups = () => {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);

  // Group creation form state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [newGroupMembers, setNewGroupMembers] = useState(['', '']);

  const {
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
    handleSelectGroup,
    handleBackToGroups,
    handleSplitCheckboxChange,
    handleAddExpenseSubmit,
    handleDeleteExpense
  } = useGroupDetails();

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      setLoading(true);
      const data = await groupService.getGroups();
      if (data.success) {
        setGroups(data.groups);
      }
    } catch (err) {
      console.error('Failed to fetch groups:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    handleBackToGroups();
    fetchGroups();
  };

  // Group creation dynamic member inputs handler
  const handleMemberNameChange = (index, value) => {
    const updated = [...newGroupMembers];
    updated[index] = value;
    setNewGroupMembers(updated);
  };

  const addMemberField = () => {
    setNewGroupMembers([...newGroupMembers, '']);
  };

  const removeMemberField = (index) => {
    if (newGroupMembers.length > 2) {
      const updated = newGroupMembers.filter((_, i) => i !== index);
      setNewGroupMembers(updated);
    }
  };

  const handleCreateGroupSubmit = async (e) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;

    const filteredMembers = newGroupMembers.map(m => m.trim()).filter(Boolean);

    try {
      const data = await groupService.createGroup({
        name: newGroupName,
        description: newGroupDesc,
        members: filteredMembers
      });

      if (data.success) {
        setShowCreateForm(false);
        setNewGroupName('');
        setNewGroupDesc('');
        setNewGroupMembers(['', '']);
        fetchGroups();
      }
    } catch (err) {
      console.error('Group creation failed:', err);
    }
  };

  if (loading) {
    return <div className="loading-spinner">Loading billing groups...</div>;
  }

  return (
    <div className="groups-container">
      {/* 1. Group List Dashboard */}
      {!selectedGroup && (
        <>
          <header className="transactions-header">
            <h2>Group Bill Splitting</h2>
            <p>Settle debts and share bills with roommates, trips, and friends 💸</p>
          </header>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.5rem' }}>
            <button 
              className="auth-btn" 
              style={{ width: 'auto', padding: '10px 20px', borderRadius: '8px' }}
              onClick={() => setShowCreateForm(true)}
            >
              ➕ Create New Group
            </button>
          </div>

          {/* Create Group Form Overlay Modal */}
          {showCreateForm && (
            <div className="edit-modal-backdrop">
              <div className="edit-modal-content" style={{ maxWidth: '500px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <h3>Create Split Group</h3>
                  <button 
                    onClick={() => setShowCreateForm(false)} 
                    style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text)' }}
                  >
                    ×
                  </button>
                </div>

                <form onSubmit={handleCreateGroupSubmit} className="auth-form" style={{ padding: 0, boxShadow: 'none', background: 'none' }}>
                  <div className="form-group">
                    <label htmlFor="groupName">Group Name</label>
                    <input 
                      type="text" 
                      id="groupName" 
                      placeholder="e.g. Goa Trip, Flatmates"
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="groupDesc">Description (Optional)</label>
                    <input 
                      type="text" 
                      id="groupDesc" 
                      placeholder="e.g. Shared expenses for summer vacation"
                      value={newGroupDesc}
                      onChange={(e) => setNewGroupDesc(e.target.value)}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                    <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>Add Members</span>
                      <button 
                        type="button" 
                        onClick={addMemberField}
                        style={{ background: 'var(--accent-bg)', border: '1px solid var(--accent-border)', color: 'var(--accent)', padding: '2px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' }}
                      >
                        + Add Person
                      </button>
                    </label>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem', maxHeight: '150px', overflowY: 'auto', paddingRight: '4px' }}>
                      {newGroupMembers.map((member, index) => (
                        <div key={index} style={{ display: 'flex', gap: '0.5rem' }}>
                          <input 
                            type="text" 
                            placeholder={`Member ${index + 1}`}
                            value={member}
                            onChange={(e) => handleMemberNameChange(index, e.target.value)}
                            required
                            style={{ flex: '1', padding: '8px' }}
                          />
                          {newGroupMembers.length > 2 && (
                            <button 
                              type="button" 
                              onClick={() => removeMemberField(index)}
                              style={{ background: 'none', border: 'none', color: 'var(--expense)', cursor: 'pointer', fontSize: '1.2rem', padding: '0 8px' }}
                            >
                              🗑️
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                    <button 
                      type="button" 
                      className="edit-btn" 
                      onClick={() => setShowCreateForm(false)}
                      style={{ background: '#6b7280', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '6px' }}
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit" 
                      className="auth-btn"
                      style={{ width: 'auto', padding: '10px 20px', borderRadius: '6px' }}
                    >
                      Create Group
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Groups Listing Grid */}
          {groups.length === 0 ? (
            <div className="transactions-card" style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
              <span style={{ fontSize: '3rem' }}>👥</span>
              <h3 style={{ marginTop: '1rem' }}>No groups found</h3>
              <p style={{ color: 'var(--text)' }}>Create a group to start splitting bills and shared expenses.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
              {groups.map((group) => (
                <div 
                  key={group._id} 
                  className="card" 
                  onClick={() => handleSelectGroup(group)}
                  style={{ 
                    cursor: 'pointer', 
                    padding: '1.5rem', 
                    background: 'var(--card-bg)', 
                    border: '1px solid var(--border)', 
                    borderRadius: '12px',
                    boxShadow: 'var(--shadow)',
                    transition: 'transform 0.2s, box-shadow 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-3px)';
                    e.currentTarget.style.boxShadow = 'var(--shadow-lg)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'var(--shadow)';
                  }}
                >
                  <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-h)' }}>{group.name}</h3>
                  {group.description && <p style={{ fontSize: '0.9rem', color: 'var(--text)', margin: '0 0 1rem 0' }}>{group.description}</p>}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem', fontSize: '0.85rem', color: 'var(--text)', borderTop: '1px solid var(--border)', paddingTop: '0.8rem' }}>
                    <span>👥 {group.members.length} Members</span>
                    <span>Created {new Date(group.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* 2. Group Detail Dashboard view */}
      {selectedGroup && groupDetails && (
        <>
          <div style={{ marginBottom: '1.5rem' }}>
            <button 
              onClick={handleBack} 
              style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '1rem' }}
            >
              ← Back to Groups
            </button>
          </div>

          <header className="transactions-header" style={{ marginBottom: '2rem' }}>
            <h2>{groupDetails.group.name}</h2>
            {groupDetails.group.description && <p style={{ marginTop: '4px' }}>{groupDetails.group.description}</p>}
          </header>

          {detailsLoading ? (
            <div className="loading-spinner">Syncing group data...</div>
          ) : (
            <div className="dashboard-grid">
              
              {/* Left Column: Balances and Settlements */}
              <div className="left-panel">
                
                {/* Net Balances Card */}
                <div className="recent-transactions-card" style={{ marginBottom: '1.5rem', padding: '1.25rem' }}>
                  <h3>👥 Member Balances</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', marginTop: '1rem' }}>
                    {Object.keys(groupDetails.balances).map((name) => {
                      const bal = groupDetails.balances[name];
                      return (
                        <div key={name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--bg)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                          <span style={{ fontWeight: '500', color: 'var(--text-h)' }}>{name}</span>
                          <span 
                            style={{ 
                              fontWeight: 'bold', 
                              color: bal > 0.01 ? 'var(--income)' : bal < -0.01 ? 'var(--expense)' : 'var(--text)' 
                            }}
                          >
                            {bal > 0.01 ? '+' : ''}{getCurrencySymbol('INR')}{bal.toFixed(2)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Settlements simplification view */}
                <div className="recent-transactions-card" style={{ padding: '1.25rem' }}>
                  <h3>🤝 Simplified Settlement Plan</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', marginTop: '1rem' }}>
                    {groupDetails.settlements.length === 0 ? (
                      <p style={{ color: 'var(--income)', fontWeight: 'bold', textAlign: 'center', padding: '1rem 0' }}>
                        🎉 Everyone is completely settled up!
                      </p>
                    ) : (
                      groupDetails.settlements.map((settle, idx) => (
                        <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '10px 12px', background: 'var(--accent-bg)', border: '1px solid var(--accent-border)', borderRadius: '8px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: '500', color: 'var(--text-h)' }}>
                              <strong>{settle.from}</strong> owes <strong>{settle.to}</strong>
                            </span>
                            <span style={{ fontWeight: 'bold', color: 'var(--accent)', fontSize: '1.1rem' }}>
                              {getCurrencySymbol('INR')}{settle.amount.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column: Add expense form and list of expenses */}
              <div className="right-panel">
                
                {/* Add Expense Form Card */}
                <div className="form-card" style={{ marginBottom: '1.5rem', padding: '1.5rem' }}>
                  <h3>💸 Add Shared Expense</h3>
                  <form onSubmit={handleAddExpenseSubmit} className="auth-form" style={{ padding: 0, boxShadow: 'none', background: 'none', marginTop: '1rem' }}>
                    
                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                      <div className="form-group" style={{ flex: '2', minWidth: '200px' }}>
                        <label htmlFor="expDesc">Description</label>
                        <input 
                          type="text" 
                          id="expDesc"
                          placeholder="e.g. Cab fare, Dinner bill"
                          value={expDesc}
                          onChange={(e) => setExpDesc(e.target.value)}
                          required
                        />
                      </div>
                      <div className="form-group" style={{ flex: '1', minWidth: '100px' }}>
                        <label htmlFor="expAmount">Amount (₹)</label>
                        <input 
                          type="number" 
                          id="expAmount"
                          placeholder="0.00"
                          value={expAmount}
                          onChange={(e) => setExpAmount(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '0.8rem' }}>
                      <div className="form-group" style={{ flex: '1', minWidth: '150px' }}>
                        <label htmlFor="expPaidBy">Who Paid?</label>
                        <select 
                          id="expPaidBy"
                          value={expPaidBy}
                          onChange={(e) => setExpPaidBy(e.target.value)}
                        >
                          {groupDetails.group.members.map((m) => (
                            <option key={m.name} value={m.name}>{m.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="form-group" style={{ flex: '1', minWidth: '150px' }}>
                        <label htmlFor="expCategory">Category</label>
                        <select 
                          id="expCategory"
                          value={expCategory}
                          onChange={(e) => setExpCategory(e.target.value)}
                        >
                          <option value="Food">Food</option>
                          <option value="Shopping">Shopping</option>
                          <option value="Travel">Travel</option>
                          <option value="Entertainment">Entertainment</option>
                          <option value="Rent">Rent</option>
                          <option value="Utilities">Utilities</option>
                          <option value="Others">Others</option>
                        </select>
                      </div>
                    </div>

                    {/* Split selector list */}
                    <div className="form-group" style={{ marginTop: '1rem' }}>
                      <label>Split Splitwise-style (Select who is splitting)</label>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.8rem', marginTop: '0.5rem', background: 'var(--bg)', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                        {groupDetails.group.members.map((member) => (
                          <label key={member.name} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.9rem', color: 'var(--text-h)' }}>
                            <input 
                              type="checkbox"
                              checked={expSplitAmong.includes(member.name)}
                              onChange={() => handleSplitCheckboxChange(member.name)}
                            />
                            {member.name}
                          </label>
                        ))}
                      </div>
                      {expSplitAmong.length > 0 && (
                        <div style={{ fontSize: '0.8rem', color: 'var(--text)', marginTop: '4px' }}>
                          Each pays: {getCurrencySymbol('INR')}{(parseFloat(expAmount || 0) / expSplitAmong.length).toFixed(2)}
                        </div>
                      )}
                    </div>

                    <button 
                      type="submit" 
                      className="auth-btn"
                      style={{ marginTop: '1.25rem' }}
                    >
                      Add Group Expense
                    </button>
                  </form>
                </div>

                {/* Expenses List Card */}
                <div className="recent-transactions-card" style={{ padding: '1.25rem' }}>
                  <h3>📋 Group Expenses Log</h3>
                  {groupDetails.expenses.length === 0 ? (
                    <p style={{ color: 'var(--text)', textAlign: 'center', padding: '2rem 0' }}>No expenses logged yet. Add one above!</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                      {groupDetails.expenses.map((exp) => (
                        <div 
                          key={exp._id} 
                          style={{ 
                            padding: '1rem', 
                            background: 'var(--bg)', 
                            border: '1px solid var(--border)', 
                            borderRadius: '10px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.4rem'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                              <h4 style={{ margin: '0', color: 'var(--text-h)' }}>{exp.description}</h4>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text)' }}>
                                {new Date(exp.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <span style={{ fontWeight: 'bold', fontSize: '1.1rem', color: 'var(--text-h)' }}>
                                {getCurrencySymbol('INR')}{exp.amount.toFixed(2)}
                              </span>
                              <button 
                                onClick={() => handleDeleteExpense(exp._id)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', padding: '4px' }}
                                title="Delete Expense"
                              >
                                🗑️
                              </button>
                            </div>
                          </div>

                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text)', borderTop: '1px dashed var(--border)', paddingTop: '0.4rem', marginTop: '0.2rem' }}>
                            <span>Paid by <strong>{exp.paidBy}</strong></span>
                            <span>|</span>
                            <span>Split among: {exp.splitAmong.map(s => s.name).join(', ')}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>

            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Groups;
