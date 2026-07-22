const Transaction = require('../models/Transaction');
const { parseSMS } = require('../utils/smsParser');

// @desc    Add a new transaction (income or expense)
// @route   POST /api/transactions
// @access  Private
const addTransaction = async (req, res, next) => {
  try {
    const { type, amount, category, note, date } = req.body;

    const transaction = await Transaction.create({
      user: req.user._id,
      type,
      amount,
      category,
      note,
      date,
    });

    res.status(201).json({ success: true, transaction });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all transactions for the logged in user
// @route   GET /api/transactions
// @access  Private
const getTransactions = async (req, res, next) => {
  try {
    // optional filters via query params, e.g. ?type=expense&category=Food
    const filter = { user: req.user._id };

    if (req.query.type) filter.type = req.query.type;
    if (req.query.category) filter.category = req.query.category;

    // Filter by status if provided, otherwise default to showing 'confirmed'
    if (req.query.status) {
      filter.status = req.query.status;
    } else {
      filter.status = 'confirmed';
    }

    const transactions = await Transaction.find(filter).sort({ date: -1 });

    res.status(200).json({ success: true, count: transactions.length, transactions });
  } catch (error) {
    next(error);
  }
};

// @desc    Get a single transaction by id
// @route   GET /api/transactions/:id
// @access  Private
const getTransactionById = async (req, res, next) => {
  try {
    const transaction = await Transaction.findById(req.params.id);

    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    // make sure the transaction belongs to the logged in user
    if (transaction.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to view this transaction' });
    }

    res.status(200).json({ success: true, transaction });
  } catch (error) {
    next(error);
  }
};

// @desc    Update a transaction
// @route   PUT /api/transactions/:id
// @access  Private
const updateTransaction = async (req, res, next) => {
  try {
    let transaction = await Transaction.findById(req.params.id);

    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    if (transaction.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to update this transaction' });
    }

    const { type, amount, category, note, date, status, currency } = req.body;

    transaction.type = type ?? transaction.type;
    transaction.amount = amount ?? transaction.amount;
    transaction.category = category ?? transaction.category;
    transaction.note = note ?? transaction.note;
    transaction.date = date ?? transaction.date;
    transaction.status = status ?? transaction.status;
    transaction.currency = currency ?? transaction.currency;

    await transaction.save();

    res.status(200).json({ success: true, transaction });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a transaction
// @route   DELETE /api/transactions/:id
// @access  Private
const deleteTransaction = async (req, res, next) => {
  try {
    const transaction = await Transaction.findById(req.params.id);

    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    if (transaction.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this transaction' });
    }

    await transaction.deleteOne();

    res.status(200).json({ success: true, message: 'Transaction deleted' });
  } catch (error) {
    next(error);
  }
};

// @desc    Get summary - total income, total expense, balance
// @route   GET /api/transactions/summary
// @access  Private
const getSummary = async (req, res, next) => {
  try {
    const transactions = await Transaction.find({ user: req.user._id, status: 'confirmed' });

    let totalIncome = 0;
    let totalExpense = 0;

    transactions.forEach((txn) => {
      const amt = txn.amountInBaseCurrency || txn.amount;
      if (txn.type === 'income') totalIncome += amt;
      else totalExpense += amt;
    });

    res.status(200).json({
      success: true,
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Auto-detect transaction from SMS / notifications
// @route   POST /api/transactions/auto-detect
// @access  Private
const autoDetectTransaction = async (req, res, next) => {
  try {
    const { smsBody, sender, notificationTitle, notificationBody, packageName, timestamp } = req.body;

    const messageText = smsBody || notificationBody;
    const msgSender = sender || packageName || 'Unknown Source';

    if (!messageText) {
      return res.status(400).json({ success: false, message: 'Message content is required' });
    }

    const parsed = parseSMS(messageText);

    if (!parsed) {
      return res.status(200).json({ success: false, message: 'Message ignored (OTP or non-payment related)' });
    }

    // Check for duplicates
    const existing = await Transaction.findOne({
      user: req.user._id,
      rawMessage: messageText
    });

    if (existing) {
      return res.status(200).json({ success: true, message: 'Transaction already auto-detected (duplicate)', transaction: existing });
    }

    const transaction = await Transaction.create({
      user: req.user._id,
      type: parsed.type,
      amount: parsed.amount,
      currency: parsed.currency,
      category: parsed.category,
      note: parsed.note,
      isAutoDetected: true,
      status: 'pending',
      smsSender: msgSender,
      rawMessage: messageText,
      date: timestamp ? new Date(Number(timestamp)) : new Date()
    });

    res.status(201).json({ success: true, message: 'Transaction auto-detected successfully', transaction });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  addTransaction,
  getTransactions,
  getTransactionById,
  updateTransaction,
  deleteTransaction,
  getSummary,
  autoDetectTransaction,
};