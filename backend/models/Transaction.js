const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: ['income', 'expense'],
      required: [true, 'Type is required (income or expense)'],
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [1, 'Amount must be greater than 0'],
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
    },
    note: {
      type: String,
      trim: true,
      default: '',
    },
    currency: {
      type: String,
      default: 'INR',
      trim: true,
    },
    isAutoDetected: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed'],
      default: 'confirmed',
    },
    smsSender: {
      type: String,
      default: '',
      trim: true,
    },
    rawMessage: {
      type: String,
      default: '',
      trim: true,
    },
    amountInBaseCurrency: {
      type: Number,
    },
    date: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

const { convertCurrency } = require('../utils/currencyConverter');

transactionSchema.pre('save', async function () {
  if (this.isModified('amount') || this.isModified('currency') || !this.amountInBaseCurrency) {
    const User = mongoose.model('User');
    const user = await User.findById(this.user);
    const baseCurrency = user ? (user.baseCurrency || 'INR') : 'INR';
    
    this.amountInBaseCurrency = await convertCurrency(this.amount, this.currency, baseCurrency);
  }
});

module.exports = mongoose.model('Transaction', transactionSchema);