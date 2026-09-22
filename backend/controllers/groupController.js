const Group = require('../models/Group');
const GroupExpense = require('../models/GroupExpense');
const User = require('../models/User');

const escapeRegex = (str) => {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * Helper to compute net balances and settlements for a group.
 */
const computeGroupData = async (group) => {
  const expenses = await GroupExpense.find({ group: group._id }).sort({ date: -1 });

  // Calculate net balances
  const netBalances = {};
  group.members.forEach((member) => {
    netBalances[member.name] = 0;
  });

  expenses.forEach((expense) => {
    const payer = expense.paidBy;
    const totalAmount = expense.amount;
    const splitList = expense.splitAmong;

    // Creditor: Payer is credited the sum of others' shares
    if (netBalances[payer] === undefined) {
      netBalances[payer] = 0;
    }
    netBalances[payer] += totalAmount;

    // Debtors: Split members are debited their respective shares
    splitList.forEach((split) => {
      if (netBalances[split.name] === undefined) {
        netBalances[split.name] = 0;
      }
      netBalances[split.name] -= split.share;
    });
  });

  // Simplify debt settlements using Greedy Cash Flow Minimization algorithm
  const settlements = calculateSettlements(netBalances);

  return {
    group,
    expenses,
    balances: netBalances,
    settlements,
  };
};

/**
 * Create a new bill sharing group.
 * The creator is automatically added as a member and other members are auto-linked to registered users if found.
 */
const createGroup = async (req, res, next) => {
  try {
    const { name, description, members } = req.body;

    const groupMembers = [{ name: req.user.name, userId: req.user._id }];

    if (Array.isArray(members)) {
      for (const m of members) {
        const memberName = typeof m === 'string' ? m.trim() : m.name?.trim();
        if (memberName && memberName.toLowerCase() !== req.user.name.toLowerCase()) {
          // Check if this member is an existing registered user by name or email
          const existingUser = await User.findOne({
            $or: [
              { name: { $regex: new RegExp(`^${escapeRegex(memberName)}$`, 'i') } },
              { email: memberName.toLowerCase() }
            ]
          });

          if (existingUser) {
            groupMembers.push({
              name: existingUser.name,
              userId: existingUser._id
            });
          } else {
            groupMembers.push({ name: memberName });
          }
        }
      }
    }

    const group = await Group.create({
      name: name.trim(),
      description: description?.trim() || '',
      createdBy: req.user._id,
      members: groupMembers,
    });

    const io = req.app.get('io');
    if (io) {
      io.emit('groups-changed');
    }

    res.status(201).json({ success: true, group });
  } catch (error) {
    next(error);
  }
};

/**
 * Fetch all groups where the authenticated user is creator or member.
 * Automatically links member userId if matched by name.
 */
const getGroups = async (req, res, next) => {
  try {
    const userNameRegex = new RegExp(`^${escapeRegex(req.user.name)}$`, 'i');
    const userEmailRegex = new RegExp(`^${escapeRegex(req.user.email)}$`, 'i');

    const groups = await Group.find({
      $or: [
        { createdBy: req.user._id },
        { 'members.userId': req.user._id },
        { 'members.name': userNameRegex },
        { 'members.name': userEmailRegex }
      ]
    }).sort({ createdAt: -1 });

    // Auto-link userId in groups where member name matched but userId wasn't set yet
    for (const group of groups) {
      let needsSave = false;
      group.members.forEach((m) => {
        if (!m.userId && (userNameRegex.test(m.name) || userEmailRegex.test(m.name))) {
          m.userId = req.user._id;
          m.name = req.user.name; // normalize to actual user name
          needsSave = true;
        }
      });
      if (needsSave) {
        await group.save();
      }
    }

    res.status(200).json({ success: true, count: groups.length, groups });
  } catch (error) {
    next(error);
  }
};

/**
 * Retrieve group details and calculate net balances and debt settlements.
 */
const getGroupById = async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.id);

    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    const userNameRegex = new RegExp(`^${escapeRegex(req.user.name)}$`, 'i');
    const userEmailRegex = new RegExp(`^${escapeRegex(req.user.email)}$`, 'i');

    // Check authorization: must be creator or member
    const isMember = group.createdBy.toString() === req.user._id.toString() ||
                     group.members.some(m => 
                       (m.userId && m.userId.toString() === req.user._id.toString()) ||
                       userNameRegex.test(m.name) ||
                       userEmailRegex.test(m.name)
                     );

    if (!isMember) {
      return res.status(403).json({ success: false, message: 'Not authorized to view this group' });
    }

    // Auto-link userId if missing
    let needsSave = false;
    group.members.forEach((m) => {
      if (!m.userId && (userNameRegex.test(m.name) || userEmailRegex.test(m.name))) {
        m.userId = req.user._id;
        m.name = req.user.name;
        needsSave = true;
      }
    });
    if (needsSave) {
      await group.save();
    }

    const data = await computeGroupData(group);

    res.status(200).json({
      success: true,
      ...data
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Add a new expense within a group.
 * Automatically recalculates balances + settlements and broadcasts to all connected group members.
 */
const addGroupExpense = async (req, res, next) => {
  try {
    const { description, amount, paidBy, splitAmong, category, date } = req.body;
    const group = await Group.findById(req.params.id);

    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    const userNameRegex = new RegExp(`^${escapeRegex(req.user.name)}$`, 'i');
    const isMember = group.createdBy.toString() === req.user._id.toString() ||
                     group.members.some(m => 
                       (m.userId && m.userId.toString() === req.user._id.toString()) ||
                       userNameRegex.test(m.name)
                     );

    if (!isMember) {
      return res.status(403).json({ success: false, message: 'Not authorized to add expense to this group' });
    }

    let splits = [];
    if (Array.isArray(splitAmong) && splitAmong.length > 0) {
      splits = splitAmong.map((m) => ({
        name: typeof m === 'object' ? (m.name || req.user.name) : m,
        share: typeof m === 'object' && m.share ? Number(m.share) : (Number(amount) / splitAmong.length)
      }));
    } else {
      // Split equally among all group members by default
      const memberCount = group.members.length;
      splits = group.members.map((m) => ({
        name: m.name,
        share: Number(amount) / memberCount
      }));
    }

    const expense = await GroupExpense.create({
      group: group._id,
      description: description.trim(),
      amount: Number(amount),
      paidBy: paidBy.trim(),
      splitAmong: splits,
      category: category || 'Others',
      date: date || new Date(),
      createdBy: req.user._id
    });

    const updatedData = await computeGroupData(group);

    // Broadcast real-time update to all members connected in this group room and across the app
    const io = req.app.get('io');
    if (io) {
      io.to(`group:${group._id}`).emit('group-updated', {
        groupId: group._id.toString(),
        ...updatedData
      });
      io.emit('groups-changed');
    }

    res.status(201).json({
      success: true,
      expense,
      ...updatedData
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a group expense and broadcast update to all members.
 */
const deleteGroupExpense = async (req, res, next) => {
  try {
    const expense = await GroupExpense.findById(req.params.expenseId);

    if (!expense) {
      return res.status(404).json({ success: false, message: 'Expense not found' });
    }

    const group = await Group.findById(expense.group);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    // Only creator of the expense or group creator can delete it
    const isAuthorized = expense.createdBy.toString() === req.user._id.toString() ||
                         group.createdBy.toString() === req.user._id.toString();

    if (!isAuthorized) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this expense' });
    }

    await expense.deleteOne();

    const updatedData = await computeGroupData(group);

    // Broadcast real-time update to all connected group members
    const io = req.app.get('io');
    if (io) {
      io.to(`group:${group._id}`).emit('group-updated', {
        groupId: group._id.toString(),
        ...updatedData
      });
      io.emit('groups-changed');
    }

    res.status(200).json({
      success: true,
      message: 'Expense deleted',
      ...updatedData
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Cash Flow Minimization Algorithm to resolve debts with minimum transactions.
 */
const calculateSettlements = (netBalances) => {
  const balances = Object.keys(netBalances).map((name) => ({
    name,
    amount: parseFloat(netBalances[name].toFixed(2))
  })).filter((b) => Math.abs(b.amount) > 0.01);

  const debtors = balances.filter((b) => b.amount < 0).sort((a, b) => a.amount - b.amount); // most negative first
  const creditors = balances.filter((b) => b.amount > 0).sort((a, b) => b.amount - a.amount); // most positive first

  const settlements = [];
  let i = 0;
  let j = 0;

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];

    const debtAmount = Math.abs(debtor.amount);
    const creditAmount = creditor.amount;

    const settledAmount = Math.min(debtAmount, creditAmount);

    if (settledAmount > 0.01) {
      settlements.push({
        from: debtor.name,
        to: creditor.name,
        amount: parseFloat(settledAmount.toFixed(2))
      });
    }

    debtor.amount += settledAmount;
    creditor.amount -= settledAmount;

    if (Math.abs(debtor.amount) < 0.01) i++;
    if (Math.abs(creditor.amount) < 0.01) j++;
  }

  return settlements;
};

module.exports = {
  createGroup,
  getGroups,
  getGroupById,
  addGroupExpense,
  deleteGroupExpense,
  calculateSettlements,
};
