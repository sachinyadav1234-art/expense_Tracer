const express = require('express');
const {
  createGroup,
  getGroups,
  getGroupById,
  addGroupExpense,
  deleteGroupExpense,
} = require('../controllers/groupController');
const { body } = require('express-validator');
const { protect } = require('../middleware/authMiddleware');
const validate = require('../middleware/validate');

const router = express.Router();

// All group routes are protected and require authorization
router.use(protect);

const groupValidation = [
  body('name').trim().notEmpty().withMessage('Group name is required'),
];

const expenseValidation = [
  body('description').trim().notEmpty().withMessage('Description is required'),
  body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0'),
  body('paidBy').trim().notEmpty().withMessage('Payer name is required'),
];

router.post('/', groupValidation, validate, createGroup);
router.get('/', getGroups);
router.get('/:id', getGroupById);
router.post('/:id/expenses', expenseValidation, validate, addGroupExpense);
router.delete('/:id/expenses/:expenseId', deleteGroupExpense);

module.exports = router;
