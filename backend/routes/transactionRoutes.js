const express = require('express');
const { body } = require('express-validator');
const {
  addTransaction,
  getTransactions,
  getTransactionById,
  updateTransaction,
  deleteTransaction,
  getSummary,
  autoDetectTransaction,
} = require('../controllers/transactionController');
const { protect } = require('../middleware/authMiddleware');
const validate = require('../middleware/validate');

const router = express.Router();

// All transaction routes are protected - login is required
router.use(protect);

const transactionValidation = [
  body('type').isIn(['income', 'expense']).withMessage('Type must be income or expense'),
  body('amount').isFloat({ min: 1 }).withMessage('Amount must be greater than 0'),
  body('category').trim().notEmpty().withMessage('Category is required'),
];

// Note: /summary route must be written BEFORE the /:id route
// Otherwise express will interpret '/summary' as ':id' and it will crash!
router.get('/summary', getSummary);
router.post('/auto-detect', autoDetectTransaction);

// All other CRUD operations
router.post('/', transactionValidation, validate, addTransaction);
router.get('/', getTransactions);
router.get('/:id', getTransactionById);
router.put('/:id', transactionValidation, validate, updateTransaction);
router.delete('/:id', deleteTransaction);

module.exports = router;