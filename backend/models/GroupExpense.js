const mongoose = require('mongoose');

const groupExpenseSchema = new mongoose.Schema(
  {
    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group',
      required: true,
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0.01, 'Amount must be greater than 0'],
    },
    paidBy: {
      type: String,
      required: [true, 'Payer name is required'],
    },
    splitAmong: [
      {
        name: {
          type: String,
          required: true,
        },
        share: {
          type: Number,
          required: true,
        },
      }
    ],
    category: {
      type: String,
      default: 'Others',
    },
    date: {
      type: Date,
      default: Date.now,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('GroupExpense', groupExpenseSchema);
