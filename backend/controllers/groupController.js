const Group = require('../models/Group');
const GroupExpense = require('../models/GroupExpense');

/**
 * Create a new bill sharing group.
 * The creator is automatically added as a member.
 */
const createGroup = async (req, res, next) => {
  try {
        const { name, description, members } = req.body;

    const groupMembers = [{ name: req.user.name, userId: req.user._id }];

    if (Array.isArray(members)) {
      members.forEach((m) => {
        const memberName = typeof m === 'string' ? m.trim() : m.name?.trim();
        if (memberName && memberName !== req.user.name) {
          groupMembers.push({ name: memberName });
        }
      });
    }

    const group = await Group.create({
      name: name.trim(),
      description: description?.trim() || '',
      createdBy: req.user._id,
      members: groupMembers,
    });

    res.status(201).json({ success: true, group });
  } catch (error) {
    next(error);
  }
};

/**
 * Fetch all groups where the authenticated user is a member.
 */
const getGroups = async (req, res, next) => {
  try {
    const groups = await Group.find({
      $or: [
        { createdBy: req.user._id },
        { 'members.userId': req.user._id }
      ]
    }).sort({ createdAt: -1 });

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

    // Check authorization: must be a member
    const isMember = group.createdBy.toString() === req.user._id.toString() ||
                     group.members.some(m => m.userId && m.userId.toString() === req.user._id.toString());

    if (!isMember) {
      return res.status(403).json({ success: false, message: 'Not authorized to view this group' });
    }

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

    res.status(200).json({
      success: true,
      group,
      expenses,
      balances: netBalances,
      settlements
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Add a new expense within a group.
 */
const addGroupExpense = async (req, res, next) => {
  try {
    const { description, amount, paidBy, splitAmong, category, date } = req.body;
    const group = await Group.findById(req.params.id);

    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    let splits = [];
    if (Array.isArray(splitAmong) && splitAmong.length > 0) {
      splits = splitAmong.map((m) => ({
        name: m.name || m,
        share: Number(m.share) || (amount / splitAmong.length)
      }));
    } else {
      // Split equally among all group members by default
      const memberCount = group.members.length;
      splits = group.members.map((m) => ({
        name: m.name,
        share: amount / memberCount
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

    res.status(201).json({ success: true, expense });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a group expense.
 */
const deleteGroupExpense = async (req, res, next) => {
  try {
    const expense = await GroupExpense.findById(req.params.expenseId);

    if (!expense) {
      return res.status(404).json({ success: false, message: 'Expense not found' });
    }

    // Only creator of the expense or group creator can delete it
    const group = await Group.findById(expense.group);
    const isAuthorized = expense.createdBy.toString() === req.user._id.toString() ||
                         (group && group.createdBy.toString() === req.user._id.toString());

    if (!isAuthorized) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this expense' });
    }

    await expense.deleteOne();

    res.status(200).json({ success: true, message: 'Expense deleted' });
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
