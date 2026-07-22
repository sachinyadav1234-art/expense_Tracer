const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Group name is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    members: [
      {
        name: {
          type: String,
          required: [true, 'Member name is required'],
          trim: true,
        },
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
      }
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Group', groupSchema);
