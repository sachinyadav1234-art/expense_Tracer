const { validationResult } = require('express-validator');

/**
 * Middleware to run express-validator results.
 * Returns a 400 Bad Request error if validation fails.
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: errors.array()[0].msg
    });
  }
  next();
};

module.exports = validate;
